import type { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { Play, User, CheckCircle2, Settings, Mail, X, type LucideIcon } from 'lucide-react';
import type { FlowNodeType } from '../api/flows';
import { collectsValue, type Form, type FormField } from '../api/forms';

export type NodeType = 'start' | 'userTask' | 'end' | 'serviceTask' | 'receiveTask' | 'messageStartEvent' | 'gateway';
export type ConnectorType = 'REST' | 'KAFKA' | 'EVENT_HUBS' | 'SERVICE_BUS';

export const FRONT_TO_BACKEND_TYPE: Record<NodeType, FlowNodeType> = {
  start: 'START',
  userTask: 'USER_TASK',
  end: 'END',
  serviceTask: 'SERVICE_TASK',
  receiveTask: 'RECEIVE_TASK',
  messageStartEvent: 'MESSAGE_START_EVENT',
  gateway: 'GATEWAY',
};

export const BACKEND_TO_FRONT_TYPE: Record<FlowNodeType, NodeType> = {
  START: 'start',
  USER_TASK: 'userTask',
  END: 'end',
  SERVICE_TASK: 'serviceTask',
  RECEIVE_TASK: 'receiveTask',
  MESSAGE_START_EVENT: 'messageStartEvent',
  GATEWAY: 'gateway',
};

export interface ConnectorConfig {
  connectorType: ConnectorType;
  config: Record<string, unknown> | null;
  credentialRef: string | null;
}

// REQ-03.11.003: the type a variable's value takes, used to offer the right comparison operators
// and value input in a gateway condition (e.g. no "maior que" for a string). Defaults to 'string'
// when absent (rules saved before this field existed, or added manually without picking one).
export type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'datetime';

// REQ-03.09.010: mapping rule extracting a variable from the integration response/payload.
export interface OutputMappingRule {
  name: string;
  jsonPath: string;
  type?: VariableType;
}

// REQ-03.12.001: {name, type} declared on the START node — the variables the caller (canal
// digital/BFF) must supply when starting an instance. No jsonPath: the value arrives direct, it
// isn't extracted from a response.
export interface StartVariable {
  name: string;
  type: VariableType;
}

// Same variable as OutputMappingRule/StartVariable, but carrying where it comes from — used by the
// "Variáveis" reference panel and the variable picker to group by origin instead of a flat list.
export interface VariableOrigin {
  name: string;
  type: VariableType;
  sourceNodeId: string;
  sourceLabel: string;
}

export interface WFNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  // Only meaningful on a userTask with no tela desenhada (REQ-04.01.005): a display-only step
  // shows this message instead of a form — may reference {{name}} tokens (REQ-03.09.012 syntax),
  // resolved by the simulator at execution time.
  messageText?: string | null;
  // Tela desenhada no editor embutido do dock (FormPreviewDock) — campos copiados de um formulário
  // do catálogo (só como ponto de partida) ou desenhados do zero. Nunca uma referência viva a um
  // Form: escolher um formulário salvo copia os campos pra cá, não guarda o id em lugar nenhum.
  embeddedScreen?: FormField[];
  connectorConfig: ConnectorConfig | null;
  // REQ-03.12.001: only meaningful on the START node.
  startVariables?: StartVariable[];
  // Client-only highlight set by validation; never sent to the backend.
  invalid?: boolean;
  // Client-only flag: these node types may have at most one outgoing path (REQ-03.02.007/03.02.004).
  outgoingLimitReached?: boolean;
  // Client-only: a GATEWAY needs exactly one outgoing path marked "padrão" (REQ-03.11.002) — set
  // once it already has both outgoing edges but neither is marked default yet.
  missingGatewayDefault?: boolean;
  // Client-only: current canvas zoom, passed down so the node can hide secondary detail (description,
  // linked-form row) when zoomed out far enough that they'd render as illegible clutter.
  zoom?: number;
}

export type WFNode = Node<WFNodeData, NodeType>;

