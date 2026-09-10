import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CircleHelp, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import { ToggleSwitch, gridInputStyle } from '../PropertyGrid';
import type { VariableOrigin } from '../model';
import type { ComponentDefinition, PropDescriptor } from '../../api/componentDefinitions';
import { tokensForGroup } from '../../sdui/designTokens';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import type { SduiNode } from '../../sdui/model';
import type { ChannelType } from '../../api/products';
import { BindingEditor } from './BindingEditor';
import { ActionEditor } from './ActionEditor';
import { ConditionEditor } from './ConditionEditor';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';
import { PROPERTY_GROUP_LABEL, PROPERTY_GROUP_ORDER, propertyPresentation, type PropertyPresentation } from './propertyPresentation';

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
      const listId = `tokens-${prop.name}`;
      return (
        <>
          <input
            style={gridInputStyle(c)}
            list={listId}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={listId}>
            {tokensForGroup(prop.tokenGroup).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
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

type Tab = 'props' | 'bindings' | 'events' | 'visibility' | 'active';
const TABS: { key: Tab; label: string; reservedField?: '$bindings' | '$events' | '$visibility' | '$active' }[] = [
  { key: 'props', label: 'Propriedades' },
  { key: 'bindings', label: 'Valor', reservedField: '$bindings' },
  { key: 'events', label: 'Ações', reservedField: '$events' },
  { key: 'visibility', label: 'Visibilidade', reservedField: '$visibility' },
  { key: 'active', label: 'Estado', reservedField: '$active' },
];

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
  onUpdateProps: (patch: Record<string, unknown>) => void;
  onUpdateBindings: (bindings: SduiNode['bindings']) => void;
  onUpdateEvents: (events: SduiNode['events']) => void;
  onUpdateVisibility: (visibility: SduiNode['visibility']) => void;
  onUpdateActive: (active: SduiNode['active']) => void;
}) {
  const { c } = useFlowTheme();
  const [tab, setTab] = useState<Tab>('props');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const availableTabs = useMemo(
    () => TABS.filter((item) => !item.reservedField || definition?.allowedReservedFields.includes(item.reservedField)),
    [definition],
  );
  const propertyGroups = useMemo(() => PROPERTY_GROUP_ORDER.map((group) => ({
    group,
    items: definition?.propsSchema
      .map((prop) => ({ prop, presentation: propertyPresentation(node?.type ?? '', prop) }))
      .filter((item) => item.presentation.group === group) ?? [],
  })).filter((group) => group.items.length > 0), [definition, node?.type]);

  useEffect(() => {
    if (!availableTabs.some((item) => item.key === tab)) setTab('props');
  }, [availableTabs, tab]);

  function toggleGroup(group: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
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

  return (
    <div className="flex flex-col h-full overflow-y-auto shrink-0" style={{ width: 320, borderLeft: `1px solid ${c.border}`, background: c.cardBg }}>
      <InspectorHeader node={node} definition={definition} designChannel={designChannel} />
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${c.border}` }}>
        {availableTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 border-0 cursor-pointer"
            style={{
              padding: '8px 2px',
              fontSize: 10.5,
              fontWeight: 600,
              background: 'transparent',
              color: tab === t.key ? c.accent : c.textSecondary,
              borderBottom: `2px solid ${tab === t.key ? c.accent : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {compatibilityForDesignChannel(definition, designChannel) !== 'COMPATIBLE' && (
        <div
          className="flex items-center gap-[6px] px-3 py-[6px] shrink-0"
          style={{ background: c.dangerSoft, color: c.danger, fontSize: 11 }}
        >
          <AlertTriangle size={12} />
          {compatibilityMessage(compatibilityForDesignChannel(definition, designChannel), designChannel)}
        </div>
      )}

      {tab === 'props' && (
        <div className="py-2">
          {propertyGroups.map(({ group, items }) => (
            <section key={group} style={{ borderBottom: `1px solid ${c.border}` }}>
              <button type="button" onClick={() => toggleGroup(group)} className="w-full flex items-center gap-1.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
                {collapsedGroups.has(group) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">{PROPERTY_GROUP_LABEL[group]}</span>
                <span className="text-[9px]">{items.length}</span>
              </button>
              {!collapsedGroups.has(group) && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {items.map(({ prop, presentation }) => {
                    const fullWidth = presentation.multiline || prop.kind === 'OPTIONS_LIST' || prop.kind === 'VALIDATION_LIST';
                    return (
                      <label key={prop.name} title={prop.name} className={fullWidth ? 'block' : 'grid items-center gap-2'} style={fullWidth ? undefined : { gridTemplateColumns: '112px minmax(0, 1fr)' }}>
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${fullWidth ? 'mb-1' : ''}`} style={{ color: c.textSecondary }}>
                          <span>{presentation.label}{prop.required && <span style={{ color: c.danger }}> *</span>}</span>
                          {presentation.help && <span title={presentation.help} className="inline-flex"><CircleHelp size={11} /></span>}
                        </span>
                        <span className="min-w-0">
                          <PropField prop={prop} presentation={presentation} value={node.props[prop.name]} onChange={(value) => onUpdateProps({ [prop.name]: value })} />
                          {prop.required && isMissing(node.props[prop.name]) && (
                            <span className="block mt-1" style={{ color: c.danger, fontSize: 10 }}>Preenchimento obrigatório.</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
          {definition.propsSchema.length === 0 && (
            <div className="m-3 rounded-lg p-4 text-center text-[11px]" style={{ color: c.textSecondary, background: c.canvasBg }}>
              Este componente não possui propriedades configuráveis.
            </div>
          )}
        </div>
      )}

      {tab === 'bindings' && (
        <BindingEditor
          bindings={node.bindings}
          bindingNames={bindingConfiguration(definition).names}
          requiredBindingNames={bindingConfiguration(definition).required}
          fixedMode={bindingConfiguration(definition).mode}
          variables={variables}
          onChange={onUpdateBindings}
        />
      )}

      {tab === 'events' && (
        <ActionEditor availableEvents={definition.events} events={node.events} onChange={onUpdateEvents} />
      )}

      {tab === 'visibility' && (
        <ConditionEditor
          visibility={node.visibility}
          variables={variables}
          channelTypes={channelTypes}
          onChange={onUpdateVisibility}
        />
      )}

      {tab === 'active' && (
        <ConditionEditor
          visibility={node.active}
          variables={variables}
          channelTypes={channelTypes}
          onChange={onUpdateActive}
        />
      )}
    </div>
  );
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
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
