import { useEffect, useState } from 'react';
import { X, Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppTheme, type AppColors } from '../shell/theme';
import { getJourneyPublication } from '../api/journeys';

/** Antes disto, o modal só jogava `JSON.stringify(data, null, 2)` num `<pre>` plano — pra um snapshot
 * de tela real (árvore SDUI aninhada, várias dezenas de linhas) isso vira um bloco de texto ilegível.
 * Árvore recolhível + destaque de token, sem trazer uma lib nova pra isso. */
function JsonNode({ value, name, depth, c }: { value: unknown; name?: string; depth: number; c: AppColors }) {
  const [open, setOpen] = useState(true);
  const KeyLabel = name !== undefined ? (
    <span style={{ color: c.accent }}>"{name}"</span>
  ) : null;

  if (value === null || value === undefined) {
    return <Line indent={depth} keyLabel={KeyLabel}><span style={{ color: c.textMuted, fontStyle: 'italic' }}>null</span></Line>;
  }
  if (typeof value === 'string') {
    return <Line indent={depth} keyLabel={KeyLabel}><span style={{ color: c.success }}>"{value}"</span></Line>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <Line indent={depth} keyLabel={KeyLabel}><span style={{ color: c.warning }}>{String(value)}</span></Line>;
  }
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [i, v] as const) : Object.entries(value as Record<string, unknown>);
  const [openBrace, closeBrace] = isArray ? ['[', ']'] : ['{', '}'];
  if (entries.length === 0) {
    return <Line indent={depth} keyLabel={KeyLabel}><span style={{ color: c.textMuted }}>{openBrace}{closeBrace}</span></Line>;
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-start gap-1 w-full text-left border-0 bg-transparent cursor-pointer p-0"
        style={{ paddingLeft: depth * 14, fontFamily: 'inherit' }}
      >
        {open ? <ChevronDown size={11} style={{ marginTop: 3, color: c.textMuted }} /> : <ChevronRight size={11} style={{ marginTop: 3, color: c.textMuted }} />}
        <span>
          {KeyLabel}{KeyLabel && ': '}
          <span style={{ color: c.textMuted }}>
            {openBrace}{!open && ` ${entries.length} ${isArray ? 'itens' : 'chaves'} `}{!open && closeBrace}
          </span>
        </span>
      </button>
      {open && (
        <>
          {entries.map(([k, v]) => (
            <JsonNode key={k} name={isArray ? undefined : String(k)} value={v} depth={depth + 1} c={c} />
          ))}
          <div style={{ paddingLeft: depth * 14 + 14, color: c.textMuted }}>{closeBrace}</div>
        </>
      )}
    </div>
  );
}

function Line({ indent, keyLabel, children }: { indent: number; keyLabel: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ paddingLeft: indent * 14 + 14 }}>
      {keyLabel}
      {keyLabel && ': '}
      {children}
    </div>
  );
}

interface PublicationSnapshotModalProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  data?: unknown;
}

export function PublicationSnapshotModal({
  journeyId,
  journeyName,
  onClose,
  title,
  subtitle,
  data,
}: PublicationSnapshotModalProps) {
  const { colors: c } = useAppTheme();
  const [json, setJson] = useState<string | null>(data !== undefined ? JSON.stringify(data, null, 2) : null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Reaproveita a mesma string já guardada pro botão "Copiar JSON" — evita manter valor bruto e
  // string em dois estados que poderiam desalinhar.
  let parsed: unknown = null;
  if (json !== null) {
    try {
      parsed = JSON.parse(json);
    } catch {
      parsed = null;
    }
  }

  useEffect(() => {
    if (data !== undefined) return;
    let cancelled = false;
    getJourneyPublication(journeyId)
      .then((res) => {
        if (!cancelled) setJson(JSON.stringify(res, null, 2));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar a publicação.');
      });
    return () => {
      cancelled = true;
    };
  }, [journeyId, data]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function copyToClipboard() {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[820px] rounded-2xl flex flex-col max-h-[85vh] box-border"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: c.border }}>
          <div className="min-w-0">
            <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: c.textPrimary }}>
              {title ?? `Publicação: ${journeyName}`}
            </h2>
            <p className="m-0 mt-[3px] text-[12.5px]" style={{ color: c.textSecondary }}>
              {subtitle ?? 'JSON enviado à API de publicação do runtime.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer"
            style={{ color: c.textMuted }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto">
          {error && (
            <p className="text-[13px]" style={{ color: c.danger }}>
              {error}
            </p>
          )}
          {!error && json === null && (
            <p className="text-[13px]" style={{ color: c.textSecondary }}>
              Carregando...
            </p>
          )}
          {json !== null && parsed !== null && (
            <div
              className="text-[12px] leading-[1.6] rounded-lg p-4 overflow-x-auto"
              style={{ background: c.bg, color: c.textPrimary, border: `1px solid ${c.border}`, fontFamily: 'monospace' }}
            >
              <JsonNode value={parsed} depth={0} c={c} />
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t rounded-b-2xl"
          style={{ borderColor: c.border, background: c.bg }}
        >
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!json}
            className="flex items-center gap-[6px] rounded-md px-3 py-2 text-[12.5px] font-medium cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: c.border, background: c.surface, color: c.textPrimary }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