// REQ-03.11.002/003: only meaningful for an edge whose source is a GATEWAY node.
export interface WFEdgeData extends Record<string, unknown> {
  condition?: string;
  isDefault?: boolean;
}
export type WFEdge = Edge<WFEdgeData>;

// A free-floating note on the canvas — not part of the executable flow (never validated, never
// published to BPMN), kept in its own React state in the designer (not mixed into `nodes`) so
// nothing that walks the flow graph for BPMN/validation purposes needs to know it exists. Only
// concatenated into the single <ReactFlow> nodes/edges arrays at render time, since there's only
// one canvas. `linkedNodeIds` renders as a faint dashed line to each linked flow node.
export interface AnnotationData extends Record<string, unknown> {
  text: string;
  linkedNodeIds: string[];
  // Client-only, same purpose as WFNodeData.zoom.
  zoom?: number;
}
export type WFAnnotation = Node<AnnotationData, 'annotation'>;

// Ids get this prefix instead of Node_/Flow_ (see newNodeId/newConnectionId below) both for
// readability and so the designer can tell an annotation id from a flow node id at a glance (used to
// route onNodesChange/onConnect to the right piece of state) — annotations never reach the BPMN
// transformer, so the "valid XML NCName" constraint that shapes those other prefixes doesn't apply.
const ANNOTATION_ID_PREFIX = 'Annotation_';

