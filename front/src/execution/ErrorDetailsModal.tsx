import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, X } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';

interface Props {
  title: string;
  message: string;
  onClose: () => void;
}

// Portal pro `document.body`: o diagrama fica dentro do viewport do React Flow, que aplica
// `transform` pra pan/zoom — um `position: fixed` teria seu "containing block" recalculado ali
// dentro e não centralizaria na tela de verdade.
export function ErrorDetailsModal({ title, message, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl p-5"
        style={{ background: skinVars.colors.backgroundContainer, boxShadow: '0 24px 60px -12px rgba(0,0,0,.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <Text size={17} weight="bold" color={skinVars.colors.textPrimary}>
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="shrink-0 border-0 bg-transparent cursor-pointer p-0"
            style={{ color: skinVars.colors.textSecondary }}
          >
            <X size={18} />
          </button>
        </div>

        <pre
          className="text-[12.5px] whitespace-pre-wrap break-words rounded-lg p-3 mb-4 overflow-y-auto"
          style={{
            background: skinVars.colors.backgroundAlternative,
            color: skinVars.colors.textSecondary,
            fontFamily: 'monospace',
            maxHeight: 260,
          }}
        >
          {message}
        </pre>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-[6px] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer"
            style={{ background: 'transparent', border: `1px solid ${skinVars.colors.border}`, color: skinVars.colors.textPrimary }}
          >
            <Copy size={14} />
            {copied ? 'Copiado!' : 'Copiar erro'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer border-0"
            style={{ background: skinVars.colors.buttonPrimaryBackground, color: skinVars.colors.textButtonPrimary }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
