import { useState } from 'react';
import { Plus, Trash2, Box, SlidersHorizontal, Braces, MonitorSmartphone, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Modal } from '../products/Modal';
import { Field, TextInput, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import {
  RENDER_TARGETS,
  RESERVED_FIELDS,
  type ComponentDefinition,
  type ComponentDefinitionInput,
  type ComponentStatus,
  type ComponentCategory,
  type PropDescriptor,
  type PropKind,
  type TargetStatus,
  type RenderTarget,
  type ReservedField,
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
const TARGET_STATUS_LABEL: Record<TargetStatus, string> = {
  SUPPORTED: 'Compatível',
  PLANNED: 'Planejado',
  UNSUPPORTED: 'Incompatível',
};
const TARGET_LABEL: Record<RenderTarget, string> = {
  'react.web': 'React Web',
  'react.mobile': 'React Mobile',
  'flutter.web': 'Flutter Web',
  'flutter.mobile': 'Flutter Mobile',
  whatsapp: 'WhatsApp',
};
const RESERVED_FIELD_LABEL: Record<ReservedField, string> = {
  '$bindings': 'Vínculos de dados',
  '$events': 'Ações',
  '$visibility': 'Visibilidade condicional',
  '$active': 'Estado ativo condicional',
};
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function isValidSemVer(value: string): boolean {
  return SEMVER_PATTERN.test(value.trim());
}
const PROP_KIND_LABEL: Record<PropKind, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  BOOLEAN: 'Sim ou não',
  ENUM: 'Lista de valores',
  TOKEN: 'Token visual',
  OPTIONS_LIST: 'Lista de opções',
  VALIDATION_LIST: 'Regras de validação',
};

function FormSection({ icon: Icon, title, description, children }: { icon: typeof Box; title: string; description: string; children: ReactNode }) {
  const { colors: c } = useAppTheme();
  return (
    <section className="rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
      <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.accentSoft, color: c.accent }}>
          <Icon size={16} />
        </span>
        <div>
          <h3 className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>{title}</h3>
          <p className="m-0 mt-0.5 text-[11.5px]" style={{ color: c.textMuted }}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PropsSchemaEditor({ value, onChange }: { value: PropDescriptor[]; onChange: (next: PropDescriptor[]) => void }) {
  const { colors: c } = useAppTheme();

  function update(i: number, patch: Partial<PropDescriptor>) {
    onChange(value.map((p, pi) => (pi === i ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <div className="rounded-lg px-3 py-3 text-[12px]" style={{ background: c.bg, color: c.textMuted }}>
          Nenhuma propriedade configurada.
        </div>
      )}
      {value.map((prop, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-lg" style={{ border: `1px solid ${c.border}`, background: c.bg }}>
          <div className="grid grid-cols-[minmax(0,1fr)_180px_auto_auto] gap-2 items-end">
            <label className="flex flex-col gap-1 text-[11px] font-medium" style={{ color: c.textSecondary }}>
              Nome
            <input
              placeholder="Ex.: label"
              value={prop.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1 py-1 px-2 rounded text-[12.5px] outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium" style={{ color: c.textSecondary }}>
              Tipo de valor
            <select
              value={prop.kind}
              onChange={(e) => update(i, { kind: e.target.value as PropKind })}
              className="py-1 px-2 rounded text-[12.5px] outline-none"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            >
              {PROP_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {PROP_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            </label>
            <label className="flex items-center gap-1 text-[12px] pb-1" style={{ color: c.textSecondary }}>
              <input type="checkbox" checked={prop.required} onChange={(e) => update(i, { required: e.target.checked })} />
              obrigatória
            </label>
            <button type="button" title="Remover propriedade" onClick={() => onChange(value.filter((_, pi) => pi !== i))} className="w-8 h-8 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center" style={{ color: c.danger }}>
              <Trash2 size={15} />
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
        <Plus size={14} /> Adicionar propriedade
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
  const [version, setVersion] = useState(definition?.version ?? '1.0.0');
  const [status, setStatus] = useState<ComponentStatus>(definition?.status ?? 'EXPERIMENTAL');
  const [level, setLevel] = useState(definition?.level ?? 0);
  const [category, setCategory] = useState<ComponentCategory>(definition?.category ?? 'CONTENT');
  const [allowsChildren, setAllowsChildren] = useState(definition?.allowsChildren ?? false);
  const [propsSchema, setPropsSchema] = useState<PropDescriptor[]>(definition?.propsSchema ?? []);
  const [events, setEvents] = useState((definition?.events ?? []).join(', '));
  const [allowedReservedFields, setAllowedReservedFields] = useState<ReservedField[]>(definition?.allowedReservedFields ?? []);
  const [targets, setTargets] = useState(() => {
    const map: Record<RenderTarget, { status: TargetStatus; minRendererVersion: string }> = {} as never;
    for (const t of RENDER_TARGETS) {
      map[t] = { status: definition?.supportedTargets[t]?.status ?? 'UNSUPPORTED', minRendererVersion: definition?.supportedTargets[t]?.minRendererVersion ?? '1.0.0' };
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetVersionErrors = RENDER_TARGETS.filter((target) => !isValidSemVer(targets[target].minRendererVersion));
  const hasInvalidTargetVersion = targetVersionErrors.length > 0;

  async function submit() {
    if (hasInvalidTargetVersion) {
      setError('Corrija as versões mínimas antes de salvar o componente.');
      return;
    }
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
        allowedReservedFields,
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
      subtitle="Configure como o componente poderá ser usado na criação das telas."
      onClose={onClose}
      width={760}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!type || !version || hasInvalidTargetVersion}>
            {definition ? 'Salvar alterações' : 'Criar componente'}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormSection icon={Box} title="Identificação" description="Informações que identificam e organizam o componente no catálogo.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo técnico" helperText={definition ? 'O tipo não pode ser alterado após a criação.' : 'Use o padrão ui.nomeDoComponente.'}>
              <TextInput value={type} onChange={(e) => setType(e.target.value)} placeholder="ui.textInput" disabled={!!definition} />
            </Field>
            <Field label="Versão" helperText="Utilize o formato 1.0.0.">
              <TextInput value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" disabled={!!definition} />
            </Field>
            <Field label="Status">
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value as ComponentStatus)}>
                {STATUS_OPTIONS.filter((s) => definition?.origin !== 'SYSTEM' || s.value !== 'REMOVED').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Categoria">
              <SelectInput value={category} onChange={(e) => setCategory(e.target.value as ComponentCategory)}>
                {CATEGORY_OPTIONS.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Nível de composição" helperText="Define a ordem de apresentação no catálogo.">
              <TextInput type="number" min={0} max={4} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
            </Field>
            <label className="flex items-center gap-3 rounded-lg px-3 py-2 self-start mt-[22px]" style={{ background: c.bg, color: c.textPrimary }}>
              <input type="checkbox" checked={allowsChildren} onChange={(e) => setAllowsChildren(e.target.checked)} />
              <span><strong className="block text-[12.5px]">Pode agrupar componentes</strong><small style={{ color: c.textMuted }}>Permite adicionar conteúdo dentro dele.</small></span>
            </label>
          </div>
        </FormSection>

        <FormSection icon={SlidersHorizontal} title="Comportamento" description="Defina as interações e condições disponíveis no editor de telas.">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {RESERVED_FIELDS.map((field) => (
              <label key={field} className="flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer" style={{ border: `1px solid ${allowedReservedFields.includes(field) ? c.accent : c.border}`, background: allowedReservedFields.includes(field) ? c.accentSoft : c.surface, color: c.textPrimary }}>
                <input type="checkbox" checked={allowedReservedFields.includes(field)} onChange={(e) => setAllowedReservedFields((current) => e.target.checked ? [...current, field] : current.filter((item) => item !== field))} />
                <span className="text-[12.5px] font-medium">{RESERVED_FIELD_LABEL[field]}</span>
              </label>
            ))}
          </div>
          <Field label="Interações disponíveis" optional helperText="Informe os eventos separados por vírgula, por exemplo: onPress, onDismiss.">
            <TextInput value={events} onChange={(e) => setEvents(e.target.value)} placeholder="Nenhuma interação configurada" />
          </Field>
        </FormSection>

        <FormSection icon={Braces} title="Propriedades" description="Configure os dados que poderão ser preenchidos ao usar este componente.">
          <PropsSchemaEditor value={propsSchema} onChange={setPropsSchema} />
        </FormSection>

        <FormSection icon={MonitorSmartphone} title="Compatibilidade" description="Informe onde o componente pode ser renderizado e a versão mínima necessária.">
          <div className="grid grid-cols-[minmax(150px,1fr)_180px_160px] gap-2 px-2 pb-2 text-[11px] font-semibold" style={{ color: c.textMuted }}>
            <span>Alvo</span><span>Disponibilidade</span><span>Versão mínima</span>
          </div>
          <div className="flex flex-col gap-2">
            {RENDER_TARGETS.map((t) => (
              <div key={t} className="grid grid-cols-[minmax(150px,1fr)_180px_160px] gap-2 items-center rounded-lg p-2" style={{ background: c.bg }}>
                <span className="text-[12.5px] font-medium" style={{ color: c.textPrimary }}>{TARGET_LABEL[t]}</span>
                <select value={targets[t].status} onChange={(e) => setTargets((prev) => ({ ...prev, [t]: { ...prev[t], status: e.target.value as TargetStatus } }))} className="py-2 px-2 rounded-md text-[12.5px] outline-none" style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}>
                  {TARGET_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{TARGET_STATUS_LABEL[s]}</option>)}
                </select>
                <div className="flex flex-col gap-1">
                  <input
                    value={targets[t].minRendererVersion}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [t]: { ...prev[t], minRendererVersion: e.target.value } }))}
                    placeholder="1.0.0"
                    inputMode="numeric"
                    aria-invalid={targetVersionErrors.includes(t)}
                    className="w-full py-2 px-2 rounded-md text-[12.5px] outline-none box-border"
                    style={{ border: `1px solid ${targetVersionErrors.includes(t) ? c.danger : c.border}`, background: c.surface, color: c.textPrimary }}
                  />
                  {targetVersionErrors.includes(t) && <span className="text-[10.5px]" style={{ color: c.danger }}>Use o formato 1.0.0.</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-3 text-[11.5px]" style={{ color: c.textMuted }}><Info size={14} className="shrink-0 mt-0.5" /> A compatibilidade técnica é combinada em Web, Mobile e WhatsApp durante a criação da jornada.</div>
        </FormSection>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </div>
    </Modal>
  );
}
