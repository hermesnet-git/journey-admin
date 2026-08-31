// Cliente dedicado ao ms-espec-registry (simulacoes/ms-espec-registry, porta 8083) — um serviço
// à parte do admin/back, sem sessão/token: só um wrapper fino da API do motor de runtime, por isso
// não usa o cliente autenticado de ../api/client.

const BASE_URL = 'http://localhost:8083/api/v1';

export class ExecutionApiError extends Error {
  status: number;
  code?: string;
  // Só presente quando code é SYNCHRONOUS_CHAIN_JSONPATH_FAILURE — GlobalExceptionHandler
  // (ms-espec-registry) já roda o StartFailureDiagnostic antes de responder, então o nó/campo
  // culpado (ou as suspeitas) chegam nesta mesma resposta de erro.
  diagnosis?: DiagnosisResult;

  constructor(status: number, message: string, code?: string, diagnosis?: DiagnosisResult) {
    super(message);
    this.status = status;
    this.code = code;
    this.diagnosis = diagnosis;
  }
}

export class ExecutionNetworkError extends Error {}

const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ApiCallLogEntry {
  method: string;
  path: string;
  status?: number;
  error?: string;
  // Cabeçalhos/corpo de fato enviados — pra quem está lendo o log poder ver a configuração exata
  // usada em cada chamada (ex.: o payload de um POST /instances), não só o resultado.
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  // Corpo da resposta — sem isso, um GET de polling (ex.: current-step) só mostrava "→ 200" sem
  // nenhum jeito de ver o que voltou, mesmo quando é exatamente isso que se quer conferir.
  responseBody?: unknown;
}

let onApiCall: ((entry: ApiCallLogEntry) => void) | null = null;

/** Registered by ExecutionsPage (before a run starts) and ExecutionWorkspace (once one is running)
 * so every call this client makes — every ms-espec-registry integration the front does — shows up
 * in the Log tab, not just the curated business-level entries (`appendLog`) already sprinkled
 * through ExecutionWorkspace's handlers. Only one of the two is ever registered at a time. */
export function setApiCallLogger(handler: ((entry: ApiCallLogEntry) => void) | null) {
  onApiCall = handler;
}

// GET .../variables só alimenta a aba Variáveis (chamada a cada passo pra refletir o que a jornada
// gravou) — não é uma etapa da execução em si, então fica de fora do log de integrações.
export function shouldLogApiCall(entry: ApiCallLogEntry): boolean {
  return !(entry.method === 'GET' && entry.path.endsWith('/variables'));
}

export function formatApiCallLog(entry: ApiCallLogEntry): { message: string; isError: boolean } {
  const outcome = entry.error ? entry.error : String(entry.status);
  const isError = !!entry.error || (entry.status !== undefined && entry.status >= 400);
  return { message: `${entry.method} ${entry.path} → ${outcome}`, isError };
}

/** Monta o bloco de detalhe (mesmo formato JSON-com-"Copiar" que outras entradas do log já usam)
 * com a configuração de fato usada na chamada — cabeçalhos e corpo, quando existem. undefined
 * quando não há nada além de method/path/status (ex.: um GET simples sem corpo). */
export function apiCallLogData(entry: ApiCallLogEntry): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  if (entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0) data.requestHeaders = entry.requestHeaders;
  if (entry.requestBody !== undefined) data.requestBody = entry.requestBody;
  if (entry.responseBody !== undefined) data.responseBody = entry.responseBody;
  return Object.keys(data).length > 0 ? data : undefined;
}

