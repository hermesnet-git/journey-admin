// Cliente dedicado ao ms-espec-registry (simulacoes/ms-espec-registry, porta 8083) — um serviço
// à parte do admin/back, sem sessão/token: só um wrapper fino da API do Camunda, por isso não usa
// o cliente autenticado de ../api/client.

const BASE_URL = 'http://localhost:8083/api/v1';

export class SimulationApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class SimulationNetworkError extends Error {}

const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  };

  let response: Response | undefined;
  for (let attempt = 1; attempt <= NETWORK_RETRY_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`${BASE_URL}${path}`, requestInit);
      break;
    } catch {
      if (attempt === NETWORK_RETRY_ATTEMPTS) {
        throw new SimulationNetworkError(
          'Não foi possível conectar ao ms-espec-registry (localhost:8083). Verifique se o serviço está rodando.',
        );
      }
      await delay(NETWORK_RETRY_DELAY_MS);
    }
  }
  response = response as Response;

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new SimulationApiError(response.status, body?.message ?? response.statusText);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export interface JourneySummary {
  journeyId: string;
  name: string;
  description: string | null;
  productName: string;
  channelName: string;
}

export type SduiNode = [tag: string, props: Record<string, unknown>, children: SduiNode[]];

export interface FormPayload {
  id: string;
  name: string;
  description: string | null;
  sdui: SduiNode;
}

export interface TrailEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

export interface StepResponse {
  type: 'USER_TASK' | 'WAITING' | 'ENDED';
  taskId: string | null;
  nodeId: string | null;
  nodeName: string | null;
  nodeType: string | null;
  form: FormPayload | null;
  trail: TrailEntry[];
  errorNodeId: string | null;
  errorNodeName: string | null;
  errorMessage: string | null;
}

export type BackendConnectorType = 'REST' | 'KAFKA';

export interface ConnectorConfigInfo {
  connectorType: BackendConnectorType;
  config: Record<string, unknown> | null;
}

export type BackendNodeType =
  | 'START'
  | 'USER_TASK'
  | 'END'
  | 'SERVICE_TASK'
  | 'RECEIVE_TASK'
  | 'MESSAGE_START_EVENT'
  | 'GATEWAY';

export interface FlowNodeInfo {
  id: string;
  type: BackendNodeType;
  name: string;
  positionX: number;
  positionY: number;
  formId: string | null;
  connectorConfig: ConnectorConfigInfo | null;
}

export interface FlowConnectionInfo {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: string | null;
  isDefault: boolean;
}

export interface FlowBundle {
  channelType: 'WEB' | 'MOBILE' | string;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
}

export interface InstanceResponse {
  processInstanceId: string;
  flow: FlowBundle;
  step: StepResponse;
}

export interface VariableEntry {
  name: string;
  value: unknown;
  type: string;
}

export function listJourneys(): Promise<JourneySummary[]> {
  return apiGet('/journeys');
}

export function startInstance(journeyId: string): Promise<InstanceResponse> {
  return apiPost(`/journeys/${journeyId}/instances`);
}

export function completeTask(
  processInstanceId: string,
  taskId: string,
  answers: Record<string, unknown>,
): Promise<StepResponse> {
  return apiPost(`/instances/${processInstanceId}/tasks/${taskId}/complete`, { answers });
}

export function simulateStep(processInstanceId: string): Promise<StepResponse> {
  return apiPost(`/instances/${processInstanceId}/simulate-step`);
}

export function getVariables(processInstanceId: string): Promise<VariableEntry[]> {
  return apiGet(`/instances/${processInstanceId}/variables`);
}

export function setVariable(
  processInstanceId: string,
  name: string,
  value: unknown,
  type: string,
): Promise<VariableEntry[]> {
  return apiPut(`/instances/${processInstanceId}/variables/${encodeURIComponent(name)}`, { value, type });
}
