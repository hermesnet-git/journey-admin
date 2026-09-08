import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
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

function connectedDevice(): string | null {
  if (!available(adb)) return null;
  return run(adb, ['devices']).split(/\r?\n/).slice(1)
    .map((line) => line.trim().split(/\s+/))
    .find((parts) => parts[0] && parts[1] === 'device')?.[0] ?? null;
}

function property(device: string, name: string): string {
  return run(adb, ['-s', device, 'shell', 'getprop', name]);
}

function avds(): string[] {
  if (!available(emulator)) return [];
  return run(emulator, ['-list-avds']).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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

async function ensureDevice(): Promise<{ deviceId: string; avdName: string | null }> {
  if (!available(adb)) throw new AndroidControllerError('ADB_NOT_FOUND', 'ADB não encontrado. Configure o Android SDK antes de iniciar o canal mobile.');
  const current = connectedDevice();
  if (current && property(current, 'sys.boot_completed') === '1') return { deviceId: current, avdName: null };
  const avdName = avds()[0];
  if (!avdName) throw new AndroidControllerError('AVD_NOT_FOUND', 'Nenhum dispositivo Android conectado ou AVD configurado.');
  start(emulator, ['-avd', avdName, '-no-snapshot-load']);
  const deviceId = await waitUntil(() => {
    const device = connectedDevice();
    return device && property(device, 'sys.boot_completed') === '1' ? device : null;
  }, 180_000);
  if (!deviceId) throw new AndroidControllerError('AVD_START_TIMEOUT', `O AVD ${avdName} não ficou pronto em 180 segundos.`);
  return { deviceId, avdName };
}

function reversePorts(deviceId: string): void {
  run(adb, ['-s', deviceId, 'reverse', 'tcp:18081', 'tcp:18081']);
  run(adb, ['-s', deviceId, 'reverse', 'tcp:18085', 'tcp:18085']);
}

function lockPortrait(deviceId: string): void {
  run(adb, ['-s', deviceId, 'shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
  run(adb, ['-s', deviceId, 'shell', 'settings', 'put', 'system', 'user_rotation', '0']);
  // Android versions that support wm user-rotation apply this immediately.
  spawnSync(adb, ['-s', deviceId, 'shell', 'wm', 'user-rotation', 'lock', '0'], { stdio: 'ignore', windowsHide: true });
}

async function launch(target: AndroidTarget, bootstrapToken: string): Promise<AndroidLaunchResult> {
  const device = await ensureDevice();
  lockPortrait(device.deviceId);
  reversePorts(device.deviceId);
  if (target === 'react.mobile') {
    if (!(await metroAvailable())) throw new AndroidControllerError('METRO_UNAVAILABLE', 'Metro não está disponível na porta 18081. Inicie o ambiente com npm run dev:all.');
    run(adb, ['-s', device.deviceId, 'shell', 'am', 'force-stop', 'host.exp.exponent']);
    const projectUrl = `exp://127.0.0.1:18081/--/?labBootstrap=${encodeURIComponent(bootstrapToken)}`;
    const openProject = (): void => {
      run(adb, ['-s', device.deviceId, 'shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', projectUrl]);
    };
    openProject();
    const experience = await waitUntil(() => {
      const activity = topActivity(device.deviceId);
      if (activity.includes('ErrorActivity')) throw new AndroidControllerError('EXPO_LOAD_FAILED', 'O Expo Go abriu a tela de erro ao carregar o projeto pelo Metro.');
      return activity.includes('host.exp.exponent') && activity.includes('ExperienceActivity') ? activity : null;
    }, 60_000);
    if (!experience) throw new AndroidControllerError('EXPO_START_TIMEOUT', 'O projeto React Native não ficou pronto no Expo Go em até 60 segundos.');
    // On a cold start Expo consumes the first URL to load the project before
    // React Native subscribes to Linking. Re-deliver it once the experience is
    // active so the bootstrap is handled on the first click in Channel Lab.
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_500));
    openProject();
    return { status: 'RUNNING', target, ...device, detail: 'Expo Go aberto no AVD com o bootstrap da jornada.' };
  }
  if (!available(flutter)) throw new AndroidControllerError('FLUTTER_NOT_FOUND', 'Flutter não encontrado no PATH do Emulator BFF.');
  run(adb, ['-s', device.deviceId, 'shell', 'am', 'force-stop', 'com.elasticjourney.elastic_journey_flutter_host']);
  const child = start(flutter, [
    'run', '-d', device.deviceId, '--no-pub',
    '--dart-define=EMULATOR_BFF_BASE_URL=http://127.0.0.1:18085/api/v1',
    `--dart-define=LAB_BOOTSTRAP_TOKEN=${bootstrapToken}`,
  ], resolve(workspaceRoot, 'apps/flutter-host'));
  const deadline = Date.now() + 180_000;
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
  if (!flutterPid) throw new AndroidControllerError('FLUTTER_START_FAILED', 'O Flutter não abriu no AVD em até 180 segundos. Consulte o log do Emulator BFF.');
  await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
  let flutterForeground = topActivity(device.deviceId).includes('com.elasticjourney.elastic_journey_flutter_host');
  if (!flutterForeground && runningPackage(device.deviceId, 'com.elasticjourney.elastic_journey_flutter_host')) {
    run(adb, ['-s', device.deviceId, 'shell', 'am', 'start', '-W', '-n', 'com.elasticjourney.elastic_journey_flutter_host/.MainActivity']);
    await new Promise((resolveWait) => setTimeout(resolveWait, 3_000));
    flutterForeground = topActivity(device.deviceId).includes('com.elasticjourney.elastic_journey_flutter_host');
  }
  if (!flutterForeground || !runningPackage(device.deviceId, 'com.elasticjourney.elastic_journey_flutter_host')) {
    throw new AndroidControllerError('FLUTTER_APP_STOPPED', 'O Flutter foi instalado, mas não permaneceu aberto no AVD. Consulte os logs [android] do BFF.');
  }
  return { status: 'RUNNING', target, ...device, detail: 'Flutter iniciado no AVD com o bootstrap da jornada.' };
}

export function launchAndroid(target: AndroidTarget, bootstrapToken: string): Promise<AndroidLaunchResult> {
  if (activeLaunch) throw new AndroidControllerError('ANDROID_BUSY', 'Já existe uma inicialização mobile em andamento.');
  activeLaunch = launch(target, bootstrapToken).finally(() => { activeLaunch = null; });
  return activeLaunch;
}
