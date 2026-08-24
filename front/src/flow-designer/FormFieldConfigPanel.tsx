import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useFlowTheme } from './theme';
import { PropertyGrid, PropertyRow, gridInputStyle } from './PropertyGrid';
import { VariablePickerButton, insertTokenAtCursor } from './PropertiesPanel';
import { COMPONENT_META, COMPONENT_PROPERTIES, getPropertyValue, setPropertyValue, type PropertySchema } from './formScreenModel';
import type { VariableOrigin } from './model';
import { collectsValue } from '../api/forms';
import type { FormField, FormFieldOption } from '../api/forms';

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Painel genérico dirigido por schema (COMPONENT_PROPERTIES) — uma única implementação pra todo o
// catálogo de ~17 componentes, em vez de um bloco de JSX hardcoded por tipo (não escalaria).
// Rotulado "Configuração" (não "Propriedades"); expandido/recolhido é controlado por fora
// (FormPreviewDock), sincronizado com o expandir/recolher do dock inteiro.
export function FormFieldConfigPanel({
  field,
  expanded,
  onExpandedChange,
  onUpdate,
  variables,
  sameScreenNames,
  crossNodeNames,
}: {
  field: FormField | null;
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
          <>
            <div className="text-[11px] font-semibold mb-2 px-1" style={{ color: c.textSecondary }}>
              {COMPONENT_META[field.type].label}
            </div>
            <PropertyGrid>
              <PropertyRow label="Nome (técnico)" first>
                <NameField
                  field={field}
                  onUpdate={onUpdate}
                  takenNames={
                    collectsValue(field.type) ? new Set([...sameScreenNames, ...crossNodeNames]) : sameScreenNames
                  }
                />
              </PropertyRow>
              {COMPONENT_PROPERTIES[field.type].map((schema) => (
                <PropertyRow key={schema.key} label={schema.label}>
                  <PropertyInput schema={schema} field={field} onUpdate={onUpdate} variables={variables} />
                </PropertyRow>
              ))}
            </PropertyGrid>
          </>
        )}
      </div>
    </div>
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
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  takenNames: Set<string>;
}) {
  const { c } = useFlowTheme();
  const [draft, setDraft] = useState(field.name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(field.name);
    setError(null);
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
}: {
  schema: PropertySchema;
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  variables: VariableOrigin[];
}) {
  const { c } = useFlowTheme();
  const value = getPropertyValue(field, schema.key);
  const textRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function update(next: unknown) {
    onUpdate(setPropertyValue(field, schema.key, next) as Partial<FormField>);
  }

  if (schema.kind === 'boolean') {
    return <input type="checkbox" checked={value === true} onChange={(e) => update(e.target.checked)} />;
  }

  if (schema.kind === 'select') {
    return (
      <select
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : (schema.selectOptions?.[0] ?? '')}
        onChange={(e) => update(e.target.value)}
        style={{ ...gridInputStyle(c), cursor: 'pointer' }}
      >
        {(schema.selectOptions ?? []).map((opt) => (
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
  // antiga "Mensagem exibida ao usuário" já usava.
  const text = typeof value === 'string' ? value : '';
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