export function newAnnotationId() {
  return `${ANNOTATION_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isAnnotationId(id: string): boolean {
  return id.startsWith(ANNOTATION_ID_PREFIX);
}

export function makeAnnotation(x: number, y: number): WFAnnotation {
  return {
    id: newAnnotationId(),
    type: 'annotation',
    position: { x, y },
    data: { text: '', linkedNodeIds: [] },
  };
}

// Node types that may have at most one outgoing connection (REQ-03.02.004/03.02.007). GATEWAY has
// its own rule (exactly two outputs, REQ-03.11.001) enforced separately in validation.ts.
export const SINGLE_OUTPUT_TYPES: NodeType[] = ['userTask', 'serviceTask', 'receiveTask'];

// Max outgoing connections allowed for a node type, used to disable the connect handle/quick-add
// once reached (REQ-03.02.004/03.02.007, REQ-03.11.001). START/MESSAGE_START_EVENT are capped at 1
// here too (REQ-03.07.005: the start element has exactly one output) but deliberately left out of
// SINGLE_OUTPUT_TYPES itself — that list also gates copy/duplicate eligibility (Ctrl+C/D), and
// duplicating the start node would produce a second one, which is invalid (exactly one start per flow).
export function outgoingLimitFor(type: NodeType): number {
  if (type === 'gateway') return 2;
  if (type === 'start' || type === 'messageStartEvent' || SINGLE_OUTPUT_TYPES.includes(type)) return 1;
  return Infinity;
}

// Enabled connectors only (REQ-03.08.003/004, REQ-14.05.001) — SOAP and others exist in the
// backend catalog but are registered disabled, so they're never offered here.
export const CONNECTOR_TYPES: ConnectorType[] = ['REST', 'KAFKA', 'EVENT_HUBS', 'SERVICE_BUS'];

// Connectors de mensageria (Kafka/Event Hubs/Service Bus) — usados nos pontos onde REST não se
// aplica (MESSAGE_START_EVENT) e no seletor de cluster/credencial do catálogo (FT-14).
export const MESSAGE_BROKER_TYPES: ConnectorType[] = ['KAFKA', 'EVENT_HUBS', 'SERVICE_BUS'];

// REST models an outbound call (method/URL to reach), which doesn't fit a
// MESSAGE_START_EVENT — it starts the flow from an incoming message, it never
// calls out. Só conectores de mensageria (consumo) se aplicam lá (REQ-03.09.007, REQ-14.05.001).
export const CONNECTOR_TYPES_BY_NODE: Partial<Record<NodeType, ConnectorType[]>> = {
  serviceTask: ['REST', 'KAFKA', 'EVENT_HUBS', 'SERVICE_BUS'],
  receiveTask: ['REST', 'KAFKA', 'EVENT_HUBS', 'SERVICE_BUS'],
  messageStartEvent: ['KAFKA', 'EVENT_HUBS', 'SERVICE_BUS'],
};

// A operação de mensageria é implícita ao papel do nó, não uma escolha livre: um
// SERVICE_TASK publica como efeito de rodar; RECEIVE_TASK e
// MESSAGE_START_EVENT só esperam uma mensagem (REQ-03.09.008).
export const BROKER_OPERATION_BY_NODE: Partial<Record<NodeType, 'PRODUCE' | 'CONSUME'>> = {
  serviceTask: 'PRODUCE',
  receiveTask: 'CONSUME',
  messageStartEvent: 'CONSUME',
};

// Campos sem os quais o conector não roda de verdade — usado só pra sinalizar visualmente
// (indicador "incompleto" no nó do canvas e no painel), não bloqueia salvar/publicar.
export function connectorMissingFields(connector: ConnectorConfig | null | undefined): string[] {
  if (!connector) return [];
  const cfg = connector.config ?? {};
  if (connector.connectorType === 'REST') {
    const missing: string[] = [];
    if (!cfg.method) missing.push('Método');
    if (!String(cfg.url ?? '').trim()) missing.push('URL');
    return missing;
  }
  const missing: string[] = [];
  if (!cfg.clusterId) missing.push('Cluster');
  if (!String(cfg.topic ?? '').trim()) missing.push(connector.connectorType === 'EVENT_HUBS' ? 'Event Hub' : 'Tópico');
  if (!connector.credentialRef) missing.push('Credencial');
  return missing;
}

// `subtitle` is short — it seeds the node's own `description` field on creation (see `makeNode`
// below), so it has to stay editable-card-sized. `help` is the long-form explanation shown only in
// the palette's hover hint; it never touches saved node data.
export const NODE_META: Record<NodeType, { title: string; subtitle: string; help: string }> = {
  start: {
    title: 'Início',
    subtitle: 'Inicia o fluxo',
    help: 'Elemento inicial do fluxo. Toda jornada precisa de exatamente um elemento inicial — este ou o "Início por Mensagem", nunca os dois. Não tem entrada, e sua única saída dispara assim que uma instância da jornada é criada pela aplicação cliente.',
  },
  userTask: {
    title: 'Tarefa de Usuário',
    subtitle: 'Coleta dados do usuário',
    help: 'Etapa que coleta dados do usuário através de um formulário — pode ter um formulário associado, ou nenhum, se for só um ponto de confirmação. Permite apenas um caminho de saída; para ramificar a jornada depois dela, use uma Decisão.',
  },
  end: {
    title: 'Fim',
    subtitle: 'Encerra o fluxo',
    help: 'Encerra um caminho do fluxo. Toda jornada precisa de ao menos um nó de Fim; se houver uma Decisão, cada ramo pode terminar num Fim diferente, sem precisar reconvergir num único ponto final.',
  },
  serviceTask: {
    title: 'Tarefa de Serviço',
    subtitle: 'Executa uma integração externa',
    help: 'Dispara uma integração sistêmica automaticamente, sem esperar nenhuma ação do usuário — pode ser síncrona, chamando uma API e aguardando a resposta antes de seguir (ex.: consultar um sistema), ou assíncrona, publicando uma mensagem num tópico/fila sem esperar retorno (ex.: notificar outro sistema de um evento). O conector configurado nela define exatamente qual integração é executada.',
  },
  receiveTask: {
    title: 'Tarefa de Recebimento',
    subtitle: 'Aguarda uma mensagem externa',
    help: 'Aguarda uma mensagem externa chegar antes de prosseguir, numa instância de jornada que já está em andamento — por exemplo, esperar a confirmação assíncrona de um sistema terceiro. Diferente do "Início por Mensagem", não cria uma instância nova: só destrava uma que já existe.',
  },
  messageStartEvent: {
    title: 'Início por Mensagem',
    subtitle: 'Inicia o fluxo a partir de uma mensagem externa',
    help: 'Inicia uma nova instância da jornada a partir de uma mensagem recebida num tópico/fila, em vez de uma chamada direta. Substitui o "Início" tradicional quando o disparo do fluxo depende de um evento externo, como outro sistema publicando uma mensagem.',
  },
  gateway: {
    title: 'Decisão',
    subtitle: 'Segue por um de dois caminhos, conforme uma condição',
    help: 'Ramifica o fluxo em dois caminhos (A e B) conforme uma condição sobre uma variável já disponível naquele ponto da jornada. Um dos caminhos precisa ser marcado como padrão, usado quando a condição do outro não é satisfeita — garantindo que sempre haja um caminho definido em tempo de execução.',
  },
};

export const TYPE_COLOR: Record<NodeType, string> = {
  start: '#16a34a',
  userTask: '#019DF4',
  end: '#dc2626',
  serviceTask: '#9333ea',
  receiveTask: '#d97706',
  messageStartEvent: '#16a34a',
  gateway: '#eab308',
};

// Única fonte do ícone por tipo — antes vivia triplicado (WorkflowNode, Palette,
// execution/FlowDiagramViewer), o que já causou o designer e o visualizador de execução
// divergirem (um trocado pra User, o outro esquecido em ClipboardList). Gateway usa o mesmo X do
// marcador "exclusivo" desenhado dentro do losango (NodeShape) — não é um ícone genérico de
// "excluir" aqui, mesmo componente reaproveitado.
export const NODE_ICON: Record<NodeType, LucideIcon> = {
  start: Play,
  userTask: User,
  end: CheckCircle2,
  serviceTask: Settings,
  receiveTask: Mail,
  messageStartEvent: Mail,
  gateway: X,
};

// Formato de renderização por tipo — evento (círculo), decisão (losango) ou tarefa (caixa
// arredondada), igual notação BPMN de mercado (bpmn.io/Camunda Modeler) em vez do card retangular
// largo único que existia antes pra todos os tipos.
export type NodeShape = 'event' | 'gateway' | 'task';
export const NODE_SHAPE: Record<NodeType, NodeShape> = {
  start: 'event',
  messageStartEvent: 'event',
  end: 'event',
  gateway: 'gateway',
  userTask: 'task',
  serviceTask: 'task',
  receiveTask: 'task',
};

export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  start: { width: 44, height: 44 },
  messageStartEvent: { width: 44, height: 44 },
  end: { width: 44, height: 44 },
  gateway: { width: 50, height: 50 },
  userTask: { width: 116, height: 82 },
  serviceTask: { width: 116, height: 82 },
  receiveTask: { width: 116, height: 82 },
};

// Fallback genérico pra call sites que precisam de um tamanho aproximado sem saber o tipo exato
// (ex.: margem de "manter nó visível" no pan automático) — usa o tamanho de tarefa, o mais comum.
export const NODE_WIDTH = NODE_DIMENSIONS.userTask.width;

// Client-only display preference (not persisted with the flow) — lets the user try out the
// built-in @xyflow/react edge renderers directly in the designer.
export type EdgeShape = 'smoothstep' | 'default' | 'step' | 'straight';

export const EDGE_SHAPE_OPTIONS: { value: EdgeShape; label: string }[] = [
  { value: 'default', label: 'Curva (bezier)' },
  { value: 'smoothstep', label: 'Ortogonal suave' },
  { value: 'step', label: 'Ortogonal reta' },
  { value: 'straight', label: 'Reta direta' },
];

// Os campos de formulário de uma User Task são o que o usuário final realmente preenche — essas
// respostas viram variáveis de processo do mesmo jeito que o outputMapping de um conector, então um
// nó downstream deveria poder referenciá-las também. TEXT (só texto exibido, não coleta nada) e
// FILE_UPLOAD (referência a um arquivo, não algo que caiba numa mensagem/condição) são os dois
// tipos de campo sem nada a oferecer aqui.
//
// Sem tratamento de deduplicação/colisão aqui de propósito: se dois campos alcançáveis tiverem o
// mesmo nome (mesmo formulário reusado duas vezes, ou dois formulários usando "cpf" por exemplo),
// os dois aparecem na lista normalmente. Colocar um prefixo no token (formularioA.cpf) foi cogitado
// e descartado — só estaria correto se o motor de runtime realmente gravasse o valor submetido sob
// essa chave prefixada, o que este portal não tem como confirmar (resolução de variável em runtime
// está fora do seu domínio). Em vez disso, o backend rejeita a colisão direto no salvamento
// (FlowValidator, REQ-03.09.011 estendido pra campos de formulário) — a mesma nota sobre escopo
// (fluxo todo vs. restrito por alcançabilidade) está lá.
export function variableTypeForFormField(field: FormField): VariableType {
  if (field.type === 'INPUT') {
    if (field.inputSubtype === 'NUMBER') return 'number';
    if (field.inputSubtype === 'DATE') return 'date';
  }
  return 'string';
}

function userTaskFormVariables(node: WFNode): { name: string; type: VariableType }[] {
  if (node.type !== 'userTask' || !node.data.embeddedScreen) return [];
  return node.data.embeddedScreen
    .filter((f) => collectsValue(f.type))
    .map((f) => ({ name: f.name, type: variableTypeForFormField(f) }));
}

// REQ-03.09.013: variables available at a given node — the outputMapping names declared by every
// ancestor reachable backwards from it (same BFS shape as validation.ts's reachableFrom), plus
// START's declared startVariables (REQ-03.12.001, always available — START is trivially an
// ancestor of every node) — keeping each rule's declared type (REQ-03.11.003) instead of just the
// name, used by the gateway condition picker to offer the right operators and value input per
// variable.
export function availableVariableRulesAt(nodeId: string, nodes: WFNode[], edges: WFEdge[], _forms: Form[]): OutputMappingRule[] {
  const backward = new Map<string, string[]>();
  nodes.forEach((n) => backward.set(n.id, []));
  edges.forEach((e) => backward.get(e.target)?.push(e.source));

  const ancestors = new Set<string>();
  const queue = [...(backward.get(nodeId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (ancestors.has(id)) continue;
    ancestors.add(id);
    queue.push(...(backward.get(id) ?? []));
  }

  const rules: OutputMappingRule[] = [];
  nodes.forEach((n) => {
    if (n.type === 'start') {
      (n.data.startVariables ?? []).forEach((v) => v.name && rules.push({ name: v.name, jsonPath: '', type: v.type }));
    }
  });
  nodes.forEach((n) => {
    if (!ancestors.has(n.id)) return;
    const nodeRules = n.data.connectorConfig?.config?.outputMapping;
    if (Array.isArray(nodeRules)) {
      nodeRules.forEach((r) => {
        if (r && typeof r === 'object' && typeof (r as { name?: unknown }).name === 'string' && (r as { name: string }).name) {
          rules.push(r as OutputMappingRule);
        }
      });
    }
    userTaskFormVariables(n).forEach((v) => rules.push({ name: v.name, jsonPath: '', type: v.type }));
  });
  return rules;
}

// Ordem de navegação do painel de tarefas do editor de tela embutido (FormPreviewDock): BFS a
// partir do(s) nó(s) de início, na ordem em que cada User Task é alcançada pelas arestas — cobre o
// caso comum (fluxo linear) e dá uma ordem estável mesmo com desvios/gateways. Tarefas
// inalcançáveis a partir do início (fluxo ainda sendo montado, pedaço solto) entram no fim, na
// ordem em que aparecem no array de nós.
export function orderedUserTasks(nodes: WFNode[], edges: WFEdge[]): WFNode[] {
  const forward = new Map<string, string[]>();
  nodes.forEach((n) => forward.set(n.id, []));
  edges.forEach((e) => forward.get(e.source)?.push(e.target));

  const visited = new Set<string>();
  const queue = nodes.filter((n) => n.type === 'start').map((n) => n.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order: WFNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (node?.type === 'userTask') order.push(node);
    queue.push(...(forward.get(id) ?? []));
  }
  nodes.forEach((n) => {
    if (n.type === 'userTask' && !visited.has(n.id)) order.push(n);
  });
  return order;
}

// A node/connector-type combination that a future node type doesn't know about yet still gets a
// sane label for free, since this reads NODE_META/connectorType generically instead of switching
// on specific combinations.
function originLabelFor(node: WFNode): string {
  if (node.type === 'start') return 'Variável de entrada da jornada';
  const meta = NODE_META[node.type as NodeType];
  const connectorType = node.data.connectorConfig?.connectorType;
  const name = node.data.name || meta.title;
  return connectorType ? `${name} (${meta.title} · ${connectorType})` : `${name} (${meta.title})`;
}

// Same ancestor set as availableVariablesAt/availableVariableRulesAt, but carrying where each
// variable comes from — used by the "Variáveis" reference panel and the field-level variable
// picker (VariablePickerButton) to group instead of showing one flat list.
export function availableVariableOriginsAt(nodeId: string, nodes: WFNode[], edges: WFEdge[], _forms: Form[]): VariableOrigin[] {
  const backward = new Map<string, string[]>();
  nodes.forEach((n) => backward.set(n.id, []));
  edges.forEach((e) => backward.get(e.target)?.push(e.source));

  const ancestors = new Set<string>();
  const queue = [...(backward.get(nodeId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (ancestors.has(id)) continue;
    ancestors.add(id);
    queue.push(...(backward.get(id) ?? []));
  }

  const origins: VariableOrigin[] = [];
  nodes.forEach((n) => {
    if (n.type === 'start') {
      (n.data.startVariables ?? []).forEach((v) => {
        if (v.name) origins.push({ name: v.name, type: v.type, sourceNodeId: n.id, sourceLabel: originLabelFor(n) });
      });
    }
  });
  nodes.forEach((n) => {
    if (!ancestors.has(n.id)) return;
    const rules = n.data.connectorConfig?.config?.outputMapping;
    if (Array.isArray(rules)) {
      rules.forEach((r) => {
        if (r && typeof r === 'object' && typeof (r as { name?: unknown }).name === 'string' && (r as { name: string }).name) {
          const rule = r as OutputMappingRule;
          origins.push({ name: rule.name, type: rule.type ?? 'string', sourceNodeId: n.id, sourceLabel: originLabelFor(n) });
        }
      });
    }
    userTaskFormVariables(n).forEach((v) =>
      origins.push({ name: v.name, type: v.type, sourceNodeId: n.id, sourceLabel: originLabelFor(n) }),
    );
  });
  return origins;
}

// REQ-03.10.001: after a successful connector test, generate one outputMapping rule per leaf
// field of the response body — the whole point of the test is to see real shape and wire it up,
// so the editor derives the mapping instead of the user typing each JSONPath by hand. Arrays are
// represented by their first element only (real per-item fan-out is a runtime concern, not design-time).
export function flattenJsonToOutputMappingRules(value: unknown): OutputMappingRule[] {
  // ISO 8601 date/date-time strings (the format every real API uses) are detected so the picker
  // can offer a date input and chronological operators instead of treating them as opaque text.
  const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  function typeOf(v: unknown): VariableType {
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'string' && ISO_DATETIME.test(v)) return 'datetime';
    if (typeof v === 'string' && ISO_DATE.test(v)) return 'date';
    return 'string';
  }
  function walk(v: unknown, path: string, nameParts: string[]): OutputMappingRule[] {
    if (v === null || typeof v !== 'object') {
      const type = typeOf(v);
      if (nameParts.length === 0) return [{ name: 'value', jsonPath: path, type }];
      const name = nameParts.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');
      return [{ name, jsonPath: path, type }];
    }
    if (Array.isArray(v)) {
      return v.length === 0 ? [] : walk(v[0], `${path}[0]`, nameParts);
    }
    return Object.entries(v as Record<string, unknown>).flatMap(([key, child]) => walk(child, `${path}.${key}`, [...nameParts, key]));
  }
  return walk(value, '$', []);
}

// Node/connection ids are later embedded verbatim as BPMN element ids by the
// runtime; XML NCName forbids an id starting with a digit, which a bare UUID
// cannot guarantee, so every id carries a fixed non-numeric prefix.
export function newNodeId() {
  return `Node_${crypto.randomUUID()}`;
}

export function newConnectionId() {
  return `Flow_${crypto.randomUUID()}`;
}

export function makeNode(type: NodeType, x: number, y: number): WFNode {
  const meta = NODE_META[type];
  return {
    id: newNodeId(),
    type,
    position: { x, y },
    data: { name: meta.title, description: meta.subtitle, connectorConfig: null },
  };
}

// Nudges (x, y) diagonally, step by step, until it clears every existing
// node's position — keeps repeated palette clicks/drops from stacking nodes
// exactly on top of each other.
export function findFreeSpot(nodes: WFNode[], x: number, y: number): { x: number; y: number } {
  const STEP = 32;
  const CLEARANCE = 24;
  let candidate = { x, y };
  let i = 0;
  while (
    nodes.some((n) => Math.abs(n.position.x - candidate.x) < CLEARANCE && Math.abs(n.position.y - candidate.y) < CLEARANCE) &&
    i < 20
  ) {
    i += 1;
    candidate = { x: x + i * STEP, y: y + i * STEP };
  }
  return candidate;
}

export function initialFlowNodes(): WFNode[] {
  return [];
}

export function initialFlowEdges(_nodes: WFNode[]): WFEdge[] {
  return [];
}

// Gap between nodes of adjacent layers / within the same layer. dagre's ranker already handles
// crossing minimization and rank assignment properly, so layout tuning is just these two numbers.
const RANK_SEP = 90;
const NODE_SEP = 32;

// Layered auto-layout via dagre (replaces a hand-rolled barycenter-sweep layout that was ported
// from the wf-designer reference project — dagre does real crossing minimization and holds up
// better on larger, denser flows). Cada tipo usa seu próprio tamanho real (NODE_DIMENSIONS) desde
// que eventos/decisão pararam de compartilhar a caixa larga única das tarefas.
export function computeLayout(nodes: WFNode[], edges: WFEdge[]): WFNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 80, marginy: 80 });

  // Cópia nova a cada chamada — dagre.layout muta o próprio objeto do label (escreve x/y nele
  // direto), e NODE_DIMENSIONS[type] é a MESMA referência pra todo nó daquele tipo. Sem copiar,
  // todo nó do mesmo tipo (ex.: todas as USER_TASK) compartilha um único objeto, e a última escrita
  // do dagre vence pra todos eles — colapsando todos na mesma posição (x,y). Foi isso que fez o
  // canvas parecer "doidinho" depois de eventos/decisão pararem de usar NODE_WIDTH/NODE_HEIGHT fixos.
  const dimensionsOf = (n: WFNode) => ({ ...(NODE_DIMENSIONS[n.type as NodeType] ?? NODE_DIMENSIONS.userTask) });

  nodes.forEach((n) => g.setNode(n.id, dimensionsOf(n)));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const dim = dimensionsOf(n);
    return { ...n, position: { x: pos.x - dim.width / 2, y: pos.y - dim.height / 2 } };
  });
}
