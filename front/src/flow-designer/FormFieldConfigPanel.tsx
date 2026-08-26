import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, PanelTop, PanelLeft, PanelRight, type LucideIcon } from 'lucide-react';
import { useFlowTheme } from './theme';
import { PropertyGrid, PropertyRow, PropertyGroupHeader, ToggleSwitch, gridInputStyle } from './PropertyGrid';
import { VariablePickerButton, insertTokenAtCursor } from './PropertiesPanel';
import { FieldLogicSection } from './FormScreenLogicPanel';
import {
  COMPONENT_META,
  COMPONENT_PROPERTIES,
  getPropertyValue,
  setPropertyValue,
  type PropertyKind,
  type PropertySchema,
} from './formScreenModel';
import type { VariableOrigin } from './model';
import { collectsValue } from '../api/forms';
import type { FormField, FormFieldOption, FormFieldType } from '../api/forms';
import type { ChannelType } from '../api/products';

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Ao selecionar um componente no canvas WEB (que fica desabilitado pra digitação direta — ver
// ScreenFieldNode), a Configuração precisa abrir já com o cursor na propriedade certa: o texto
// principal (schema.key === 'label') quando existe, senão o nome técnico como alternativa mais
// próxima de "editar o que identifica esse componente".
function hasLabelProperty(type: FormFieldType): boolean {
  return COMPONENT_PROPERTIES[type].some((s) => s.key === 'label');
}

// Painel genérico dirigido por schema (COMPONENT_PROPERTIES) — uma única implementação pra todo o
// catálogo de ~17 componentes, em vez de um bloco de JSX hardcoded por tipo (não escalaria).
// Rotulado "Configuração" (não "Propriedades"); expandido/recolhido é controlado por fora
// (FormPreviewDock), sincronizado com o expandir/recolher do dock inteiro.
export function FormFieldConfigPanel({
  field,
  fields,
  expanded,
  onExpandedChange,
  onUpdate,
  variables,
  sameScreenNames,
  crossNodeNames,
  channelType,
}: {
  field: FormField | null;
  /** Tela inteira — só usada pela sub-aba Lógica, pra calcular quais campos anteriores são
   * elegíveis como referência de uma condição de exibição. */
  fields: FormField[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onUpdate: (patch: Partial<FormField>) => void;
  /** Variáveis do fluxo disponíveis até este nó — mesma lista que o antigo campo "Mensagem exibida
   * ao usuário" oferecia, agora pros campos de texto/textarea do editor de tela. */
  variables: VariableOrigin[];
  /** Nomes já usados por OUTROS campos desta mesma tela (exclui o campo selecionado) — todo tipo de
   * componente precisa disto (é a chave de ordenação/arraste do canvas), não só quem coleta valor. */
  sameScreenNames: Set<string>;
  /** Nomes já usados em OUTRAS User Tasks do fluxo — só relevante pra tipos que coletam valor
   * (viram variável de processo, um namespace único pra jornada inteira). */
  crossNodeNames: Set<string>;
  /** Só WEB ganha as linhas de posição/tamanho (x/y/largura/altura) — outros canais continuam com
   * o layout linear de sempre, sem posição livre pra editar. */
  channelType: ChannelType;
}) {
  const { c } = useFlowTheme();

  if (!expanded) {
    return (
      <div className="w-[36px] shrink-0 border-l flex flex-col items-center py-2" style={{ background: c.sidebarBg, borderColor: c.border }}>
        <button
          onClick={() => onExpandedChange(true)}
          title="Expandir configuração"
          className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 border-l flex flex-col" style={{ background: c.sidebarBg, borderColor: c.border }}>
      <div
        className="relative flex items-center justify-center px-2 py-[6px] border-b border-r-[3px]"
        style={{ background: c.chipBg, borderColor: c.border, borderRightColor: c.accent }}
      >
        <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
          Configuração
        </div>
        <button
          onClick={() => onExpandedChange(false)}
          title="Recolher"
          className="absolute right-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="p-2 overflow-y-auto">
        {!field ? (
          <div className="text-[11.5px] p-2" style={{ color: c.textSecondary }}>
            Selecione um componente no canvas pra configurar.
          </div>
        ) : (
          <FieldPropertiesSection
            field={field}
            fields={fields}
            onUpdate={onUpdate}
            variables={variables}
            sameScreenNames={sameScreenNames}
            crossNodeNames={crossNodeNames}
            channelType={channelType}
          />
        )}
      </div>
    </div>
  );
}

// Extraído do corpo principal só pra poder derivar `basicProperties`/`validationProperties` com
// `field` já estreitado como não-nulo (o ternário ali em cima não deixa declarar `const` no meio).
function FieldPropertiesSection({
  field,
  fields,
  onUpdate,
  variables,
  sameScreenNames,
  crossNodeNames,
  channelType,
}: {
  field: FormField;
  fields: FormField[];
  onUpdate: (patch: Partial<FormField>) => void;
  variables: VariableOrigin[];
  sameScreenNames: Set<string>;
  crossNodeNames: Set<string>;
  channelType: ChannelType;
}) {
  const { c } = useFlowTheme();
  const properties = COMPONENT_PROPERTIES[field.type];
  const basicProperties = properties.filter((s) => (s.group ?? 'basic') === 'basic');
  const validationProperties = properties.filter((s) => s.group === 'validation');
  // Colapsar/expandir cada seção — estado local (não persiste, é só conveniência de navegação no
  // painel), mesmo espírito do "Basic Setting -/+" da referência.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="text-[11px] font-semibold mb-2 px-1" style={{ color: c.textSecondary }}>
        {COMPONENT_META[field.type].label}
      </div>
      <PropertyGrid>
        <PropertyGroupHeader label="Identificação" first collapsed={collapsed.has('id')} onToggleCollapse={() => toggleSection('id')} />
        {!collapsed.has('id') && (
          <PropertyRow label="Nome (técnico)" first>
            <NameField
              field={field}
              onUpdate={onUpdate}
              takenNames={collectsValue(field.type) ? new Set([...sameScreenNames, ...crossNodeNames]) : sameScreenNames}
              autoFocus={!hasLabelProperty(field.type)}
            />
          </PropertyRow>
        )}
        {basicProperties.length > 0 && (
          <PropertyGroupHeader label="Configuração básica" collapsed={collapsed.has('basic')} onToggleCollapse={() => toggleSection('basic')} />
        )}
        {!collapsed.has('basic') &&
          basicProperties.map((schema) => (
            <PropertyRow key={schema.key} label={schema.label}>
              <PropertyInput schema={schema} field={field} onUpdate={onUpdate} variables={variables} autoFocus={schema.key === 'label'} />
            </PropertyRow>
          ))}
        {validationProperties.length > 0 && (
          <PropertyGroupHeader label="Validação" collapsed={collapsed.has('validation')} onToggleCollapse={() => toggleSection('validation')} />
        )}
        {!collapsed.has('validation') &&
          validationProperties.map((schema) => (
            <PropertyRow key={schema.key} label={schema.label}>
              <PropertyInput schema={schema} field={field} onUpdate={onUpdate} variables={variables} />
            </PropertyRow>
          ))}
        {field.type === 'INPUT' && (
          <>
            <PropertyGroupHeader label="Avançado" collapsed={collapsed.has('advanced')} onToggleCollapse={() => toggleSection('advanced')} />
            {!collapsed.has('advanced') && <InputAdvancedFields field={field} onUpdate={onUpdate} />}
          </>
        )}
        <PropertyGroupHeader label="Lógica (exibição condicional)" collapsed={collapsed.has('logic')} onToggleCollapse={() => toggleSection('logic')} />
        {!collapsed.has('logic') && <FieldLogicSection fields={fields} field={field} onUpdate={onUpdate} />}
        {channelType === 'WEB' && (
          <>
            <PropertyGroupHeader label="Posição e tamanho" collapsed={collapsed.has('position')} onToggleCollapse={() => toggleSection('position')} />
            {!collapsed.has('position') && <PositionSizeFields field={field} onUpdate={onUpdate} />}
          </>
        )}
      </PropertyGrid>
    </>
  );
}

// Nome técnico (vira {{name}}/variável de processo, e é a chave de arraste do canvas) — sugerido
// automaticamente na criação (nextFieldName), mas sempre editável depois. Confirma só no blur/Enter
// (não a cada tecla) pra não brigar com quem ainda está digitando; volta pro valor salvo se o
// rascunho não for um nome válido.
function NameField({
  field,
  onUpdate,
  takenNames,
  autoFocus,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  takenNames: Set<string>;
  autoFocus?: boolean;
}) {
  const { c } = useFlowTheme();
  const [draft, setDraft] = useState(field.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(field.name);
    setError(null);
    if (autoFocus) inputRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.name]);

  function commit() {
    const next = draft.trim();
    if (next === field.name) {
      setDraft(field.name);
      setError(null);
      return;
    }
    if (!NAME_PATTERN.test(next)) {
      setError('Use letras, números e "_", começando com letra ou "_".');
      return;
    }
    if (takenNames.has(next)) {
      setError('Esse nome já está em uso nesta jornada.');
      return;
    }
    setError(null);
    onUpdate({ name: next });
  }

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(field.name);
            setError(null);
          }
        }}
        style={{ ...gridInputStyle(c), fontFamily: 'monospace', borderColor: error ? c.danger : undefined }}
      />
      {error && (
        <div className="text-[10.5px] mt-1" style={{ color: c.danger }}>
          {error}
        </div>
      )}
    </div>
  );
}

