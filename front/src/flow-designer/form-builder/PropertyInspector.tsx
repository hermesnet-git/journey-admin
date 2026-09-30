import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CircleHelp, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import { ToggleSwitch, gridInputStyle } from '../PropertyGrid';
import { VariablePickerButton, insertTokenAtCursor } from '../PropertiesPanel';
import { bareDataName, sduiVariablePath, type VariableOrigin } from '../model';
import type { ComponentDefinition, PropDescriptor } from '../../api/componentDefinitions';
import { tokenOptionsForGroup, tokensForGroup } from '../../sdui/designTokens';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import type { SduiNode } from '../../sdui/model';
import { ENABLED_WHEN, type SelectListActionConfig } from '../../sdui/selectList';
import type { ChannelType } from '../../api/products';
import { BindingEditor } from './BindingEditor';
import { ActionEditor } from './ActionEditor';
import { ConditionEditor } from './ConditionEditor';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';
import { PROPERTY_GROUP_ORDER, propertyPresentation, type PropertyPresentation } from './propertyPresentation';

export type InspectorSection = 'identification' | 'configuration' | 'advancedProperties' | 'bindings' | 'events' | 'visibility' | 'active';

export interface InspectorFocusRequest {
  id: string;
  section: InspectorSection;
  field?: string;
}

