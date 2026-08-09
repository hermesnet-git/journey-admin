import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppTheme } from '../shell/theme';
import { PrimaryButton } from './ui';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setQueue((prev) => [...prev, { id: nextId.current++, message, type }]);
  }, []);

  const current = queue[0] ?? null;
  const closeCurrent = () => setQueue((prev) => prev.slice(1));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && <ToastDialog item={current} onClose={closeCurrent} />}
    </ToastContext.Provider>
  );
}

function ToastDialog({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { colors: c } = useAppTheme();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isSuccess = item.type === 'success';

  return (
    <div
      role="alertdialog"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-[modal-backdrop-in_180ms_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-2xl p-6 flex flex-col gap-4 box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: isSuccess ? c.successSoft : c.dangerSoft }}
          >
            {isSuccess ? <CheckCircle2 size={17} color={c.success} /> : <XCircle size={17} color={c.danger} />}
          </div>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold" style={{ color: c.textPrimary }}>
              {isSuccess ? 'Sucesso' : 'Erro'}
            </h2>
            <p className="m-0 mt-[6px] text-[13px]" style={{ color: c.textSecondary }}>
              {item.message}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end pt-1">
          <PrimaryButton onClick={onClose}>Fechar</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
