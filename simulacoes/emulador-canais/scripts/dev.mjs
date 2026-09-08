import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const windows = process.platform === 'win32';
const npm = windows ? resolveWindowsCommand('npm.cmd') : 'npm';
const flutter = windows ? resolveWindowsCommand('flutter.bat') : 'flutter';
const adb = resolveAndroidCommand(windows ? 'adb.exe' : 'adb', join('platform-tools', windows ? 'adb.exe' : 'adb'));
const emulator = resolveAndroidCommand(windows ? 'emulator.exe' : 'emulator', join('emulator', windows ? 'emulator.exe' : 'emulator'));
const children = new Map();
let stopping = false;
const platformName = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[process.platform] ?? process.platform;

const colors = ['\x1b[35m', '\x1b[36m', '\x1b[33m', '\x1b[32m', '\x1b[34m', '\x1b[31m', '\x1b[95m'];
const reset = '\x1b[0m';

function resolveWindowsCommand(command) {
  const result = spawnSync('where.exe', [command], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(Boolean)?.trim() || command : command;
}

function resolveAndroidCommand(command, sdkRelativePath) {
  const fromPath = windows ? resolveWindowsCommand(command) : command;
  if (fromPath !== command || commandAvailable(fromPath)) return fromPath;
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    windows && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
    process.platform === 'darwin' && process.env.HOME ? join(process.env.HOME, 'Library', 'Android', 'sdk') : null,
    process.platform === 'linux' && process.env.HOME ? join(process.env.HOME, 'Android', 'Sdk') : null,
  ].filter(Boolean);
  return sdkRoots.map((sdkRoot) => join(sdkRoot, sdkRelativePath)).find(existsSync) ?? command;
}

function commandAvailable(command) {
  if (existsSync(command)) return true;
  const locator = windows ? 'where.exe' : 'which';
  return spawnSync(locator, [command], { stdio: 'ignore' }).status === 0;
}

function portIsOpen(port) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (open) => {
      socket.destroy();
      resolvePort(open);
    };
    socket.setTimeout(350);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portIsOpen(port)) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return false;
}

function pipeLines(stream, prefix, color) {
  if (!stream) return;
  createInterface({ input: stream }).on('line', (line) => {
    process.stdout.write(`${color}[${prefix}]${reset} ${line}\n`);
  });
}

