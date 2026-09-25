import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, MoveDiagonal2, X } from 'lucide-react';
import { JsonTreeViewer, type JsonViewerColors } from './JsonTreeViewer';

const MIN_WIDTH = 420;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 520;

// Modal redimensionável (alça no canto inferior direito) pra examinar um JSON isolado com mais
// espaço e busca — usado em toda tela que hoje só joga um JSON num <pre> plano (Log de
// execução/diagnóstico, resposta de teste de conector, snapshot de publicação/versão de jornada).
export function JsonModal({
  title,
  data,
  colors,
  onClose,
}: {
  title: string;
  data: unknown;
  colors: JsonViewerColors;
  onClose: () => void;
}) {
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [copied, setCopied] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      setSize({
        width: Math.min(Math.max(r.startW + (e.clientX - r.startX), MIN_WIDTH), window.innerWidth - 80),
        height: Math.min(Math.max(r.startH + (e.clientY - r.startY), MIN_HEIGHT), window.innerHeight - 80),
      });
    }
    function onUp() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startResize(e: React.MouseEvent) {
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem feedback, sem quebrar a tela
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.45)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl flex flex-col box-border"
        style={{
          width: size.width,
          height: size.height,
          background: colors.surface,
          boxShadow: '0 24px 60px -12px rgba(0,0,0,.4)',
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: colors.border }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.textPrimary }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="shrink-0 border-0 bg-transparent cursor-pointer p-0"
            style={{ color: colors.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 px-5 py-3">
          <JsonTreeViewer data={data} colors={colors} searchPlaceholder="Buscar neste JSON..." />
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-t" style={{ borderColor: colors.border }}>
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar JSON"
            className="flex items-center gap-1 cursor-pointer rounded px-1.5 py-0.5 border-0"
            style={{ background: colors.backgroundAlt, color: colors.textSecondary, fontSize: 10.5 }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <div
            onMouseDown={startResize}
            title="Arraste para redimensionar"
            className="cursor-nwse-resize"
            style={{ color: colors.textSecondary }}
          >
            <MoveDiagonal2 size={14} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
