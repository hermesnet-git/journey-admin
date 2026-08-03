import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-[modal-backdrop-in_180ms_ease-out]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,.25)] border border-[#e4e4e7] p-6 flex flex-col gap-4 box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <AlertTriangle size={17} color="#b91c1c" />
          </div>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold text-[#1a1a1a]">{title}</h2>
            <p className="m-0 mt-[6px] text-[13px] text-[#71717a]">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-[6px] rounded-md bg-white border border-[#e4e4e7] px-4 py-2 text-[13px] font-medium text-[#1a1a1a] cursor-pointer transition-colors hover:bg-[#f4f4f5]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-[6px] rounded-md bg-[#dc2626] px-4 py-2 text-[13px] font-medium text-white border-0 cursor-pointer transition-colors hover:bg-[#b91c1c]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
