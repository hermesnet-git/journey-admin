import { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2, ZoomOut, ZoomIn, Maximize, Save, LayoutGrid, Keyboard, ChevronDown, Sparkles, PaintBucket } from 'lucide-react';
import { useFlowTheme } from './theme';
import { EDGE_SHAPE_OPTIONS, type EdgeShape } from './model';

const SHORTCUTS_HINT = [
  'Ctrl+Z — Desfazer',
  'Ctrl+Y — Refazer',
  'Delete — Excluir nó/conexão selecionado',
  'Arrastar da paleta — Adicionar nó',
  'Duplo clique no nó — Editar propriedades',
].join('\n');

// Miniature preview of each edge renderer's path shape — a native <select> can't render icons
// inside its options, so the shape picker below is a small custom dropdown instead.
const EDGE_SHAPE_PATH: Record<EdgeShape, string> = {
  default: 'M3 11 C9 11 11 3 17 3',
  smoothstep: 'M3 11 H8 Q10 11 10 8 Q10 3 12 3 H17',
  step: 'M3 11 H10 V3 H17',
  straight: 'M3 11 L17 3',
};

function EdgeShapeIcon({ shape }: { shape: EdgeShape }) {
  return (
    <svg width={18} height={13} viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <circle cx={3} cy={11} r={1.6} fill="currentColor" stroke="none" />
      <path d={EDGE_SHAPE_PATH[shape]} />
      <circle cx={17} cy={3} r={1.6} fill="currentColor" stroke="none" />
    </svg>
  );
}

function EdgeShapePicker({ value, onChange }: { value: EdgeShape; onChange: (shape: EdgeShape) => void }) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    // Fase de captura — o canvas do React Flow interrompe a propagação do mousedown pro próprio
    // pan/drag, então um clique no canvas nunca chegaria a um listener na fase de bolha aqui.
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Formato das linhas de conexão"
        className="h-[28px] px-[7px] rounded-lg flex items-center gap-[4px] cursor-pointer"
        style={{ border: `1px solid ${c.border}`, color: c.textPrimary, background: c.cardBg }}
      >
        <EdgeShapeIcon shape={value} />
        <ChevronDown size={11} style={{ color: c.textSecondary }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-[32px] w-[172px] rounded-[8px] p-[5px] z-30"
          style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: '0 10px 30px -8px rgba(0,0,0,.25)' }}
        >
          {EDGE_SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center gap-[8px] text-left px-[8px] py-[6px] rounded-[6px] border-0 bg-transparent cursor-pointer text-[12px]"
              style={{ color: opt.value === value ? c.accent : c.textPrimary, background: opt.value === value ? c.hoverBg : 'transparent' }}
            >
              <EdgeShapeIcon shape={opt.value} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOrganize,
  edgeShape,
  onEdgeShapeChange,
  nodeFill,
  onNodeFillChange,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onSave,
  saving,
  onCancel,
  onGenerate,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOrganize: () => void;
  edgeShape: EdgeShape;
  onEdgeShapeChange: (shape: EdgeShape) => void;
  nodeFill: boolean;
  onNodeFillChange: (fill: boolean) => void;
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
  onGenerate: () => void;
}) {
  const { c } = useFlowTheme();
  const iconBtn =
    'w-[27px] h-[27px] rounded-lg border-0 bg-transparent flex items-center justify-center cursor-pointer disabled:opacity-35';
  const divider = <div className="w-px h-[18px] mx-[3px]" style={{ background: c.border }} />;

  return (
    <div className="shrink-0 border-b px-3 py-[6px] flex items-center justify-between gap-3" style={{ background: c.headerBg, borderColor: c.border }}>
      <div className="flex items-center gap-[3px] shrink-0 ml-auto">
        <button
          onClick={onGenerate}
          title="Gerar fluxo a partir de um prompt"
          className="h-[27px] px-[8px] rounded-lg flex items-center gap-[5px] text-[12px] font-semibold cursor-pointer"
          style={{ border: `1px solid ${c.border}`, color: c.accent }}
        >
          <Sparkles size={14} /> Gerar com IA
        </button>
        {divider}
        <button
          onClick={onOrganize}
          title="Organizar objetos no canvas"
          className="h-[27px] px-[8px] rounded-lg flex items-center gap-[5px] text-[12px] font-semibold cursor-pointer"
          style={{ border: `1px solid ${c.border}`, color: c.textPrimary }}
        >
          <LayoutGrid size={14} /> Organizar
        </button>
        <EdgeShapePicker value={edgeShape} onChange={onEdgeShapeChange} />
        <button
          onClick={() => onNodeFillChange(!nodeFill)}
          title={nodeFill ? 'Nós preenchidos com a cor do tipo — clique para deixar vazios' : 'Nós vazios — clique para preencher com a cor do tipo'}
          className={iconBtn}
          style={{ color: nodeFill ? c.accent : c.textSecondary, background: nodeFill ? c.accentSoft : 'transparent' }}
        >
          <PaintBucket size={15} />
        </button>
        {divider}
        <button onClick={onUndo} disabled={!canUndo} className={iconBtn} style={{ color: c.textSecondary }} title="Desfazer (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={iconBtn} style={{ color: c.textSecondary }} title="Refazer (Ctrl+Y)">
          <Redo2 size={16} />
        </button>
        {divider}
        <button onClick={onZoomOut} className={iconBtn} style={{ color: c.textSecondary }} title="Diminuir zoom">
          <ZoomOut size={16} />
        </button>
        <div className="w-7 text-center text-[11px] font-medium" style={{ color: c.textSecondary }}>
          {zoomPct}%
        </div>
        <button onClick={onZoomIn} className={iconBtn} style={{ color: c.textSecondary }} title="Aumentar zoom">
          <ZoomIn size={16} />
        </button>
        <button onClick={onFitToScreen} className={iconBtn} style={{ color: c.textSecondary }} title="Ajustar à tela">
          <Maximize size={16} />
        </button>
        {divider}
        <button className={iconBtn} style={{ color: c.textSecondary }} title={SHORTCUTS_HINT}>
          <Keyboard size={16} />
        </button>
        {divider}
        <button
          onClick={onCancel}
          className="h-[29px] px-3 rounded-md text-[12.5px] font-medium cursor-pointer"
          style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-[5px] h-[29px] rounded-md px-3 text-[12.5px] font-medium text-white border-0 cursor-pointer disabled:opacity-50"
          style={{ background: c.accent }}
        >
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
