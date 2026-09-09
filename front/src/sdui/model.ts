// Espelha domain/sdui (admin/back) — {id,type,version,props,bindings,events,visibility,children}
// do catálogo SDUI corporativo v1 (requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md,
// seção 6). Substitui por completo a tupla [tag,props,children] (execution/api.ts antigo) e o
// FormField[] (api/forms.ts, removido) — o nó editado no builder já é o nó publicável.
import type { ComponentDefinition } from '../api/componentDefinitions';

export interface SduiBinding {
  path: string;
  mode: 'oneWay' | 'twoWay';
}

export interface SduiEvent {
  action: string;
  params: Record<string, unknown> | null;
}

export interface SduiVisibility {
  rule: string;
  path: string;
  value: unknown;
}

export interface SduiNode {
  id: string;
  type: string;
  version: string;
  props: Record<string, unknown>;
  bindings: Record<string, SduiBinding> | null;
  events: Record<string, SduiEvent> | null;
  visibility: SduiVisibility | null;
  active: SduiVisibility | null;
  children: SduiNode[] | null;
}

export interface SduiEnvelope {
  schemaVersion: string;
  catalogVersion: string;
  journeyId: string;
  journeyVersion: number;
  uiStepId: string;
  data: unknown[];
}

/** Adapta a tupla publicada somente para o renderer de inspeção do Admin. */
export function fromCanonicalTuple(tuple: unknown[]): SduiNode {
  if (!Array.isArray(tuple) || tuple.length < 2 || typeof tuple[0] !== 'string') {
    throw new Error('Tupla SDUI inválida');
  }
  const attributes = { ...((tuple[1] as Record<string, unknown>) ?? {}) };
  const id = String(attributes.id ?? '');
  const version = String(attributes.version ?? '');
  const bindings = (attributes.$bindings as SduiNode['bindings']) ?? null;
  const events = (attributes.$events as SduiNode['events']) ?? null;
  const visibility = (attributes.$visibility as SduiVisibility) ?? null;
  const active = (attributes.$active as SduiVisibility) ?? null;
  delete attributes.id;
  delete attributes.version;
  delete attributes.$bindings;
  delete attributes.$events;
  delete attributes.$visibility;
  delete attributes.$active;
  return {
    id,
    type: tuple[0],
    version,
    props: attributes,
    bindings,
    events,
    visibility,
    active,
    children: Array.isArray(tuple[2]) ? (tuple[2] as unknown[][]).map(fromCanonicalTuple) : null,
  };
}

export function walk(node: SduiNode, visit: (node: SduiNode, parent: SduiNode | null) => void, parent: SduiNode | null = null) {
  visit(node, parent);
  (node.children ?? []).forEach((child) => walk(child, visit, node));
}

export function findNode(root: SduiNode, id: string): SduiNode | null {
  let found: SduiNode | null = null;
  walk(root, (node) => {
    if (node.id === id) found = node;
  });
  return found;
}

export function findParent(root: SduiNode, id: string): SduiNode | null {
  let found: SduiNode | null = null;
  walk(root, (node) => {
    if ((node.children ?? []).some((c) => c.id === id)) found = node;
  });
  return found;
}

/** Substitui o nó de id `id` em toda a árvore por `replacement` — usado por update*/
export function replaceNode(root: SduiNode, id: string, replacement: SduiNode): SduiNode {
  if (root.id === id) return replacement;
  if (!root.children) return root;
  return { ...root, children: root.children.map((c) => replaceNode(c, id, replacement)) };
}

export function updateProps(root: SduiNode, id: string, patch: Record<string, unknown>): SduiNode {
  const node = findNode(root, id);
  if (!node) return root;
  return replaceNode(root, id, { ...node, props: { ...node.props, ...patch } });
}

export function updateBindings(root: SduiNode, id: string, bindings: Record<string, SduiBinding> | null): SduiNode {
  const node = findNode(root, id);
  if (!node) return root;
  return replaceNode(root, id, { ...node, bindings });
}

export function updateEvents(root: SduiNode, id: string, events: Record<string, SduiEvent> | null): SduiNode {
  const node = findNode(root, id);
  if (!node) return root;
  return replaceNode(root, id, { ...node, events });
}