// `Date` só tem precisão de milissegundo (JS não expõe microssegundo de verdade) — por isso 3
// dígitos, não 6. toLocaleTimeString não tem opção de casas decimais, daí a formatação manual.
// Compartilhado entre ExecutionsPage (log de antes da instância existir) e ExecutionWorkspace (log
// de durante a execução) — mesmo formato dos dois lados de uma única linha de tempo.
export function now(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

// Corpo já chega aqui como string JSON (todo apiPost/apiPut/apiDelete já faz JSON.stringify antes
// de passar pra request) — reconstitui pra objeto só pra exibição no log; se não for JSON por algum
// motivo, mostra a string crua em vez de esconder o valor.
function parseBodyForLog(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string' || body.length === 0) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  // Todo chamador deste módulo passa headers como objeto simples (nunca Headers/array de tuplas),
  // então o cast é seguro — só estreita o tipo largo de RequestInit['headers'] pro que de fato é usado.
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const requestInit: RequestInit = { ...init, headers: requestHeaders };
  const requestBody = parseBodyForLog(init?.body);

  let response: Response | undefined;
  for (let attempt = 1; attempt <= NETWORK_RETRY_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`${BASE_URL}${path}`, requestInit);
      break;
    } catch {
      if (attempt === NETWORK_RETRY_ATTEMPTS) {
        onApiCall?.({ method, path, error: 'não foi possível conectar', requestHeaders, requestBody });
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
    onApiCall?.({ method, path, status: response.status, requestHeaders, requestBody, responseBody: body });
    throw new ExecutionApiError(response.status, body?.message ?? response.statusText, body?.code, body?.diagnosis);
  }
  // Lê o corpo uma única vez (stream só dá pra consumir uma vez) — o mesmo valor alimenta o retorno
  // real da chamada e o log, em vez de um response.json() duplicado que quebraria a segunda leitura.
  const responseBody = response.status === 204 || response.headers.get('content-length') === '0' ? undefined : await response.json();
  onApiCall?.({ method, path, status: response.status, requestHeaders, requestBody, responseBody });
  return responseBody as T;
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

function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export interface JourneySummary {
  journeyId: string;
  name: string;
  description: string | null;
  productName: string;
  channelName: string;
  publishedVersionNumber: number | null;
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
  // Method is always set alongside url; headers/body come null when the connector had none configured
  // (e.g. a GET with no custom headers) — the log then simply omits that field, matching the request.
  method: string | null;
  requestHeaders: string | null;
  requestBody: string | null;
  // Only set for a SERVICE_TASK with a Kafka connector: the topic and payload actually published.
  kafkaTopic: string | null;
  kafkaPayload: string | null;
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
  // Configuração completa (tipo + config bruta) do nó que falhou, salva no fluxo — mostrada no log
  // como o mesmo bloco JSON (com "Copiar") que as respostas de User Task já usam.
  errorConnectorConfig: ConnectorConfigInfo | null;
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
  connectorConfig: ConnectorConfigInfo | null;
  // REQ-03.12.001: {name, type} declarations, meaningful only on the START node — variables the
  // caller must supply when starting an instance (collected by StartPanel before "Executar").
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
  // Ligado quando a execução foi iniciada com "controlar mensagens Kafka manualmente" marcado — o
  // worker automático (KafkaBridgeScheduler) nunca publica sozinho pelos Service Tasks Kafka desta
  // instância, é preciso chamar sendKafkaMessage. Decidido só no início (ver startInstance) porque o
  // worker roda em background sem saber que esta tela está olhando um passo específico.
  manualKafkaControl: boolean;
}

export interface VariableEntry {
  name: string;
  value: unknown;
  type: string;
}

// Written by KafkaMessagePublisher.completionVariables (ms-espec-registry) at PROCESS scope on
// purpose (the Kafka worker completes asynchronously, needs to communicate topic/payload back to the
// process) — technical, not meant to show up as a regular process variable in the "Variáveis" tab.
// REST's equivalent (url/method/headers/payload/response) never needs this: HttpConnectorDelegate
// (ms-runtime-camunda) writes those as variables LOCAL to the node's own activity instance, which
// ms-espec-registry's CamundaClient.getHistoricProcessVariables already filters out by scope before
// this ever reaches the front — no reserved naming needed for REST.
export const KAFKA_TOPIC_VAR_PREFIX = '__kafkaTopic__';
export const KAFKA_PAYLOAD_VAR_PREFIX = '__kafkaPayload__';

export function isInternalVariableName(name: string): boolean {
  return name.startsWith(KAFKA_TOPIC_VAR_PREFIX) || name.startsWith(KAFKA_PAYLOAD_VAR_PREFIX);
}

/** Resultado do replay (StartFailureDiagnostic, ms-espec-registry) da cadeia síncrona da jornada
 * (Início até o primeiro checkpoint) contra as integrações REST de verdade — anexado por
 * GlobalExceptionHandler direto na resposta de erro do POST .../instances quando ele falha com o
 * código SYNCHRONOUS_CHAIN_JSONPATH_FAILURE, então chega já resolvido em ExecutionApiError.diagnosis. */
export interface DiagnosisResult {
  confirmed: boolean;
  nodeId: string | null;
  nodeName: string | null;
  field: string | null;
  jsonPath: string | null;
  reason: string | null;
  responseSnippet: string | null;
  suspectNodeNames: string[];
}

export function startInstance(
  journeyId: string,
  variables?: Record<string, unknown>,
  manualKafkaControl?: boolean,
): Promise<InstanceResponse> {
  const qs = manualKafkaControl ? '?manualKafkaControl=true' : '';
  return apiPost(`/journeys/${journeyId}/instances${qs}`, variables);
}

/** Diagrama da jornada sem iniciar instância — usado só pra descobrir o tipo do nó de início antes
 * de decidir entre o botão "Executar" e o painel de envio de mensagem (MESSAGE_START_EVENT). */
export function getJourneyFlow(journeyId: string): Promise<FlowBundle> {
  return apiGet(`/journeys/${journeyId}/flow`);
}

// `since` (ISO 8601) opcional: quando presente, o backend inclui a trilha do que o worker
// automático rodou sozinho desde então — sem isso, o polling nunca saberia que um Service Task
// Kafka publicou algo em segundo plano (ver ExecutionWorkspace, loop de polling do WAITING Kafka).
export function getCurrentStep(processInstanceId: string, since?: string): Promise<StepResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return apiGet(`/instances/${processInstanceId}/current-step${qs}`);
}

/** Encerra a instância no Camunda — usado pelo botão "Parar execução" da toolbar, pra não deixar a
 * engine com processos abandonados quando o usuário troca de jornada no meio do caminho. Idempotente
 * no backend: chamar numa instância que já tinha terminado sozinha não é erro. */
export function stopInstance(processInstanceId: string): Promise<void> {
  return apiDelete(`/instances/${processInstanceId}`);
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

/** Corpo de negócio + correlação do envelope de teste — correlationId é obrigatório (é o que o
 * worker Kafka usa pra correlacionar a mensagem, ou como businessKey pra um MESSAGE_START_EVENT). */
export interface TestMessageInput {
  correlationId: string;
  messageName?: string;
  data: Record<string, unknown>;
}

/** Publica de verdade no tópico Kafka do nó — usado pelo painel "Enviar mensagem" pra testar o
 * lado de consumo (RECEIVE_TASK/MESSAGE_START_EVENT) sem precisar de um produtor externo real. */
export function sendTestMessage(journeyId: string, nodeId: string, message: TestMessageInput): Promise<void> {
  return apiPost(`/journeys/${journeyId}/nodes/${nodeId}/test-message`, message);
}

/** Publica de verdade no tópico Kafka do Service Task atual — só funciona quando a instância foi
 * iniciada com `manualKafkaControl` ligado (senão o worker automático já teria completado essa
 * task sozinho). `payload` ausente pede pro corpo ser resolvido igual ao worker faria (botão
 * "Gerar automaticamente"); presente é o texto digitado pelo usuário. */
export function sendKafkaMessage(processInstanceId: string, payload?: unknown): Promise<StepResponse> {
  return apiPost(`/instances/${processInstanceId}/send-kafka-message`, payload !== undefined ? { payload } : undefined);
}

/** Resolve, sem publicar nada, o mesmo payload que "Gerar automaticamente" enviaria — usado pra
 * pré-preencher o editor manual com um JSON válido de partida em vez de abrir em branco. */
export function previewKafkaMessage(processInstanceId: string): Promise<unknown> {
  return apiGet(`/instances/${processInstanceId}/kafka-message-preview`);
}

/** Instância mais nova da jornada iniciada depois de `since` (ISO 8601) — undefined enquanto nada
 * apareceu ainda (204). Usado só depois de enviar uma mensagem de teste pra um MESSAGE_START_EVENT,
 * quando ainda não existe processInstanceId nenhum pra fazer polling em cima. */
export function getLatestInstance(journeyId: string, since: string): Promise<InstanceResponse | undefined> {
  return apiGet(`/journeys/${journeyId}/latest-instance?since=${encodeURIComponent(since)}`);
}

// --- Histórico (aba "Histórico" de Execução & Diagnóstico) ---
// Ao contrário de tudo acima (que só funciona enquanto a instância existe no runtime do Camunda),
// estas duas batem nas APIs de história do motor (via InstanceHistoryController do
// ms-espec-registry) — respondem pra qualquer instância, ativa ou já terminada.

export interface HistoricInstanceSummary {
  id: string;
  businessKey: string;
  journeyName: string;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  state: string;
}

/** Um nó que a instância visitou, com o que ele recebeu/produziu — mesmo mapa de campos por tipo de
 * nó que TrailEntry já usa pra execução ao vivo (REST: method/url/headers/body no input, response no
 * output; Kafka: topic/payload no input; USER_TASK: respostas submetidas no input), só que
 * estruturado como objeto em vez de campos soltos, e cobrindo a instância inteira de uma vez — não
 * incremental feito TrailEntry. */
export interface NodeIODetail {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
}

export interface InstanceHistoryResponse {
  processInstanceId: string;
  businessKey: string;
  journeyId: string;
  journeyName: string;
  versionNumber: number | null;
  state: string;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  flow: FlowBundle;
  steps: NodeIODetail[];
}

export interface InstanceHistorySearchFilters {
  journeyId?: string;
  businessKey?: string;
  finished?: boolean;
  startedFrom?: string;
  startedTo?: string;
}

export function searchInstanceHistory(filters: InstanceHistorySearchFilters): Promise<HistoricInstanceSummary[]> {
  const params = new URLSearchParams();
  if (filters.journeyId) params.set('journeyId', filters.journeyId);
  if (filters.businessKey) params.set('businessKey', filters.businessKey);
  if (filters.finished !== undefined) params.set('finished', String(filters.finished));
  if (filters.startedFrom) params.set('startedFrom', filters.startedFrom);
  if (filters.startedTo) params.set('startedTo', filters.startedTo);
  const qs = params.toString();
  return apiGet(`/instances/search${qs ? `?${qs}` : ''}`);
}

export function getInstanceHistory(processInstanceId: string): Promise<InstanceHistoryResponse> {
  return apiGet(`/instances/${processInstanceId}/history`);
}
