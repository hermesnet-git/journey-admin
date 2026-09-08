import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../products/Modal';
import { Field, TextInput, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import {
  RENDER_TARGETS,
  type ComponentDefinition,
  type ComponentDefinitionInput,
  type ComponentStatus,
  type ComponentCategory,
  type PropDescriptor,
  type PropKind,
  type TargetStatus,
  type RenderTarget,
} from '../api/componentDefinitions';

const STATUS_OPTIONS: { value: ComponentStatus; label: string }[] = [
  { value: 'EXPERIMENTAL', label: 'Experimental' },
  { value: 'STABLE', label: 'Estável' },
  { value: 'DEPRECATED', label: 'Depreciado' },
  { value: 'REMOVED', label: 'Removido' },
];
const CATEGORY_OPTIONS: { value: ComponentCategory; label: string }[] = [
  { value: 'CONTENT', label: 'Conteúdo' },
  { value: 'LAYOUT', label: 'Layout' },
  { value: 'INPUT', label: 'Campos de entrada' },
  { value: 'ACTION', label: 'Ação' },
  { value: 'FEEDBACK', label: 'Feedback' },
];
const PROP_KIND_OPTIONS: PropKind[] = ['TEXT', 'NUMBER', 'BOOLEAN', 'ENUM', 'TOKEN', 'OPTIONS_LIST', 'VALIDATION_LIST'];
const TARGET_STATUS_OPTIONS: TargetStatus[] = ['SUPPORTED', 'PLANNED', 'UNSUPPORTED'];
const TARGET_LABEL: Record<RenderTarget, string> = {
  'react.web': 'React Web',
  'react.mobile': 'React Mobile',
  'flutter.web': 'Flutter Web',
  'flutter.mobile': 'Flutter Mobile',
  whatsapp: 'WhatsApp',
};

function PropsSchemaEditor({ value, onChange }: { value: PropDescriptor[]; onChange: (next: PropDescriptor[]) => void }) {
  const { colors: c } = useAppTheme();

  function update(i: number, patch: Partial<PropDescriptor>) {
    onChange(value.map((p, pi) => (pi === i ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((prop, i) => (
        <div key={i} className="flex flex-col gap-1 p-2 rounded-md" style={{ border: `1px solid ${c.border}` }}>
          <div className="flex gap-2">
            <input
              placeholder="nome"
              value={prop.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1 py-1 px-2 rounded text-[12.5px] outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            />
            <select
              value={prop.kind}
              onChange={(e) => update(i, { kind: e.target.value as PropKind })}
              className="py-1 px-2 rounded text-[12.5px] outline-none"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            >
              {PROP_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[12px]" style={{ color: c.textSecondary }}>
              <input type="checkbox" checked={prop.required} onChange={(e) => update(i, { required: e.target.checked })} />
              obrigatória
            </label>
            <button onClick={() => onChange(value.filter((_, pi) => pi !== i))} className="border-0 bg-transparent cursor-pointer" style={{ color: c.danger }}>
              <Trash2 size={13} />
            </button>
          </div>
          {prop.kind === 'TOKEN' && (
            <input
              placeholder="grupo de token (ex.: color, spacing)"
              value={prop.tokenGroup ?? ''}
              onChange={(e) => update(i, { tokenGroup: e.target.value || null })}
              className="py-1 px-2 rounded text-[12px] outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            />
          )}
          {prop.kind === 'ENUM' && (
            <input
              placeholder="valores possíveis, separados por vírgula"
              value={(prop.enumValues ?? []).join(', ')}
              onChange={(e) =>
                update(i, { enumValues: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
              }
              className="py-1 px-2 rounded text-[12px] outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            />
          )}
        </div>
      ))}
      <button
        onClick={() => onChange([...value, { name: '', kind: 'TEXT', required: false, defaultValue: null, tokenGroup: null, enumValues: null }])}
        className="flex items-center gap-1 self-start border-0 bg-transparent cursor-pointer text-[12.5px]"
        style={{ color: c.accent }}
      >
        <Plus size={13} /> Propriedade
      </button>
    </div>
  );
}

interface Props {
  definition: ComponentDefinition | null;
  onClose: () => void;
  onSubmit: (input: ComponentDefinitionInput) => Promise<void>;
}

export function ComponentDefinitionFormModal({ definition, onClose, onSubmit }: Props) {
  const { colors: c } = useAppTheme();
  const [type, setType] = useState(definition?.type ?? '');
  const [version, setVersion] = useState(definition?.version ?? '1.0');
  const [status, setStatus] = useState<ComponentStatus>(definition?.status ?? 'EXPERIMENTAL');
  const [level, setLevel] = useState(definition?.level ?? 0);
  const [category, setCategory] = useState<ComponentCategory>(definition?.category ?? 'CONTENT');
  const [allowsChildren, setAllowsChildren] = useState(definition?.allowsChildren ?? false);
  const [propsSchema, setPropsSchema] = useState<PropDescriptor[]>(definition?.propsSchema ?? []);
  const [events, setEvents] = useState((definition?.events ?? []).join(', '));
  const [targets, setTargets] = useState(() => {
    const map: Record<RenderTarget, { status: TargetStatus; minRendererVersion: string }> = {} as never;
    for (const t of RENDER_TARGETS) {
      map[t] = { status: definition?.supportedTargets[t]?.status ?? 'UNSUPPORTED', minRendererVersion: definition?.supportedTargets[t]?.minRendererVersion ?? '1.0.0' };
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const supportedTargets: ComponentDefinitionInput['supportedTargets'] = {};
      for (const t of RENDER_TARGETS) supportedTargets[t] = targets[t];
      await onSubmit({
        type,
        version,
        status,
        level,
        category,
        allowsChildren,
        allowedChildTypes: [],
        propsSchema,
        events: events.split(',').map((e) => e.trim()).filter(Boolean),
        supportedTargets,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar componente');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={definition ? `Editar ${definition.type}` : 'Novo componente'}
      subtitle="Define as propriedades, eventos e compatibilidade deste componente nas telas de Jornadas"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!type || !version}>
            {definition ? 'Salvar alterações' : 'Criar componente'}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Field label="Tipo (ui.*)">
            <TextInput value={type} onChange={(e) => setType(e.target.value)} placeholder="ui.textInput" disabled={!!definition} />
          </Field>
          <Field label="Versão">
            <TextInput value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" disabled={!!definition} />
          </Field>
        </div>
        <div className="flex gap-3">
          <Field label="Status">
            <SelectInput value={status} onChange={(e) => setStatus(e.target.value as ComponentStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Nível (0-4)">
            <TextInput type="number" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </Field>
          <Field label="Categoria">
            <SelectInput value={category} onChange={(e) => setCategory(e.target.value as ComponentCategory)}>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: c.textPrimary }}>
          <input type="checkbox" checked={allowsChildren} onChange={(e) => setAllowsChildren(e.target.checked)} />
          Aceita filhos (children) — layout/composição
        </label>
        <Field label="Eventos disparados (separados por vírgula)" helperText="ex.: onPress, onChange, onBlur, onDismiss">
          <TextInput value={events} onChange={(e) => setEvents(e.target.value)} />
        </Field>
        <Field label="Propriedades (propsSchema)">
          <PropsSchemaEditor value={propsSchema} onChange={setPropsSchema} />
        </Field>
        <Field label="Compatibilidade por alvo de renderização">
          <div className="flex flex-col gap-1">
            {RENDER_TARGETS.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-[110px] text-[12.5px]" style={{ color: c.textSecondary }}>
                  {TARGET_LABEL[t]}
                </span>
                <select
                  value={targets[t].status}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [t]: { ...prev[t], status: e.target.value as TargetStatus } }))}
                  className="py-1 px-2 rounded text-[12.5px] outline-none"
                  style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
                >
                  {TARGET_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  value={targets[t].minRendererVersion}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [t]: { ...prev[t], minRendererVersion: e.target.value } }))}
                  placeholder="versão mínima"
                  className="flex-1 py-1 px-2 rounded text-[12.5px] outline-none box-border"
                  style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
                />
              </div>
            ))}
          </div>
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </div>
    </Modal>
  );
}