function PropertyInput({
  schema,
  field,
  onUpdate,
  variables,
  autoFocus,
}: {
  schema: PropertySchema;
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  variables: VariableOrigin[];
  autoFocus?: boolean;
}) {
  const { c } = useFlowTheme();
  const value = getPropertyValue(field, schema.key);
  const textRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    textRef.current?.select();
    textareaRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.name]);

  function update(next: unknown) {
    onUpdate(setPropertyValue(field, schema.key, next) as Partial<FormField>);
  }

  if (schema.kind === 'boolean') {
    return <ToggleSwitch checked={value === true} onChange={(checked) => update(checked)} />;
  }

  if (schema.kind === 'select') {
    const options = schema.selectOptions ?? [];
    const current = typeof value === 'string' || typeof value === 'number' ? String(value) : (options[0] ?? '');
    // Poucas opções, e curtas, cabem como grupo de botões segmentado (mesmo visual do "AG / 123 /
    // A1A2" da referência) — opção mais longa (ex.: "pequeno"/"destaque" do tamanho de texto) ou
    // muitas opções (subtipo de INPUT com 11) continuam mais legíveis como <select> nativo.
    const shortEnough = options.every((opt) => opt.length <= 5);
    if (options.length > 0 && options.length <= 4 && shortEnough) {
      return (
        <SegmentedButtons options={options.map((opt) => ({ value: opt, label: opt }))} value={current} onChange={update} />
      );
    }
    return (
      <select value={current} onChange={(e) => update(e.target.value)} style={{ ...gridInputStyle(c), cursor: 'pointer' }}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (schema.kind === 'textarea') {
    const text = typeof value === 'string' ? value : '';
    return (
      <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'flex-start' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => update(e.target.value || null)}
          rows={2}
          style={{ ...gridInputStyle(c), flex: 1, height: 'auto', resize: 'vertical' }}
        />
        <VariablePickerButton
          variables={variables}
          onInsert={(token) => insertTokenAtCursor(textareaRef.current, text, token, (next) => update(next || null))}
        />
      </div>
    );
  }

  if (schema.kind === 'number') {
    return (
      <input
        type="number"
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => update(e.target.value === '' ? null : Number(e.target.value))}
        style={gridInputStyle(c)}
      />
    );
  }

  if (schema.kind === 'option-list') {
    const options = Array.isArray(value) ? (value as FormFieldOption[]) : [];
    return (
      <div className="flex flex-col gap-[4px] w-full py-1">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-[4px]">
            <input
              value={opt.label}
              placeholder="Rótulo"
              onChange={(e) => {
                const next = [...options];
                next[i] = { ...opt, label: e.target.value };
                update(next);
              }}
              style={gridInputStyle(c)}
            />
            <input
              value={opt.value}
              placeholder="Valor"
              onChange={(e) => {
                const next = [...options];
                next[i] = { ...opt, value: e.target.value };
                update(next);
              }}
              style={gridInputStyle(c)}
            />
            <button
              onClick={() => update(options.filter((_, idx) => idx !== i))}
              disabled={options.length <= 1}
              className="shrink-0 flex items-center justify-center w-[20px] h-[20px] rounded border-0 bg-transparent cursor-pointer disabled:opacity-30"
              style={{ color: c.danger }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => update([...options, { label: `Opção ${options.length + 1}`, value: `opcao_${options.length + 1}` }])}
          className="self-start flex items-center gap-1 text-[11px] font-medium border-0 bg-transparent cursor-pointer p-0"
          style={{ color: c.accent }}
        >
          <Plus size={11} /> Adicionar opção
        </button>
      </div>
    );
  }

  if (schema.kind === 'item-list') {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const itemSchema = schema.itemSchema ?? [];
    return (
      <div className="flex flex-col gap-[6px] w-full py-1">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-[4px] p-[6px] rounded-md" style={{ border: `1px solid ${c.border}` }}>
            {itemSchema.map((sub) => (
              <div key={sub.key} className="flex items-center gap-[4px]">
                <span className="text-[10px] w-[64px] shrink-0" style={{ color: c.textSecondary }}>
                  {sub.label}
                </span>
                <ItemFieldValueInput
                  kind={sub.kind}
                  selectOptions={sub.selectOptions}
                  value={item[sub.key]}
                  onChange={(next) => {
                    const nextItems = [...items];
                    nextItems[i] = { ...item, [sub.key]: next };
                    update(nextItems);
                  }}
                />
              </div>
            ))}
            <button
              onClick={() => update(items.filter((_, idx) => idx !== i))}
              disabled={items.length <= 1}
              className="self-end flex items-center justify-center w-[20px] h-[20px] rounded border-0 bg-transparent cursor-pointer disabled:opacity-30"
              style={{ color: c.danger }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const blank: Record<string, unknown> = {};
            for (const sub of itemSchema) blank[sub.key] = sub.kind === 'boolean' ? false : sub.kind === 'number' ? 0 : '';
            update([...items, blank]);
          }}
          className="self-start flex items-center gap-1 text-[11px] font-medium border-0 bg-transparent cursor-pointer p-0"
          style={{ color: c.accent }}
        >
          <Plus size={11} /> Adicionar item
        </button>
      </div>
    );
  }

  // 'image' (URL) — input de texto simples, sem inserir variável (URL, não conteúdo interpolado).
  if (schema.kind === 'image') {
    return (
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => update(e.target.value || null)}
        style={gridInputStyle(c)}
      />
    );
  }

  // 'text' — rótulos/títulos de conteúdo podem referenciar {{variavel}}, mesmo mecanismo que a
  // antiga "Mensagem exibida ao usuário" já usava. Exceção: "label" (rótulo do campo) é só o texto
  // que identifica o campo pro usuário final — não faz sentido interpolar variável ali.
  const text = typeof value === 'string' ? value : '';
  if (schema.key === 'label') {
    return (
      <input
        ref={textRef}
        value={text}
        onChange={(e) => update(e.target.value || null)}
        style={{ ...gridInputStyle(c), width: '100%' }}
      />
    );
  }
  return (
    <div style={{ display: 'flex', gap: 4, width: '100%' }}>
      <input
        ref={textRef}
        value={text}
        onChange={(e) => update(e.target.value || null)}
        style={{ ...gridInputStyle(c), flex: 1 }}
      />
      <VariablePickerButton
        variables={variables}
        onInsert={(token) => insertTokenAtCursor(textRef.current, text, token, (next) => update(next || null))}
      />
    </div>
  );
}

