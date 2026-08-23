const BASE_URL = 'http://localhost:8081/api/v1';

const SESSION_KEY = 'journey-admin-session';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: { field: string; code: string; message: string }[];

  constructor(status: number, message: string, code?: string, details?: { field: string; code: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {}

let onUnauthorized: (() => void) | null = null;

/** Registered by AuthContext so a 401 response can clear the session and show the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export interface ServerErrorInfo {
  status: number;
  code?: string;
  message: string;
  path?: string;
}

let onServerError: ((info: ServerErrorInfo) => void) | null = null;

/** Registered by AppErrorBoundary so a 5xx response shows a full-screen application-error notice. */
export function setServerErrorHandler(handler: ((info: ServerErrorInfo) => void) | null) {
  onServerError = handler;
}

/** Manually routes a caught error through that same notice — for a caller whose action failed with
 * a status < 500 (so the automatic trigger below never fired) but still wants the full technical
 * detail box instead of an inline message, e.g. a runtime/infra failure the backend correctly
 * reports as 422 (content rejected) rather than an outage, but that's just as opaque to fix inline. */
export function reportServerError(info: ServerErrorInfo) {
  onServerError?.(info);
}

export function getStoredToken(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token: string }).token;
  } catch {
    return null;
  }
}

const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const requestInit: RequestInit = {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  };

  let response: Response | undefined;
  for (let attempt = 1; attempt <= NETWORK_RETRY_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`${BASE_URL}${path}`, requestInit);
      break;
    } catch (err) {
      if (attempt === NETWORK_RETRY_ATTEMPTS) {
        throw new NetworkError('Não foi possível conectar ao servidor. Tente novamente em instantes.');
      }
      await delay(NETWORK_RETRY_DELAY_MS);
    }
  }
  response = response as Response;

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    const body = await response.json().catch(() => null);
    if (response.status >= 500) {
      onServerError?.({
        status: response.status,
        code: body?.code,
        message: body?.message ?? response.statusText,
        path: body?.path ?? path,
      });
    }
    throw new ApiClientError(response.status, body?.message ?? response.statusText, body?.code, body?.details ?? undefined);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// POST que consome uma resposta text/event-stream (SSE) linha a linha, chamando onEvent pra cada
// bloco "event: X\ndata: Y" recebido — usado pelo "Gerar com IA" do flow-designer, que pode levar
// várias tentativas e quer mostrar o progresso ao vivo em vez de só esperar o resultado final.
export async function apiPostSse(
  path: string,
  body: unknown,
  onEvent: (event: string, data: string) => void,
): Promise<void> {
  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError('Não foi possível conectar ao servidor. Tente novamente em instantes.');
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    const errBody = await response.json().catch(() => null);
    if (response.status >= 500) {
      onServerError?.({
        status: response.status,
        code: errBody?.code,
        message: errBody?.message ?? response.statusText,
        path,
      });
    }
    throw new ApiClientError(response.status, errBody?.message ?? response.statusText, errBody?.code, errBody?.details ?? undefined);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new NetworkError('Resposta do servidor sem corpo.');
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIndex: number;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) onEvent(eventName, dataLines.join('\n'));
    }
  }
}
