import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';

// Compartilhado entre ExecutionWorkspace (ao vivo) e diagnostics/HistoryWorkspace (histórico) —
// mesmo cabeçalho de resumo (Instance ID, Business key, etc.) nas duas telas.
export function SummaryField({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem feedback, sem quebrar a tela
    }
  }

  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase" style={{ color: skinVars.colors.textSecondary }}>
        {label}
      </div>
      <div className="flex items-center gap-1">
        <div
          className="text-[12.5px] truncate"
          style={{ color: skinVars.colors.textPrimary, fontFamily: mono ? 'monospace' : undefined }}
        >
          {value}
        </div>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar"
            className="shrink-0 cursor-pointer border-0 bg-transparent flex items-center justify-center"
            style={{ color: copied ? skinVars.colors.brand : skinVars.colors.textSecondary }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
