import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
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
import { ACTION_LABEL, ActionEditor, EVENT_LABEL } from './ActionEditor';
import { ConditionEditor } from './ConditionEditor';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';
import { PROPERTY_GROUP_ORDER, propertyPresentation, type PropertyPresentation } from './propertyPresentation';

export type InspectorSection = 'identification' | 'configuration' | 'advancedProperties' | 'bindings' | 'events' | 'visibility' | 'active';

export interface InspectorFocusRequest {
  id: string;
  section: InspectorSection;
  field?: string;
}

type SelectOption = { label: string; value: string; disabled?: boolean };

function OptionsListEditor({ value, onChange }: { value: SelectOption[]; onChange: (next: SelectOption[]) => void }) {
  const { c } = useFlowTheme();
  return (
    <div className="flex flex-col gap-[6px]" style={{ width: '100%' }}>
      {value.map((opt, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          <div className="flex gap-1">
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
          {/* Catálogo §7.1.3: cada opção pode declarar disabled. */}
          <label className="flex items-center gap-1 text-[10.5px] cursor-pointer self-start" style={{ color: c.textSecondary }}>
            <input
              type="checkbox"
              checked={opt.disabled === true}
              onChange={(e) => onChange(value.map((o, oi) => {
                if (oi !== i) return o;
                const { disabled: _disabled, ...rest } = o;
                return e.target.checked ? { ...rest, disabled: true } : rest;
              }))}
            />
            Opção desabilitada
          </label>
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

const ITEM_FIELDS_SOURCE = '__item__';

/** Um só botão para os dois tipos de campo do texto do item: primeiro os campos de cada item (mudam
 * de um item para outro, {{item.campo}}), depois os dados da jornada (iguais para todos os itens). */
function templateVariables(itemFields: string[], variables: VariableOrigin[]): VariableOrigin[] {
  const journey = variables
    .filter((v) => v.type !== 'list')
    .map((v) => ({ ...v, sourceLabel: 'Dados da jornada' }))
    .filter((v, index, all) => all.findIndex((other) => templateToken(other) === templateToken(v)) === index);
  return [
    ...itemFields.map((name): VariableOrigin => ({ name, label: name, type: 'string', kind: 'data', sourceNodeId: ITEM_FIELDS_SOURCE, sourceLabel: 'Campos de cada item' })),
    ...journey,
  ];
}

function templateToken(v: VariableOrigin): string {
  return v.sourceNodeId === ITEM_FIELDS_SOURCE ? `item.${v.name}` : sduiVariablePath(v.kind, v.kind === 'data' ? bareDataName(v.name) : v.name);
}

function ItemFieldsHint({ itemFields }: { itemFields: string[] }) {
  const { c } = useFlowTheme();
  if (itemFields.length > 0) return null;
  return <span className="text-[10px]" style={{ color: c.textSecondary }}>Vincule os itens a uma lista para ver os campos do item.</span>;
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
        <VariablePickerButton variables={templateVariables(itemFields, variables)} tokenFor={templateToken}
          onInsert={(token) => insertTokenAtCursor(ref.current, value, token, onChange)} />
      </span>
      <ItemFieldsHint itemFields={itemFields} />
    </div>
  );
}

/** Descrição do item em linhas: cada linha aparece embaixo da anterior no canal. Grava um texto só,
 * com quebra de linha entre as linhas. */
function ItemLinesEditor({ value, itemFields, variables, onChange }: { value: string; itemFields: string[]; variables: VariableOrigin[]; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const lines = value === '' ? [''] : value.split('\n');
  const setLines = (next: string[]) => onChange(next.join('\n'));
  const setLine = (index: number, text: string) => setLines(lines.map((line, i) => (i === index ? text : line)));
  const pickerVariables = templateVariables(itemFields, variables);
  return (
    <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
      {lines.map((line, index) => (
        <span key={index} className="flex gap-1 items-center">
          <span className="text-[10px] shrink-0 w-[44px]" style={{ color: c.textSecondary }}>Linha {index + 1}</span>
          <input
            ref={(el) => { refs.current[index] = el; }}
            style={{ ...gridInputStyle(c), flex: 1, minWidth: 0 }}
            value={line}
            placeholder="{{item.campo}}"
            onChange={(e) => setLine(index, e.target.value)}
          />
          <VariablePickerButton variables={pickerVariables} tokenFor={templateToken}
            onInsert={(token) => insertTokenAtCursor(refs.current[index], line, token, (next) => setLine(index, next))} />
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => setLines(lines.filter((_, i) => i !== index))}
              title="Remover linha"
              className="w-[22px] h-[22px] rounded flex items-center justify-center border-0 cursor-pointer shrink-0"
              style={{ background: 'transparent', color: c.textSecondary }}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setLines([...lines, ''])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start"
        style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}
      >
        <Plus size={12} /> Linha
      </button>
      <ItemFieldsHint itemFields={itemFields} />
    </div>
  );
}

const ACTION_VARIANT_LABEL: Record<string, string> = { primary: 'Principal', secondary: 'Secundário', danger: 'Destrutivo' };

// Limites do WhatsApp para as ações da lista de seleção — os mesmos que a publicação cobra
// (FlowValidator.validateSelectList, back).
const WHATSAPP_MAX_ACTIONS = 3;
const WHATSAPP_MAX_ACTION_LABEL = 20;

function parseRule(rule: string | undefined) {
  const match = rule?.match(ENABLED_WHEN);
  return { field: match?.[1] ?? '', operator: match?.[2] ?? '==', literal: match?.[3] ?? 'true' };
}

function composeRule(field: string, operator: string, literal: string): string {
  return field ? `{{item.${field}}} ${operator} ${/^(true|false|-?\d+(\.\d+)?|".*")$/.test(literal) ? literal : `"${literal}"`}` : '';
}

function ruleSummary(rule: string | undefined): string {
  const { field, operator, literal } = parseRule(rule);
  if (!field) return 'sempre liberada';
  return `liberada quando ${field} ${operator === '==' ? 'for' : 'não for'} ${literal.startsWith('"') ? literal.slice(1, -1) : literal}`;
}

/** Ações sobre o item escolhido (lista de seleção): um cartão por ação; cada uma abre na própria página. */
function ActionSummaryList({ value, whatsapp, onOpen, onAdd }: { value: SelectListActionConfig[]; whatsapp: boolean; onOpen: (index: number) => void; onAdd: () => void }) {
  const { c } = useFlowTheme();
  return (
    <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
      {value.map((action, index) => {
        const longLabel = whatsapp && action.label.length > WHATSAPP_MAX_ACTION_LABEL;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onOpen(index)}
            className="flex items-center gap-2 w-full text-left rounded-md px-2.5 py-2 cursor-pointer"
            style={{ border: `1px solid ${longLabel ? c.danger : c.border}`, background: c.canvasBg, color: c.textPrimary }}
          >
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold truncate">{action.label || 'Nova ação'}</span>
              <span className="block text-[10.5px] truncate" style={{ color: c.textSecondary }}>
                {ACTION_VARIANT_LABEL[action.variant ?? 'primary']} · {ruleSummary(action.enabledWhen)}
              </span>
              {longLabel && <span className="block mt-0.5 text-[10px]" style={{ color: c.danger }}>Rótulo com mais de {WHATSAPP_MAX_ACTION_LABEL} caracteres, o limite do botão no WhatsApp.</span>}
            </span>
            <ChevronRight size={14} color={c.textSecondary} />
          </button>
        );
      })}
      {whatsapp && value.length > WHATSAPP_MAX_ACTIONS && (
        <span className="text-[10.5px]" style={{ color: c.danger }}>O WhatsApp mostra no máximo {WHATSAPP_MAX_ACTIONS} botões; a publicação recusa mais ações.</span>
      )}
      <button type="button" onClick={onAdd} className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start" style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}>
        <Plus size={12} /> Ação
      </button>
    </div>
  );
}

/** Uma ação da lista de seleção: rótulo, identificador, estilo e a regra "liberada quando", que
 * compara um campo do item vindo da integração (a regra de negócio é do sistema de origem, não da tela). */
function ActionItemEditor({ action, itemFields, whatsapp, onChange, onRemove }: {
  action: SelectListActionConfig;
  itemFields: string[];
  whatsapp: boolean;
  onChange: (next: SelectListActionConfig) => void;
  onRemove: () => void;
}) {
  const { c } = useFlowTheme();
  const { field, operator, literal } = parseRule(action.enabledWhen);
  const update = (patch: Partial<SelectListActionConfig>) => onChange({ ...action, ...patch });
  return (
    <div className="flex flex-col gap-3 p-3">
      <label className="flex flex-col gap-1">
        <FieldLabel text="Texto do botão" />
        <input style={gridInputStyle(c)} placeholder="Rótulo do botão" value={action.label} onChange={(e) => update({ label: e.target.value })} />
        {whatsapp && action.label.length > WHATSAPP_MAX_ACTION_LABEL && (
          <span style={{ color: c.danger, fontSize: 10 }}>No WhatsApp o rótulo do botão tem até {WHATSAPP_MAX_ACTION_LABEL} caracteres.</span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel text="Identificador" help="Valor gravado quando o usuário escolhe esta ação." />
        <input style={{ ...gridInputStyle(c), fontFamily: 'monospace' }} placeholder="id" value={action.id} onChange={(e) => update({ id: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel text="Estilo" />
        <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={action.variant ?? 'primary'}
          onChange={(e) => update({ variant: e.target.value as SelectListActionConfig['variant'] })}>
          {Object.entries(ACTION_VARIANT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <FieldLabel text="Liberada quando" help="Compara um campo do item vindo da integração." />
        <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={field}
          onChange={(e) => update({ enabledWhen: composeRule(e.target.value, operator, literal) })}>
          <option value="">sempre</option>
          {[...new Set([...itemFields, ...(field ? [field] : [])])].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        {field && (
          <div className="flex gap-1 items-center">
            <select style={{ ...gridInputStyle(c), flex: '0 0 40%', cursor: 'pointer' }} value={operator}
              onChange={(e) => update({ enabledWhen: composeRule(field, e.target.value, literal) })}>
              <option value="==">for igual a</option>
              <option value="!=">for diferente de</option>
            </select>
            <input style={{ ...gridInputStyle(c), flex: 1, fontFamily: 'monospace' }} value={literal.startsWith('"') ? literal.slice(1, -1) : literal}
              onChange={(e) => update({ enabledWhen: composeRule(field, operator, e.target.value) })}
              title="true, false, um número ou um texto" />
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} className="flex items-center gap-1.5 self-start rounded-md px-2.5 py-1.5 text-[11.5px] font-medium cursor-pointer"
        style={{ border: `1px solid ${c.danger}`, background: 'transparent', color: c.danger }}>
        <Trash2 size={12} /> Remover ação
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

/** Ícone decorativo e imagem sem descrição: o catálogo (§7.1.2) aceita a descrição vazia. Vazio
 * gravado ("") é essa escolha; propriedade ausente continua pendência. */
const DECORATIVE_EMPTY: Record<string, string> = {
  'ui.icon.accessibilityLabel': 'Ícone decorativo, sem descrição',
  'ui.image.alt': 'Imagem decorativa, sem descrição',
};

/** Falta de valor numa propriedade, respeitando a descrição vazia que o catálogo aceita. Usada pelo
 * painel e pelas pendências da tela (FormBuilder), para os dois dizerem a mesma coisa. */
export function isMissingPropValue(type: string, propName: string, value: unknown): boolean {
  if (value === '' && DECORATIVE_EMPTY[`${type}.${propName}`]) return false;
  return isMissing(value);
}

function PropField({ nodeType, prop, presentation, value, variables, itemFields, onChange }: { nodeType: string; prop: PropDescriptor; presentation: PropertyPresentation; value: unknown; variables: VariableOrigin[]; itemFields: string[]; onChange: (value: unknown) => void }) {
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
      return prop.name === 'itemDescription'
        ? <ItemLinesEditor value={typeof value === 'string' ? value : ''} itemFields={itemFields} variables={variables} onChange={onChange} />
        : <ItemTemplateEditor value={typeof value === 'string' ? value : ''} itemFields={itemFields} variables={variables} onChange={onChange} />;
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
      return <OptionsListEditor value={Array.isArray(value) ? (value as SelectOption[]) : []} onChange={onChange} />;
    case 'VALIDATION_LIST':
      return <ValidationListEditor value={Array.isArray(value) ? (value as ValidationRule[]) : []} onChange={onChange} />;
    case 'TEXT':
    default: {
      const text = typeof value === 'string' ? value : '';
      const decorativeLabel = DECORATIVE_EMPTY[`${nodeType}.${prop.name}`];
      const decorative = !!decorativeLabel && value === '';
      // Com a opção decorativa, apagar o texto volta a "não preenchido"; o vazio só vem da caixa.
      const setText = (next: unknown) => onChange(decorativeLabel && next === '' ? undefined : next);
      const picker = PROPS_QUE_ACEITAM_VARIAVEL.has(prop.name) ? (
        <VariablePickerButton
          variables={variables}
          tokenFor={(v) => sduiVariablePath(v.kind, v.name)}
          onInsert={(token) => insertTokenAtCursor(presentation.multiline ? textareaRef.current : textRef.current, text, token, setText)}
        />
      ) : null;
      const field = presentation.multiline ? (
        <span className="flex gap-1 items-start" style={{ width: '100%' }}>
          <textarea ref={textareaRef} disabled={decorative} style={{ ...gridInputStyle(c), flex: 1, height: 68, resize: 'vertical', padding: '7px 8px' }} value={text} onChange={(e) => setText(e.target.value)} />
          {picker}
        </span>
      ) : (
        <span className="flex gap-1 items-center" style={{ width: '100%' }}>
          <input ref={textRef} disabled={decorative} style={{ ...gridInputStyle(c), flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} />
          {picker}
        </span>
      );
      if (!decorativeLabel) return field;
      return (
        <span className="flex flex-col gap-1" style={{ width: '100%' }}>
          {field}
          <label className="flex items-center gap-1 text-[10.5px] cursor-pointer self-start" style={{ color: c.textSecondary }}>
            <input type="checkbox" checked={decorative} onChange={(e) => onChange(e.target.checked ? '' : undefined)} />
            {decorativeLabel}
          </label>
        </span>
      );
    }
  }
}

function FieldLabel({ text, required, help }: { text: string; required?: boolean; help?: string }) {
  const { c } = useFlowTheme();
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c.textSecondary }}>
      <span>{text}{required && <span style={{ color: c.danger }}> *</span>}</span>
      {help && <span title={help} className="inline-flex"><CircleHelp size={11} /></span>}
    </span>
  );
}

interface PropItem {
  prop: PropDescriptor;
  presentation: PropertyPresentation;
}

function PropRow({ item, node, bindable, variables, itemFields, onChange }: {
  item: PropItem;
  node: SduiNode;
  bindable: boolean;
  variables: VariableOrigin[];
  itemFields: string[];
  onChange: (value: unknown) => void;
}) {
  const { c } = useFlowTheme();
  const { prop, presentation } = item;
  const value = node.props[prop.name];
  const hasBinding = !!node.bindings?.[prop.name]?.path;
  const error = propertyError(node.type, prop, value, hasBinding, bindable);
  const inline = prop.kind === 'BOOLEAN';
  // Editores com caixas de marcar ou vários campos próprios não cabem dentro de um <label> só.
  const Wrapper = prop.kind === 'OPTIONS_LIST' || prop.name === 'itemDescription' || DECORATIVE_EMPTY[`${node.type}.${prop.name}`] ? 'div' : 'label';
  return (
    <div data-property-field={prop.name} title={prop.name} className="flex flex-col gap-1">
      <Wrapper className={inline ? 'flex items-center justify-between gap-2' : 'flex flex-col gap-1'}>
        <FieldLabel text={presentation.label} required={prop.required && !hasBinding} help={presentation.help} />
        <span className={inline ? 'shrink-0' : 'min-w-0'}>
          <PropField nodeType={node.type} prop={prop} presentation={presentation} value={value} variables={variables} itemFields={itemFields} onChange={onChange} />
        </span>
      </Wrapper>
      {error && <span style={{ color: c.danger, fontSize: 10 }}>{error}</span>}
    </div>
  );
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

// ---------------------------------------------------------------------------------------------
// Páginas do painel: o índice mostra um cartão por assunto e cada cartão abre a página dele.

type PageId = 'content' | 'items' | 'choice' | 'answer' | 'appearance' | 'behavior' | 'actions' | 'rules';

const PAGE_ORDER: PageId[] = ['content', 'items', 'choice', 'answer', 'appearance', 'behavior', 'actions', 'rules'];

const PAGE_TITLE: Record<PageId, string> = {
  content: 'Conteúdo',
  items: 'Itens da lista',
  choice: 'Escolha',
  answer: 'Resposta',
  appearance: 'Aparência',
  behavior: 'Comportamento',
  actions: 'Ações',
  rules: 'Regras',
};

// Lista de seleção: cada assunto junta propriedades e vínculos que tratam da mesma coisa.
const SELECT_LIST_PAGES: Record<string, PageId> = {
  label: 'content',
  itemTitle: 'content',
  itemDescription: 'content',
  itemHint: 'content',
  emptyMessage: 'content',
  maxItems: 'items',
  'binding:items': 'items',
  itemValue: 'choice',
  required: 'choice',
  'binding:value': 'choice',
  actions: 'actions',
  'binding:action': 'actions',
};

interface InspectorPage {
  id: PageId;
  props: PropItem[];
  advanced: PropItem[];
  bindings: string[];
  events: boolean;
  rules: boolean;
}

function pageForProp(definition: ComponentDefinition, prop: PropDescriptor, presentation: PropertyPresentation): PageId {
  const special = definition.type === 'ui.selectList' ? SELECT_LIST_PAGES[prop.name] : undefined;
  if (special) return special;
  switch (presentation.group) {
    case 'CONTENT':
    case 'ACCESSIBILITY':
      return 'content';
    case 'APPEARANCE':
    case 'LAYOUT':
      return 'appearance';
    default:
      // Comportamento e validação de um campo de entrada dizem respeito à resposta da pessoa.
      return definition.category === 'INPUT' ? 'answer' : 'behavior';
  }
}

function buildPages(definition: ComponentDefinition): InspectorPage[] {
  const pages = new Map<PageId, InspectorPage>();
  const page = (id: PageId) => {
    if (!pages.has(id)) pages.set(id, { id, props: [], advanced: [], bindings: [], events: false, rules: false });
    return pages.get(id)!;
  };
  const pageOfProp = new Map<string, PageId>();
  PROPERTY_GROUP_ORDER.forEach((group) => {
    definition.propsSchema
      .map((prop) => ({ prop, presentation: propertyPresentation(definition.type, prop) }))
      .filter((item) => item.presentation.group === group)
      .forEach((item) => {
        const id = pageForProp(definition, item.prop, item.presentation);
        pageOfProp.set(item.prop.name, id);
        (item.presentation.advanced ? page(id).advanced : page(id).props).push(item);
      });
  });
  if (definition.allowedReservedFields.includes('$bindings')) {
    bindingConfiguration(definition).names.forEach((name) => {
      const special = definition.type === 'ui.selectList' ? SELECT_LIST_PAGES[`binding:${name}`] : undefined;
      // Vínculo de uma propriedade fica junto dela; o valor de um campo de entrada fica em Resposta.
      page(special ?? pageOfProp.get(name) ?? 'answer').bindings.push(name);
    });
  }
  if (definition.allowedReservedFields.includes('$events') && definition.events.length > 0) page('actions').events = true;
  if (definition.allowedReservedFields.includes('$visibility') || definition.allowedReservedFields.includes('$active')) page('rules').rules = true;
  return PAGE_ORDER.flatMap((id) => pages.get(id) ?? []);
}

/** Página onde fica o que uma pendência aponta (seção + campo do painel); null = índice. */
function pageIdFor(pages: InspectorPage[], section: InspectorSection, field?: string): PageId | null {
  let id: PageId | undefined;
  if (section === 'visibility' || section === 'active') id = 'rules';
  else if (section === 'events') id = 'actions';
  else if (section === 'bindings') id = pages.find((p) => !!field && p.bindings.includes(field))?.id ?? pages.find((p) => p.bindings.length > 0)?.id;
  else if (section === 'configuration' || section === 'advancedProperties') {
    id = pages.find((p) => [...p.props, ...p.advanced].some((item) => item.prop.name === field))?.id;
  }
  return id && pages.some((p) => p.id === id) ? id : null;
}

/** Nome da página do painel onde se corrige uma pendência — as pendências da tela (FormBuilder)
 * mostram esse nome junto do campo. */
export function inspectorPageTitle(definition: ComponentDefinition, section: InspectorSection, field?: string): string {
  const id = pageIdFor(buildPages(definition), section, field);
  return id ? PAGE_TITLE[id] : 'Identificação';
}

function bindingLabels(definition: ComponentDefinition): Record<string, string> {
  if (definition.type === 'ui.selectList') {
    return { items: 'De onde vêm os itens', value: 'Onde gravar o item escolhido', action: 'Onde gravar a ação escolhida' };
  }
  return Object.fromEntries(bindingConfiguration(definition).names.map((name) => {
    if (name === 'options') return [name, 'Opções vindas de uma lista'];
    const prop = definition.propsSchema.find((p) => p.name === name);
    return [name, prop ? `Vincular ${lowerFirst(propertyPresentation(definition.type, prop).label)} a um dado` : 'Onde gravar a resposta'];
  }));
}

function selectListActions(node: SduiNode): SelectListActionConfig[] {
  return Array.isArray(node.props.actions) ? (node.props.actions as SelectListActionConfig[]) : [];
}

/** Catálogo §7.1.6: tocar numa ação conclui a etapa (action.submit). A lista grava o item e a ação
 * pelos vínculos, então "Guardar a escolha em" do botão não vale aqui. */
function selectListEventOk(node: SduiNode): boolean {
  const event = node.events?.onAction;
  return event?.action === 'action.submit' && Object.values(event.params ?? {}).every((v) => v === undefined || v === null || String(v).trim() === '');
}

function bindingSuffix(path: string | undefined): string {
  return path && path.includes('.') ? path.slice(path.indexOf('.') + 1) : '';
}

const TEMPLATE_TOKEN = /\{\{\s*(?:item|form|data)\.([\w.-]+)\s*\}\}/g;

function Token({ name }: { name: string }) {
  const { c } = useFlowTheme();
  return (
    <span className="font-mono rounded px-1 mx-[1px] text-[10px] whitespace-nowrap" style={{ background: c.accentSoft, color: c.accent }}>
      {name}
    </span>
  );
}

/** Texto de modelo com os campos ({{item.x}}, {{form.x}}, {{data.x}}) mostrados como fichas. */
function TemplateText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TEMPLATE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push(<Token key={index} name={match[1]} />);
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Valor configurado no resumo do cartão: em destaque, para não se confundir com o nome do que é. */
function Value({ children }: { children: ReactNode }) {
  const { c } = useFlowTheme();
  return <span style={{ color: c.textPrimary }}>{children}</span>;
}

function valueSummary(item: PropItem, value: unknown): ReactNode | null {
  const { prop, presentation } = item;
  if (value === undefined || value === null || value === '' || value === false) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (prop.kind === 'OPTIONS_LIST') return <Value>{value.length} {value.length === 1 ? 'opção' : 'opções'}</Value>;
    return <Value>{value.length} {value.length === 1 ? 'regra de validação' : 'regras de validação'}</Value>;
  }
  if (value === true) return <Value>{presentation.label}</Value>;
  if (typeof value === 'number') return <>{presentation.label}: <Value>{value}</Value></>;
  const text = String(value);
  if (prop.kind === 'TOKEN') return <>{presentation.label}: <Value>{tokenOptionsForGroup(prop.tokenGroup).find((t) => t.value === text)?.label ?? text}</Value></>;
  if (prop.kind === 'ENUM') return <>{presentation.label}: <Value>{presentation.enumLabels?.[text] ?? text}</Value></>;
  // Texto de conteúdo aparece como está; os demais (estilo, alinhamento…) dizem o que são.
  if (presentation.group === 'CONTENT' || presentation.group === 'ACCESSIBILITY') return <Value><TemplateText text={text} /></Value>;
  return <>{presentation.label}: <Value>{text}</Value></>;
}

/** Resumo do cartão em frase: o que a página tem; sem nada, o que dá para configurar nela. */
function pageSummary(page: InspectorPage, node: SduiNode, definition: ComponentDefinition): { parts: ReactNode[]; muted: boolean } {
  const bound = (name: string) => bindingSuffix(node.bindings?.[name]?.path);
  const parts: ReactNode[] = [];
  const isSelectList = definition.type === 'ui.selectList';
  const requiredProp = definition.propsSchema.find((p) => p.name === 'required');
  // Catálogo §7.1.6: a escolha da lista de seleção é obrigatória por padrão.
  const requiredValue = node.props.required ?? (isSelectList ? true : undefined);

  if (isSelectList && page.id === 'items') {
    if (bound('items')) parts.push(<Value>{bound('items')}</Value>);
    if (typeof node.props.maxItems === 'number') parts.push(<>máx. <Value>{node.props.maxItems}</Value></>);
  } else if (isSelectList && page.id === 'choice') {
    const field = typeof node.props.itemValue === 'string' ? node.props.itemValue : '';
    if (field || bound('value')) {
      parts.push(<>Guarda {field ? <Token name={field} /> : 'o item'}{bound('value') ? <> em <Value>{bound('value')}</Value></> : null}</>);
    }
    parts.push(<Value>{requiredValue === true ? 'obrigatória' : 'opcional'}</Value>);
  } else if (isSelectList && page.id === 'actions') {
    const actions = selectListActions(node);
    if (actions.length > 0) {
      parts.push(<Value>{actions.length} {actions.length === 1 ? 'ação' : 'ações'}</Value>, <Value>{actions.map((a) => a.label || 'Nova ação').join(', ')}</Value>);
    }
  } else if (page.id === 'answer') {
    if (bound('value')) parts.push(<>Grava em <Value>{bound('value')}</Value></>);
    if (requiredProp) parts.push(<Value>{requiredValue === true ? 'obrigatório' : 'opcional'}</Value>);
    [...page.props, ...page.advanced]
      .filter((item) => item.prop.name !== 'required')
      .forEach((item) => {
        const summary = valueSummary(item, node.props[item.prop.name]);
        if (summary) parts.push(summary);
      });
  } else {
    [...page.props, ...page.advanced].forEach((item) => {
      const summary = valueSummary(item, node.props[item.prop.name]);
      if (summary) parts.push(summary);
    });
    page.bindings.forEach((name) => {
      if (bound(name)) parts.push(<>{name === 'options' ? 'Opções de' : 'Vinculado a'} <Value>{bound(name)}</Value></>);
    });
  }
  if (page.events && !isSelectList) {
    Object.values(node.events ?? {}).forEach((event) => parts.push(<Value>{ACTION_LABEL[event.action] ?? event.action}</Value>));
  }
  if (page.rules) {
    const visibility = definition.allowedReservedFields.includes('$visibility');
    const active = definition.allowedReservedFields.includes('$active');
    if (visibility && active && !node.visibility && !node.active) parts.push(<Value>Sempre visível e ativo</Value>);
    else {
      if (visibility) parts.push(<Value>{node.visibility ? 'Visível com condição' : 'Sempre visível'}</Value>);
      if (active) parts.push(<Value>{node.active ? 'Ativo com condição' : 'Sempre ativo'}</Value>);
    }
  }
  if (parts.length > 0) return { parts: parts.slice(0, 3), muted: false };
  const labels = [...page.props, ...page.advanced].map((item) => item.presentation.label);
  if (page.events) labels.push(...definition.events.map((e) => EVENT_LABEL[e] ?? e));
  return { parts: [labels.slice(0, 3).join(', ') + (labels.length > 3 ? '…' : '')], muted: true };
}

type PageStatus = 'error' | 'warning' | 'done' | 'empty';

const PAGE_STATUS_TITLE: Record<PageStatus, string> = {
  error: 'Falta algo obrigatório ou há um erro que impede publicar',
  warning: 'Há um ponto de atenção nesta página',
  done: 'Configurado, sem pendências',
  empty: 'Opcional, ainda não configurado',
};

// Cor de "Atenção" das pendências da tela (FormBuilder.issueTone).
const WARNING_COLOR = '#d97706';

function pageConfigured(page: InspectorPage, node: SduiNode): boolean {
  return [...page.props, ...page.advanced].some((item) => {
    const value = node.props[item.prop.name];
    return !isMissing(value) && value !== false && !(Array.isArray(value) && value.length === 0);
  })
    || page.bindings.some((name) => !!bindingSuffix(node.bindings?.[name]?.path))
    || (page.events && Object.keys(node.events ?? {}).length > 0)
    || (page.rules && (!!node.visibility || !!node.active));
}

/** Bolinha do cartão: vermelho impede publicar; âmbar é a "Atenção" das pendências (botão ou link
 * sem ação principal); verde tem algo configurado e nada pendente; cinza ainda não foi mexido. */
function pageStatus(page: InspectorPage, node: SduiNode, definition: ComponentDefinition, requiredBindings: string[], whatsapp: boolean): PageStatus {
  if (pageHasError(page, node, definition, requiredBindings, whatsapp)) return 'error';
  if (page.events && (definition.type === 'ui.button' || definition.type === 'ui.link') && !node.events?.onPress) return 'warning';
  return pageConfigured(page, node) ? 'done' : 'empty';
}

function StatusDot({ status }: { status: PageStatus }) {
  const { c } = useFlowTheme();
  const color = status === 'error' ? c.danger : status === 'warning' ? WARNING_COLOR : status === 'done' ? c.success : 'transparent';
  return (
    <span
      role="img"
      aria-label={PAGE_STATUS_TITLE[status]}
      title={PAGE_STATUS_TITLE[status]}
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: color, border: status === 'empty' ? `1.5px solid ${c.textSecondary}` : 'none', opacity: status === 'empty' ? 0.6 : 1 }}
    />
  );
}

function pageHasError(page: InspectorPage, node: SduiNode, definition: ComponentDefinition, requiredBindings: string[], whatsapp: boolean): boolean {
  const bindable = bindingConfiguration(definition).names;
  const propError = [...page.props, ...page.advanced].some((item) =>
    propertyError(node.type, item.prop, node.props[item.prop.name], !!node.bindings?.[item.prop.name]?.path, bindable.includes(item.prop.name)) !== null);
  const bindingError = page.bindings.some((name) => requiredBindings.includes(name) && !bindingSuffix(node.bindings?.[name]?.path));
  let listError = false;
  if (definition.type === 'ui.selectList' && page.id === 'actions') {
    const actions = selectListActions(node);
    listError = !selectListEventOk(node)
      || (whatsapp && (actions.length > WHATSAPP_MAX_ACTIONS || actions.some((a) => a.label.length > WHATSAPP_MAX_ACTION_LABEL)));
  }
  return propError || bindingError || listError;
}

// ---------------------------------------------------------------------------------------------
// Largura: arrastar a borda esquerda; o navegador lembra a última largura.

const WIDTH_KEY = 'form-builder:inspector-width';
const MIN_WIDTH = 300;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;

function useInspectorWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(WIDTH_KEY));
      return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const widthRef = useRef(width);
  widthRef.current = width;

  function onResizeStart(event: React.PointerEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    // O painel fica na borda direita: arrastar a borda para a esquerda alarga.
    const move = (e: PointerEvent) => setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth - (e.clientX - startX))));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try {
        localStorage.setItem(WIDTH_KEY, String(widthRef.current));
      } catch {
        // Sem armazenamento no navegador a largura só não é lembrada.
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return { width, onResizeStart };
}

function InspectorShell({ width, onResizeStart, children }: { width: number; onResizeStart: (event: React.PointerEvent) => void; children: ReactNode }) {
  const { c } = useFlowTheme();
  return (
    <div className="relative shrink-0 flex h-full" style={{ width }}>
      <div onPointerDown={onResizeStart} title="Arrastar para redimensionar" className="absolute -left-[3px] top-0 bottom-0 w-[6px] cursor-col-resize z-10" />
      <div className="flex flex-col h-full w-full min-w-0" style={{ borderLeft: `1px solid ${c.border}`, background: c.cardBg }}>
        {children}
      </div>
    </div>
  );
}

/** Painel de propriedades do componente SDUI selecionado — sucessor de FormFieldConfigPanel.tsx:
 * schema de props vem de ComponentDefinition.propsSchema (Component Registry), não de uma lista
 * curada em código. Bindings/events/visibility ganham editores estruturados dedicados (pedido
 * explícito: aderência total ao contrato, sem cair pra JSON bruto). Navegação em níveis: o índice
 * mostra um cartão por assunto e cada cartão abre a página dele. */
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
  const { width, onResizeStart } = useInspectorWidth();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Caminho aberto no painel, preso ao componente: selecionar outro volta ao índice.
  const [nav, setNav] = useState<{ nodeId: string | null; stack: string[] }>({ nodeId: null, stack: [] });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<InspectorFocusRequest | null>(null);
  const [draftNodeId, setDraftNodeId] = useState(node?.id ?? '');
  const pages = useMemo(() => (definition ? buildPages(definition) : []), [definition]);
  const stack = node && nav.nodeId === node.id ? nav.stack : [];
  const current = stack[stack.length - 1] ?? null;

  useEffect(() => {
    setDraftNodeId(node?.id ?? '');
  }, [node?.id]);

  useEffect(() => {
    if (!focusRequest || !node) return;
    // Abre a página da pendência; o foco no campo vem depois que a página estiver na tela.
    const target = pageIdFor(pages, focusRequest.section, focusRequest.field);
    setNav({ nodeId: node.id, stack: target ? [target] : [] });
    if (focusRequest.section === 'advancedProperties') setAdvancedOpen(true);
    setPendingFocus(focusRequest);
  }, [focusRequest?.id]);

  useEffect(() => {
    if (!pendingFocus) return;
    const panel = panelRef.current;
    if (!panel) return;
    const sectionSelector = `[data-inspector-section="${pendingFocus.section}"]`;
    const fieldSelector = pendingFocus.field ? escapeDataAttribute(pendingFocus.field) : null;
    let target = fieldSelector
      ? panel.querySelector<HTMLElement>(`[data-property-field="${fieldSelector}"] input, [data-property-field="${fieldSelector}"] textarea, [data-property-field="${fieldSelector}"] select, [data-property-field="${fieldSelector}"] button`)
      : null;
    target = target
      ?? panel.querySelector<HTMLElement>(`${sectionSelector} input, ${sectionSelector} textarea, ${sectionSelector} select, ${sectionSelector} button`)
      ?? panel.querySelector<HTMLElement>(`${sectionSelector} button`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.focus?.();
    setPendingFocus(null);
  }, [pendingFocus, current]);

  function commitNodeId() {
    if (!node) return;
    const nextId = draftNodeId.trim();
    if (validateComponentName(nextId, reservedNodeIds)) return;
    if (nextId !== node.id) onRenameNode(nextId);
  }

  if (!node || !definition) {
    return (
      <InspectorShell width={width} onResizeStart={onResizeStart}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center" style={{ color: c.textSecondary }}>
          <SlidersHorizontal size={22} strokeWidth={1.6} />
          <span className="mt-2 text-[11.5px] font-medium">Selecione um componente</span>
          <span className="mt-1 text-[10.5px]">As configurações disponíveis aparecerão aqui.</span>
        </div>
      </InspectorShell>
    );
  }

  const nodeIdError = validateComponentName(draftNodeId.trim(), reservedNodeIds);
  const itemsPath = node.bindings?.items?.path ?? '';
  const itemFields = itemsPath.startsWith('data.')
    ? variables.find((v) => v.type === 'list' && v.kind === 'data' && v.name === itemsPath.slice('data.'.length))?.fields ?? []
    : [];
  const isSelectList = definition.type === 'ui.selectList';
  const whatsapp = channelTypes.includes('WHATSAPP');
  const bindingsConfig = bindingConfiguration(definition);
  const actions = selectListActions(node);
  // Catálogo §7.1.6: com ações, gravar a ação escolhida passa a ser obrigatório.
  const requiredBindings = [...bindingsConfig.required, ...(isSelectList && actions.length > 0 ? ['action'] : [])];
  const labels = bindingLabels(definition);

  const go = (key: string) => setNav({ nodeId: node.id, stack: [...stack, key] });
  const back = () => setNav({ nodeId: node.id, stack: stack.slice(0, -1) });
  const actionIndex = current?.startsWith('action:') ? Number(current.slice('action:'.length)) : null;
  const currentAction = actionIndex !== null ? actions[actionIndex] ?? null : null;
  const currentPage = pages.find((p) => p.id === current) ?? null;
  const titleOf = (key: string) => (key.startsWith('action:') ? actions[Number(key.slice('action:'.length))]?.label || 'Nova ação' : PAGE_TITLE[key as PageId] ?? key);

  const renderProp = (item: PropItem) => {
    if (item.prop.kind === 'ACTION_LIST') {
      return (
        <div key={item.prop.name} data-property-field={item.prop.name} title={item.prop.name} className="flex flex-col gap-1">
          <FieldLabel text={item.presentation.label} help={item.presentation.help} />
          <ActionSummaryList
            value={actions}
            whatsapp={whatsapp}
            onOpen={(index) => go(`action:${index}`)}
            onAdd={() => {
              onUpdateProps({ actions: [...actions, { id: '', label: '', variant: 'primary', enabledWhen: '' }] });
              go(`action:${actions.length}`);
            }}
          />
        </div>
      );
    }
    return (
      <PropRow
        key={item.prop.name}
        item={item}
        node={node}
        bindable={bindingsConfig.names.includes(item.prop.name)}
        variables={variables}
        itemFields={itemFields}
        onChange={(value) => onUpdateProps({ [item.prop.name]: value })}
      />
    );
  };

  const sectionTitle = (text: string) => (
    <div className="text-[10px] font-bold uppercase tracking-[.06em]" style={{ color: c.textSecondary }}>{text}</div>
  );

  function renderPage(page: InspectorPage) {
    const availableEvents = definition!.events.filter((event) => !(definition!.type === 'ui.alert' && event === 'onDismiss' && node!.props.dismissible !== true));
    return (
      <div className="flex flex-col gap-3 p-3">
        {page.props.map(renderProp)}
        {page.advanced.length > 0 && (
          <div data-inspector-section="advancedProperties" className="rounded-md" style={{ border: `1px solid ${c.border}`, background: c.canvasBg }}>
            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="w-full flex items-center gap-1.5 px-2 py-2 border-0 bg-transparent cursor-pointer text-left"
              style={{ color: c.textSecondary }}
            >
              {advancedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="text-[10px] font-bold uppercase tracking-[.06em] flex-1">Mais opções</span>
              <span className="text-[9px]">{page.advanced.length}</span>
            </button>
            {advancedOpen && <div className="px-2 pb-2 flex flex-col gap-3">{page.advanced.map(renderProp)}</div>}
          </div>
        )}
        {page.bindings.length > 0 && (
          <div data-inspector-section="bindings" className="-mx-2">
            <BindingEditor
              root={root}
              bindings={node!.bindings}
              bindingNames={page.bindings}
              requiredBindingNames={requiredBindings}
              fixedMode={bindingsConfig.mode}
              modeByName={bindingsConfig.modeByName}
              variables={variables}
              labels={labels}
              compact
              onChange={onUpdateBindings}
            />
          </div>
        )}
        {page.events && isSelectList && (
          <div
            data-inspector-section="events"
            className="flex flex-col gap-1.5 rounded-md p-2 text-[11px]"
            style={{ border: `1px solid ${selectListEventOk(node!) ? c.border : c.danger}`, background: selectListEventOk(node!) ? c.canvasBg : c.dangerSoft, color: selectListEventOk(node!) ? c.textSecondary : c.danger }}
          >
            {selectListEventOk(node!)
              ? 'Ao tocar numa ação, a etapa é concluída e o item e a ação escolhidos são gravados.'
              : 'Esta lista precisa concluir a etapa ao tocar numa ação.'}
            {!selectListEventOk(node!) && (
              <button
                type="button"
                onClick={() => onUpdateEvents({ ...(node!.events ?? {}), onAction: { action: 'action.submit', params: {} } })}
                className="self-start rounded px-2 py-1 text-[11px] font-semibold cursor-pointer"
                style={{ border: `1px solid ${c.danger}`, background: 'transparent', color: c.danger }}
              >
                Corrigir
              </button>
            )}
          </div>
        )}
        {page.events && !isSelectList && (
          <div data-inspector-section="events" className="-mx-2">
            {availableEvents.length > 0 ? (
              <ActionEditor availableEvents={availableEvents} events={node!.events} onChange={onUpdateEvents} />
            ) : (
              <div className="px-2 text-[11px]" style={{ color: c.textSecondary }}>
                Para escolher o que acontece ao fechar o alerta, ligue "Permitir fechar" em Comportamento (Mais opções).
              </div>
            )}
          </div>
        )}
        {page.rules && definition!.allowedReservedFields.includes('$visibility') && (
          <section data-inspector-section="visibility" className="flex flex-col gap-1">
            {sectionTitle('Quando aparece')}
            <div className="-mx-2">
              <ConditionEditor visibility={node!.visibility} variables={variables} channelTypes={channelTypes} mode="visibility" onChange={onUpdateVisibility} />
            </div>
          </section>
        )}
        {page.rules && definition!.allowedReservedFields.includes('$active') && (
          <section data-inspector-section="active" className="flex flex-col gap-1">
            {sectionTitle('Quando pode ser usado')}
            <div className="-mx-2">
              <ConditionEditor visibility={node!.active} variables={variables} channelTypes={channelTypes} mode="active" onChange={onUpdateActive} />
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <InspectorShell width={width} onResizeStart={onResizeStart}>
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
      {(currentPage || currentAction) && (
        <div className="flex items-center gap-1 px-3 py-2 shrink-0 min-w-0" style={{ borderBottom: `1px solid ${c.border}` }}>
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-0.5 border-0 bg-transparent cursor-pointer text-[11.5px] font-semibold shrink-0 p-0"
            style={{ color: c.accent }}
          >
            <ChevronLeft size={14} />
            {stack.length > 1 ? titleOf(stack[stack.length - 2]) : labelFor(node.type)}
          </button>
          <span className="text-[11.5px] truncate" style={{ color: c.textSecondary }}>/ {titleOf(current!)}</span>
        </div>
      )}

      <div ref={panelRef} className="flex-1 overflow-y-auto min-h-0">
        {currentAction && actionIndex !== null ? (
          <ActionItemEditor
            action={currentAction}
            itemFields={itemFields}
            whatsapp={whatsapp}
            onChange={(next) => onUpdateProps({ actions: actions.map((a, i) => (i === actionIndex ? next : a)) })}
            onRemove={() => {
              back();
              onUpdateProps({ actions: actions.filter((_, i) => i !== actionIndex) });
            }}
          />
        ) : currentPage ? (
          renderPage(currentPage)
        ) : (
          <div className="flex flex-col gap-2 p-3">
            <section data-inspector-section="identification" className="flex flex-col gap-1 mb-1">
              <label className="flex flex-col gap-1">
                <FieldLabel text="Nome" />
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
              </label>
              {nodeIdError && <span style={{ color: c.danger, fontSize: 10 }}>{nodeIdError}</span>}
            </section>
            {pages.length === 0 && (
              <div className="rounded-lg p-4 text-center text-[11px]" style={{ color: c.textSecondary, background: c.canvasBg }}>
                Este componente não possui configurações.
              </div>
            )}
            {pages.map((page) => {
              const summary = pageSummary(page, node, definition);
              const status = pageStatus(page, node, definition, requiredBindings, whatsapp);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => go(page.id)}
                  className="flex items-center gap-3 w-full text-left rounded-[10px] px-3.5 py-3 cursor-pointer"
                  style={{ border: `1px solid ${c.border}`, background: c.canvasBg, color: c.textPrimary }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
                >
                  <StatusDot status={status} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">{PAGE_TITLE[page.id]}</span>
                    <span
                      className="mt-0.5 text-[11px] leading-[1.45]"
                      style={{
                        color: c.textSecondary,
                        opacity: summary.muted ? 0.75 : 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {summary.parts.map((part, index) => (
                        <span key={index}>{index > 0 && ' · '}{part}</span>
                      ))}
                    </span>
                  </span>
                  <ChevronRight size={14} color={c.textSecondary} className="shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </InspectorShell>
  );
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLocaleLowerCase('pt-BR') + value.slice(1) : value;
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
function propertyError(type: string, prop: PropDescriptor, value: unknown, hasBinding: boolean, bindable: boolean): string | null {
  // Vinculada, a propriedade é preenchida em tempo de execução — o vínculo já satisfaz a
  // obrigatoriedade, sem exigir também um valor digitado (ver FormBuilder.collectAuthoringIssues,
  // mesma regra). Quando falta os dois, a mensagem explica as duas formas de resolver — não só
  // "preencha", porque vincular também é uma resposta válida aqui.
  if (prop.required && !hasBinding && isMissingPropValue(type, prop.name, value)) {
    return bindable ? 'Preenchimento obrigatório: digite um valor ou vincule a um dado da jornada.' : 'Preenchimento obrigatório.';
  }
  if (isMissing(value)) return null;
  if (prop.kind === 'NUMBER' && (typeof value !== 'number' || !Number.isFinite(value))) return 'Informe um número válido.';
  if (type === 'ui.progress' && prop.name === 'value' && typeof value === 'number' && (value < 0 || value > 1)) return 'Informe um valor entre 0 e 1 (0,75 = 75%).';
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
