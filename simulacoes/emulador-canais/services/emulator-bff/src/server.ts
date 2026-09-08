import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  CHANNEL_TYPES,
  JourneyClient,
  JourneyClientError,
  type ChannelType,
} from '@elastic-journey/journey-client';
import type { BffConfig } from './config.js';
import { AdminCatalogClient, AdminCatalogError } from './admin-catalog.js';
import { WhatsAppSessionManager } from './whatsapp.js';
import { LAB_TARGETS, LabBootstrapStore, type LabTarget } from './lab-bootstrap.js';
import { AndroidControllerError, getEmulatorHardwareConfig, launchAndroid, setEmulatorHardwareConfig, type AndroidTarget } from './android-controller.js';
import { getLabStatus } from './lab-status.js';

const MAX_BODY_BYTES = 1_048_576;

interface ApiProblem {
  status: number;
  code: string;
  title: string;
  detail: string;
  correlationId: string;
  timestamp: string;
}

class RequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function setCors(request: IncomingMessage, response: ServerResponse, config: BffConfig): void {
  const origin = request.headers.origin;
  if (origin && config.corsOrigins.has(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('vary', 'Origin');
  }
  response.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type,x-correlation-id');
  response.setHeader('access-control-expose-headers', 'x-correlation-id');
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const serialized = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(serialized),
    'cache-control': 'no-store',
  });
  response.end(serialized);
}

function sendEmpty(response: ServerResponse, status = 204): void {
  response.writeHead(status, { 'cache-control': 'no-store' });
  response.end();
}

async function readJsonObject(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > MAX_BODY_BYTES) throw new RequestError(413, 'REQUEST_TOO_LARGE', 'O corpo da requisição excede 1 MiB.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new RequestError(400, 'JSON_OBJECT_REQUIRED', 'O corpo JSON deve ser um objeto.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'INVALID_JSON', 'O corpo da requisição não contém JSON válido.');
  }
}

function requireChannelType(url: URL): ChannelType {
  const channelType = url.searchParams.get('channelType')?.toUpperCase();
  if (!channelType || !CHANNEL_TYPES.includes(channelType as ChannelType)) {
    throw new RequestError(400, 'CHANNEL_TYPE_INVALID', `channelType deve ser um de: ${CHANNEL_TYPES.join(', ')}.`);
  }
  return channelType as ChannelType;
}

function match(pathname: string, pattern: RegExp): string[] | null {
  const result = pattern.exec(pathname);
  return result ? result.slice(1).map(decodeURIComponent) : null;
}

function sanitizedLogPath(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const pathname = rawUrl.split('?')[0];
  return pathname
    ?.replace(/^\/api\/lab\/v1\/bootstraps\/[^/]+$/, '/api/lab/v1/bootstraps/:token')
    .replace(/^\/api\/whatsapp\/v1\/sessions\/[^/]+$/, '/api/whatsapp/v1/sessions/:from');
}