function windowsCommandLine(command, args) {
  const commandLine = [command, ...args].map((value) => {
    const escaped = String(value)
      .replace(/%/g, '%%')
      .replace(/"/g, '""');
    return `"${escaped}"`;
  }).join(' ');
  return `chcp 65001>nul && ${commandLine}`;
}

function startProcess(definition, index) {
  const color = colors[index % colors.length];
  const options = {
    cwd: definition.cwd ?? root,
    env: { ...process.env, ...(definition.env ?? {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !windows,
    windowsHide: true,
  };
  const child = windows
    ? spawn(windowsCommandLine(definition.command, definition.args), { ...options, shell: true })
    : spawn(definition.command, definition.args, options);
  children.set(child.pid, child);
  pipeLines(child.stdout, definition.name, color);
  pipeLines(child.stderr, definition.name, color);
  child.once('error', (error) => {
    process.stderr.write(`${color}[${definition.name}]${reset} não iniciou: ${error.message}\n`);
  });
  child.once('exit', (code, signal) => {
    children.delete(child.pid);
    if (!stopping) {
      const result = signal ? `sinal ${signal}` : `código ${code ?? 0}`;
      process.stdout.write(`${color}[${definition.name}]${reset} encerrado (${result}).\n`);
      if (code) process.exitCode = code;
    }
  });
  return child;
}

async function waitForService(definition, child) {
  const timeoutMs = definition.readinessTimeoutMs ?? 30_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portIsOpen(definition.port)) {
      return { name: definition.name, status: 'RODANDO', detail: `porta ${definition.port}` };
    }
    if (child.exitCode != null || child.signalCode != null) {
      const result = child.signalCode ? `sinal ${child.signalCode}` : `código ${child.exitCode}`;
      return { name: definition.name, status: 'FALHOU', detail: `encerrou com ${result}` };
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return { name: definition.name, status: 'FALHOU', detail: `porta ${definition.port} indisponível após ${timeoutMs / 1000}s` };
}

function printSummary(rows) {
  const headers = ['COMPONENTE', 'STATUS', 'DETALHE'];
  const widths = headers.map((header, index) => Math.max(
    header.length,
    ...rows.map((row) => [row.name, row.status, row.detail][index].length),
  ));
  const line = (values) => values.map((value, index) => value.padEnd(widths[index])).join('  ');
  process.stdout.write(`\nResumo do ambiente (${platformName})\n`);
  process.stdout.write(`${line(headers)}\n`);
  process.stdout.write(`${line(widths.map((width) => '─'.repeat(width)))}\n`);
  for (const row of rows) process.stdout.write(`${line([row.name, row.status, row.detail])}\n`);
}

function stopChild(pid) {
  if (windows) {
    spawnSync('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    try { process.kill(-pid, 'SIGTERM'); } catch { /* grupo já encerrado */ }
  }
}

function stopAll(signal) {
  if (stopping) return;
  stopping = true;
  process.stdout.write(`\nEncerrando ${children.size} processo(s) iniciado(s) por este comando...\n`);
  for (const pid of children.keys()) stopChild(pid);
  process.exit(signal === 'SIGINT' ? 130 : 143);
}

process.once('SIGINT', () => stopAll('SIGINT'));
process.once('SIGTERM', () => stopAll('SIGTERM'));

async function startAll() {
  const definitions = [
    { name: 'BFF', port: 18085, command: npm, args: ['run', 'dev:bff'] },
    { name: 'WCE Bridge', port: 13001, command: npm, args: ['run', 'dev:wce-bridge'] },
    { name: 'React Web', port: 15171, command: npm, args: ['run', 'dev', '--workspace', '@elastic-journey/react-web-host'] },
    { name: 'WCE UI', port: 15173, command: npm, args: ['run', 'dev:wce-ui'] },
    { name: 'Channel Lab', port: 15170, command: npm, args: ['run', 'dev:lab'] },
    // Metro must be ready before Expo Go is opened. Keeping these actions
    // separate also prevents Expo's error screen from being reported healthy.
    { name: 'React Native Metro', port: 18081, command: npm, args: ['run', 'dev:react-native'], readinessTimeoutMs: 60_000 },
    { name: 'Flutter Web', port: 15172, command: flutter, args: ['run', '-d', 'web-server', '--web-hostname', '127.0.0.1', '--web-port', '15172', '--no-pub'], cwd: resolve(root, 'apps/flutter-host'), requires: flutter, readinessTimeoutMs: 90_000 },
  ];
  const readiness = [];

  for (const [index, definition] of definitions.entries()) {
    if (definition.requires && !commandAvailable(definition.requires)) {
      process.stderr.write(`[${definition.name}] comando '${definition.requires}' não encontrado; aplicação ignorada.\n`);
      process.exitCode = 1;
      readiness.push(Promise.resolve({ name: definition.name, status: 'NÃO DISPONÍVEL', detail: `comando ${definition.requires} não encontrado` }));
      continue;
    }
    if (await portIsOpen(definition.port)) {
      process.stdout.write(`[${definition.name}] porta ${definition.port} já está ativa; mantendo o processo existente.\n`);
      readiness.push(Promise.resolve({ name: definition.name, status: 'JÁ ATIVO', detail: `porta ${definition.port}` }));
      continue;
    }
    const child = startProcess(definition, index);
    readiness.push(waitForService(definition, child));
  }

  process.stdout.write('\nAguardando a prontidão dos serviços...\n');
  const rows = await Promise.all(readiness);
  rows.push(
    { name: 'React Native Android', status: 'SOB DEMANDA', detail: 'iniciado pelo Channel Lab via Emulator BFF' },
    { name: 'Flutter Android', status: 'SOB DEMANDA', detail: 'iniciado pelo Channel Lab via Emulator BFF' },
  );
  const iosDetail = process.platform === 'darwin'
    ? 'excluído deste ambiente por configuração'
    : `iOS não é suportado em ${platformName}`;
  rows.push(
    { name: 'React Native iOS', status: 'NÃO APLICÁVEL', detail: iosDetail },
    { name: 'Flutter iOS', status: 'NÃO APLICÁVEL', detail: iosDetail },
  );
  printSummary(rows);
  const hasProblems = rows.some((row) => row.status === 'FALHOU' || row.status === 'NÃO DISPONÍVEL');
  if (hasProblems) process.exitCode = 1;

  if (children.size === 0) process.stdout.write('\nNenhum processo novo foi iniciado.\n');
  else if (hasProblems) process.stdout.write('\nAmbiente iniciado com problemas. Consulte o resumo acima. Use Ctrl+C para encerrar somente estes processos.\n');
  else process.stdout.write('\nAmbiente pronto. Use Ctrl+C para encerrar somente estes processos.\n');
}

function androidDevices() {
  if (!commandAvailable(adb)) throw new Error("ADB não encontrado. Instale/configure o Android SDK e adicione 'platform-tools' ao PATH.");
  const result = spawnSync(adb, ['devices'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'Não foi possível consultar os dispositivos Android.');
  return result.stdout.split(/\r?\n/).slice(1).map((line) => line.trim().split(/\s+/)).filter((parts) => parts[0] && parts[1] === 'device').map((parts) => parts[0]);
}

function listAndroidAvds() {
  if (!commandAvailable(emulator)) return [];
  const result = spawnSync(emulator, ['-list-avds'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function androidProperty(device, name) {
  const result = spawnSync(adb, ['-s', device, 'shell', 'getprop', name], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

async function waitForAndroidDevice(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const device = androidDevices()[0];
    if (device && androidProperty(device, 'sys.boot_completed') === '1') return device;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return null;
}

async function waitForAndroidPackage(device, packageName, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = spawnSync(adb, ['-s', device, 'shell', 'pidof', packageName], { encoding: 'utf8', windowsHide: true });
    if (result.status === 0 && result.stdout.trim()) return true;
    if (child && (child.exitCode != null || child.signalCode != null)) return false;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return false;
}

function androidTopActivity(device) {
  const result = spawnSync(adb, ['-s', device, 'shell', 'dumpsys', 'activity', 'activities'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return '';
  return result.stdout.split(/\r?\n/).find((line) => line.includes('topResumedActivity'))?.trim() ?? '';
}

async function waitForExpoExperience(device, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const activity = androidTopActivity(device);
    if (activity.includes('host.exp.exponent') && activity.includes('ErrorActivity')) return false;
    if (activity.includes('host.exp.exponent') && activity.includes('ExperienceActivity')) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return false;
}

async function ensureAndroidDevice() {
  if (!commandAvailable(adb)) {
    return { device: null, detail: 'ADB não encontrado; configure o Android SDK' };
  }
  const connected = androidDevices()[0];
  if (connected && androidProperty(connected, 'sys.boot_completed') === '1') {
    return { device: connected, detail: `dispositivo ${connected}` };
  }
  const avd = listAndroidAvds()[0];
  if (!avd) return { device: null, detail: 'nenhum dispositivo conectado ou AVD configurado' };
  process.stdout.write(`\n[Android Emulator] iniciando AVD ${avd}...\n`);
  startProcess({ name: 'Android Emulator', command: emulator, args: ['-avd', avd, '-no-snapshot-load'] }, colors.length);
  const device = await waitForAndroidDevice();
  return device
    ? { device, detail: `AVD ${avd} (${device})` }
    : { device: null, detail: `AVD ${avd} não ficou pronto em 120s` };
}

async function startAndroidApplications(android, metroAvailable = true) {
  if (!android.device) {
    return [
      { name: 'React Native Android', status: 'NÃO DISPONÍVEL', detail: android.detail },
      { name: 'Flutter Android', status: 'NÃO DISPONÍVEL', detail: android.detail },
    ];
  }
  const device = android.device;
  spawnSync(adb, ['-s', device, 'reverse', 'tcp:18081', 'tcp:18081'], { stdio: 'ignore', windowsHide: true });
  spawnSync(adb, ['-s', device, 'reverse', 'tcp:18085', 'tcp:18085'], { stdio: 'ignore', windowsHide: true });

  let reactRunning = false;
  let reactDetail = android.detail;
  if (!metroAvailable) {
    reactDetail = 'Metro indisponível na porta 18081; Expo Go não foi iniciado';
  } else {
    spawnSync(adb, ['-s', device, 'shell', 'am', 'force-stop', 'host.exp.exponent'], { stdio: 'ignore', windowsHide: true });
    const expo = spawnSync(adb, [
      '-s', device, 'shell', 'am', 'start', '-W',
      '-a', 'android.intent.action.VIEW',
      '-d', 'exp://127.0.0.1:18081',
      'host.exp.exponent',
    ], { encoding: 'utf8', windowsHide: true });
    reactRunning = expo.status === 0
      && await waitForAndroidPackage(device, 'host.exp.exponent', null, 20_000)
      && await waitForExpoExperience(device);
    if (!reactRunning) reactDetail = 'Expo Go abriu, mas não carregou o projeto pelo Metro';
  }

  let flutterRunning = false;
  let flutterDetail = android.detail;
  if (!commandAvailable(flutter)) {
    flutterDetail = 'Flutter não encontrado no PATH';
  } else {
    const flutterChild = startProcess({
      name: 'Flutter Android',
      command: flutter,
      args: ['run', '-d', device, '--no-pub', '--dart-define=EMULATOR_BFF_BASE_URL=http://127.0.0.1:18085/api/v1'],
      cwd: resolve(root, 'apps/flutter-host'),
    }, colors.length + 1);
    flutterRunning = await waitForAndroidPackage(device, 'com.elasticjourney.elastic_journey_flutter_host', flutterChild, 120_000);
    if (flutterRunning) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 10_000));
      flutterRunning = androidDevices().includes(device) && androidProperty(device, 'sys.boot_completed') === '1';
    }
    if (!flutterRunning) flutterDetail = 'aplicativo ou dispositivo perdeu a conexão durante a validação';
  }

  return [
    { name: 'React Native Android', status: reactRunning ? 'RODANDO' : 'FALHOU', detail: reactDetail },
    { name: 'Flutter Android', status: flutterRunning ? 'RODANDO' : 'FALHOU', detail: flutterDetail },
  ];
}

async function startAndroid() {
  const android = await ensureAndroidDevice();
  if (!android.device) throw new Error(android.detail);
  if (!(await portIsOpen(18081))) {
    startProcess({ name: 'React Native Metro', command: npm, args: ['run', 'dev:react-native'] }, 0);
    if (!(await waitForPort(18081, 60_000))) throw new Error('O Metro não ficou disponível na porta 18081 dentro de 60 segundos.');
  } else {
    process.stdout.write('[React Native Metro] porta 18081 já está ativa; reutilizando o Metro existente.\n');
  }
  printSummary(await startAndroidApplications(android));
  process.stdout.write('\nAplicações Android processadas. Use Ctrl+C para encerrar somente estes processos.\n');
}

try {
  if (mode === 'all') await startAll();
  else if (mode === 'android') await startAndroid();
  else throw new Error("Modo inválido. Use 'all' ou 'android'.");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
