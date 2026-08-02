import { Undo2, Redo2, ZoomOut, ZoomIn, Maximize, Save, X } from 'lucide-react';

export function Toolbar({
  journeyName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onSave,
  saving,
  onClose,
}: {
  journeyName: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onSave: () => void;
  saving: boolean;
  onClose: () => void;
}) {
  const iconBtn =
    'w-[30px] h-[30px] rounded-lg border-0 bg-transparent flex items-center justify-center cursor-pointer text-[#71717a] hover:bg-[#f4f4f5] disabled:opacity-35';

  return (
    <div className="h-[56px] shrink-0 flex items-center justify-between px-4 border-b border-[#e4e4e7] bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onClose} className={iconBtn} title="Fechar">
          <X size={18} />
        </button>
        <div className="text-[14.5px] font-semibold truncate">{journeyName || 'Nova jornada'}</div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onUndo} disabled={!canUndo} className={iconBtn} title="Desfazer">
          <Undo2 size={17} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={iconBtn} title="Refazer">
          <Redo2 size={17} />
        </button>
        <div className="w-px h-[20px] bg-[#e4e4e7] mx-1" />
        <button onClick={onZoomOut} className={iconBtn} title="Diminuir zoom">
          <ZoomOut size={17} />
        </button>
        <div className="w-8 text-center text-[11.5px] font-medium text-[#71717a]">{zoomPct}%</div>
        <button onClick={onZoomIn} className={iconBtn} title="Aumentar zoom">
          <ZoomIn size={17} />
        </button>
        <button onClick={onFitToScreen} className={iconBtn} title="Ajustar à tela">
          <Maximize size={17} />
        </button>
        <div className="w-px h-[20px] bg-[#e4e4e7] mx-1" />
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-[6px] rounded-md bg-[#019DF4] px-4 py-[7px] text-[13px] font-medium text-white border-0 cursor-pointer disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
