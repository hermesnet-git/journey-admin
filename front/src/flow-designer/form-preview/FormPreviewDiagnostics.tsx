import { Info, TriangleAlert } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { FormPreviewDiagnostic } from './previewDiagnostics';

export function FormPreviewDiagnostics({ diagnostics }: { diagnostics: FormPreviewDiagnostic[] }) {
  const { c } = useFlowTheme();
  if (diagnostics.length === 0) return null;
  return (
    <aside className="mx-auto mt-4 max-w-[720px] rounded-lg p-3" style={{ border: `1px solid ${c.border}`, background: c.cardBg }}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.textSecondary }}>Observações do preview</div>
      <div className="flex flex-col gap-1.5">
        {diagnostics.map((item) => {
          const Icon = item.tone === 'warning' ? TriangleAlert : Info;
          return <div key={item.id} className="flex items-start gap-2 text-[11.5px]" style={{ color: item.tone === 'warning' ? c.danger : c.textSecondary }}><Icon size={13} className="mt-0.5 shrink-0" />{item.message}</div>;
        })}
      </div>
    </aside>
  );
}
