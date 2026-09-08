import { connect } from 'node:net';
import { currentDeviceSummary, metroAvailable, packageInstalled } from './android-controller.js';

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

// Só abre e fecha a conexão TCP, sem enviar requisição HTTP: usada para
// serviços cujo log de acesso registraria a URL base sem rota mapeada
// (admin loga INFO com status=401, ms-journey loga ERROR "inesperado") —
// uma requisição HTTP de verdade nessa URL geraria isso a cada 30s do
// auto-refresh do painel de status.
async function tcpReachable(url: string, timeoutMs = 2_500): Promise<boolean> {
  const { hostname, port, protocol } = new URL(url);
  const resolvedPort = port ? Number(port) : protocol === 'https:' ? 443 : 80;
  return new Promise((resolvePromise) => {
    const socket = connect({ host: hostname, port: resolvedPort, timeout: timeoutMs });
    const finish = (result: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePromise(result);
    };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export async function getLabStatus(input: LabStatusInput): Promise<LabStatus> {
  const [adminUp, journeyUp, wceBridgeUp, metroUp] = await Promise.all([
    tcpReachable(input.adminBaseUrl),
    tcpReachable(input.journeyBaseUrl),
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