function problemFrom(error: unknown, correlationId: string): ApiProblem {
  if (error instanceof RequestError) {
    return {
      status: error.status,
      code: error.code,
      title: 'Requisição inválida',
      detail: error.message,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
  if (error instanceof JourneyClientError) {
    const upstreamIsClientError = error.status >= 400 && error.status < 500;
    return {
      status: upstreamIsClientError ? error.status : 502,
      code: upstreamIsClientError ? 'JOURNEY_REQUEST_REJECTED' : 'JOURNEY_SERVICE_UNAVAILABLE',
      title: upstreamIsClientError ? 'Operação recusada pelo serviço de jornadas' : 'Serviço de jornadas indisponível',
      detail: upstreamIsClientError ? error.message : 'Não foi possível concluir a operação no ms-journey.',
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
  if (error instanceof AdminCatalogError) {
    return {
      status: error.status,
      code: 'ADMIN_CATALOG_UNAVAILABLE',
      title: 'Catálogo administrativo indisponível',
      detail: error.message,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
  if (error instanceof AndroidControllerError) {
    const status = error.code === 'ANDROID_BUSY' ? 409 : error.code === 'EMULATOR_CONFIG_INVALID' ? 400 : 503;
    return {
      status,
      code: error.code,
      title: status === 400 ? 'Configuração de emulador inválida' : 'Não foi possível iniciar o canal mobile',
      detail: error.message,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    title: 'Erro interno',
    detail: 'O BFF não conseguiu concluir a operação.',
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

export function createBffServer(config: BffConfig): Server {
  const journey = new JourneyClient({
    baseUrl: config.journeyBaseUrl,
    timeoutMs: config.journeyTimeoutMs,
  });
  const adminCatalog = new AdminCatalogClient({
    baseUrl: config.adminBaseUrl,
    timeoutMs: config.adminTimeoutMs,
    username: config.adminServiceUsername,
    password: config.adminServicePassword,
  });
  const whatsapp = new WhatsAppSessionManager(
    journey,
    config.wceBridgeBaseUrl,
    config.wceBridgeTimeoutMs,
  );
  const labBootstraps = new LabBootstrapStore(config.labBootstrapTtlMs);

  return createServer(async (request, response) => {
    const correlationId = request.headers['x-correlation-id']?.toString() || randomUUID();
    response.setHeader('x-correlation-id', correlationId);
    setCors(request, response, config);

    if (request.method === 'OPTIONS') {
      sendEmpty(response);
      return;
    }

    const startedAt = performance.now();
    let responseStatus = 200;
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { status: 'UP', service: 'emulator-bff' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/lab/v1/journeys') {
        const requestedChannel = url.searchParams.get('channelType');
        const channelType = requestedChannel ? requireChannelType(url) : null;
        sendJson(response, 200, await adminCatalog.listPublishedJourneys(channelType, correlationId));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/lab/v1/bootstraps') {
        const body = await readJsonObject(request);
        const journeyId = typeof body.journeyId === 'string' ? body.journeyId.trim() : '';
        const target = typeof body.target === 'string' ? body.target : '';
        const variables = body.variables;
        if (!journeyId || !LAB_TARGETS.includes(target as LabTarget)) {
          throw new RequestError(400, 'LAB_BOOTSTRAP_INVALID', `journeyId e target (${LAB_TARGETS.join(', ')}) são obrigatórios.`);
        }
        if (typeof variables !== 'object' || variables === null || Array.isArray(variables)) {
          throw new RequestError(400, 'LAB_BOOTSTRAP_VARIABLES_INVALID', 'variables deve ser um objeto.');
        }
        sendJson(response, 201, labBootstraps.create(journeyId, target as LabTarget, variables as Record<string, unknown>));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/lab/v1/android/launch') {
        const body = await readJsonObject(request);
        const target = typeof body.target === 'string' ? body.target : '';
        const bootstrapToken = typeof body.bootstrapToken === 'string' ? body.bootstrapToken.trim() : '';
        if (!['react.mobile', 'flutter.mobile'].includes(target) || !bootstrapToken) {
          throw new RequestError(400, 'ANDROID_LAUNCH_INVALID', 'target mobile e bootstrapToken são obrigatórios.');
        }
        const bootstrap = labBootstraps.get(bootstrapToken);
        if (!bootstrap) {
          throw new RequestError(404, 'LAB_BOOTSTRAP_NOT_FOUND', 'Bootstrap inexistente ou expirado.');
        }
        if (bootstrap.target !== target) {
          throw new RequestError(409, 'LAB_BOOTSTRAP_TARGET_MISMATCH', `O bootstrap pertence ao alvo ${bootstrap.target}.`);
        }
        sendJson(response, 200, await launchAndroid(target as AndroidTarget, bootstrapToken, {
          avdBootMs: config.androidAvdBootTimeoutMs,
          expoReadyMs: config.androidExpoReadyTimeoutMs,
          flutterReadyMs: config.androidFlutterReadyTimeoutMs,
        }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/lab/v1/android/emulator-config') {
        sendJson(response, 200, getEmulatorHardwareConfig());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/lab/v1/android/emulator-config') {
        const body = await readJsonObject(request);
        const ramMb = Number(body.ramMb);
        const cpuCores = Number(body.cpuCores);
        sendJson(response, 200, setEmulatorHardwareConfig(ramMb, cpuCores));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/lab/v1/status') {
        sendJson(response, 200, await getLabStatus({
          adminBaseUrl: config.adminBaseUrl,
          journeyBaseUrl: config.journeyBaseUrl,
          wceBridgeBaseUrl: config.wceBridgeBaseUrl,
        }));
        return;
      }

      const labBootstrap = match(url.pathname, /^\/api\/lab\/v1\/bootstraps\/([^/]+)$/);
      if (request.method === 'GET' && labBootstrap) {
        const entry = labBootstraps.get(labBootstrap[0]!);
        if (!entry) throw new RequestError(404, 'LAB_BOOTSTRAP_NOT_FOUND', 'Bootstrap inexistente ou expirado.');
        sendJson(response, 200, entry);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/whatsapp/v1/sessions') {
        const body = await readJsonObject(request);
        const journeyId = typeof body.journeyId === 'string' ? body.journeyId.trim() : '';
        const from = typeof body.from === 'string' ? body.from.trim() : '';
        const variables = body.variables;
        if (!journeyId || !from) throw new RequestError(400, 'WHATSAPP_SESSION_INVALID', 'journeyId e from são obrigatórios.');
        if (variables != null && (typeof variables !== 'object' || Array.isArray(variables))) {
          throw new RequestError(400, 'WHATSAPP_VARIABLES_INVALID', 'variables deve ser um objeto.');
        }
        sendJson(response, 201, await whatsapp.start({
          journeyId,
          from,
          variables: variables as Record<string, unknown> | undefined,
        }));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/whatsapp/v1/webhook') {
        await whatsapp.receiveWebhook(await readJsonObject(request));
        sendEmpty(response);
        return;
      }

      const whatsappSession = match(url.pathname, /^\/api\/whatsapp\/v1\/sessions\/([^/]+)$/);
      if (request.method === 'DELETE' && whatsappSession) {
        await whatsapp.stop(whatsappSession[0]!);
        sendEmpty(response);
        return;
      }

      const flow = match(url.pathname, /^\/api\/v1\/journeys\/([^/]+)\/flow$/);
      if (request.method === 'GET' && flow) {
        sendJson(response, 200, await journey.getFlow(flow[0]!, { correlationId }));
        return;
      }

      const start = match(url.pathname, /^\/api\/v1\/journeys\/([^/]+)\/instances$/);
      if (request.method === 'POST' && start) {
        const variables = await readJsonObject(request);
        sendJson(response, 201, await journey.startJourney(start[0]!, requireChannelType(url), variables, { correlationId }));
        return;
      }

      const currentStep = match(url.pathname, /^\/api\/v1\/instances\/([^/]+)\/current-step$/);
      if (request.method === 'GET' && currentStep) {
        sendJson(response, 200, await journey.getCurrentStep(currentStep[0]!, { correlationId }));
        return;
      }

      const complete = match(url.pathname, /^\/api\/v1\/instances\/([^/]+)\/tasks\/([^/]+)\/complete$/);
      if (request.method === 'POST' && complete) {
        const body = await readJsonObject(request);
        const answers = body.answers;
        if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
          throw new RequestError(400, 'ANSWERS_REQUIRED', "O corpo deve conter o objeto 'answers'.");
        }
        sendJson(response, 200, await journey.completeTask(complete[0]!, complete[1]!, { answers: answers as Record<string, unknown> }, { correlationId }));
        return;
      }

      const stop = match(url.pathname, /^\/api\/v1\/instances\/([^/]+)$/);
      if (request.method === 'DELETE' && stop) {
        await journey.stopInstance(stop[0]!, { correlationId });
        sendEmpty(response);
        return;
      }

      throw new RequestError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada no Emulator BFF.');
    } catch (error) {
      const problem = problemFrom(error, correlationId);
      responseStatus = problem.status;
      sendJson(response, problem.status, problem);
    } finally {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: responseStatus >= 500 ? 'error' : 'info',
        service: 'emulator-bff',
        method: request.method,
        path: sanitizedLogPath(request.url),
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        correlationId,
      };
      process.stdout.write(`${JSON.stringify(logEntry)}\n`);
    }
  });
}