export function updateVisibility(root: SduiNode, id: string, visibility: SduiVisibility | null): SduiNode {
  const node = findNode(root, id);
  if (!node) return root;
  return replaceNode(root, id, { ...node, visibility });
}

export function updateActive(root: SduiNode, id: string, active: SduiVisibility | null): SduiNode {
  const node = findNode(root, id);
  if (!node) return root;
  return replaceNode(root, id, { ...node, active });
}

export function removeNode(root: SduiNode, id: string): SduiNode {
  if (!root.children) return root;
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => removeNode(c, id)) };
}

/** Insere `node` como último filho de `parentId` — soltar sempre insere no fim (sem reordenar por
 * posição exata dentro do nível, ver tratamento correspondente no FormCanvas. */
export function insertNode(root: SduiNode, parentId: string, node: SduiNode): SduiNode {
  if (root.id === parentId) return { ...root, children: [...(root.children ?? []), node] };
  if (!root.children) return root;
  return { ...root, children: root.children.map((c) => insertNode(c, parentId, node)) };
}

/** Reordena `id` um passo pra cima/baixo entre os irmãos do MESMO pai — não muda de container (ver
 * LayerPanel, que oferece isto porque o canvas de arrastar sempre insere no fim, sem posição
 * fina dentro de um nível). */
export function moveWithinSiblings(root: SduiNode, id: string, direction: 'up' | 'down'): SduiNode {
  const parent = findParent(root, id);
  if (!parent || !parent.children) return root;
  const index = parent.children.findIndex((c) => c.id === id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= parent.children.length) return root;
  const children = [...parent.children];
  [children[index], children[targetIndex]] = [children[targetIndex], children[index]];
  return replaceNode(root, parent.id, { ...parent, children });
}

export function moveNode(root: SduiNode, nodeId: string, newParentId: string): SduiNode {
  const node = findNode(root, nodeId);
  if (!node) return root;
  const withoutNode = removeNode(root, nodeId);
  return insertNode(withoutNode, newParentId, node);
}

let counter = 0;
export function nextNodeId(type: string): string {
  counter += 1;
  const base = type.replace(/^ui\./, '').replace(/[^a-zA-Z0-9]/g, '');
  return `${base}_${Date.now().toString(36)}_${counter}`;
}

/** Novo nó a partir de uma definição do Component Registry — props já preenchidas com o
 * `defaultValue` declarado em cada `propsSchema`. */
export function createNode(definition: ComponentDefinition): SduiNode {
  const props: Record<string, unknown> = {};
  for (const prop of definition.propsSchema) {
    if (prop.defaultValue !== null && prop.defaultValue !== undefined) props[prop.name] = prop.defaultValue;
  }
  const id = nextNodeId(definition.type);
  const inputBinding = definition.category === 'INPUT' && definition.allowedReservedFields.includes('$bindings')
    ? { value: { path: `form.${id}`, mode: 'twoWay' as const } }
    : null;
  const requiredAction = definition.allowedReservedFields.includes('$events') && definition.events.includes('onPress')
    ? { onPress: { action: definition.type === 'ui.link' ? 'action.openUrl' : 'action.submit', params: {} } }
    : null;
  return {
    id,
    type: definition.type,
    version: definition.version,
    props,
    bindings: inputBinding,
    events: requiredAction,
    visibility: null,
    active: null,
    children: definition.allowsChildren ? [] : null,
  };
}

/** Todo `id` já em uso na árvore — usado pra checar unicidade ao criar/colar um nó. */
export function collectIds(root: SduiNode): Set<string> {
  const ids = new Set<string>();
  walk(root, (node) => ids.add(node.id));
  return ids;
}

/** Nome de variável de processo de um campo: parte final de um binding `value.path = "form.<nome>"`
 * — mesma convenção usada por FlowValidator.java (admin/back) e pelo ms-espec-registry em runtime. */
export function collectFormVariableNames(root: SduiNode): string[] {
  const names: string[] = [];
  walk(root, (node) => {
    const path = node.bindings?.value?.path;
    if (path?.startsWith('form.')) names.push(path.slice('form.'.length));
  });
  return names;
}
