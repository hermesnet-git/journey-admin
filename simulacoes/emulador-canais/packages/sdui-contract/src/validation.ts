import { COMPONENT_CATALOG_V1, VALID_ACTIONS, VALID_BINDING_NAMESPACES, VALID_CONDITION_RULES } from './catalog.js';
import { RENDER_TARGETS, type ComponentVersion, type SduiBinding, type SduiComponentType, type SduiCondition, type SduiDocument, type SduiEvent, type SduiNode } from './types.js';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export interface ContractDiagnostic {
  severity: DiagnosticSeverity; code: string; message: string; path: string;
  uiStepId?: string; componentId?: string; componentType?: string; target?: string; correlationId?: string;
}
export interface ParsedSduiDocument {
  document: SduiDocument | null; root: SduiNode<'ui.screen'> | null;
  diagnostics: ContractDiagnostic[]; valid: boolean;
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const RESERVED = new Set(['$bindings', '$events', '$visibility', '$active']);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const knownType = (value: string): value is SduiComponentType => Object.hasOwn(COMPONENT_CATALOG_V1, value);
const knownPath = (path: string): boolean => VALID_BINDING_NAMESPACES.some((namespace) => path.startsWith(`${namespace}.`));
const INPUT_TYPES = new Set<SduiComponentType>(['ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker']);
const bindingNames: Partial<Record<SduiComponentType, readonly string[]>> = {
  'ui.text': ['text'], 'ui.image': ['source', 'alt'],
  'ui.textInput': ['value'], 'ui.textArea': ['value'], 'ui.select': ['value'],
  'ui.checkbox': ['value'], 'ui.datePicker': ['value'],
  'ui.alert': ['title', 'message'], 'ui.progress': ['value'],
};
const add = (list: ContractDiagnostic[], code: string, message: string, path: string, context: Partial<ContractDiagnostic> = {}): void => { list.push({ severity: 'error', code, message, path, ...context }); };

function condition(raw: unknown, path: string, diagnostics: ContractDiagnostic[], context: Partial<ContractDiagnostic>): SduiCondition | null {
  if (!isRecord(raw)) { add(diagnostics, 'SDUI_CONDITION_INVALID', 'A condição deve ser um objeto.', path, context); return null; }
  if (!nonBlank(raw.path) || !knownPath(raw.path)) add(diagnostics, 'SDUI_CONDITION_INVALID', 'Path de condição não permitido.', `${path}.path`, context);
  if (!nonBlank(raw.rule) || !VALID_CONDITION_RULES.includes(raw.rule as never)) add(diagnostics, 'SDUI_CONDITION_INVALID', 'Regra de condição não permitida.', `${path}.rule`, context);
  if (!Object.hasOwn(raw, 'value')) add(diagnostics, 'SDUI_CONDITION_INVALID', 'A condição deve declarar value.', `${path}.value`, context);
  return raw as unknown as SduiCondition;
}

function node(raw: unknown, path: string, diagnostics: ContractDiagnostic[], ids: Set<string>, uiStepId?: string, parentType?: SduiComponentType): SduiNode | null {
  if (!Array.isArray(raw)) { add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'O componente deve ser uma tupla Hiccup.', path, { uiStepId }); return null; }
  const typeValue = raw[0];
  const attributesRaw = raw[1];
  const context: Partial<ContractDiagnostic> = { uiStepId, ...(nonBlank(typeValue) ? { componentType: typeValue } : {}) };
  if (!nonBlank(typeValue) || !knownType(typeValue)) { add(diagnostics, 'SDUI_COMPONENT_UNSUPPORTED', `Componente não registrado: '${String(typeValue)}'.`, `${path}[0]`, context); return null; }
  const contract = COMPONENT_CATALOG_V1[typeValue];
  if (typeValue === 'ui.screen' && parentType) add(diagnostics, 'SDUI_COMPONENT_NESTING_INVALID', 'ui.screen não pode ser aninhado.', `${path}[0]`, context);
  if (raw.length !== (contract.container ? 3 : 2)) add(diagnostics, 'SDUI_DOCUMENT_INVALID', `${typeValue} deve possuir exatamente ${contract.container ? 3 : 2} posições.`, path, context);
  if (!isRecord(attributesRaw)) { add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'A segunda posição deve ser um objeto de atributos.', `${path}[1]`, context); return null; }
  const id = nonBlank(attributesRaw.id) ? attributesRaw.id : undefined;
  const fullContext = { ...context, ...(id ? { componentId: id } : {}) };
  if (!id) add(diagnostics, 'SDUI_COMPONENT_ID_REQUIRED', 'O atributo id é obrigatório.', `${path}[1].id`, fullContext);
  else if (ids.has(id)) add(diagnostics, 'SDUI_COMPONENT_ID_DUPLICATED', `O id '${id}' está duplicado.`, `${path}[1].id`, fullContext);
  else ids.add(id);
  const version = attributesRaw.version;
  if (!nonBlank(version) || !SEMVER.test(version)) add(diagnostics, 'SDUI_COMPONENT_VERSION_UNSUPPORTED', 'version deve usar SemVer completo.', `${path}[1].version`, fullContext);
  else if (version.split('.')[0] !== contract.version.split('.')[0]) add(diagnostics, 'SDUI_COMPONENT_VERSION_UNSUPPORTED', `A versão ${version} é incompatível com ${typeValue} ${contract.version}.`, `${path}[1].version`, fullContext);

  const allowed = new Set(['id', 'version', ...contract.required, ...contract.optional, ...contract.reserved]);
  for (const key of Object.keys(attributesRaw)) {
    if (key.startsWith('$') && !RESERVED.has(key)) add(diagnostics, 'SDUI_RESERVED_ATTRIBUTE_UNSUPPORTED', `Atributo reservado desconhecido: '${key}'.`, `${path}[1].${key}`, fullContext);
    else if (!allowed.has(key)) add(diagnostics, 'SDUI_PROP_UNSUPPORTED', `A propriedade '${key}' não é suportada por ${typeValue}.`, `${path}[1].${key}`, fullContext);
  }
  for (const key of contract.required) {
    const missing = attributesRaw[key] === undefined || attributesRaw[key] === null || (attributesRaw[key] === '' && !(typeValue === 'ui.image' && key === 'alt'));
    if (missing) add(diagnostics, 'SDUI_PROP_REQUIRED', `A propriedade '${key}' é obrigatória em ${typeValue}.`, `${path}[1].${key}`, fullContext);
  }

  const bindings: Record<string, SduiBinding> = {};
  const bindingsRaw = attributesRaw.$bindings;
  if (bindingsRaw !== undefined) {
    if (!contract.reserved.includes('$bindings')) add(diagnostics, 'SDUI_RESERVED_ATTRIBUTE_UNSUPPORTED', '$bindings não é permitido neste componente.', `${path}[1].$bindings`, fullContext);
    else if (!isRecord(bindingsRaw)) add(diagnostics, 'SDUI_BINDING_INVALID', '$bindings deve ser um objeto.', `${path}[1].$bindings`, fullContext);
    else for (const [name, value] of Object.entries(bindingsRaw)) {
      const bindingPath = `${path}[1].$bindings.${name}`;
      if (!bindingNames[typeValue]?.includes(name)) add(diagnostics, 'SDUI_BINDING_INVALID', `Binding '${name}' não permitido em ${typeValue}.`, bindingPath, fullContext);
      else if (!isRecord(value) || !nonBlank(value.path) || !knownPath(value.path) || (value.mode !== 'oneWay' && value.mode !== 'twoWay')) add(diagnostics, 'SDUI_BINDING_INVALID', 'Binding inválido.', bindingPath, fullContext);
      else if (value.mode === 'twoWay' && !value.path.startsWith('form.')) add(diagnostics, 'SDUI_BINDING_INVALID', 'Binding twoWay deve usar o namespace form.', bindingPath, fullContext);
      else if (!INPUT_TYPES.has(typeValue) && value.mode !== 'oneWay') add(diagnostics, 'SDUI_BINDING_INVALID', `Binding de ${typeValue} deve usar oneWay.`, bindingPath, fullContext);
      else bindings[name] = value as never;
    }
  }
  if (contract.requiredBinding && !bindings[contract.requiredBinding]) add(diagnostics, 'SDUI_BINDING_INVALID', `$bindings.${contract.requiredBinding} é obrigatório em ${typeValue}.`, `${path}[1].$bindings.${contract.requiredBinding}`, fullContext);

  const events: Record<string, SduiEvent> = {};
  const eventsRaw = attributesRaw.$events;
  if (eventsRaw !== undefined) {
    if (!contract.reserved.includes('$events')) add(diagnostics, 'SDUI_RESERVED_ATTRIBUTE_UNSUPPORTED', '$events não é permitido neste componente.', `${path}[1].$events`, fullContext);
    else if (!isRecord(eventsRaw)) add(diagnostics, 'SDUI_EVENT_INVALID', '$events deve ser um objeto.', `${path}[1].$events`, fullContext);
    else for (const [name, value] of Object.entries(eventsRaw)) {
      if (!contract.events.includes(name) || !isRecord(value) || !nonBlank(value.action) || !VALID_ACTIONS.includes(value.action as never)) add(diagnostics, 'SDUI_EVENT_INVALID', `Evento '${name}' inválido para ${typeValue}.`, `${path}[1].$events.${name}`, fullContext);
      else events[name] = value as unknown as SduiEvent;
    }
  }
  if ((typeValue === 'ui.button' || typeValue === 'ui.link') && !events.onPress) add(diagnostics, 'SDUI_EVENT_INVALID', '$events.onPress é obrigatório.', `${path}[1].$events.onPress`, fullContext);
  if (typeValue === 'ui.alert' && events.onDismiss && attributesRaw.dismissible !== true) add(diagnostics, 'SDUI_EVENT_INVALID', '$events.onDismiss exige dismissible: true.', `${path}[1].$events.onDismiss`, fullContext);
  if (typeValue === 'ui.stack' && attributesRaw.direction !== undefined && !['vertical', 'horizontal'].includes(String(attributesRaw.direction))) add(diagnostics, 'SDUI_PROP_INVALID', 'direction deve ser vertical ou horizontal.', `${path}[1].direction`, fullContext);
  if (typeValue === 'ui.stack' && attributesRaw.alignment !== undefined && !['start', 'center', 'end', 'stretch'].includes(String(attributesRaw.alignment))) add(diagnostics, 'SDUI_PROP_INVALID', 'alignment inválido.', `${path}[1].alignment`, fullContext);
  if (typeValue === 'ui.datePicker' && !['date', 'time', 'dateTime'].includes(String(attributesRaw.mode))) add(diagnostics, 'SDUI_PROP_INVALID', 'mode deve ser date, time ou dateTime.', `${path}[1].mode`, fullContext);
  if (typeValue === 'ui.progress' && (typeof attributesRaw.value !== 'number' || attributesRaw.value < 0 || attributesRaw.value > 1)) add(diagnostics, 'SDUI_PROP_INVALID', 'value deve ser numérico entre 0 e 1.', `${path}[1].value`, fullContext);
  if (typeValue === 'ui.select' && (!Array.isArray(attributesRaw.options) || attributesRaw.options.some((option) => !isRecord(option) || !nonBlank(option.value) || !nonBlank(option.label)))) add(diagnostics, 'SDUI_PROP_INVALID', 'Cada opção deve possuir value e label não vazios.', `${path}[1].options`, fullContext);

  const visibility = attributesRaw.$visibility === undefined ? null : condition(attributesRaw.$visibility, `${path}[1].$visibility`, diagnostics, fullContext);
  const active = attributesRaw.$active === undefined ? null : condition(attributesRaw.$active, `${path}[1].$active`, diagnostics, fullContext);
  const children: SduiNode[] = [];
  if (contract.container) {
    const childrenRaw = raw[2];
    if (!Array.isArray(childrenRaw)) add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'A terceira posição deve ser uma lista de filhos.', `${path}[2]`, fullContext);
    else childrenRaw.forEach((child, index) => { const parsed = node(child, `${path}[2][${index}]`, diagnostics, ids, uiStepId, typeValue); if (parsed) children.push(parsed); });
  }
  if (!id || !nonBlank(version) || !SEMVER.test(version)) return null;
  const attributes = Object.fromEntries(Object.entries(attributesRaw).filter(([key]) => !key.startsWith('$') && key !== 'id' && key !== 'version'));
  return { id, type: typeValue, version: version as ComponentVersion, attributes, bindings: bindings as never, events, visibility, active, children };
}

