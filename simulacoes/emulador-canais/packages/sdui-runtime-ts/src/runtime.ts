import {
  INPUT_COMPONENTS,
  rootOf,
  walkSdui,
  type SduiDocument,
  type SduiEvent,
  type SduiNode,
} from '@elastic-journey/sdui-contract';
import { interpolateText } from './interpolation.js';
import { emptyRuntimeContext, readPath, writePath, type RuntimeContext } from './path.js';
import { validateNodeValue, type FieldError } from './validation.js';

export interface RuntimeActionContext {
  node: SduiNode;
  eventName: string;
  event: SduiEvent;
}

export interface RuntimeHandlers {
  submit?: (answers: Record<string, unknown>, context: RuntimeActionContext) => void | Promise<void>;
  navigate?: (params: Record<string, unknown>, context: RuntimeActionContext) => void | Promise<void>;
  openUrl?: (params: Record<string, unknown>, context: RuntimeActionContext) => void | Promise<void>;
  track?: (params: Record<string, unknown>, context: RuntimeActionContext) => void | Promise<void>;
}

export interface RuntimeOptions {
  document: SduiDocument;
  context?: Partial<RuntimeContext>;
  handlers?: RuntimeHandlers;
}

export interface ActionResult {
  handled: boolean;
  submitted: boolean;
  errors: FieldError[];
}

type Listener = () => void;

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value === 'object' && value !== null) {
    const clone: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) clone[key] = cloneValue(child);
    return clone;
  }
  return value;
}

function cloneRecord(source: Record<string, unknown> | undefined): Record<string, unknown> {
  return source ? cloneValue(source) as Record<string, unknown> : {};
}

function valueBinding(node: SduiNode): string | null {
  return node.bindings?.value?.path ?? null;
}

function matchesVisibility(actual: unknown, rule: string, expected: unknown): boolean {
  switch (rule) {
    case 'equals': return Object.is(actual, expected) || String(actual) === String(expected);
    case 'notEquals': return !(Object.is(actual, expected) || String(actual) === String(expected));
    case 'in': return Array.isArray(expected) && expected.some((item) => Object.is(actual, item) || String(actual) === String(item));
    case 'notIn': return !(Array.isArray(expected) && expected.some((item) => Object.is(actual, item) || String(actual) === String(item)));
    default: return true;
  }
}

export class SduiRuntime {
  readonly document: SduiDocument;
  readonly root: SduiNode<'ui.screen'>;
  readonly context: RuntimeContext;
  private readonly handlers: RuntimeHandlers;
  private readonly dismissed = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private revision = 0;

  constructor(options: RuntimeOptions) {
    this.document = options.document;
    this.root = rootOf(options.document);
    this.context = {
      ...emptyRuntimeContext(),
      form: cloneRecord(options.context?.form),
      data: cloneRecord(options.context?.data),
      session: cloneRecord(options.context?.session),
      route: cloneRecord(options.context?.route),
      computed: cloneRecord(options.context?.computed),
    };
    this.handlers = options.handlers ?? {};
    this.seedResolvedValues();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRevision = (): number => this.revision;

  isVisible(node: SduiNode): boolean {
    if (this.dismissed.has(node.id)) return false;
    if (!node.visibility) return true;
    const actual = readPath(this.context, node.visibility.path);
    return matchesVisibility(actual.found ? actual.value : undefined, node.visibility.rule, node.visibility.value);
  }

  resolveText(value: unknown): string {
    return typeof value === 'string' ? interpolateText(value, this.context) : '';
  }

  getNodeValue(node: SduiNode): unknown {
    const path = valueBinding(node);
    if (!path) return node.props.value;
    const resolved = readPath(this.context, path);
    return resolved.found ? resolved.value : node.props.value;
  }

  setNodeValue(node: SduiNode, value: unknown): boolean {
    const binding = node.bindings?.value;
    if (!binding || binding.mode !== 'twoWay' || !binding.path.startsWith('form.')) return false;
    if (!writePath(this.context, binding.path, value)) return false;
    this.changed();
    return true;
  }

  dismiss(nodeId: string): void {
    this.dismissed.add(nodeId);
    this.changed();
  }

  validate(): FieldError[] {
    const errors: FieldError[] = [];
    walkSdui(this.root, (node) => {
      if (!INPUT_COMPONENTS.has(node.type) || !this.isVisible(node)) return;
      const path = valueBinding(node);
      if (!path?.startsWith('form.')) return;
      errors.push(...validateNodeValue(node, path, this.getNodeValue(node)));
    });
    return errors;
  }

  answers(): Record<string, unknown> {
    const answers: Record<string, unknown> = {};
    walkSdui(this.root, (node) => {
      if (!INPUT_COMPONENTS.has(node.type) || !this.isVisible(node)) return;
      const path = valueBinding(node);
      if (!path?.startsWith('form.')) return;
      const value = this.getNodeValue(node);
      if (value !== undefined && value !== null) answers[path.slice('form.'.length)] = value;
    });
    return answers;
  }

  async dispatch(node: SduiNode, eventName: string): Promise<ActionResult> {
    const event = node.events?.[eventName];
    if (!event) return { handled: false, submitted: false, errors: [] };
    const params = event.params ?? {};
    const actionContext: RuntimeActionContext = { node, eventName, event };

    switch (event.action) {
      case 'action.submit': {
        const errors = this.validate();
        if (errors.length > 0) return { handled: true, submitted: false, errors };
        await this.handlers.submit?.(this.answers(), actionContext);
        return { handled: true, submitted: true, errors: [] };
      }
      case 'action.navigate':
        await this.handlers.navigate?.(params, actionContext);
        return { handled: Boolean(this.handlers.navigate), submitted: false, errors: [] };
      case 'action.openUrl':
        await this.handlers.openUrl?.(params, actionContext);
        return { handled: Boolean(this.handlers.openUrl), submitted: false, errors: [] };
      case 'action.track':
        await this.handlers.track?.(params, actionContext);
        return { handled: Boolean(this.handlers.track), submitted: false, errors: [] };
      case 'action.setValue': {
        const path = typeof params.path === 'string' ? params.path : '';
        const handled = path.startsWith('form.') && writePath(this.context, path, params.value);
        if (handled) this.changed();
        return { handled, submitted: false, errors: [] };
      }
      case 'action.dismiss':
        this.dismiss(node.id);
        return { handled: true, submitted: false, errors: [] };
    }
  }

  private seedResolvedValues(): void {
    walkSdui(this.root, (node) => {
      const binding = node.bindings?.value;
      if (!binding || node.props.value === undefined || readPath(this.context, binding.path).found) return;
      writePath(this.context, binding.path, node.props.value);
    });
  }

  private changed(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }
}

export function createSduiRuntime(options: RuntimeOptions): SduiRuntime {
  return new SduiRuntime(options);
}
