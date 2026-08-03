import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppTheme } from '../shell/theme';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function Modal({ title, subtitle, onClose, children, footer }: ModalProps) {
  const { colors: c } = useAppTheme();

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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-2xl flex flex-col max-h-[90vh] box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: c.border }}>
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

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">{children}</div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t rounded-b-2xl"
          style={{ borderColor: c.border, background: c.bg }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
