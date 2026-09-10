import type { ComponentDefinition } from '../../api/componentDefinitions';
import type { SduiNode, SduiVisibility } from '../../sdui/model';
import { compatibilityForDesignChannel, type DesignChannel } from '../form-builder/designChannel';

export interface PreviewContext {
  form: Record<string, unknown>;
  data: Record<string, unknown>;
  session: Record<string, unknown>;
  route: Record<string, unknown>;
  computed: Record<string, unknown>;
}

export const EMPTY_PREVIEW_CONTEXT: PreviewContext = {
  form: {},
  data: {},
  session: {},
  route: {},
  computed: {},
};

export interface PreviewProjectionResult {
  root: SduiNode | null;
  omittedByCompatibility: SduiNode[];
  omittedByVisibility: SduiNode[];
  unresolvedVisibility: SduiNode[];
  inactive: SduiNode[];
}

/** Prepara a árvore para o preview funcional sem alterar a árvore autorada. Compatibilidade,
 * visibilidade e estado são preocupações comuns aos três canais; cada preview recebe apenas a
 * projeção que efetivamente pode representar. */
export function projectPreviewTree(
  source: SduiNode,
  channel: DesignChannel,
  registry: Map<string, ComponentDefinition>,
  inputContext: PreviewContext,
): PreviewProjectionResult {
  const result: PreviewProjectionResult = {
    root: null,
    omittedByCompatibility: [],
    omittedByVisibility: [],
    unresolvedVisibility: [],
    inactive: [],
  };
  const context: PreviewContext = {
    ...inputContext,
    session: { ...inputContext.session, channel },
  };

  function visit(node: SduiNode): SduiNode | null {
    const definition = registry.get(`${node.type}@${node.version}`);
    if (!definition || compatibilityForDesignChannel(definition, channel) !== 'COMPATIBLE') {
      result.omittedByCompatibility.push(node);
      return null;
    }
    const visible = evaluate(node.visibility, context);
    if (visible === false) {
      result.omittedByVisibility.push(node);
      return null;
    }
    if (visible === undefined && node.visibility) result.unresolvedVisibility.push(node);

    const active = evaluate(node.active, context);
    if (active === undefined && node.active && !result.unresolvedVisibility.some((item) => item.id === node.id)) {
      result.unresolvedVisibility.push(node);
    }
    if (active === false) result.inactive.push(node);

    const children = node.children?.map(visit).filter((child): child is SduiNode => child !== null) ?? null;
    return active === false
      ? { ...node, props: { ...node.props, disabled: true }, children }
      : { ...node, children };
  }

  result.root = visit(source);
  return result;
}

function evaluate(condition: SduiVisibility | null, context: PreviewContext): boolean | undefined {
  if (!condition) return true;
  const actual = readPath(context, condition.path);
  if (actual === undefined) return undefined;
  switch (condition.rule) {
    case 'equals': return actual === condition.value;
    case 'notEquals': return actual !== condition.value;
    case 'in': return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'notIn': return Array.isArray(condition.value) && !condition.value.includes(actual);
    default: return undefined;
  }
}

function readPath(context: PreviewContext, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let current: unknown = context;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
