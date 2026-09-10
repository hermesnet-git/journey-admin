import { useState } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { PreviewContext } from './previewProjection';

const AREAS: { key: keyof PreviewContext; label: string; help: string }[] = [
  { key: 'form', label: 'Respostas do formulário', help: 'Valores editáveis coletados na jornada.' },
  { key: 'data', label: 'Dados da jornada', help: 'Informações somente para leitura.' },
  { key: 'session', label: 'Sessão', help: 'Contexto da sessão. O canal é preenchido automaticamente.' },
  { key: 'route', label: 'Navegação', help: 'Parâmetros de entrada da navegação.' },
  { key: 'computed', label: 'Valores calculados', help: 'Valores derivados para apoiar a apresentação.' },
];

export function PreviewContextEditor({ value, onChange }: { value: PreviewContext; onChange: (value: PreviewContext) => void }) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<keyof PreviewContext, string>>(() => Object.fromEntries(
    AREAS.map(({ key }) => [key, JSON.stringify(value[key], null, 2)]),
  ) as Record<keyof PreviewContext, string>);
  const [errors, setErrors] = useState<Partial<Record<keyof PreviewContext, string>>>({});

  function update(key: keyof PreviewContext, text: string) {
    setDrafts((current) => ({ ...current, [key]: text }));
    try {
      const parsed = JSON.parse(text || '{}');
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
      setErrors((current) => ({ ...current, [key]: undefined }));
      onChange({ ...value, [key]: parsed as Record<string, unknown> });
    } catch {
      setErrors((current) => ({ ...current, [key]: 'Informe um objeto JSON válido.' }));
    }
  }

  return (
    <section className="mx-auto mb-4 w-full max-w-[760px] rounded-lg" style={{ border: `1px solid ${c.border}`, background: c.cardBg }}>
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left cursor-pointer" style={{ color: c.textPrimary }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Database size={14} />
        <span className="text-[11.5px] font-semibold">Dados do preview</span>
        <span className="ml-auto text-[10.5px]" style={{ color: c.textSecondary }}>Opcional</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t p-3 lg:grid-cols-2" style={{ borderColor: c.border }}>
          {AREAS.map(({ key, label, help }) => (
            <label key={key} className="min-w-0">
              <span className="block text-[11px] font-semibold" style={{ color: c.textPrimary }}>{label}</span>
              <span className="mb-1 block text-[9.5px]" style={{ color: c.textSecondary }}>{help}</span>
              <textarea value={drafts[key]} onChange={(event) => update(key, event.target.value)} spellCheck={false} className="h-20 w-full resize-y rounded-md p-2 font-mono text-[10.5px]" style={{ border: `1px solid ${errors[key] ? c.danger : c.border}`, background: c.canvasBg, color: c.textPrimary }} />
              {errors[key] && <span className="text-[10px]" style={{ color: c.danger }}>{errors[key]}</span>}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
