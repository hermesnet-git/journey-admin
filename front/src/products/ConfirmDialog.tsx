import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ButtonDanger } from '@telefonica/mistica';
import { useAppTheme } from '../shell/theme';
import { SecondaryButton } from './ui';

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
  const { colors: c } = useAppTheme();

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
        className="w-full max-w-[400px] rounded-2xl p-6 flex flex-col gap-4 box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.dangerSoft }}>
            <AlertTriangle size={17} color={c.danger} />
          </div>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold" style={{ color: c.textPrimary }}>
              {title}
            </h2>
            <p className="m-0 mt-[6px] text-[13px]" style={{ color: c.textSecondary }}>
              {message}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
          <ButtonDanger small onPress={onConfirm}>
            {confirmLabel}
          </ButtonDanger>
        </div>
      </div>
    </div>
  );
}
