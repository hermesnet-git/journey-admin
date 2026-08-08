import { Undo2, Redo2, ZoomOut, ZoomIn, Maximize, Save, LayoutGrid, Keyboard, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_META, TYPE_COLOR, type NodeType } from './model';

const SHORTCUTS_HINT = [
  'Ctrl+Z — Desfazer',
  'Ctrl+Y — Refazer',
  'Delete — Excluir nó/conexão selecionado',
  'Arrastar da paleta — Adicionar nó',
  'Duplo clique no nó — Editar propriedades',
].join('\n');

// 'start' is excluded: exactly one is required and it always exists from the
// initial flow, so it is never offered again in the palette.
const COMPONENT_TYPES: NodeType[] = ['userTask', 'end'];
const COMPONENT_ICON: Partial<Record<NodeType, typeof ClipboardList>> = { userTask: ClipboardList, end: CheckCircle2 };

export function Toolbar({
  onAddComponent,
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
  onAddComponent: (type: NodeType) => void;
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
      <div className="flex items-center gap-2 shrink-0">
        {COMPONENT_TYPES.map((type) => {
          const Icon = COMPONENT_ICON[type]!;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
              onClick={() => onAddComponent(type)}
              title={`Adicionar ${NODE_META[type].title}`}
              className="h-[30px] pl-[6px] pr-[10px] rounded-lg flex items-center gap-[6px] cursor-grab"
              style={{ border: `1px solid ${c.border}` }}
            >
              <div
                className="w-[20px] h-[20px] rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${TYPE_COLOR[type]}22` }}
              >
                <Icon size={12} color={TYPE_COLOR[type]} strokeWidth={1.8} />
              </div>
              <span className="text-[12.5px] font-medium" style={{ color: c.textPrimary }}>
                {NODE_META[type].title}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
