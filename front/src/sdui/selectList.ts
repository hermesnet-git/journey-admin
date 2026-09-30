import type { SduiNode } from './model';

// Forma entregue ao canal da lista de seleção (ADR-002) — montada pelo servidor em execução
// (ms-espec-registry, ListMaterializer) e, no editor, por materializeSelectListsForPreview abaixo.
export interface SelectListItem {
  value: string;
  title: string;
  description?: string;
  hint?: string;
  enabledActions: string[];
}

export interface SelectListAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
}

// Forma de autoria de cada ação (ACTION_LIST no catálogo).
export interface SelectListActionConfig {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  enabledWhen?: string;
}

export interface SelectListLoadError {
  message: string;
  required: boolean;
}

const ITEM_PLACEHOLDER = /\{\{\s*item\.([A-Za-z_][\w-]*)\s*\}\}/g;
export const ENABLED_WHEN = /^\s*\{\{\s*item\.([A-Za-z_][\w-]*)\s*\}\}\s*(==|!=)\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*$/;

/** Campos do item referenciados nos textos e regras — base dos itens fictícios do preview. */
export function referencedItemFields(node: SduiNode): string[] {
  const fields = new Set<string>();
  for (const key of ['itemTitle', 'itemDescription', 'itemHint']) {
    const text = node.props[key];
    if (typeof text === 'string') for (const m of text.matchAll(ITEM_PLACEHOLDER)) fields.add(m[1]);
  }
  if (typeof node.props.itemValue === 'string' && node.props.itemValue) fields.add(node.props.itemValue);
  return [...fields];
}

export function itemText(template: unknown, item: Record<string, unknown>): string {
  if (typeof template !== 'string') return '';
  return template.replace(ITEM_PLACEHOLDER, (_, field: string) => (item[field] == null ? '' : String(item[field]))).trim();
}

/** Mesma regra do servidor: {{item.campo}} == / != literal; vazia = sempre liberada. */
export function isActionEnabled(rule: string | undefined, item: Record<string, unknown>): boolean {
  if (!rule || !rule.trim()) return true;
  const match = rule.match(ENABLED_WHEN);
  if (!match) return false;
  const actual = item[match[1]];
  const literal = match[3];
  let equal: boolean;
  if (literal === 'true' || literal === 'false') equal = actual != null && String(actual).toLowerCase() === literal;
  else if (literal.startsWith('"')) equal = actual != null && String(actual) === literal.slice(1, -1);
  else equal = Number(actual) === Number(literal);
  return match[2] === '==' ? equal : !equal;
}

/** Itens fictícios pro preview quando não há exemplo real (fonte testada): cada campo vira
 * "<campo> 1", "<campo> 2"… e campos usados em "liberada quando" variam entre true e false, pra
 * mostrar ações habilitadas e bloqueadas. */
function fictitiousItems(node: SduiNode, actions: SelectListActionConfig[]): Record<string, unknown>[] {
  const fields = referencedItemFields(node);
  const ruleFields = actions.map((a) => a.enabledWhen?.match(ENABLED_WHEN)?.[1]).filter((f): f is string => !!f);
  return [1, 2, 3].map((n) => {
    const item: Record<string, unknown> = {};
    fields.forEach((f) => { item[f] = `${f} ${n}`; });
    ruleFields.forEach((f, i) => { item[f] = (n + i) % 2 === 1; });
    return item;
  });
}

function toDelivered(node: SduiNode, items: Record<string, unknown>[]): SduiNode {
  const actions = (Array.isArray(node.props.actions) ? node.props.actions : []) as SelectListActionConfig[];
  const source = items.length > 0 ? items : fictitiousItems(node, actions);
  const max = typeof node.props.maxItems === 'number' && node.props.maxItems > 0 ? node.props.maxItems : 50;
  const valueField = typeof node.props.itemValue === 'string' ? node.props.itemValue : '';
  const delivered: SelectListItem[] = source.slice(0, max).map((item, i) => ({
    value: valueField && item[valueField] != null ? String(item[valueField]) : String(i),
    title: itemText(node.props.itemTitle, item) || `Item ${i + 1}`,
    description: itemText(node.props.itemDescription, item) || undefined,
    hint: itemText(node.props.itemHint, item) || undefined,
    enabledActions: actions.filter((a) => isActionEnabled(a.enabledWhen, item)).map((a) => a.id),
  }));
  const { itemValue: _v, itemTitle: _t, itemDescription: _d, itemHint: _h, maxItems: _m, ...rest } = node.props;
  return {
    ...node,
    props: {
      ...rest,
      items: delivered,
      totalItems: source.length,
      actions: actions.map((a) => ({ id: a.id, label: a.label, variant: a.variant ?? 'primary' })),
    },
  };
}

/** Converte cada ui.selectList da árvore de autoria na forma entregue, pro preview do editor.
 * sampleItems: itens de exemplo por apelido de fonte (resultado do "Testar"). */
export function materializeSelectListsForPreview(root: SduiNode, sampleItems: Record<string, Record<string, unknown>[]>): SduiNode {
  function visit(node: SduiNode): SduiNode {
    if (node.type === 'ui.selectList') {
      const path = node.bindings?.items?.path ?? '';
      const alias = path.startsWith('data.') ? path.slice('data.'.length) : '';
      return toDelivered(node, sampleItems[alias] ?? []);
    }
    return node.children ? { ...node, children: node.children.map(visit) } : node;
  }
  return visit(root);
}