// Sub-input de um item dentro de uma lista 'item-list' (TABS/CAROUSEL/TABLE) — mesmos kinds
// primitivos de PropertyInput, mas operando sobre valor/onChange crus (o item é um Record solto,
// não um FormField com getPropertyValue/setPropertyValue). Sem inserir-variável aqui, pra manter
// simples — itens de lista não precisam desse recurso tanto quanto rótulos de campo únicos.
function ItemFieldValueInput({
  kind,
  selectOptions,
  value,
  onChange,
}: {
  kind: PropertyKind;
  selectOptions?: string[];
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const { c } = useFlowTheme();

  if (kind === 'boolean') {
    return <ToggleSwitch checked={value === true} onChange={(checked) => onChange(checked)} />;
  }

  if (kind === 'select') {
    return (
      <select
        value={typeof value === 'string' ? value : (selectOptions?.[0] ?? '')}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...gridInputStyle(c), cursor: 'pointer' }}
      >
        {(selectOptions ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (kind === 'number') {
    return (
      <input
        type="number"
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        style={gridInputStyle(c)}
      />
    );
  }

  if (kind === 'textarea') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...gridInputStyle(c), flex: 1, height: 'auto', resize: 'vertical' }}
      />
    );
  }

  return (
    <input
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...gridInputStyle(c), flex: 1 }}
    />
  );
}

