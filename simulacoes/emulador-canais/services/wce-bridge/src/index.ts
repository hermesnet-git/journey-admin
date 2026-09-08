import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server as SocketServer } from 'socket.io';
import {
  constructWebhookPayload,
  parseWhatsAppPayload,
  replyAsDisplayMessage,
  type StoredMessage,
  type WceReply,
} from './protocol.js';

const host = process.env.WCE_BRIDGE_HOST ?? '127.0.0.1';
const port = Number(process.env.WCE_BRIDGE_PORT ?? 13001);
const botWebhookUrl = process.env.WCE_BOT_WEBHOOK_URL ?? 'http://127.0.0.1:18085/api/whatsapp/v1/webhook';
const userPhone = process.env.WCE_USER_PHONE ?? '5511999999999';
const displayPhone = process.env.WCE_BUSINESS_PHONE ?? '5511000000000';
const allowedOrigins = new Set((process.env.WCE_UI_ORIGINS
  ?? 'http://localhost:15173,http://127.0.0.1:15173').split(',').map((value) => value.trim()).filter(Boolean));
const history: StoredMessage[] = [];
const maxBodyBytes = 1_048_576;

function setCors(request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('vary', 'Origin');
  }
  response.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
}

function json(response: ServerResponse, status: number, body: unknown): void {
  const value = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(value),
    'cache-control': 'no-store',
  });
  response.end(value);
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) throw new Error('Payload excede 1 MiB.');
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Payload JSON inválido.');
  return parsed as Record<string, unknown>;
}

function store(direction: 'in' | 'out', data: StoredMessage['data']): StoredMessage {
  const message = { id: randomUUID(), direction, data, timestamp: new Date().toISOString() };
  history.push(message);
  if (history.length > 500) history.shift();
  return message;
}

const server = createServer(async (request, response) => {
  setCors(request, response);
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/health') {
      json(response, 200, { status: 'UP', service: 'wce-bridge', historySize: history.length });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/messages') {
      json(response, 200, history);
      return;
    }
    if (request.method === 'DELETE' && url.pathname === '/messages') {
      history.length = 0;
      io.emit('ui_history', history);
      response.writeHead(204, { 'cache-control': 'no-store' }).end();
      return;
    }
    if (request.method === 'POST' && url.pathname === '/send-to-emulator') {
      const message = parseWhatsAppPayload(await readBody(request));
      store('out', message);
      io.emit('ui_message', message);
      json(response, 200, { status: 'ok', messageId: message.id });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/reply') {
      await processReply(await readBody(request));
      json(response, 200, { status: 'ok' });
      return;
    }
    json(response, 404, { status: 'error', message: 'Rota não encontrada no WCE Bridge.' });
  } catch (error) {
    json(response, 400, { status: 'error', message: error instanceof Error ? error.message : 'Falha ao processar mensagem.' });
  }
});

const io = new SocketServer(server, {
  cors: {
    origin: [...allowedOrigins],
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.emit('ui_history', history);
  socket.on('ui_reply', async (value: unknown) => {
    try {
      await processReply(value);
    } catch (error) {
      socket.emit('bridge_error', error instanceof Error ? error.message : 'Não foi possível entregar o webhook.');
    }
  });
});

async function processReply(value: unknown): Promise<void> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Resposta inválida.');
  const reply = value as WceReply;
  const display = replyAsDisplayMessage(reply);
  store('in', display);
  io.emit('ui_user_message', display);
  const response = await fetch(botWebhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(constructWebhookPayload(reply, userPhone, displayPhone)),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Webhook respondeu HTTP ${response.status}.`);
}

server.listen(port, host, () => {
  process.stdout.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'wce-bridge',
    message: 'WCE Bridge iniciado',
    host,
    port,
    botWebhookUrl,
  })}\n`);
});

function shutdown(signal: string): void {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', service: 'wce-bridge', message: 'Encerrando WCE Bridge', signal })}\n`);
  io.close(() => server.close());
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
