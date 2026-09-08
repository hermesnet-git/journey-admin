import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, homedir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AndroidTarget = 'react.mobile' | 'flutter.mobile';

export interface AndroidLaunchResult {
  status: 'RUNNING';
  target: AndroidTarget;
  deviceId: string;
  avdName: string | null;
  detail: string;
}

export interface AndroidTimeouts {
  avdBootMs: number;
  expoReadyMs: number;
  flutterReadyMs: number;
}

export interface EmulatorHardwareConfig {
  avdName: string;
  ramMb: number;
  cpuCores: number;
  maxRamMb: number;
  maxCpuCores: number;
  deviceConnected: boolean;
}

export class AndroidControllerError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

const windows = process.platform === 'win32';
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const managedProcesses = new Set<ChildProcess>();
const processErrors = new WeakMap<ChildProcess, Error>();
let activeLaunch: Promise<AndroidLaunchResult> | null = null;
// `flutter run` fica vivo de propósito (monitora o device para hot-reload) —
// se não for encerrado antes do próximo lançamento, o processo antigo e o
// novo disputam o mesmo app no device, cada um com seu próprio serviço de
// VM Dart, e o app instala mas nunca fica estável em primeiro plano.
let activeFlutterProcess: ChildProcess | null = null;

function stopActiveFlutterProcess(): void {
  const child = activeFlutterProcess;
  activeFlutterProcess = null;
  if (!child || child.exitCode !== null || child.signalCode !== null || child.pid == null) return;
  if (windows) {
    // No Windows o comando rodou via "cmd /d /c flutter.bat ..."; o PID
    // rastreado é o do cmd.exe, então é preciso matar a árvore (/t).
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    try { child.kill('SIGTERM'); } catch { /* já encerrado */ }
  }
}

function available(command: string): boolean {
  if (existsSync(command)) return true;
  return spawnSync(windows ? 'where.exe' : 'which', [command], { stdio: 'ignore', windowsHide: true }).status === 0;
}

function resolveCommand(command: string, sdkPath?: string): string {
  if (available(command)) return command;
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    windows && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
    process.platform === 'darwin' && process.env.HOME ? join(process.env.HOME, 'Library', 'Android', 'sdk') : null,
    process.platform === 'linux' && process.env.HOME ? join(process.env.HOME, 'Android', 'Sdk') : null,
  ].filter((value): value is string => Boolean(value));
  return sdkPath ? roots.map((root) => join(root, sdkPath)).find(existsSync) ?? command : command;
}

const adb = resolveCommand(windows ? 'adb.exe' : 'adb', join('platform-tools', windows ? 'adb.exe' : 'adb'));
const emulator = resolveCommand(windows ? 'emulator.exe' : 'emulator', join('emulator', windows ? 'emulator.exe' : 'emulator'));
const flutter = windows ? resolveCommand('flutter.bat') : resolveCommand('flutter');

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new AndroidControllerError('ANDROID_COMMAND_FAILED', result.stderr?.trim() || `Falha ao executar ${command}.`);
  return result.stdout.trim();
}

async function runWithRetry(command: string, args: string[], attempts = 3, delayMs = 800): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return run(command, args);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolveWait) => setTimeout(resolveWait, delayMs));
    }
  }
  throw lastError;
}

function start(command: string, args: string[], cwd = workspaceRoot): ChildProcess {
  const options: SpawnOptions = {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: false,
  };
  const child: ChildProcess = windows && /\.(?:bat|cmd)$/i.test(command)
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', command, ...args], options)
    : spawn(command, args, options);
  managedProcesses.add(child);
  child.stdout?.on('data', (chunk: Buffer) => process.stdout.write(`[android] ${chunk.toString('utf8')}`));
  child.stderr?.on('data', (chunk: Buffer) => process.stderr.write(`[android] ${chunk.toString('utf8')}`));
  child.once('error', (error) => {
    processErrors.set(child, error);
    process.stderr.write(`[android] processo não iniciado: ${error.message}\n`);
  });
  child.once('exit', () => managedProcesses.delete(child));
  return child;
}

function deviceLines(): Array<{ id: string; status: string }> {
  if (!available(adb)) return [];
  return run(adb, ['devices']).split(/\r?\n/).slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts): parts is [string, string] => Boolean(parts[0] && parts[1]))
    .map(([id, status]) => ({ id, status }));
}

