import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useAppTheme } from '../shell/theme';
import { getJourneyPublication } from '../api/journeys';

interface PublicationSnapshotModalProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

export function PublicationSnapshotModal({ journeyId, journeyName, onClose }: PublicationSnapshotModalProps) {
  const { colors: c } = useAppTheme();
  const [json, setJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJourneyPublication(journeyId)
      .then((data) => {
        if (!cancelled) setJson(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar a publicação.');
      });
    return () => {
      cancelled = true;
    };
  }, [journeyId]);

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
              Publicação: {journeyName}
            </h2>
            <p className="m-0 mt-[3px] text-[12.5px]" style={{ color: c.textSecondary }}>
              JSON enviado à API de publicação do runtime.
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
          {json !== null && (
            <pre
              className="m-0 text-[12px] leading-[1.5] whitespace-pre-wrap break-words rounded-lg p-4"
              style={{ background: c.bg, color: c.textPrimary, border: `1px solid ${c.border}` }}
            >
              {json}
            </pre>
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
