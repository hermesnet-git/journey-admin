import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppTheme } from '../shell/theme';

// Backdrop click-to-close, robust against a drag that starts inside the panel and releases
// outside it — dragging the resize handle to enlarge the panel (or just selecting text) ends the
// mouseup over the backdrop, which a plain onClick={onClose} normalizes to a backdrop click and
// closes the modal mid-resize. Recording where the mousedown happened (before any drag) tells the
// two apart. Same fix already applied to flow-designer's own Modal (PropertyGrid.tsx).
function useBackdropClose(onClose: () => void) {
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);
  return {
    onMouseDown: (e: React.MouseEvent) => setMouseDownOnBackdrop(e.target === e.currentTarget),
    onClick: () => {
      if (mouseDownOnBackdrop) onClose();
      setMouseDownOnBackdrop(false);
    },
  };
}

interface ModalProps {
  title: string;
  subtitle?: string;
  // Ícone opcional antes do título — semântico por chamador (ex.: ErrorModal passa um ícone de
  // erro), não algo que todo modal precisa ter por padrão.
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function Modal({ title, subtitle, icon, onClose, children, footer }: ModalProps) {
  const { colors: c } = useAppTheme();
  const backdrop = useBackdropClose(onClose);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-[modal-backdrop-in_180ms_ease-out]"
      {...backdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        // resize (largura+altura) + overflow-hidden: o usuário pode puxar o canto pra abrir mais
        // espaço quando o conteúdo (ex.: lista de violações) for grande — min/max dão o piso/teto
        // pra não encolher a ponto de cortar o cabeçalho nem crescer além da tela. Largura inicial
        // continua 460px (não w-full: isso travaria o teto do resize no próprio valor inicial).
        className="w-[460px] min-w-[320px] max-w-[95vw] rounded-2xl flex flex-col max-h-[90vh] min-h-[180px] box-border overflow-hidden resize animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b shrink-0" style={{ borderColor: c.border }}>
          <div className="min-w-0 flex items-start gap-2.5">
            {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
            <div className="min-w-0">
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: c.textPrimary }}>
                {title}
              </h2>
              {subtitle && (
                <p className="m-0 mt-[3px] text-[12.5px]" style={{ color: c.textSecondary }}>
                  {subtitle}
                </p>
              )}
            </div>
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

        {/* min-h-0: sem isso um filho flex não encolhe abaixo do tamanho do conteúdo, então o
            overflow-y-auto nunca entrava em ação — a modal inteira só crescia (era exatamente o
            "sem scroll" da lista de violações longa). */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto min-h-0 flex-1">{children}</div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t rounded-b-2xl shrink-0"
          style={{ borderColor: c.border, background: c.bg }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
