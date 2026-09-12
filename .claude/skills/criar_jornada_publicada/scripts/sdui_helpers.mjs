// Helpers reutilizáveis pra montar e publicar uma jornada via API do admin/back (porta 8081), sem
// passar pelo navegador. Node 18+ (fetch nativo). Ver SKILL.md nesta mesma pasta pro passo a passo.

export const BASE = 'http://localhost:8081/api/v1';

export async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// Autenticação mockada do MVP (REQ-07.01/02/04) — único usuário aceito.
export async function login(username = 'admin', password = 'admin') {
  const res = await api('POST', '/auth/login', null, { username, password });
  return res.token;
}

// --- Construtores de nó SDUI (catálogo v1) ---------------------------------------------------
// Cada função devolve o objeto pronto pro formato SduiNode (id/type/version/props/bindings/events/
// visibility/active/children). `varName` vira o nome técnico da variável de processo — o mesmo nome
// PODE se repetir em telas (USER_TASKs) diferentes: desde 2026-09-12 (REQ-03.09.011) isso é permitido
// de propósito, é o padrão de releitura-e-edição do vínculo twoWay (catálogo SDUI v1, seção 8.1) —
// só não pode colidir com o nome de uma variável de saída de integração (outputMapping) nem de
// entrada da jornada (startVariables no nó START).

export function screen(id, title, children) {
  return {
    id: `screen_${id}`, type: 'ui.screen', version: '1.0.0',
    props: { title, scrollable: true, paddingToken: 'spacing.md', backgroundToken: 'color.background.primary' },
    bindings: null, events: null, visibility: null, active: null,
    children: [{
      id: `stack_${id}`, type: 'ui.stack', version: '1.0.0',
      props: { direction: 'vertical', spacingToken: 'spacing.md', alignment: 'stretch' },
      bindings: null, events: null, visibility: null, active: null,
      children,
    }],
  };
}

export function text(id, value, variant = 'title') {
  return {
    id, type: 'ui.text', version: '1.0.0',
    props: { text: value, align: 'start', variant, maxLines: 2, colorToken: 'color.text.primary' },
    bindings: null, events: null, visibility: null, active: null, children: null,
  };
}

export function textInput(id, label, varName, opts = {}) {
  return {
    id, type: 'ui.textInput', version: '1.0.0',
    props: {
      label, placeholder: opts.placeholder ?? null, inputMode: opts.inputMode ?? 'text',
      required: opts.required ?? true, readOnly: false, maxLength: opts.maxLength ?? 200, validation: null,
    },
    bindings: { value: { path: `form.${varName}`, mode: 'twoWay' } },
    events: null, visibility: null, active: null, children: null,
  };
}

export function textArea(id, label, varName, opts = {}) {
  return {
    id, type: 'ui.textArea', version: '1.0.0',
    props: {
      label, maxLines: opts.maxLines ?? 5, minLines: opts.minLines ?? 3,
      required: opts.required ?? false, maxLength: opts.maxLength ?? 500, placeholder: opts.placeholder ?? null,
    },
    bindings: { value: { path: `form.${varName}`, mode: 'twoWay' } },
    events: null, visibility: null, active: null, children: null,
  };
}

export function select(id, label, varName, options, opts = {}) {
  return {
    id, type: 'ui.select', version: '1.0.0',
    props: { label, placeholder: opts.placeholder ?? 'Selecione', options, required: opts.required ?? true, searchable: false },
    bindings: { value: { path: `form.${varName}`, mode: 'twoWay' } },
    events: null, visibility: null, active: null, children: null,
  };
}

export function checkbox(id, label, varName, opts = {}) {
  return {
    id, type: 'ui.checkbox', version: '1.0.0',
    props: { label, required: opts.required ?? false, indeterminate: false },
    bindings: { value: { path: `form.${varName}`, mode: 'twoWay' } },
    events: null, visibility: null, active: null, children: null,
  };
}

export function submitButton(id, label) {
  return {
    id, type: 'ui.button', version: '1.0.0',
    props: { size: 'medium', label, loading: false, variant: 'primary', disabled: false, fullWidth: true },
    bindings: null, events: { onPress: { action: 'action.submit', params: {} } }, visibility: null, active: null, children: null,
  };
}

// mode: 'date' | 'time' | 'dateTime' (VALID_DATE_PICKER_MODES no FlowValidator).
export function datePicker(id, label, varName, opts = {}) {
  return {
    id, type: 'ui.datePicker', version: '1.0.0',
    props: {
      label, mode: opts.mode ?? 'date', format: opts.format ?? 'locale',
      minDate: opts.minDate ?? null, maxDate: opts.maxDate ?? null, required: opts.required ?? true, validation: null,
    },
    bindings: { value: { path: `form.${varName}`, mode: 'twoWay' } },
    events: null, visibility: null, active: null, children: null,
  };
}

// --- Layout em linha ---------------------------------------------------------------------------

// Tamanho de cada tipo de nó no canvas (front/src/flow-designer/model.ts, NODE_DIMENSIONS — todos
// quadrados). START/END/MESSAGE_START_EVENT são círculos menores (52px) que
// USER_TASK/SERVICE_TASK/RECEIVE_TASK (78px). positionX/positionY é o canto superior-esquerdo do
// nó, não o centro: usar o mesmo Y bruto pra tipos de tamanhos diferentes desalinha os centros
// verticais — e é do centro que a aresta sai (Handle padrão do React Flow, position Left/Right,
// ancorado em 50% da altura do nó) — dando um efeito de linha torta no canvas (Diagnóstico/Execução
// usam a mesma NODE_DIMENSIONS, mesmo efeito).
const NODE_SIZE = {
  START: 52, MESSAGE_START_EVENT: 52, END: 52, GATEWAY: 50,
  USER_TASK: 78, SERVICE_TASK: 78, RECEIVE_TASK: 78,
};

