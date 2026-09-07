import {
  COMPONENT_CATALOG_V1,
  VALID_ACTIONS,
  VALID_BINDING_NAMESPACES,
  VALID_VISIBILITY_RULES,
} from './catalog.js';
import type { SduiComponentType, SduiDocument, SduiNode, SduiSnapshot } from './types.js';

export type DiagnosticSeverity = 'error' | 'warning';

export interface ContractDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path: string;
  nodeId?: string;
}

export interface ParsedSduiDocument {
  document: SduiDocument | null;
  root: SduiNode<'ui.screen'> | null;
  diagnostics: ContractDiagnostic[];
  valid: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isKnownType(value: string): value is SduiComponentType {
  return Object.hasOwn(COMPONENT_CATALOG_V1, value);
}

function hasKnownNamespace(path: string): boolean {
  return VALID_BINDING_NAMESPACES.some((namespace) => path.startsWith(`${namespace}.`));
}

function error(diagnostics: ContractDiagnostic[], code: string, message: string, path: string, nodeId?: string): void {
  diagnostics.push({ severity: 'error', code, message, path, ...(nodeId ? { nodeId } : {}) });
}

function validateNode(
  raw: unknown,
  path: string,
  diagnostics: ContractDiagnostic[],
  ids: Set<string>,
): SduiNode | null {
  if (!isRecord(raw)) {
    error(diagnostics, 'SDUI_NODE_NOT_OBJECT', 'O nó SDUI deve ser um objeto.', path);
    return null;
  }

  const nodeId = isNonBlankString(raw.id) ? raw.id : undefined;
  if (!nodeId) {
    error(diagnostics, 'SDUI_NODE_ID_REQUIRED', 'O nó SDUI deve possuir id não vazio.', `${path}.id`);
  } else if (ids.has(nodeId)) {
    error(diagnostics, 'SDUI_NODE_ID_DUPLICATED', `O id '${nodeId}' está duplicado na tela.`, `${path}.id`, nodeId);
  } else {
    ids.add(nodeId);
  }

  const typeValue = raw.type;
  if (!isNonBlankString(typeValue) || !isKnownType(typeValue)) {
    error(diagnostics, 'SDUI_COMPONENT_UNSUPPORTED', `Tipo de componente não registrado: '${String(typeValue)}'.`, `${path}.type`, nodeId);
  }

  const version = raw.version;
  if (!isNonBlankString(version) || !/^\d+\.\d+$/.test(version)) {
    error(diagnostics, 'SDUI_VERSION_INVALID', 'A versão deve seguir o formato principal.secundária.', `${path}.version`, nodeId);
  } else if (version.split('.')[0] !== '1') {
    error(diagnostics, 'SDUI_VERSION_UNSUPPORTED', `A versão principal '${version}' não é suportada pelo catálogo v1.`, `${path}.version`, nodeId);
  }

  const props = raw.props == null ? {} : raw.props;
  if (!isRecord(props)) {
    error(diagnostics, 'SDUI_PROPS_INVALID', 'props deve ser um objeto.', `${path}.props`, nodeId);
  }

  if (isNonBlankString(typeValue) && isKnownType(typeValue) && isRecord(props)) {
    const definition = COMPONENT_CATALOG_V1[typeValue];
    for (const requiredProp of definition.requiredProps) {
      if (props[requiredProp] === undefined || props[requiredProp] === null || props[requiredProp] === '') {
        error(diagnostics, 'SDUI_PROP_REQUIRED', `A propriedade '${requiredProp}' é obrigatória em ${typeValue}.`, `${path}.props.${requiredProp}`, nodeId);
      }
    }
  }

  const bindings = raw.bindings;
  if (bindings != null) {
    if (!isRecord(bindings)) {
      error(diagnostics, 'SDUI_BINDINGS_INVALID', 'bindings deve ser um objeto ou null.', `${path}.bindings`, nodeId);
    } else {
      for (const [bindingName, bindingRaw] of Object.entries(bindings)) {
        const bindingPath = `${path}.bindings.${bindingName}`;
        if (!isRecord(bindingRaw)) {
          error(diagnostics, 'SDUI_BINDING_INVALID', 'O binding deve ser um objeto.', bindingPath, nodeId);
          continue;
        }
        if (!isNonBlankString(bindingRaw.path) || !hasKnownNamespace(bindingRaw.path)) {
          error(diagnostics, 'SDUI_BINDING_PATH_INVALID', `Path de binding não permitido: '${String(bindingRaw.path)}'.`, `${bindingPath}.path`, nodeId);
        }
        if (bindingRaw.mode !== 'oneWay' && bindingRaw.mode !== 'twoWay') {
          error(diagnostics, 'SDUI_BINDING_MODE_INVALID', `Modo de binding não permitido: '${String(bindingRaw.mode)}'.`, `${bindingPath}.mode`, nodeId);
        }
      }
    }
  }

  const events = raw.events;
  if (events != null) {
    if (!isRecord(events)) {
      error(diagnostics, 'SDUI_EVENTS_INVALID', 'events deve ser um objeto ou null.', `${path}.events`, nodeId);
    } else {
      for (const [eventName, eventRaw] of Object.entries(events)) {
        const eventPath = `${path}.events.${eventName}`;
        if (!isRecord(eventRaw) || !isNonBlankString(eventRaw.action) || !VALID_ACTIONS.includes(eventRaw.action as never)) {
          error(diagnostics, 'SDUI_ACTION_UNSUPPORTED', `Ação não permitida em '${eventName}': '${isRecord(eventRaw) ? String(eventRaw.action) : ''}'.`, eventPath, nodeId);
        }
      }
    }
  }

  const visibility = raw.visibility;
  if (visibility != null) {
    if (!isRecord(visibility)) {
      error(diagnostics, 'SDUI_VISIBILITY_INVALID', 'visibility deve ser um objeto ou null.', `${path}.visibility`, nodeId);
    } else {
      if (!isNonBlankString(visibility.path) || !hasKnownNamespace(visibility.path)) {
        error(diagnostics, 'SDUI_VISIBILITY_PATH_INVALID', `Path de visibilidade não permitido: '${String(visibility.path)}'.`, `${path}.visibility.path`, nodeId);
      }
      if (!isNonBlankString(visibility.rule) || !VALID_VISIBILITY_RULES.includes(visibility.rule as never)) {
        error(diagnostics, 'SDUI_VISIBILITY_RULE_INVALID', `Regra de visibilidade não permitida: '${String(visibility.rule)}'.`, `${path}.visibility.rule`, nodeId);
      }
    }
  }

  const childrenRaw = raw.children;
  const children: SduiNode[] = [];
  if (childrenRaw != null) {
    if (!Array.isArray(childrenRaw)) {
      error(diagnostics, 'SDUI_CHILDREN_INVALID', 'children deve ser uma lista ou null.', `${path}.children`, nodeId);
    } else {
      if (isNonBlankString(typeValue) && isKnownType(typeValue) && !COMPONENT_CATALOG_V1[typeValue].allowsChildren && childrenRaw.length > 0) {
        error(diagnostics, 'SDUI_CHILDREN_NOT_ALLOWED', `${typeValue} não aceita filhos.`, `${path}.children`, nodeId);
      }
      childrenRaw.forEach((child, index) => {
        const parsed = validateNode(child, `${path}.children[${index}]`, diagnostics, ids);
        if (parsed) children.push(parsed);
      });
    }
  }

  if (!nodeId || !isNonBlankString(typeValue) || !isKnownType(typeValue) || !isNonBlankString(version) || !/^\d+\.\d+$/.test(version) || !isRecord(props)) {
    return null;
  }

  return {
    id: nodeId,
    type: typeValue,
    version: version as `${number}.${number}`,
    props: props as never,
    bindings: isRecord(bindings) ? bindings as never : null,
    events: isRecord(events) ? events as never : null,
    visibility: isRecord(visibility) ? visibility as never : null,
    children: childrenRaw == null ? null : children,
  };
}

function looksLikeSnapshot(value: Record<string, unknown>): boolean {
  return Object.hasOwn(value, 'root') || Object.hasOwn(value, 'schemaVersion') || Object.hasOwn(value, 'catalogVersion');
}

export function parseSduiDocument(input: unknown): ParsedSduiDocument {
  const diagnostics: ContractDiagnostic[] = [];
  if (!isRecord(input)) {
    error(diagnostics, 'SDUI_DOCUMENT_NOT_OBJECT', 'O documento SDUI deve ser um objeto.', '$');
    return { document: null, root: null, diagnostics, valid: false };
  }

  const snapshot = looksLikeSnapshot(input);
  const rawRoot = snapshot ? input.root : input;
  const root = validateNode(rawRoot, snapshot ? '$.root' : '$', diagnostics, new Set());

  if (root && root.type !== 'ui.screen') {
    error(diagnostics, 'SDUI_ROOT_NOT_SCREEN', 'A raiz do documento deve ser exatamente um ui.screen.', snapshot ? '$.root.type' : '$.type', root.id);
  }

  if (snapshot) {
    for (const field of ['schemaVersion', 'catalogVersion', 'journeyId', 'screenId', 'status', 'publishedAt']) {
      if (!isNonBlankString(input[field])) {
        error(diagnostics, 'SDUI_ENVELOPE_FIELD_REQUIRED', `O campo '${field}' é obrigatório no envelope.`, `$.${field}`);
      }
    }
    if (!Number.isInteger(input.revision) || Number(input.revision) < 0) {
      error(diagnostics, 'SDUI_ENVELOPE_REVISION_INVALID', 'revision deve ser um inteiro não negativo.', '$.revision');
    }
    if (!Array.isArray(input.supportedTargets)) {
      error(diagnostics, 'SDUI_ENVELOPE_TARGETS_INVALID', 'supportedTargets deve ser uma lista.', '$.supportedTargets');
    }
    if (!isRecord(input.minRendererVersion)) {
      error(diagnostics, 'SDUI_ENVELOPE_RENDERER_VERSION_INVALID', 'minRendererVersion deve ser um objeto.', '$.minRendererVersion');
    }
  }

  const valid = diagnostics.every((diagnostic) => diagnostic.severity !== 'error') && root?.type === 'ui.screen';
  const document = valid
    ? snapshot
      ? ({ ...input, root } as unknown as SduiSnapshot)
      : root as SduiNode<'ui.screen'>
    : null;

  return {
    document,
    root: root?.type === 'ui.screen' ? root as SduiNode<'ui.screen'> : null,
    diagnostics,
    valid,
  };
}

export function assertSduiDocument(input: unknown): SduiDocument {
  const parsed = parseSduiDocument(input);
  if (!parsed.valid || !parsed.document) {
    const summary = parsed.diagnostics.map((diagnostic) => `${diagnostic.code} em ${diagnostic.path}`).join('; ');
    throw new Error(`Documento SDUI inválido: ${summary}`);
  }
  return parsed.document;
}

export function rootOf(document: SduiDocument): SduiNode<'ui.screen'> {
  return 'root' in document ? document.root : document;
}

export function walkSdui(root: SduiNode, visit: (node: SduiNode, parent: SduiNode | null) => void): void {
  const walk = (node: SduiNode, parent: SduiNode | null): void => {
    visit(node, parent);
    for (const child of node.children ?? []) walk(child, node);
  };
  walk(root, null);
}

