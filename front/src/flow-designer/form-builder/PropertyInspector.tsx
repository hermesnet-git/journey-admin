import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CircleHelp, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import { ToggleSwitch, gridInputStyle } from '../PropertyGrid';
import type { VariableOrigin } from '../model';
import type { ComponentDefinition, PropDescriptor } from '../../api/componentDefinitions';
import { tokenOptionsForGroup, tokensForGroup } from '../../sdui/designTokens';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import type { SduiNode } from '../../sdui/model';
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

function PropField({ prop, presentation, value, onChange }: { prop: PropDescriptor; presentation: PropertyPresentation; value: unknown; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  switch (prop.kind) {
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
    default:
      if (presentation.multiline) {
        return <textarea style={{ ...gridInputStyle(c), height: 68, resize: 'vertical', padding: '7px 8px' }} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
      }
      return <input style={gridInputStyle(c)} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
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
                    const fullWidth = presentation.multiline || prop.kind === 'OPTIONS_LIST' || prop.kind === 'VALIDATION_LIST';
                    const error = propertyError(prop, node.props[prop.name]);
                    return (
                      <label key={prop.name} data-property-field={prop.name} title={prop.name} className={fullWidth ? 'block' : 'grid items-center gap-2'} style={fullWidth ? undefined : { gridTemplateColumns: '112px minmax(0, 1fr)' }}>
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${fullWidth ? 'mb-1' : ''}`} style={{ color: c.textSecondary }}>
                          <span>{presentation.label}{prop.required && <span style={{ color: c.danger }}> *</span>}</span>
                          {presentation.help && <span title={presentation.help} className="inline-flex"><CircleHelp size={11} /></span>}
                        </span>
                        <span className="min-w-0">
                          <PropField prop={prop} presentation={presentation} value={node.props[prop.name]} onChange={(value) => onUpdateProps({ [prop.name]: value })} />
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
                            const fullWidth = presentation.multiline || prop.kind === 'OPTIONS_LIST' || prop.kind === 'VALIDATION_LIST';
                            const error = propertyError(prop, node.props[prop.name]);
                            return (
                              <label key={prop.name} data-property-field={prop.name} title={prop.name} className={fullWidth ? 'block' : 'grid items-center gap-2'} style={fullWidth ? undefined : { gridTemplateColumns: '104px minmax(0, 1fr)' }}>
                                <span className={`flex items-center gap-1 text-[11px] font-medium ${fullWidth ? 'mb-1' : ''}`} style={{ color: c.textSecondary }}>
                                  <span>{presentation.label}{prop.required && <span style={{ color: c.danger }}> *</span>}</span>
                                  {presentation.help && <span title={presentation.help} className="inline-flex"><CircleHelp size={11} /></span>}
                                </span>
                                <span className="min-w-0">
                                  <PropField prop={prop} presentation={presentation} value={node.props[prop.name]} onChange={(value) => onUpdateProps({ [prop.name]: value })} />
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
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Valor</span>
                <span className="text-[9px]">{bindingsConfig.names.length}</span>
              </button>
              {!collapsedSections.has('bindings') && (
                <BindingEditor
                  bindings={node.bindings}
                  bindingNames={bindingsConfig.names}
                  requiredBindingNames={bindingsConfig.required}
                  fixedMode={bindingsConfig.mode}
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
function propertyError(prop: PropDescriptor, value: unknown): string | null {
  if (prop.required && isMissing(value)) return 'Preenchimento obrigatório.';
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

function bindingConfiguration(definition: ComponentDefinition): {
  names: string[];
  required: string[];
  mode: 'oneWay' | 'twoWay' | null;
} {
  if (definition.category === 'INPUT') return { names: ['value'], required: ['value'], mode: 'twoWay' };
  if (definition.type === 'ui.text') return { names: ['text'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.image') return { names: ['source', 'alt'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.alert') return { names: ['title', 'message'], required: [], mode: 'oneWay' };
  if (definition.type === 'ui.progress') return { names: ['value'], required: [], mode: 'oneWay' };
  return { names: [], required: [], mode: null };
}
