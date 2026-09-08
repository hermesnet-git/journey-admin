import type {
  ChannelType,
  CompleteTaskRequest,
  FlowBundle,
  JourneyInstance,
  JourneyStep,
  ProblemDetails,
} from './types.js';

export interface JourneyClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  defaultHeaders?: HeadersInit;
}

export interface RequestOptions {
  signal?: AbortSignal;
  correlationId?: string;
}

export class JourneyClientError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(message: string, status: number, problem: ProblemDetails | null) {
    super(message);
    this.name = 'JourneyClientError';
    this.status = status;
    this.problem = problem;
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

interface ManagedSignal {
  signal: AbortSignal;
  timedOut: () => boolean;
  cleanup: () => void;
}

function requestSignal(timeoutMs: number, callerSignal?: AbortSignal): ManagedSignal {
  const controller = new AbortController();
  let timeoutReached = false;
  const abortFromCaller = (): void => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timeoutReached = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timeoutReached,
    cleanup: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

export class JourneyClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly defaultHeaders: HeadersInit;

  constructor(options: JourneyClientOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  getFlow(journeyId: string, options?: RequestOptions): Promise<FlowBundle> {
    return this.request(`/journeys/${encodeURIComponent(journeyId)}/flow`, { method: 'GET' }, options);
  }

  startJourney(
    journeyId: string,
    channelType: ChannelType,
    variables: Record<string, unknown> = {},
    options?: RequestOptions,
  ): Promise<JourneyInstance> {
    return this.request(
      `/journeys/${encodeURIComponent(journeyId)}/instances?channelType=${encodeURIComponent(channelType)}`,
      { method: 'POST', body: JSON.stringify(variables) },
      options,
    );
  }

  getCurrentStep(processInstanceId: string, options?: RequestOptions): Promise<JourneyStep> {
    return this.request(`/instances/${encodeURIComponent(processInstanceId)}/current-step`, { method: 'GET' }, options);
  }

  completeTask(
    processInstanceId: string,
    taskId: string,
    request: CompleteTaskRequest,
    options?: RequestOptions,
  ): Promise<JourneyStep> {
    return this.request(
      `/instances/${encodeURIComponent(processInstanceId)}/tasks/${encodeURIComponent(taskId)}/complete`,
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
  }

  async stopInstance(processInstanceId: string, options?: RequestOptions): Promise<void> {
    await this.request(`/instances/${encodeURIComponent(processInstanceId)}`, { method: 'DELETE' }, options);
  }

  private async request<T>(path: string, init: RequestInit, options?: RequestOptions): Promise<T> {
    const managedSignal = requestSignal(this.timeoutMs, options?.signal);
    let response: Response;
    try {
      const fetchImplementation = this.fetchImplementation;
      response = await fetchImplementation(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...this.defaultHeaders,
          ...(options?.correlationId ? { 'x-correlation-id': options.correlationId } : {}),
          ...init.headers,
        },
        signal: managedSignal.signal,
      });
    } catch (cause) {
      const message = managedSignal.timedOut()
        ? `Tempo limite de ${this.timeoutMs} ms excedido ao acessar o serviço de jornadas.`
        : 'Não foi possível acessar o serviço de jornadas.';
      throw new JourneyClientError(message, 503, null);
    } finally {
      managedSignal.cleanup();
    }

    if (response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json() as unknown
      : await response.text();

    if (!response.ok) {
      const problem = typeof body === 'object' && body !== null ? body as ProblemDetails : null;
      const message = problem?.detail ?? problem?.title ?? `O serviço de jornadas respondeu HTTP ${response.status}.`;
      throw new JourneyClientError(String(message), response.status, problem);
    }

    return body as T;
  }
}
