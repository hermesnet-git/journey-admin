import type { ChannelType } from '@elastic-journey/journey-client';

export interface AdminJourneySummary {
  journeyId: string;
  productId: string;
  productName: string;
  channelTypes: ChannelType[];
  name: string;
  description: string | null;
  status: 'PUBLISHED';
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCatalogClientOptions {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
}

export class AdminCatalogError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminCatalogError';
    this.status = status;
  }
}

export class AdminCatalogClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly timeoutMs: number;
  private token: string | null = null;

  constructor(options: AdminCatalogClientOptions) {
    this.baseUrl = options.baseUrl;
    this.username = options.username;
    this.password = options.password;
    this.timeoutMs = options.timeoutMs;
  }

  async listPublishedJourneys(channelType: ChannelType | null, correlationId: string): Promise<AdminJourneySummary[]> {
    const params = new URLSearchParams({ status: 'PUBLISHED' });
    if (channelType) params.set('channelType', channelType);
    return this.authorizedGet<AdminJourneySummary[]>(`/journeys?${params}`, correlationId);
  }

  private async authorizedGet<T>(path: string, correlationId: string): Promise<T> {
    await this.ensureToken(correlationId);
    let response = await this.fetch(path, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.token}`,
        'x-correlation-id': correlationId,
      },
    });

    if (response.status === 401) {
      this.token = null;
      await this.ensureToken(correlationId);
      response = await this.fetch(path, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.token}`,
          'x-correlation-id': correlationId,
        },
      });
    }

    return this.readResponse<T>(response);
  }

  private async ensureToken(correlationId: string): Promise<void> {
    if (this.token) return;
    const response = await this.fetch('/auth/login', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    const body = await this.readResponse<{ token?: unknown }>(response);
    if (typeof body.token !== 'string' || !body.token) {
      throw new AdminCatalogError('O Admin Backend não retornou uma credencial de serviço válida.', 502);
    }
    this.token = body.token;
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    try {
      return await globalThis.fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new AdminCatalogError('Não foi possível acessar o Admin Backend.', 502);
    }
  }

  private async readResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json() as unknown
      : await response.text();
    if (!response.ok) {
      throw new AdminCatalogError(`O Admin Backend recusou a operação com HTTP ${response.status}.`, 502);
    }
    return body as T;
  }
}

