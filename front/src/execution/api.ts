// Cliente dedicado ao ms-espec-registry (simulacoes/ms-espec-registry, porta 8083) — um serviço
// à parte do admin/back, sem sessão/token: só um wrapper fino da API do motor de runtime, por isso
// não usa o cliente autenticado de ../api/client.

const BASE_URL = 'http://localhost:8083/api/v1';

export class ExecutionApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ExecutionNetworkError extends Error {}

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
        throw new ExecutionNetworkError(
          'Não foi possível conectar ao ms-espec-registry (localhost:8083). Verifique se o serviço está rodando.',
        );
      }
      await delay(NETWORK_RETRY_DELAY_MS);
    }
  }
  response = response as Response;

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ExecutionApiError(response.status, body?.message ?? response.statusText);
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
  // Only set for a SERVICE_TASK with a REST connector: the URL actually called and the raw response.
  url: string | null;
  response: string | null;
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

export type BackendConnectorType = 'REST' | 'KAFKA' | 'EVENT_HUBS' | 'SERVICE_BUS';

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
  // REQ-03.12.001: {name, type} declarations, meaningful only on the START node — variables the
  // caller must supply when starting an instance (collected by JourneySearch before "Executar").
  startVariables: { name: string; type: string }[] | null;
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
  businessKey: string;
  flow: FlowBundle;
  step: StepResponse;
}

export interface VariableEntry {
  name: string;
  value: unknown;
  type: string;
}

// Same two prefixes BpmnTransformer (ms-transform-publication) writes into process variables for
// every REST-connector SERVICE_TASK (URL called / raw response, keyed per node) — technical, not
// meant to show up as a regular process variable in the "Variáveis" tab.
export const HTTP_URL_VAR_PREFIX = '__httpUrl__';
export const HTTP_RESPONSE_VAR_PREFIX = '__httpResponse__';

export function isInternalVariableName(name: string): boolean {
  return name.startsWith(HTTP_URL_VAR_PREFIX) || name.startsWith(HTTP_RESPONSE_VAR_PREFIX);
}

export function startInstance(journeyId: string, variables?: Record<string, unknown>): Promise<InstanceResponse> {
  return apiPost(`/journeys/${journeyId}/instances`, variables);
}

/** Diagrama da jornada sem iniciar instância — usado só pra descobrir o tipo do nó de início antes
 * de decidir entre o botão "Executar" e o painel de envio de mensagem (MESSAGE_START_EVENT). */
export function getJourneyFlow(journeyId: string): Promise<FlowBundle> {
  return apiGet(`/journeys/${journeyId}/flow`);
}

export function getCurrentStep(processInstanceId: string): Promise<StepResponse> {
  return apiGet(`/instances/${processInstanceId}/current-step`);
}

export function completeTask(
  processInstanceId: string,
  taskId: string,
  answers: Record<string, unknown>,
): Promise<StepResponse> {
  return apiPost(`/instances/${processInstanceId}/tasks/${taskId}/complete`, { answers });
}

// Chamada continua batendo em /simulate-step do ms-espec-registry (fora de escopo, não muda) —
// só o nome local reflete o que a UI oferece hoje: pular a etapa manualmente, fabricando o
// resultado, como alternativa à execução real (produção/consumo Kafka de verdade).
export function skipStep(processInstanceId: string): Promise<StepResponse> {
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

/** Publica de verdade no tópico Kafka do nó — usado pelo painel "Enviar mensagem" pra testar o
 * lado de consumo (RECEIVE_TASK/MESSAGE_START_EVENT) sem precisar de um produtor externo real. */
export function sendTestMessage(journeyId: string, nodeId: string, payload: Record<string, unknown>): Promise<void> {
  return apiPost(`/journeys/${journeyId}/nodes/${nodeId}/test-message`, payload);
}

/** Instância mais nova da jornada iniciada depois de `since` (ISO 8601) — undefined enquanto nada
 * apareceu ainda (204). Usado só depois de enviar uma mensagem de teste pra um MESSAGE_START_EVENT,
 * quando ainda não existe processInstanceId nenhum pra fazer polling em cima. */
export function getLatestInstance(journeyId: string, since: string): Promise<InstanceResponse | undefined> {
  return apiGet(`/journeys/${journeyId}/latest-instance?since=${encodeURIComponent(since)}`);
}
