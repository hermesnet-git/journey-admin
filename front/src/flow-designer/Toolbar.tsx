import { Undo2, Redo2, ZoomOut, ZoomIn, Maximize, Save, LayoutGrid, Keyboard } from 'lucide-react';
import { useFlowTheme } from './theme';

const SHORTCUTS_HINT = [
  'Ctrl+Z — Desfazer',
  'Ctrl+Y — Refazer',
  'Delete — Excluir nó/conexão selecionado',
  'Arrastar da paleta — Adicionar nó',
  'Duplo clique no nó — Editar propriedades',
].join('\n');

export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOrganize,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onSave,
  saving,
  onCancel,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOrganize: () => void;
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const { c } = useFlowTheme();
  const iconBtn =
    'w-[30px] h-[30px] rounded-lg border-0 bg-transparent flex items-center justify-center cursor-pointer disabled:opacity-35';

  return (
    <div className="shrink-0 border-b px-4 py-[9px] flex items-center justify-between gap-4" style={{ background: c.headerBg, borderColor: c.border }}>
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <button
          onClick={onOrganize}
          title="Organizar objetos no canvas"
          className="h-[30px] px-[9px] rounded-lg flex items-center gap-[6px] text-[12.5px] font-semibold cursor-pointer"
          style={{ border: `1px solid ${c.border}`, color: c.textPrimary }}
        >
          <LayoutGrid size={15} /> Organizar
        </button>
        <div className="w-px h-[20px] mx-1" style={{ background: c.border }} />
        <button onClick={onUndo} disabled={!canUndo} className={iconBtn} style={{ color: c.textSecondary }} title="Desfazer (Ctrl+Z)">
          <Undo2 size={17} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={iconBtn} style={{ color: c.textSecondary }} title="Refazer (Ctrl+Y)">
          <Redo2 size={17} />
        </button>
        <div className="w-px h-[20px] mx-1" style={{ background: c.border }} />
        <button onClick={onZoomOut} className={iconBtn} style={{ color: c.textSecondary }} title="Diminuir zoom">
          <ZoomOut size={17} />
        </button>
        <div className="w-8 text-center text-[11.5px] font-medium" style={{ color: c.textSecondary }}>
          {zoomPct}%
        </div>
        <button onClick={onZoomIn} className={iconBtn} style={{ color: c.textSecondary }} title="Aumentar zoom">
          <ZoomIn size={17} />
        </button>
        <button onClick={onFitToScreen} className={iconBtn} style={{ color: c.textSecondary }} title="Ajustar à tela">
          <Maximize size={17} />
        </button>
        <div className="w-px h-[20px] mx-1" style={{ background: c.border }} />
        <button className={iconBtn} style={{ color: c.textSecondary }} title={SHORTCUTS_HINT}>
          <Keyboard size={17} />
        </button>
        <div className="w-px h-[20px] mx-1" style={{ background: c.border }} />
        <button
          onClick={onCancel}
          className="h-[32px] px-4 rounded-md text-[13px] font-medium cursor-pointer"
          style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-[6px] rounded-md px-4 py-[7px] text-[13px] font-medium text-white border-0 cursor-pointer disabled:opacity-50"
          style={{ background: c.accent }}
        >
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
