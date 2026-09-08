import type {
  AdminJourneySummary,
  AndroidLaunchResult,
  ChannelType,
  FlowBundle,
  LabBootstrap,
  LabTarget,
  WhatsAppSessionSummary,
} from './types.js';

export const BFF_ORIGIN = (import.meta.env.VITE_EMULATOR_BFF_ORIGIN ?? 'http://127.0.0.1:18085').replace(/\/$/, '');

export class LabApiError extends Error {
  constructor(message: string, readonly status: number, readonly correlationId?: string) {
    super(message);
    this.name = 'LabApiError';
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  let response: Response;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    response = await fetch(`${BFF_ORIGIN}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new LabApiError('Não foi possível acessar o Emulator BFF.', 503);
  }
  if (response.status === 204) return undefined as T;
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await response.json() as unknown
    : await response.text();
  if (!response.ok) {
    const problem = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    throw new LabApiError(
      String(problem.detail ?? problem.title ?? `Emulator BFF respondeu HTTP ${response.status}.`),
      response.status,
      (response.headers.get('x-correlation-id') ?? String(problem.correlationId ?? '')) || undefined,
    );
  }
  return body as T;
}

async function longRequest<T>(path: string, init: RequestInit): Promise<T> {
  return request(path, init, 240_000);
}

export const labApi = {
  async health(): Promise<boolean> {
    const result = await request<{ status?: string }>('/health');
    return result.status === 'UP';
  },

  listJourneys(channel: ChannelType, signal?: AbortSignal): Promise<AdminJourneySummary[]> {
    return request(`/api/lab/v1/journeys?channelType=${encodeURIComponent(channel)}`, { signal });
  },

  getFlow(journeyId: string, signal?: AbortSignal): Promise<FlowBundle> {
    return request(`/api/v1/journeys/${encodeURIComponent(journeyId)}/flow`, { signal });
  },

  createBootstrap(
    journeyId: string,
    target: Exclude<LabTarget, 'whatsapp.wce'>,
    variables: Record<string, unknown>,
  ): Promise<LabBootstrap> {
    return request('/api/lab/v1/bootstraps', {
      method: 'POST',
      body: JSON.stringify({ journeyId, target, variables }),
    });
  },

  launchAndroid(target: 'react.mobile' | 'flutter.mobile', bootstrapToken: string): Promise<AndroidLaunchResult> {
    return longRequest('/api/lab/v1/android/launch', {
      method: 'POST',
      body: JSON.stringify({ target, bootstrapToken }),
    });
  },

  startWhatsApp(journeyId: string, from: string, variables: Record<string, unknown>): Promise<WhatsAppSessionSummary> {
    return request('/api/whatsapp/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({ journeyId, from, variables }),
    });
  },

  stopWhatsApp(from: string): Promise<void> {
    return request(`/api/whatsapp/v1/sessions/${encodeURIComponent(from)}`, { method: 'DELETE' });
  },
};
