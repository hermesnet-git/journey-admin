const BASE_URL = 'http://localhost:8080/api/v1';

const SESSION_KEY = 'journey-admin-session';

export class ApiClientError extends Error {
  status: number;
  details?: { field: string; code: string; message: string }[];

  constructor(status: number, message: string, details?: { field: string; code: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {}

let onUnauthorized: (() => void) | null = null;

/** Registered by AuthContext so a 401 response can clear the session and show the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
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
    throw new ApiClientError(response.status, body?.message ?? response.statusText, body?.details ?? undefined);
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