function connectedDevice(): string | null {
  const devices = deviceLines();
  const unauthorized = devices.find((device) => device.status === 'unauthorized');
  if (unauthorized) {
    throw new AndroidControllerError('DEVICE_UNAUTHORIZED', `O dispositivo ${unauthorized.id} está conectado, mas a depuração USB não foi autorizada. Aceite o prompt de autorização no aparelho e tente novamente.`);
  }
  // "offline" é o estado normal de um emulador ainda terminando de subir (ou
  // de um físico reconectando) — não é um erro, só ainda não está pronto.
  // Quem chama esta função deve continuar esperando, não tratar como fatal.
  return devices.find((device) => device.status === 'device')?.id ?? null;
}

function property(device: string, name: string): string {
  return run(adb, ['-s', device, 'shell', 'getprop', name]);
}

function avds(): string[] {
  if (!available(emulator)) return [];
  return run(emulator, ['-list-avds']).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function avdConfigPath(avdName: string): string {
  return join(homedir(), '.android', 'avd', `${avdName}.avd`, 'config.ini');
}

function readAvdConfigValues(avdName: string): Map<string, string> {
  const path = avdConfigPath(avdName);
  if (!existsSync(path)) throw new AndroidControllerError('AVD_CONFIG_NOT_FOUND', `Configuração do AVD ${avdName} não encontrada em ${path}.`);
  const values = new Map<string, string>();
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator > 0) values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return values;
}

function writeAvdConfigValues(avdName: string, values: Record<string, string>): void {
  const path = avdConfigPath(avdName);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((line, index, all) => !(line === '' && index === all.length - 1));
  const remaining = new Set(Object.keys(values));
  const updated = lines.map((line) => {
    const key = line.slice(0, line.indexOf('=')).trim();
    if (remaining.has(key)) {
      remaining.delete(key);
      return `${key}=${values[key]}`;
    }
    return line;
  });
  for (const key of remaining) updated.push(`${key}=${values[key]}`);
  writeFileSync(path, `${updated.join('\n')}\n`, 'utf8');
}

// Nunca deixa o usuário dedicar a RAM/CPU inteira do host à VM: reserva uma
// fatia para o sistema operacional e os outros programas continuarem usáveis
// enquanto o AVD roda — o teto é relativo à máquina de cada um, não um valor
// fixo (16GB é seguro numa máquina de 32GB, mas afogaria uma de 16GB).
function emulatorHostLimits(): { maxRamMb: number; maxCpuCores: number } {
  const totalRamMb = Math.floor(totalmem() / (1024 * 1024));
  const maxRamMb = Math.max(1536, Math.floor((totalRamMb * 0.6) / 512) * 512);
  const maxCpuCores = Math.max(1, cpus().length - 1);
  return { maxRamMb, maxCpuCores };
}

export function getEmulatorHardwareConfig(): EmulatorHardwareConfig {
  const avdName = avds()[0];
  if (!avdName) throw new AndroidControllerError('AVD_NOT_FOUND', 'Nenhum AVD configurado.');
  const values = readAvdConfigValues(avdName);
  const { maxRamMb, maxCpuCores } = emulatorHostLimits();
  return {
    avdName,
    ramMb: Number(values.get('hw.ramSize')) || 2048,
    cpuCores: Number(values.get('hw.cpu.ncore')) || 1,
    maxRamMb,
    maxCpuCores,
    deviceConnected: deviceLines().length > 0,
  };
}

export function setEmulatorHardwareConfig(ramMb: number, cpuCores: number): EmulatorHardwareConfig {
  const avdName = avds()[0];
  if (!avdName) throw new AndroidControllerError('AVD_NOT_FOUND', 'Nenhum AVD configurado.');
  const { maxRamMb, maxCpuCores } = emulatorHostLimits();
  if (!Number.isInteger(ramMb) || ramMb < 1536 || ramMb > maxRamMb) {
    throw new AndroidControllerError('EMULATOR_CONFIG_INVALID', `ramMb deve ser um inteiro entre 1536 e ${maxRamMb}.`);
  }
  if (!Number.isInteger(cpuCores) || cpuCores < 1 || cpuCores > maxCpuCores) {
    throw new AndroidControllerError('EMULATOR_CONFIG_INVALID', `cpuCores deve ser um inteiro entre 1 e ${maxCpuCores}.`);
  }
  writeAvdConfigValues(avdName, { 'hw.ramSize': String(ramMb), 'hw.cpu.ncore': String(cpuCores) });
  return getEmulatorHardwareConfig();
}

