import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function Modal({ title, subtitle, onClose, children, footer }: ModalProps) {
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
        className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,.25)] border border-[#e4e4e7] flex flex-col max-h-[90vh] box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#f0f0f2]">
          <div className="min-w-0">
            <h2 className="m-0 text-[16px] font-semibold text-[#1a1a1a] tracking-[-0.01em]">{title}</h2>
            {subtitle && <p className="m-0 mt-[3px] text-[12.5px] text-[#71717a]">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent text-[#a1a1aa] cursor-pointer hover:bg-[#f4f4f5] hover:text-[#52525b]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">{children}</div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#f0f0f2] bg-[#fafafa] rounded-b-2xl">
          {footer}
        </div>
      </div>
    </div>
  );
}