// Posição/tamanho de tela WEB — únicos campos do painel que escrevem direto nas colunas
// core do FormField (positionX/positionY/width/height), não em `config` (mesmo caminho que
// arrastar/redimensionar no canvas já usa, FormScreenCanvasWeb.tsx commitNodes). Altura em branco
// = automática pelo conteúdo (mesmo texto usado lá).
function PositionSizeFields({ field, onUpdate }: { field: FormField; onUpdate: (patch: Partial<FormField>) => void }) {
  const { c } = useFlowTheme();

  function numberInput(value: number | null | undefined, key: 'positionX' | 'positionY' | 'width' | 'height', placeholder?: string) {
    return (
      <input
        type="number"
        value={typeof value === 'number' ? value : ''}
        placeholder={placeholder}
        onChange={(e) => onUpdate({ [key]: e.target.value === '' ? null : Number(e.target.value) })}
        style={gridInputStyle(c)}
      />
    );
  }

  return (
    <>
      <PropertyRow label="X">{numberInput(field.positionX, 'positionX')}</PropertyRow>
      <PropertyRow label="Y">{numberInput(field.positionY, 'positionY')}</PropertyRow>
      <PropertyRow label="Largura">{numberInput(field.width, 'width')}</PropertyRow>
      <PropertyRow label="Altura">{numberInput(field.height, 'height', 'auto')}</PropertyRow>
    </>
  );
}