const snapshotLike = (value: unknown): value is Record<string, unknown> => isRecord(value);
export function parseSduiDocument(input: unknown): ParsedSduiDocument {
  const diagnostics: ContractDiagnostic[] = [];
  const snapshot = snapshotLike(input);
  const uiStepId = snapshot && nonBlank(input.uiStepId) ? input.uiStepId : undefined;
  const rawRoot = snapshot ? input.data : input;
  if (snapshot) {
    for (const field of ['schemaVersion', 'catalogVersion', 'journeyId', 'uiStepId', 'status', 'publishedAt']) if (!nonBlank(input[field])) add(diagnostics, 'SDUI_DOCUMENT_INVALID', `O campo '${field}' é obrigatório.`, `$.${field}`, { uiStepId });
    for (const field of ['schemaVersion', 'catalogVersion']) if (nonBlank(input[field]) && !SEMVER.test(input[field])) add(diagnostics, 'SDUI_COMPONENT_VERSION_UNSUPPORTED', `${field} deve usar SemVer completo.`, `$.${field}`, { uiStepId });
    if (!Number.isInteger(input.journeyVersion) || Number(input.journeyVersion) < 1) add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'journeyVersion deve ser um inteiro positivo.', '$.journeyVersion', { uiStepId });
    if (input.status !== 'published' && input.status !== 'deprecated') add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'status deve ser published ou deprecated.', '$.status', { uiStepId });
    if (!Array.isArray(input.supportedTargets) || input.supportedTargets.some((target) => !RENDER_TARGETS.includes(target as never))) add(diagnostics, 'SDUI_TARGET_UNSUPPORTED', 'supportedTargets contém alvo inválido.', '$.supportedTargets', { uiStepId });
    if (!isRecord(input.minRendererVersion)) add(diagnostics, 'SDUI_RENDERER_VERSION_UNSUPPORTED', 'minRendererVersion deve ser um objeto.', '$.minRendererVersion', { uiStepId });
    else for (const target of Array.isArray(input.supportedTargets) ? input.supportedTargets : []) {
      const minimum = input.minRendererVersion[String(target)];
      if (!nonBlank(minimum) || !SEMVER.test(minimum)) add(diagnostics, 'SDUI_RENDERER_VERSION_UNSUPPORTED', `Versão mínima inválida para '${String(target)}'.`, `$.minRendererVersion.${String(target)}`, { uiStepId });
    }
    if (nonBlank(input.publishedAt) && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(input.publishedAt) || Number.isNaN(Date.parse(input.publishedAt)))) add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'publishedAt deve usar ISO 8601 UTC.', '$.publishedAt', { uiStepId });
    if (!isRecord(input.dataSources) || Object.keys(input.dataSources).length > 0) add(diagnostics, 'SDUI_DOCUMENT_INVALID', 'dataSources deve ser {} no v1.', '$.dataSources', { uiStepId });
    const allowed = new Set(['schemaVersion','catalogVersion','journeyId','journeyVersion','uiStepId','status','publishedAt','supportedTargets','minRendererVersion','dataSources','data']);
    for (const key of Object.keys(input)) if (!allowed.has(key)) add(diagnostics, 'SDUI_PROP_UNSUPPORTED', `Campo de envelope não suportado: '${key}'.`, `$.${key}`, { uiStepId });
  }
  const root = node(rawRoot, snapshot ? '$.data' : '$', diagnostics, new Set(), uiStepId);
  if (root?.type !== 'ui.screen') add(diagnostics, 'SDUI_ROOT_INVALID', 'A raiz deve ser exatamente ui.screen.', snapshot ? '$.data[0]' : '$[0]', { uiStepId, componentId: root?.id, componentType: root?.type });
  const valid = diagnostics.every((item) => item.severity !== 'error') && root?.type === 'ui.screen';
  return { document: valid ? input as SduiDocument : null, root: root?.type === 'ui.screen' ? root as SduiNode<'ui.screen'> : null, diagnostics, valid };
}

export function assertSduiDocument(input: unknown): SduiDocument {
  const parsed = parseSduiDocument(input);
  if (!parsed.valid || !parsed.document) throw new Error(`Documento SDUI inválido: ${parsed.diagnostics.map((d) => `${d.code} (${d.path})`).join('; ')}`);
  return parsed.document;
}
export function rootOf(document: SduiDocument): SduiNode<'ui.screen'> {
  const parsed = parseSduiDocument(document);
  if (!parsed.valid || !parsed.root) throw new Error('Documento SDUI inválido.');
  return parsed.root;
}
export function walkSdui(root: SduiNode, visit: (node: SduiNode, parent: SduiNode | null) => void): void {
  const walk = (current: SduiNode, parent: SduiNode | null): void => { visit(current, parent); current.children.forEach((child) => walk(child, current)); };
  walk(root, null);
}