function OptionsListEditor({ value, onChange }: { value: { label: string; value: string }[]; onChange: (next: { label: string; value: string }[]) => void }) {
  const { c } = useFlowTheme();
  return (
    <div className="flex flex-col gap-[4px]" style={{ width: '100%' }}>
      {value.map((opt, i) => (
        <div key={i} className="flex gap-1">
          <input
            style={{ ...gridInputStyle(c), flex: 1 }}
            placeholder="Rótulo"
            value={opt.label}
            onChange={(e) => onChange(value.map((o, oi) => (oi === i ? { ...o, label: e.target.value } : o)))}
          />
          <input
            style={{ ...gridInputStyle(c), flex: 1 }}
            placeholder="Valor"
            value={opt.value}
            onChange={(e) => onChange(value.map((o, oi) => (oi === i ? { ...o, value: e.target.value } : o)))}
          />
          <button
            onClick={() => onChange(value.filter((_, oi) => oi !== i))}
            className="w-[22px] h-[22px] rounded flex items-center justify-center border-0 cursor-pointer shrink-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...value, { label: '', value: '' }])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start"
        style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}
      >
        <Plus size={12} /> Opção
      </button>
    </div>
  );
}

/** Texto de item da lista de seleção: combina texto com campos do item ({{item.campo}}) e, se
 * precisar, variáveis da jornada. Os campos do item vêm da lista vinculada em "itens". */
function ItemTemplateEditor({ value, itemFields, variables, onChange }: { value: string; itemFields: string[]; variables: VariableOrigin[]; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-col gap-1" style={{ width: '100%' }}>
      <span className="flex gap-1 items-center">
        <input ref={ref} style={{ ...gridInputStyle(c), flex: 1 }} value={value} placeholder="{{item.campo}}" onChange={(e) => onChange(e.target.value)} />
        <VariablePickerButton variables={variables.filter((v) => v.type !== 'list')} tokenFor={(v) => sduiVariablePath(v.kind, v.kind === 'data' ? bareDataName(v.name) : v.name)}
          onInsert={(token) => insertTokenAtCursor(ref.current, value, token, onChange)} />
      </span>
      {itemFields.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {itemFields.map((field) => (
            <button key={field} type="button" onClick={() => insertTokenAtCursor(ref.current, value, `{{item.${field}}}`, onChange)}
              className="rounded px-1.5 py-0.5 border-0 cursor-pointer text-[10px] font-mono" style={{ background: c.chipBg, color: c.textPrimary }}
              title="Inserir este campo do item">
              {field}
            </button>
          ))}
        </span>
      ) : (
        <span className="text-[10px]" style={{ color: c.textSecondary }}>Vincule os itens a uma lista para ver os campos do item.</span>
      )}
    </div>
  );
}

const ACTION_VARIANT_LABEL: Record<string, string> = { primary: 'Principal', secondary: 'Secundário', danger: 'Destrutivo' };

/** Ações sobre o item escolhido: rótulo, estilo e a regra "liberada quando", que compara um campo do
 * item vindo da integração (a regra de negócio é do sistema de origem, não da tela). */
function ActionListEditor({ value, itemFields, onChange }: { value: SelectListActionConfig[]; itemFields: string[]; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  function update(index: number, patch: Partial<SelectListActionConfig>) {
    onChange(value.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }
  return (
    <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
      {value.map((action, index) => {
        const rule = action.enabledWhen?.match(ENABLED_WHEN);
        const ruleField = rule?.[1] ?? '';
        const ruleOperator = rule?.[2] ?? '==';
        const ruleValue = rule?.[3] ?? 'true';
        const composeRule = (field: string, operator: string, literal: string) =>
          field ? `{{item.${field}}} ${operator} ${/^(true|false|-?\d+(\.\d+)?|".*")$/.test(literal) ? literal : `"${literal}"`}` : '';
        return (
          <div key={index} className="rounded-md p-1.5 flex flex-col gap-1" style={{ border: `1px solid ${c.border}` }}>
            <div className="flex gap-1">
              <input style={{ ...gridInputStyle(c), flex: '0 0 30%', fontFamily: 'monospace' }} placeholder="id" value={action.id}
                onChange={(e) => update(index, { id: e.target.value })} title="Valor gravado quando o usuário escolhe esta ação" />
              <input style={{ ...gridInputStyle(c), flex: 1 }} placeholder="Rótulo do botão" value={action.label}
                onChange={(e) => update(index, { label: e.target.value })} />
              <button onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="w-[22px] h-[22px] rounded flex items-center justify-center border-0 cursor-pointer shrink-0" style={{ background: 'transparent', color: c.textSecondary }}>
                <X size={12} />
              </button>
            </div>
            <div className="flex gap-1 items-center">
              <select style={{ ...gridInputStyle(c), flex: '0 0 30%', cursor: 'pointer' }} value={action.variant ?? 'primary'}
                onChange={(e) => update(index, { variant: e.target.value as SelectListActionConfig['variant'] })}>
                {Object.entries(ACTION_VARIANT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="text-[10px] shrink-0" style={{ color: c.textSecondary }}>liberada quando</span>
              <select style={{ ...gridInputStyle(c), flex: 1, cursor: 'pointer' }} value={ruleField}
                onChange={(e) => update(index, { enabledWhen: composeRule(e.target.value, ruleOperator, ruleValue) })}>
                <option value="">sempre</option>
                {[...new Set([...itemFields, ...(ruleField ? [ruleField] : [])])].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {ruleField && (
              <div className="flex gap-1 items-center">
                <select style={{ ...gridInputStyle(c), flex: '0 0 30%', cursor: 'pointer' }} value={ruleOperator}
                  onChange={(e) => update(index, { enabledWhen: composeRule(ruleField, e.target.value, ruleValue) })}>
                  <option value="==">for igual a</option>
                  <option value="!=">for diferente de</option>
                </select>
                <input style={{ ...gridInputStyle(c), flex: 1, fontFamily: 'monospace' }} value={ruleValue.startsWith('"') ? ruleValue.slice(1, -1) : ruleValue}
                  onChange={(e) => update(index, { enabledWhen: composeRule(ruleField, ruleOperator, e.target.value) })}
                  title="true, false, um número ou um texto" />
              </div>
            )}
          </div>
        );
      })}
      <button onClick={() => onChange([...value, { id: '', label: '', variant: 'primary', enabledWhen: '' }])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start" style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}>
        <Plus size={12} /> Ação
      </button>
    </div>
  );
}

interface ValidationRule {
  rule: string;
  value?: unknown;
  message: string;
}

function ValidationListEditor({ value, onChange }: { value: ValidationRule[]; onChange: (next: ValidationRule[]) => void }) {
  const { c } = useFlowTheme();
  return (
    <div className="flex flex-col gap-[4px]" style={{ width: '100%' }}>
      {value.map((rule, i) => (
        <div key={i} className="flex gap-1">
          <input
            style={{ ...gridInputStyle(c), flex: '0 0 32%' }}
            placeholder="regra (ex.: required)"
            value={rule.rule}
            onChange={(e) => onChange(value.map((r, ri) => (ri === i ? { ...r, rule: e.target.value } : r)))}
          />
          <input
            style={{ ...gridInputStyle(c), flex: '0 0 20%' }}
            placeholder="valor"
            value={rule.value === undefined ? '' : String(rule.value)}
            onChange={(e) => onChange(value.map((r, ri) => (ri === i ? { ...r, value: e.target.value } : r)))}
          />
          <input
            style={{ ...gridInputStyle(c), flex: 1 }}
            placeholder="mensagem"
            value={rule.message}
            onChange={(e) => onChange(value.map((r, ri) => (ri === i ? { ...r, message: e.target.value } : r)))}
          />
          <button
            onClick={() => onChange(value.filter((_, ri) => ri !== i))}
            className="w-[22px] h-[22px] rounded flex items-center justify-center border-0 cursor-pointer shrink-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...value, { rule: 'required', message: '' }])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start"
        style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}
      >
        <Plus size={12} /> Regra de validação
      </button>
    </div>
  );
}

/** Propriedades de texto que aceitam variável no meio do conteúdo — as cinco que a seção 7.2 do
 * catálogo homologa ("aceitam texto literal ou placeholder seguro"). "Variante", "alinhamento" e
 * afins ficam de fora: carregam intenção visual, onde um {{...}} não significaria nada. */
const PROPS_QUE_ACEITAM_VARIAVEL = new Set(['label', 'placeholder', 'title', 'message', 'text']);

function PropField({ prop, presentation, value, variables, itemFields, onChange }: { prop: PropDescriptor; presentation: PropertyPresentation; value: unknown; variables: VariableOrigin[]; itemFields: string[]; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  const textRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Campo do item gravado na seleção: escolhe entre os campos conhecidos da lista, quando há.
  if (prop.name === 'itemValue' && itemFields.length > 0) {
    return (
      <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione o campo…</option>
        {itemFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    );
  }
  switch (prop.kind) {
    case 'ITEM_TEMPLATE':
      return <ItemTemplateEditor value={typeof value === 'string' ? value : ''} itemFields={itemFields} variables={variables} onChange={onChange} />;
    case 'ACTION_LIST':
      return <ActionListEditor value={Array.isArray(value) ? (value as SelectListActionConfig[]) : []} itemFields={itemFields} onChange={onChange} />;
    case 'BOOLEAN':
      return <ToggleSwitch checked={value === true} onChange={onChange} />;
    case 'NUMBER':
      return (
        <input
          type="number"
          style={gridInputStyle(c)}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
    case 'ENUM':
      return (
        <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">...</option>
          {(prop.enumValues ?? []).map((v) => (
            <option key={v} value={v}>
              {presentation.enumLabels?.[v] ?? v}
            </option>
          ))}
        </select>
      );
    case 'TOKEN': {
      const tokens = tokenOptionsForGroup(prop.tokenGroup);
      return (
        <select
          style={{ ...gridInputStyle(c), cursor: 'pointer' }}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          title={typeof value === 'string' ? value : undefined}
        >
          <option value="">Usar padrão do componente</option>
          {tokens.map((token) => (
            <option key={token.value} value={token.value} title={token.value}>
              {token.label}
            </option>
          ))}
        </select>
      );
    }
    case 'OPTIONS_LIST':
      return <OptionsListEditor value={Array.isArray(value) ? (value as { label: string; value: string }[]) : []} onChange={onChange} />;
    case 'VALIDATION_LIST':
      return <ValidationListEditor value={Array.isArray(value) ? (value as ValidationRule[]) : []} onChange={onChange} />;
    case 'TEXT':
    default: {
      const text = typeof value === 'string' ? value : '';
      const picker = PROPS_QUE_ACEITAM_VARIAVEL.has(prop.name) ? (
        <VariablePickerButton
          variables={variables}
          tokenFor={(v) => sduiVariablePath(v.kind, v.name)}
          onInsert={(token) => insertTokenAtCursor(presentation.multiline ? textareaRef.current : textRef.current, text, token, onChange)}
        />
      ) : null;
      if (presentation.multiline) {
        return (
          <span className="flex gap-1 items-start" style={{ width: '100%' }}>
            <textarea ref={textareaRef} style={{ ...gridInputStyle(c), flex: 1, height: 68, resize: 'vertical', padding: '7px 8px' }} value={text} onChange={(e) => onChange(e.target.value)} />
            {picker}
          </span>
        );
      }
      return (
        <span className="flex gap-1 items-center" style={{ width: '100%' }}>
          <input ref={textRef} style={{ ...gridInputStyle(c), flex: 1 }} value={text} onChange={(e) => onChange(e.target.value)} />
          {picker}
        </span>
      );
    }
  }
}

function InspectorHeader({ node, definition, designChannel }: { node: SduiNode; definition: ComponentDefinition; designChannel: DesignChannel }) {
  const { c } = useFlowTheme();
  const Icon = iconFor(node.type);
  return (
    <div className="flex items-center gap-2.5 p-3 shrink-0" style={{ borderBottom: `1px solid ${c.border}` }}>
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}>
        <Icon size={17} color={c.accent} strokeWidth={1.8} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold truncate" style={{ color: c.textPrimary }}>{labelFor(node.type)}</span>
        <span className="block mt-0.5 font-mono text-[9px] truncate" style={{ color: c.textSecondary }}>{node.type} · v{node.version}</span>
      </span>
      <span className="rounded-full px-2 py-1 text-[8.5px] font-semibold" style={{ color: c.accent, background: c.accentSoft }}>{designChannel}</span>
      {definition.origin === 'CUSTOM' && <span className="rounded px-1.5 py-1 text-[8px]" style={{ color: c.textSecondary, background: c.chipBg }}>Customizado</span>}
    </div>
  );
}

/** Painel de propriedades do componente SDUI selecionado — sucessor de FormFieldConfigPanel.tsx:
 * schema de props vem de ComponentDefinition.propsSchema (Component Registry), não de uma lista
 * curada em código. Bindings/events/visibility ganham editores estruturados dedicados (pedido
 * explícito: aderência total ao contrato, sem cair pra JSON bruto). */
export function PropertyInspector({
  root,
  node,
  definition,
  variables,
  channelTypes,
  designChannel,
  reservedNodeIds,
  focusRequest,
  onRenameNode,
  onUpdateProps,
  onUpdateBindings,
  onUpdateEvents,
  onUpdateVisibility,
  onUpdateActive,
}: {
  /** Árvore inteira da tela em edição — usada só pra sugerir caminhos `form.*` já usados por outros
   * campos da mesma tela no editor de binding (BindingEditor). */
  root: SduiNode | null;
  node: SduiNode | null;
  definition: ComponentDefinition | null;
  variables: VariableOrigin[];
  channelTypes: ChannelType[];
  designChannel: DesignChannel;
  reservedNodeIds: Set<string>;
  focusRequest?: InspectorFocusRequest | null;
  onRenameNode: (nextId: string) => void;
  onUpdateProps: (patch: Record<string, unknown>) => void;
  onUpdateBindings: (bindings: SduiNode['bindings']) => void;
  onUpdateEvents: (events: SduiNode['events']) => void;
  onUpdateVisibility: (visibility: SduiNode['visibility']) => void;
  onUpdateActive: (active: SduiNode['active']) => void;
}) {
  const { c } = useFlowTheme();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['advancedProperties', 'bindings', 'events', 'visibility', 'active']));
  const [draftNodeId, setDraftNodeId] = useState(node?.id ?? '');
  const propertyItems = useMemo(() => PROPERTY_GROUP_ORDER.flatMap((group) => (
    definition?.propsSchema
      .map((prop) => ({ prop, presentation: propertyPresentation(node?.type ?? '', prop) }))
      .filter((item) => item.presentation.group === group) ?? []
  )), [definition, node?.type]);

  useEffect(() => {
    setDraftNodeId(node?.id ?? '');
  }, [node?.id]);

  useEffect(() => {
    if (!focusRequest) return undefined;

    // Abre a seção indicada pela pendência antes de mover o foco para o campo.
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(focusRequest.section);
      if (focusRequest.section === 'advancedProperties') {
        next.delete('configuration');
      }
      return next;
    });

    const timer = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;

      const sectionSelector = `[data-inspector-section="${focusRequest.section}"]`;
      const fieldSelector = focusRequest.field ? escapeDataAttribute(focusRequest.field) : null;
      let target = fieldSelector
        ? root.querySelector<HTMLElement>(`[data-property-field="${fieldSelector}"] input, [data-property-field="${fieldSelector}"] textarea, [data-property-field="${fieldSelector}"] select, [data-property-field="${fieldSelector}"] button`)
        : null;
      target = target
        ?? root.querySelector<HTMLElement>(`${sectionSelector} input, ${sectionSelector} textarea, ${sectionSelector} select, ${sectionSelector} button`)
        ?? root.querySelector<HTMLElement>(`${sectionSelector} button`);

      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusRequest?.id]);

  function toggleSection(section: string) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }

  function commitNodeId() {
    if (!node) return;
    const nextId = draftNodeId.trim();
    if (validateComponentName(nextId, reservedNodeIds)) return;
    if (nextId !== node.id) onRenameNode(nextId);
  }

  if (!node || !definition) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center" style={{ width: 320, borderLeft: `1px solid ${c.border}`, color: c.textSecondary, background: c.cardBg }}>
        <SlidersHorizontal size={22} strokeWidth={1.6} />
        <span className="mt-2 text-[11.5px] font-medium">Selecione um componente</span>
        <span className="mt-1 text-[10.5px]">As configurações disponíveis aparecerão aqui.</span>
      </div>
    );
  }

  const nodeIdError = validateComponentName(draftNodeId.trim(), reservedNodeIds);
  const itemsPath = node.bindings?.items?.path ?? '';
  const itemFields = itemsPath.startsWith('data.')
    ? variables.find((v) => v.type === 'list' && v.kind === 'data' && v.name === itemsPath.slice('data.'.length))?.fields ?? []
    : [];
  const bindingsConfig = bindingConfiguration(definition);
  const canConfigureBindings = definition.allowedReservedFields.includes('$bindings');
  const canConfigureEvents = definition.allowedReservedFields.includes('$events');
  const canConfigureVisibility = definition.allowedReservedFields.includes('$visibility');
  const canConfigureActive = definition.allowedReservedFields.includes('$active');
  const primaryPropertyItems = propertyItems.filter((item) => !item.presentation.advanced);
  const advancedPropertyItems = propertyItems.filter((item) => item.presentation.advanced);

  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-y-auto shrink-0" style={{ width: 320, borderLeft: `1px solid ${c.border}`, background: c.cardBg }}>
      <InspectorHeader node={node} definition={definition} designChannel={designChannel} />
      {compatibilityForDesignChannel(definition, designChannel) !== 'COMPATIBLE' && (
        <div
          className="flex items-center gap-[6px] px-3 py-[6px] shrink-0"
          style={{ background: c.dangerSoft, color: c.danger, fontSize: 11 }}
        >
          <AlertTriangle size={12} />
          {compatibilityMessage(compatibilityForDesignChannel(definition, designChannel), designChannel)}
        </div>
      )}

      <div className="py-2">
          <section data-inspector-section="identification" style={{ borderBottom: `1px solid ${c.border}` }}>
            <button
              type="button"
              onClick={() => toggleSection('identification')}
              className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left"
              style={{ color: c.textSecondary }}
            >
              {collapsedSections.has('identification') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Identificação</span>
              <span className="text-[9px]">1</span>
            </button>
            {!collapsedSections.has('identification') && (
              <div className="px-3 pb-3 flex flex-col gap-2">
              <label className="grid items-start gap-2" style={{ gridTemplateColumns: '112px minmax(0, 1fr)' }}>
                <span className="pt-[7px] text-[11px] font-medium" style={{ color: c.textSecondary }}>Nome</span>
                <span className="min-w-0">
                  <input
                    style={{ ...gridInputStyle(c), fontFamily: 'monospace', borderColor: nodeIdError ? c.danger : c.border }}
                    value={draftNodeId}
                    title={draftNodeId}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="sdui-node-id"
                    onChange={(event) => setDraftNodeId(event.target.value)}
                    onBlur={commitNodeId}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitNodeId();
                        event.currentTarget.blur();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setDraftNodeId(node.id);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  {nodeIdError && <span className="block mt-1" style={{ color: c.danger, fontSize: 10 }}>{nodeIdError}</span>}
                </span>
              </label>
              </div>
            )}
          </section>
          <section data-inspector-section="configuration" style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleSection('configuration')} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedSections.has('configuration') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Configurações</span>
                <span className="text-[9px]">{propertyItems.length}</span>
              </button>
              {!collapsedSections.has('configuration') && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {propertyItems.length === 0 && (
                    <div className="rounded-lg p-4 text-center text-[11px]" style={{ color: c.textSecondary, background: c.canvasBg }}>
                      Este componente não possui configurações.
                    </div>
                  )}
                  {primaryPropertyItems.map(({ prop, presentation }) => {
                    const fullWidth = presentation.multiline || prop.kind === 'OPTIONS_LIST' || prop.kind === 'VALIDATION_LIST' || prop.kind === 'ACTION_LIST' || prop.kind === 'ITEM_TEMPLATE';
                    const hasBinding = !!node.bindings?.[prop.name]?.path;
                    const bindable = bindingsConfig.names.includes(prop.name);
                    const error = propertyError(prop, node.props[prop.name], hasBinding, bindable);
                    return (
                      <label key={prop.name} data-property-field={prop.name} title={prop.name} className={fullWidth ? 'block' : 'grid items-center gap-2'} style={fullWidth ? undefined : { gridTemplateColumns: '112px minmax(0, 1fr)' }}>
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${fullWidth ? 'mb-1' : ''}`} style={{ color: c.textSecondary }}>
                          <span>{presentation.label}{prop.required && !hasBinding && <span style={{ color: c.danger }}> *</span>}</span>
                          {presentation.help && <span title={presentation.help} className="inline-flex"><CircleHelp size={11} /></span>}
                        </span>
                        <span className="min-w-0">
                          <PropField prop={prop} presentation={presentation} value={node.props[prop.name]} variables={variables} itemFields={itemFields} onChange={(value) => onUpdateProps({ [prop.name]: value })} />
                          {error && <span className="block mt-1" style={{ color: c.danger, fontSize: 10 }}>{error}</span>}
                        </span>
                      </label>
                    );
                  })}
                  {advancedPropertyItems.length > 0 && (
                    <div data-inspector-section="advancedProperties" className="mt-1 rounded-md" style={{ border: `1px solid ${c.border}`, background: c.canvasBg }}>
                      <button
                        type="button"
                        onClick={() => toggleSection('advancedProperties')}
                        className="w-full flex items-center gap-1.5 px-2 py-2 border-0 bg-transparent cursor-pointer text-left"
                        style={{ color: c.textSecondary }}
                      >
                        {collapsedSections.has('advancedProperties') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Avançado</span>
                        <span className="text-[9px]">{advancedPropertyItems.length}</span>
                      </button>
                      {!collapsedSections.has('advancedProperties') && (
                        <div className="px-2 pb-2 flex flex-col gap-2">
                          {advancedPropertyItems.map(({ prop, presentation }) => {
                            const fullWidth = presentation.multiline || prop.kind === 'OPTIONS_LIST' || prop.kind === 'VALIDATION_LIST' || prop.kind === 'ACTION_LIST' || prop.kind === 'ITEM_TEMPLATE';
                            const hasBinding = !!node.bindings?.[prop.name]?.path;
                            const bindable = bindingsConfig.names.includes(prop.name);
                            const error = propertyError(prop, node.props[prop.name], hasBinding, bindable);
                            return (
                              <label key={prop.name} data-property-field={prop.name} title={prop.name} className={fullWidth ? 'block' : 'grid items-center gap-2'} style={fullWidth ? undefined : { gridTemplateColumns: '104px minmax(0, 1fr)' }}>
                                <span className={`flex items-center gap-1 text-[11px] font-medium ${fullWidth ? 'mb-1' : ''}`} style={{ color: c.textSecondary }}>
                                  <span>{presentation.label}{prop.required && !hasBinding && <span style={{ color: c.danger }}> *</span>}</span>
                                  {presentation.help && <span title={presentation.help} className="inline-flex"><CircleHelp size={11} /></span>}
                                </span>
                                <span className="min-w-0">
                                  <PropField prop={prop} presentation={presentation} value={node.props[prop.name]} variables={variables} itemFields={itemFields} onChange={(value) => onUpdateProps({ [prop.name]: value })} />
                                  {error && <span className="block mt-1" style={{ color: c.danger, fontSize: 10 }}>{error}</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          {canConfigureBindings && (
            <section data-inspector-section="bindings" style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleSection('bindings')} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedSections.has('bindings') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Binding</span>
                <span className="text-[9px]">{bindingsConfig.names.length}</span>
              </button>
              {!collapsedSections.has('bindings') && (
                <BindingEditor
                  root={root}
                  bindings={node.bindings}
                  bindingNames={bindingsConfig.names}
                  requiredBindingNames={bindingsConfig.required}
                  fixedMode={bindingsConfig.mode}
                  modeByName={bindingsConfig.modeByName}
                  variables={variables}
                  onChange={onUpdateBindings}
                />
              )}
            </section>
          )}
          {canConfigureEvents && (
            <section data-inspector-section="events" style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleSection('events')} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedSections.has('events') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Ações</span>
                <span className="text-[9px]">{definition.events.length}</span>
              </button>
              {!collapsedSections.has('events') && (
                <ActionEditor availableEvents={definition.events} events={node.events} onChange={onUpdateEvents} />
              )}
            </section>
          )}
          {canConfigureVisibility && (
            <section data-inspector-section="visibility" style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleSection('visibility')} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedSections.has('visibility') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Visibilidade</span>
                <span className="text-[9px]">1</span>
              </button>
              {!collapsedSections.has('visibility') && (
                <ConditionEditor
                  visibility={node.visibility}
                  variables={variables}
                  channelTypes={channelTypes}
                  mode="visibility"
                  onChange={onUpdateVisibility}
                />
              )}
            </section>
          )}
          {canConfigureActive && (
            <section data-inspector-section="active" style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleSection('active')} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedSections.has('active') ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Estado</span>
                <span className="text-[9px]">1</span>
              </button>
              {!collapsedSections.has('active') && (
                <ConditionEditor
                  visibility={node.active}
                  variables={variables}
                  channelTypes={channelTypes}
                  mode="active"
                  onChange={onUpdateActive}
                />
              )}
            </section>
          )}
        </div>

    </div>
  );
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function escapeDataAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** O nome editável do componente é o `id` publicado no contrato SDUI; por isso precisa ser estável,
 * único na tela e seguro para referência por ferramentas e validações. */
function validateComponentName(value: string, reservedNodeIds: Set<string>): string | null {
  if (!value) return 'Informe um nome.';
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)) return 'Use letras, números, hífen ou sublinhado; comece por letra ou sublinhado.';
  if (reservedNodeIds.has(value)) return 'Já existe outro componente com este nome.';
  return null;
}

/** Antecipa no painel os erros determinísticos declarados no catálogo. A validação definitiva
 * continua no backend, mas o autor recebe o problema junto ao campo que precisa corrigir. */
function propertyError(prop: PropDescriptor, value: unknown, hasBinding: boolean, bindable: boolean): string | null {
  // Vinculada, a propriedade é preenchida em tempo de execução — o vínculo já satisfaz a
  // obrigatoriedade, sem exigir também um valor digitado (ver FormBuilder.collectAuthoringIssues,
  // mesma regra). Quando falta os dois, a mensagem explica as duas formas de resolver — não só
  // "preencha", porque vincular também é uma resposta válida aqui.
  if (prop.required && !hasBinding && isMissing(value)) {
    return bindable ? 'Preenchimento obrigatório: digite um valor ou vincule a um dado da jornada.' : 'Preenchimento obrigatório.';
  }
  if (isMissing(value)) return null;
  if (prop.kind === 'NUMBER' && (typeof value !== 'number' || !Number.isFinite(value))) return 'Informe um número válido.';
  if (prop.kind === 'ENUM' && !(prop.enumValues ?? []).includes(String(value))) return 'Escolha uma opção disponível.';
  if (prop.kind === 'TOKEN' && !tokensForGroup(prop.tokenGroup).includes(String(value))) return 'Escolha um valor previsto pelo design da interface.';
  if (prop.kind === 'OPTIONS_LIST' && Array.isArray(value) && value.some((option) => {
    if (!option || typeof option !== 'object') return true;
    const item = option as Record<string, unknown>;
    return !String(item.label ?? '').trim() || !String(item.value ?? '').trim();
  })) return 'Preencha o rótulo e o valor de todas as opções.';
  return null;
}

export function bindingConfiguration(definition: ComponentDefinition): {
  names: string[];
  required: string[];
  mode: 'oneWay' | 'twoWay' | null;
  modeByName?: Record<string, 'oneWay' | 'twoWay'>;
} {
  // Lista de seleção (ADR-002): lê os itens de uma lista e grava o item e a ação escolhidos.
  if (definition.type === 'ui.selectList') {
    return { names: ['items', 'value', 'action'], required: ['items', 'value'], mode: null, modeByName: { items: 'oneWay', value: 'twoWay', action: 'twoWay' } };
  }
  // Select: as opções podem vir de uma lista (fonte de dados da tela ou saída do tipo lista).
  if (definition.type === 'ui.select') {
    return { names: ['value', 'options'], required: ['value'], mode: null, modeByName: { value: 'twoWay', options: 'oneWay' } };
  }
  if (definition.category === 'INPUT') return { names: ['value'], required: ['value'], mode: 'twoWay' };
  if (definition.type === 'ui.text') return { names: ['text'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.image') return { names: ['source', 'alt'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.alert') return { names: ['title', 'message'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.progress') return { names: ['value'], required: [], mode: 'oneWay' };
  return { names: [], required: [], mode: null };
}