// Grupo de botões segmentado — cada opção com sua própria borda arredondada (não uma tira única
// dividida, que truncava/apertava com facilidade). Reaproveitado pelo <select> genérico de poucas
// opções curtas e pelos campos avançados de INPUT abaixo.
function SegmentedButtons({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { c } = useFlowTheme();
  return (
    <div className="flex w-full gap-[3px]">
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className="flex-1 flex items-center justify-center gap-1 text-[10.5px] font-semibold cursor-pointer rounded-md py-[6px] px-1"
            style={{
              border: `1px solid ${active ? c.accent : c.border}`,
              background: active ? c.accent : c.cardBg,
              color: active ? '#fff' : c.textPrimary,
            }}
          >
            {Icon ? <Icon size={13} /> : opt.label}
          </button>
        );
      })}
    </div>
  );
}

const LABEL_POSITIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'top', label: 'Rótulo acima', icon: PanelTop },
  { value: 'left', label: 'Rótulo à esquerda', icon: PanelLeft },
  { value: 'right', label: 'Rótulo à direita', icon: PanelRight },
];

// Presets de validação por classe de caractere — escrevem no MESMO validationPattern (regex) que
// já existe e já é validado ponta a ponta (schema, backend, SduiFormRenderer), em vez de um
// conceito novo — o campo de regex customizado continua abaixo pra quem precisar de algo mais
// específico que os 3 presets.
const VALIDATION_PRESETS: { key: string; label: string; pattern: string }[] = [
  { key: 'alpha', label: 'AG', pattern: '^[A-Za-zÀ-ÿ\\s]+$' },
  { key: 'numeric', label: '123', pattern: '^[0-9]+$' },
  { key: 'alphanumeric', label: 'A1A2', pattern: '^[A-Za-z0-9]+$' },
];