// Mesma fórmula de espaçamento horizontal que o botão "Organizar" do Flow Designer usa por baixo
// (dagre, rankdir LR — ver dagreLayout em front/src/flow-designer/model.ts): posição cumulativa por
// LARGURA real de cada nó + um gap fixo entre eles (RANK_SEP=60 lá), a partir de uma margem inicial
// (marginx=80 lá) — não um espaçamento fixo por índice, que ignora o tamanho de cada nó e deixa tudo
// mais espalhado do que o "Organizar" deixaria. Sem suporte a GATEWAY aqui (esse tem uma regra de
// espaçamento própria — GATEWAY_BRANCH_GAP/GATEWAY_GAP_X — fora do escopo deste helper, que só
// monta fluxos lineares; pra fluxo com decisão, publique e clique "Organizar" no editor mesmo).
//
// `items`: lista ordenada de { nodeId, nodeType }, esquerda pra direita. Devolve um
// `Map<nodeId, {positionX, positionY}>` — use `layout.get(nodeId).positionX/positionY` ao montar
// cada nó com startNode/userTaskNode/endNode.
export function layoutRow(items, { startX = 80, gap = 60, centerY = 260 } = {}) {
  const positions = new Map();
  let x = startX;
  items.forEach((item) => {
    const size = NODE_SIZE[item.nodeType] ?? 78;
    positions.set(item.nodeId, { positionX: Math.round(x), positionY: Math.round(centerY - size / 2) });
    x += size + gap;
  });
  return positions;
}

// --- Nós de fluxo (não-tela) ------------------------------------------------------------------

// startVariables: lista opcional de { name, type } (REQ-03.12.001) — declaradas só no nó START,
// valores fornecidos por quem inicia a instância (não vêm de nenhuma tela). type é um de
// 'string'|'number'|'boolean'|'date'|'datetime' (VALID_VARIABLE_TYPES no FlowValidator). Não pode
// colidir com nome de campo de tela nem de outputMapping em nenhum nó do fluxo.
export function startNode(id, name, positionX, positionY, description = 'Início da jornada', startVariables = null) {
  return { nodeId: id, nodeType: 'START', name, description, positionX, positionY, userTaskConfig: null, connectorConfig: null, startVariables };
}

export function endNode(id, name, positionX, positionY, description = 'Fim da jornada') {
  return { nodeId: id, nodeType: 'END', name, description, positionX, positionY, userTaskConfig: null, connectorConfig: null, startVariables: null };
}

// screenId: usado só nos ids internos dos componentes (screen_<screenId>/stack_<screenId>) — pode
// ser igual ao nodeId em minúsculas, não precisa seguir o padrão Node_.
export function userTaskNode(id, name, description, positionX, positionY, screenId, screenTitle, children) {
  return {
    nodeId: id, nodeType: 'USER_TASK', name, description, positionX, positionY,
    connectorConfig: null, startVariables: null,
    userTaskConfig: { messageText: null, embeddedScreenRoot: screen(screenId, screenTitle, children) },
  };
}

export function connection(id, sourceNodeId, targetNodeId, opts = {}) {
  return { connectionId: id, sourceNodeId, targetNodeId, condition: opts.condition ?? null, isDefault: opts.isDefault ?? false };
}

// --- Produto / Jornada / Fluxo / Publicação --------------------------------------------------

export async function findProductByName(token, name) {
  const products = await api('GET', '/products', token);
  return products.find((p) => p.name === name) ?? null;
}

export async function ensureProduct(token, { name, description, channelTypes }) {
  const existing = await findProductByName(token, name);
  if (existing) return existing;
  return api('POST', '/products', token, { name, description, channelTypes });
}

export async function findJourneyByName(token, productId, name) {
  const journeys = await api('GET', `/journeys?productId=${productId}`, token);
  return journeys.find((j) => j.name === name) ?? null;
}

export async function ensureJourney(token, { productId, channelTypes, name, description }) {
  const existing = await findJourneyByName(token, productId, name);
  if (existing) return existing;
  return api('POST', '/journeys', token, { productId, channelTypes, name, description, templateId: null });
}

// Salva o rascunho de fluxo, gera uma nova versão a partir dele e publica essa versão — o mesmo
// caminho de 3 passos que o editor faz na mão (Salvar → Nova versão → Publicar). Devolve a versão
// publicada (com versionNumber). Se a jornada já tiver uma versão DRAFT, ela é reaproveitada em vez
// de criar uma nova (mesmo comportamento de CreateJourneyVersion no back).
export async function publishNewFlow(token, journeyId, { name, nodes, connections, annotations = [] }, versionDescription) {
  await api('PUT', `/journeys/${journeyId}/flow`, token, { name, nodes, connections, annotations });
  const version = await api('POST', `/journeys/${journeyId}/versions`, token, { description: versionDescription ?? null });
  return api('POST', `/journeys/${journeyId}/versions/${version.versionId}/publish`, token);
}