async function waitUntil<T>(read: () => T | null, timeoutMs: number): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== null) return value;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return null;
}

function runningPackage(deviceId: string, packageName: string): string | null {
  const result = spawnSync(adb, ['-s', deviceId, 'shell', 'pidof', packageName], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

const EXPO_REDELIVER_INTERVAL_MS = 15_000;

// Espera a Experience Activity do Expo Go aparecer, reenviando a intent do deep
// link enquanto a tela ainda nem chegou a abrir o Expo Go. Depois que o Expo Go
// já está na tela (mesmo em splash/carregamento do bundle), para de reenviar —
// reenviar nesse ponto arriscaria reiniciar um carregamento que só está lento,
// não perdido.
async function waitForExpoExperience(deviceId: string, redeliver: () => void, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  let lastRedeliverAt = Date.now();
  while (Date.now() < deadline) {
    const activity = topActivity(deviceId);
    if (activity.includes('ErrorActivity')) {
      throw new AndroidControllerError('EXPO_LOAD_FAILED', 'O Expo Go abriu a tela de erro ao carregar o projeto pelo Metro.');
    }
    const insideExpoGo = activity.includes('host.exp.exponent');
    if (insideExpoGo && activity.includes('ExperienceActivity')) return activity;
    if (!insideExpoGo && Date.now() - lastRedeliverAt >= EXPO_REDELIVER_INTERVAL_MS) {
      redeliver();
      lastRedeliverAt = Date.now();
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return null;
}

const FLUTTER_FOREGROUND_RETRY_INTERVAL_MS = 8_000;

// Depois de instalado e rodando, o app Flutter pode perder o foco pra tela
// inicial (efeito comum enquanto o sistema do AVD ainda está "se acomodando"
// logo após o boot). Insiste trazendo de volta ao primeiro plano até o
// timeout, e só desiste antes disso se o processo realmente encerrar.
async function waitForFlutterForeground(deviceId: string, packageName: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let lastNudgeAt = 0;
  while (Date.now() < deadline) {
    if (!runningPackage(deviceId, packageName)) return false;
    if (topActivity(deviceId).includes(packageName)) return true;
    if (Date.now() - lastNudgeAt >= FLUTTER_FOREGROUND_RETRY_INTERVAL_MS) {
      run(adb, ['-s', deviceId, 'shell', 'am', 'start', '-W', '-n', `${packageName}/.MainActivity`]);
      lastNudgeAt = Date.now();
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return false;
}

function topActivity(deviceId: string): string {
  const result = spawnSync(adb, ['-s', deviceId, 'shell', 'dumpsys', 'activity', 'activities'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return '';
  return result.stdout.split(/\r?\n/).find((line) => line.includes('topResumedActivity'))?.trim() ?? '';
}

async function metroAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:18081/status', { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureDevice(bootTimeoutMs: number): Promise<{ deviceId: string; avdName: string | null }> {
  if (!available(adb)) throw new AndroidControllerError('ADB_NOT_FOUND', 'ADB não encontrado. Configure o Android SDK antes de iniciar o canal mobile.');
  const current = connectedDevice();
  if (current && property(current, 'sys.boot_completed') === '1') return { deviceId: current, avdName: null };

  // Se o adb já enxerga algum device (mesmo "offline"), é quase sempre um
  // emulador ainda terminando de subir ou um físico reconectando — esperar
  // por ele evita tanto um erro fatal precoce quanto abrir um AVD duplicado
  // por cima do que já está a caminho.
  const alreadyConnecting = deviceLines().length > 0;
  let avdName: string | null = null;
  if (!alreadyConnecting) {
    avdName = avds()[0] ?? null;
    if (!avdName) throw new AndroidControllerError('AVD_NOT_FOUND', 'Nenhum dispositivo Android conectado ou AVD configurado.');
    // Sem -no-snapshot-load: quando existe um quick-boot snapshot salvo, o AVD
    // volta a um estado já assentado em segundos, em vez de um cold boot que
    // deixa o sistema "se acomodando" (serviços, Play Store etc.) por um bom
    // tempo depois mesmo já com sys.boot_completed=1.
    start(emulator, ['-avd', avdName]);
  }
  const deviceId = await waitUntil(() => {
    const device = connectedDevice();
    return device && property(device, 'sys.boot_completed') === '1' ? device : null;
  }, bootTimeoutMs);
  if (!deviceId) {
    const detail = alreadyConnecting
      ? `O dispositivo já conectado não ficou pronto em ${Math.round(bootTimeoutMs / 1000)} segundos. Se é um emulador recém-aberto, aguarde o boot terminar; se é um aparelho físico, confira o cabo/ADB.`
      : `O AVD ${avdName} não ficou pronto em ${Math.round(bootTimeoutMs / 1000)} segundos.`;
    throw new AndroidControllerError('AVD_START_TIMEOUT', detail);
  }
  return { deviceId, avdName };
}

function packageInstalled(deviceId: string, packageName: string): boolean {
  const result = spawnSync(adb, ['-s', deviceId, 'shell', 'pm', 'list', 'packages', packageName], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 && result.stdout.includes(packageName);
}

export type LabStatusLevel = 'up' | 'down' | 'pending';

export interface LabStatusItem {
  id: string;
  label: string;
  status: LabStatusLevel;
  detail: string;
  help: string;
}

export interface LabStatus {
  items: LabStatusItem[];
  checkedAt: string;
}

export interface LabStatusInput {
  adminBaseUrl: string;
  journeyBaseUrl: string;
  wceBridgeBaseUrl: string;
}

async function reachable(url: string, timeoutMs = 2_500): Promise<boolean> {
  try {
    // Qualquer resposta HTTP (mesmo 4xx/5xx) já prova que o processo está de
    // pé e aceitando conexão — só falha de rede/timeout conta como fora do ar.
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return true;
  } catch {
    return false;
  }
}

// Usada só pelo painel de status: nunca deve lançar. Um device pode aparecer
// na listagem e morrer um instante depois (ex.: AVD fechando bem nessa hora)
// — isso não pode derrubar a checagem dos outros itens do painel.
function currentDeviceSummary(): { connected: boolean; booted: boolean; deviceId: string | null; detail: string } {
  let devices: Array<{ id: string; status: string }>;
  try {
    devices = deviceLines();
  } catch (error) {
    return { connected: false, booted: false, deviceId: null, detail: error instanceof Error ? error.message : 'falha ao consultar o adb' };
  }
  if (devices.length === 0) return { connected: false, booted: false, deviceId: null, detail: 'nenhum dispositivo conectado' };
  const unauthorized = devices.find((device) => device.status === 'unauthorized');
  if (unauthorized) return { connected: true, booted: false, deviceId: unauthorized.id, detail: `${unauthorized.id} aguardando autorização de depuração USB` };
  const ready = devices.find((device) => device.status === 'device');
  if (!ready) return { connected: true, booted: false, deviceId: devices[0]!.id, detail: `${devices[0]!.id} conectando (${devices[0]!.status})` };
  let booted = false;
  try {
    booted = property(ready.id, 'sys.boot_completed') === '1';
  } catch {
    // Listado como "device" mas já não responde — trata como transitório.
    return { connected: true, booted: false, deviceId: ready.id, detail: `${ready.id} parou de responder (encerrando?)` };
  }
  return { connected: true, booted, deviceId: ready.id, detail: booted ? ready.id : `${ready.id} terminando de inicializar` };
}

export async function getLabStatus(input: LabStatusInput): Promise<LabStatus> {
  const [adminUp, journeyUp, wceBridgeUp, metroUp] = await Promise.all([
    reachable(input.adminBaseUrl),
    reachable(input.journeyBaseUrl),
    reachable(`${input.wceBridgeBaseUrl}/health`),
    metroAvailable(),
  ]);
  const device = currentDeviceSummary();

  const appStatus = (installed: boolean | null, notReadyDetail: string): { status: LabStatusLevel; detail: string } => {
    if (installed === null) return { status: 'pending', detail: notReadyDetail };
    return installed ? { status: 'up', detail: 'instalado no emulador' } : { status: 'down', detail: 'não encontrado no emulador' };
  };
  const expoInstalled = device.booted && device.deviceId ? packageInstalled(device.deviceId, 'host.exp.exponent') : null;
  const flutterInstalled = device.booted && device.deviceId ? packageInstalled(device.deviceId, 'com.elasticjourney.elastic_journey_flutter_host') : null;

  const items: LabStatusItem[] = [
    {
      id: 'admin',
      label: 'Catálogo de jornadas',
      status: adminUp ? 'up' : 'down',
      detail: adminUp ? 'respondendo' : 'sem resposta',
      help: 'Serviço que lista as jornadas publicadas disponíveis para escolher no passo 2.',
    },
    {
      id: 'ms-journey',
      label: 'Execução de jornadas',
      status: journeyUp ? 'up' : 'down',
      detail: journeyUp ? 'respondendo' : 'sem resposta',
      help: 'Serviço que inicia, avança e encerra a jornada quando um canal é aberto.',
    },
    {
      id: 'wce-bridge',
      label: 'Ponte do WhatsApp',
      status: wceBridgeUp ? 'up' : 'down',
      detail: wceBridgeUp ? 'respondendo' : 'sem resposta',
      help: 'Recebe e envia as mensagens da simulação de WhatsApp entre o BFF e a WCE Web UI.',
    },
    {
      id: 'metro',
      label: 'Empacotador React Native',
      status: metroUp ? 'up' : 'down',
      detail: metroUp ? 'servindo o projeto' : 'sem resposta',
      help: 'Compila e entrega o código do canal React Native para o Expo Go, dentro do emulador.',
    },
    {
      id: 'avd',
      label: 'Emulador Android',
      status: device.booted ? 'up' : device.connected ? 'pending' : 'down',
      detail: device.detail,
      help: 'O dispositivo Android virtual onde os canais React Native e Flutter Mobile rodam.',
    },
    {
      id: 'expo-go',
      label: 'App: Expo Go',
      ...appStatus(expoInstalled, 'depende do emulador estar pronto'),
      help: 'O aplicativo que carrega e executa o canal React Native dentro do emulador.',
    },
    {
      id: 'flutter-app',
      label: 'App: canal Flutter',
      ...appStatus(flutterInstalled, 'depende do emulador estar pronto'),
      help: 'O aplicativo Flutter Mobile instalado no emulador pela última execução.',
    },
  ];

  return { items, checkedAt: new Date().toISOString() };
}

async function reversePorts(deviceId: string): Promise<void> {
  // Logo após sys.boot_completed=1 o serviço de rede do device pode ainda
  // estar terminando de subir; uma falha aqui costuma ser transitória.
  await runWithRetry(adb, ['-s', deviceId, 'reverse', 'tcp:18081', 'tcp:18081']);
  await runWithRetry(adb, ['-s', deviceId, 'reverse', 'tcp:18085', 'tcp:18085']);
}

async function lockPortrait(deviceId: string): Promise<void> {
  // Conveniência visual, não crítica: uma ROM que restrinja "settings put"
  // via ADB não deve derrubar o lançamento do canal por causa disto.
  try {
    await runWithRetry(adb, ['-s', deviceId, 'shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
    await runWithRetry(adb, ['-s', deviceId, 'shell', 'settings', 'put', 'system', 'user_rotation', '0']);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[android] aviso: não foi possível travar a orientação em retrato: ${reason}\n`);
  }
  // Android versions that support wm user-rotation apply this immediately.
  spawnSync(adb, ['-s', deviceId, 'shell', 'wm', 'user-rotation', 'lock', '0'], { stdio: 'ignore', windowsHide: true });
}

async function launch(target: AndroidTarget, bootstrapToken: string, timeouts: AndroidTimeouts): Promise<AndroidLaunchResult> {
  // Encerra qualquer `flutter run` de uma tentativa anterior antes de seguir,
  // não só quando o alvo desta vez também é flutter.mobile: um processo
  // órfão continua de olho no device e atrapalha qualquer lançamento novo.
  stopActiveFlutterProcess();
  const device = await ensureDevice(timeouts.avdBootMs);
  await lockPortrait(device.deviceId);
  await reversePorts(device.deviceId);
  if (target === 'react.mobile') {
    if (!(await metroAvailable())) throw new AndroidControllerError('METRO_UNAVAILABLE', 'Metro não está disponível na porta 18081. Inicie o ambiente com npm run dev:all.');
    if (!packageInstalled(device.deviceId, 'host.exp.exponent')) {
      throw new AndroidControllerError('EXPO_GO_NOT_INSTALLED', 'Expo Go não está instalado no dispositivo/AVD. Instale-o (Play Store ou sideload do APK) antes de tentar novamente.');
    }
    run(adb, ['-s', device.deviceId, 'shell', 'am', 'force-stop', 'host.exp.exponent']);
    const projectUrl = `exp://127.0.0.1:18081/--/?labBootstrap=${encodeURIComponent(bootstrapToken)}`;
    const openProject = (): void => {
      run(adb, ['-s', device.deviceId, 'shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', projectUrl]);
    };
    openProject();
    const experience = await waitForExpoExperience(device.deviceId, openProject, timeouts.expoReadyMs);
    if (!experience) throw new AndroidControllerError('EXPO_START_TIMEOUT', `O projeto React Native não ficou pronto no Expo Go em até ${Math.round(timeouts.expoReadyMs / 1000)} segundos.`);
    // On a cold start Expo consumes the first URL to load the project before
    // React Native subscribes to Linking. Re-deliver it once the experience is
    // active so the bootstrap is handled on the first click in Channel Lab.
    // A margem precisa cobrir um boot totalmente frio (AVD + Expo Go pela
    // primeira vez), não só o caso comum de app já familiar ao Metro — um
    // reenvio cedo demais chega com o bridge do React ainda não pronto para
    // receber onNewIntent, o que pode até derrubar o contexto (visto no log
    // como "no protocol" em DevSupportManagerBase.resetCurrentContext).
    await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
    const stillOnExperience = topActivity(device.deviceId).includes('ExperienceActivity');
    if (stillOnExperience) openProject();
    return { status: 'RUNNING', target, ...device, detail: 'Expo Go aberto no AVD com o bootstrap da jornada.' };
  }
  if (!available(flutter)) throw new AndroidControllerError('FLUTTER_NOT_FOUND', 'Flutter não encontrado no PATH do Emulator BFF.');
  run(adb, ['-s', device.deviceId, 'shell', 'am', 'force-stop', 'com.elasticjourney.elastic_journey_flutter_host']);
  const child = start(flutter, [
    'run', '-d', device.deviceId, '--no-pub',
    '--dart-define=EMULATOR_BFF_BASE_URL=http://127.0.0.1:18085/api/v1',
    `--dart-define=LAB_BOOTSTRAP_TOKEN=${bootstrapToken}`,
  ], resolve(workspaceRoot, 'apps/flutter-host'));
  activeFlutterProcess = child;
  const deadline = Date.now() + timeouts.flutterReadyMs;
  let flutterPid: string | null = null;
  while (Date.now() < deadline && !flutterPid) {
    const processError = processErrors.get(child);
    if (processError) throw new AndroidControllerError('FLUTTER_START_FAILED', `Não foi possível iniciar o Flutter: ${processError.message}`);
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new AndroidControllerError('FLUTTER_START_FAILED', `O comando Flutter encerrou antes de abrir o aplicativo (código ${child.exitCode ?? child.signalCode}).`);
    }
    flutterPid = runningPackage(device.deviceId, 'com.elasticjourney.elastic_journey_flutter_host');
    if (!flutterPid) await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  if (!flutterPid) throw new AndroidControllerError('FLUTTER_START_FAILED', `O Flutter não abriu no AVD em até ${Math.round(timeouts.flutterReadyMs / 1000)} segundos. Consulte o log do Emulator BFF.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 3_000));
  const flutterPackage = 'com.elasticjourney.elastic_journey_flutter_host';
  const remainingMs = Math.max(0, deadline - Date.now());
  const flutterForeground = await waitForFlutterForeground(device.deviceId, flutterPackage, remainingMs);
  if (!flutterForeground) {
    const stillRunning = runningPackage(device.deviceId, flutterPackage);
    throw new AndroidControllerError('FLUTTER_APP_STOPPED', stillRunning
      ? 'O Flutter continua rodando, mas não ficou em primeiro plano no AVD. Consulte os logs [android] do BFF.'
      : 'O Flutter foi instalado, mas o processo encerrou no AVD. Consulte os logs [android] do BFF.');
  }
  return { status: 'RUNNING', target, ...device, detail: 'Flutter iniciado no AVD com o bootstrap da jornada.' };
}

export function launchAndroid(target: AndroidTarget, bootstrapToken: string, timeouts: AndroidTimeouts): Promise<AndroidLaunchResult> {
  if (activeLaunch) throw new AndroidControllerError('ANDROID_BUSY', 'Já existe uma inicialização mobile em andamento.');
  activeLaunch = launch(target, bootstrapToken, timeouts).finally(() => { activeLaunch = null; });
  return activeLaunch;
}