// Campos "avançados" só de INPUT (mesmo recorte da referência, que mostra isso pra um campo de
// texto) — labelPosition/maxLength/repeatable vivem em field.config (genérico), mesmo mecanismo já
// usado por slider/callout/etc., sem precisar de coluna nova no FormField.
function InputAdvancedFields({ field, onUpdate }: { field: FormField; onUpdate: (patch: Partial<FormField>) => void }) {
  const { c } = useFlowTheme();
  const config = field.config ?? {};

  function updateConfig(patch: Record<string, unknown>) {
    onUpdate({ config: { ...field.config, ...patch } });
  }

  const labelPosition = typeof config.labelPosition === 'string' ? config.labelPosition : 'top';
  const activePreset = VALIDATION_PRESETS.find((p) => p.pattern === field.validationPattern);
  const maxLength = typeof config.maxLength === 'number' ? config.maxLength : null;

  return (
    <div className="flex flex-col gap-[10px] py-1">
      <div className="flex flex-col gap-[4px]">
        <span className="text-[10.5px] font-medium" style={{ color: c.textSecondary }}>
          Alinhamento do rótulo
        </span>
        <SegmentedButtons options={LABEL_POSITIONS} value={labelPosition} onChange={(v) => updateConfig({ labelPosition: v })} />
      </div>
      <div className="flex flex-col gap-[4px]">
        <span className="text-[10.5px] font-medium" style={{ color: c.textSecondary }}>
          Validação
        </span>
        <SegmentedButtons
          options={VALIDATION_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
          value={activePreset?.key ?? ''}
          onChange={(key) => {
            const preset = VALIDATION_PRESETS.find((p) => p.key === key);
            onUpdate({ validationPattern: preset?.pattern ?? null });
          }}
        />
        <input
          value={field.validationPattern ?? ''}
          placeholder="Expressão regular customizada"
          onChange={(e) => onUpdate({ validationPattern: e.target.value || null })}
          style={{ ...gridInputStyle(c), fontFamily: 'monospace', fontSize: 10.5 }}
        />
      </div>
      <div className="flex flex-col gap-[4px]">
        <span className="text-[10.5px] font-medium" style={{ color: c.textSecondary }}>
          Tamanho máximo
        </span>
        <div className="flex items-center gap-[6px]">
          <input
            type="range"
            min={1}
            max={1000}
            value={maxLength ?? 320}
            onChange={(e) => updateConfig({ maxLength: Number(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            value={maxLength ?? ''}
            placeholder="—"
            onChange={(e) => updateConfig({ maxLength: e.target.value === '' ? null : Number(e.target.value) })}
            style={{ ...gridInputStyle(c), width: 56 }}
          />
        </div>
      </div>
      {/* ponytail: só captura a intenção (config.repeatable) — sem renderizar múltiplas instâncias
          do campo em runtime. Isso exigiria um modelo de valor por campo repetido (array de
          respostas em vez de uma), mudança bem maior que o pedido atual; upgrade quando/se algum
          fluxo precisar de verdade desse comportamento. */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-medium" style={{ color: c.textSecondary }}>
          Repetir este campo
        </span>
        <ToggleSwitch checked={config.repeatable === true} onChange={(checked) => updateConfig({ repeatable: checked })} />
      </div>
    </div>
  );
}
