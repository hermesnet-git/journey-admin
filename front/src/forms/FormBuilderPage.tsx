import { useState } from 'react';
import {
  ArrowLeft,
  Type,
  TextCursorInput,
  CircleDot,
  ListChecks,
  Upload,
  AlignLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Field, TextInput, TextArea, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import { createForm, updateForm, type Form, type FormField, type FormFieldType, type FormInput } from '../api/forms';

const FIELD_TYPE_META: Record<FormFieldType, { label: string; icon: typeof Type }> = {
  TEXT: { label: 'Texto', icon: Type },
  INPUT: { label: 'Campo de entrada', icon: TextCursorInput },
  SINGLE_SELECT: { label: 'Seleção simples', icon: CircleDot },
  MULTI_SELECT: { label: 'Seleção múltipla', icon: ListChecks },
  FILE_UPLOAD: { label: 'Upload de arquivo', icon: Upload },
  STATIC_CONTENT: { label: 'Conteúdo estático', icon: AlignLeft },
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FormFieldType[];

function makeField(type: FormFieldType): FormField {
  const isSelect = type === 'SINGLE_SELECT' || type === 'MULTI_SELECT';
  return {
    id: crypto.randomUUID(),
    type,
    label: FIELD_TYPE_META[type].label,
    required: false,
    defaultValue: null,
    helpText: null,
    options: isSelect ? ['Opção 1'] : null,
  };
}

interface FormBuilderPageProps {
  form: Form | null;
  onBack: () => void;
  onSaved: () => Promise<void>;
}

export function FormBuilderPage({ form, onBack, onSaved }: FormBuilderPageProps) {
  const { colors: c } = useAppTheme();
  const [name, setName] = useState(form?.name ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField(type: FormFieldType) {
    const field = makeField(type);
    setFields((prev) => [...prev, field]);
    setExpandedId(field.id);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const input: FormInput = { name, description, fields };
      if (form) {
        await updateForm(form.formId, input);
      } else {
        await createForm(input);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar formulário');
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && fields.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-[40px] py-4 border-b flex-wrap"
        style={{ borderColor: c.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer border-0 bg-transparent shrink-0"
            style={{ color: c.textSecondary }}
            title="Voltar"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0">
            <h1 className="m-0 text-[18px] font-semibold tracking-[-0.02em] truncate" style={{ color: c.textPrimary }}>
              {form ? 'Editar formulário' : 'Novo formulário'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onBack}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={handleSave} loading={saving} disabled={!canSave}>
            Salvar formulário
          </PrimaryButton>
        </div>
      </div>

      {error && (
        <div className="px-[40px] pt-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-[24px_40px] box-border flex flex-col gap-5">
          <div className="flex flex-col gap-4 max-w-[560px]">
            <Field label="Nome">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus />
            </Field>
            <Field label="Descrição" optional>
              <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <div>
            <div className="text-[13px] font-semibold mb-2" style={{ color: c.textPrimary }}>
              Campos
            </div>
            {fields.length === 0 && (
              <p className="text-[12.5px] m-0 mb-3" style={{ color: c.textMuted }}>
                Adicione componentes ao formulário usando os botões abaixo.
              </p>
            )}
            <div className="flex flex-col gap-2 max-w-[560px]">
              {fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  total={fields.length}
                  expanded={expandedId === field.id}
                  onToggle={() => setExpandedId((cur) => (cur === field.id ? null : field.id))}
                  onUpdate={(patch) => updateField(field.id, patch)}
                  onRemove={() => removeField(field.id)}
                  onMove={(dir) => moveField(index, dir)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[12px] font-semibold mb-2" style={{ color: c.textSecondary }}>
              Adicionar campo
            </div>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((type) => {
                const meta = FIELD_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="flex items-center gap-[6px] rounded-md px-3 py-2 text-[12.5px] font-medium cursor-pointer border"
                    style={{ borderColor: c.border, background: c.surface, color: c.textPrimary }}
                  >
                    <Plus size={13} />
                    <Icon size={14} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="w-[380px] shrink-0 border-l overflow-auto p-[24px_28px] box-border"
          style={{ borderColor: c.border, background: c.surface }}
        >
          <div className="text-[13px] font-semibold mb-4" style={{ color: c.textPrimary }}>
            Preview
          </div>
          <FormPreview name={name} description={description} fields={fields} />
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  field,
  index,
  total,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { colors: c } = useAppTheme();
  const meta = FIELD_TYPE_META[field.type];
  const Icon = meta.icon;
  const isSelect = field.type === 'SINGLE_SELECT' || field.type === 'MULTI_SELECT';
  const options = field.options ?? [];

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: c.border, background: c.surface }}>
      <div
        className="flex items-center gap-2 px-3 py-[10px] cursor-pointer"
        onClick={onToggle}
      >
        <Icon size={15} style={{ color: c.textMuted }} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: c.textPrimary }}>
            {field.label || meta.label}
          </div>
          <div className="text-[11px]" style={{ color: c.textMuted }}>
            {meta.label}
            {field.required ? ' · obrigatório' : ''}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          disabled={index === 0}
          className="flex items-center justify-center w-6 h-6 rounded border-0 bg-transparent cursor-pointer disabled:opacity-30"
          style={{ color: c.textSecondary }}
          title="Mover para cima"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          disabled={index === total - 1}
          className="flex items-center justify-center w-6 h-6 rounded border-0 bg-transparent cursor-pointer disabled:opacity-30"
          style={{ color: c.textSecondary }}
          title="Mover para baixo"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex items-center justify-center w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
          style={{ color: c.danger }}
          title="Remover campo"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-3" style={{ borderTop: `1px solid ${c.border}` }}>
          <Field label="Rótulo">
            <TextInput value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
          </Field>

          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: c.textPrimary }}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
            />
            Campo obrigatório
          </label>

          {isSelect && (
            <Field label="Opções">
              <div className="flex flex-col gap-[6px]">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-[6px]">
                    <TextInput
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        onUpdate({ options: next });
                      }}
                    />
                    <button
                      onClick={() => onUpdate({ options: options.filter((_, idx) => idx !== i) })}
                      disabled={options.length <= 1}
                      className="flex items-center justify-center w-8 h-8 shrink-0 rounded border-0 bg-transparent cursor-pointer disabled:opacity-30"
                      style={{ color: c.danger }}
                      title="Remover opção"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onUpdate({ options: [...options, `Opção ${options.length + 1}`] })}
                  className="self-start flex items-center gap-1 text-[12px] font-medium border-0 bg-transparent cursor-pointer p-0"
                  style={{ color: c.accent }}
                >
                  <Plus size={13} /> Adicionar opção
                </button>
              </div>
            </Field>
          )}

          {field.type !== 'TEXT' && field.type !== 'STATIC_CONTENT' && field.type !== 'FILE_UPLOAD' && (
            <Field label="Valor padrão" optional>
              <TextInput
                value={field.defaultValue ?? ''}
                onChange={(e) => onUpdate({ defaultValue: e.target.value || null })}
              />
            </Field>
          )}

          <Field label="Texto de ajuda" optional>
            <TextArea
              value={field.helpText ?? ''}
              onChange={(e) => onUpdate({ helpText: e.target.value || null })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function FormPreview({ name, description, fields }: { name: string; description: string; fields: FormField[] }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4" style={{ borderColor: c.border, background: c.bg }}>
      <div>
        <div className="text-[15px] font-semibold" style={{ color: c.textPrimary }}>
          {name || 'Nome do formulário'}
        </div>
        {description && (
          <div className="text-[12px] mt-1" style={{ color: c.textSecondary }}>
            {description}
          </div>
        )}
      </div>
      {fields.length === 0 ? (
        <div className="text-[12.5px]" style={{ color: c.textMuted }}>
          Nenhum campo adicionado.
        </div>
      ) : (
        fields.map((field) => <FieldPreview key={field.id} field={field} />)
      )}
    </div>
  );
}

function FieldPreview({ field }: { field: FormField }) {
  const { colors: c } = useAppTheme();
  const label = (
    <div className="text-[12px] font-semibold mb-[6px]" style={{ color: c.textSecondary }}>
      {field.label}
      {field.required && <span style={{ color: c.danger }}> *</span>}
    </div>
  );
  const help = field.helpText && (
    <div className="text-[11px] mt-1" style={{ color: c.textMuted }}>
      {field.helpText}
    </div>
  );
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.textMuted,
    fontSize: 13,
    boxSizing: 'border-box',
  };

  if (field.type === 'TEXT') {
    return (
      <div className="text-[13px]" style={{ color: c.textPrimary }}>
        {field.label}
        {help}
      </div>
    );
  }
  if (field.type === 'STATIC_CONTENT') {
    return (
      <div className="rounded-lg p-3 text-[12.5px]" style={{ background: c.chipBg, color: c.textSecondary }}>
        {field.label}
        {help}
      </div>
    );
  }
  return (
    <div>
      {label}
      {field.type === 'INPUT' && (
        <input disabled placeholder={field.defaultValue ?? ''} style={inputStyle} />
      )}
      {field.type === 'SINGLE_SELECT' && (
        <select disabled style={{ ...inputStyle, cursor: 'not-allowed' }}>
          {(field.options ?? []).map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      )}
      {field.type === 'MULTI_SELECT' && (
        <div className="flex flex-col gap-1">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-[6px] text-[12.5px]" style={{ color: c.textMuted }}>
              <input type="checkbox" disabled />
              {opt}
            </label>
          ))}
        </div>
      )}
      {field.type === 'FILE_UPLOAD' && <input type="file" disabled style={inputStyle} />}
      {help}
    </div>
  );
}
