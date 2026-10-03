import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, useStore, type Node, type NodeProps } from '@xyflow/react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useFlowTheme } from './theme';
import { resizeBox, type ResizeDirection, type SectionBox } from './sections';

export interface SectionNodeData extends Record<string, unknown> {
  name: string;
  count: number;
  // block = seção recolhida; frame = moldura atrás das etapas; header = nome e ações, por cima.
  variant: 'block' | 'frame' | 'header';
  // danger = faixa de falha (contém o destino de um "Se falhar"): nome em vermelho.
  tone?: 'danger';
  // Moldura da seção em coordenadas do fluxo, e a caixa das etapas que estão dentro dela (o menor
  // tamanho a que ela pode chegar ao redimensionar).
  x: number;
  y: number;
  width: number;
  height: number;
  members: { x0: number; y0: number; x1: number; y1: number } | null;
  onToggle: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onResizeStart: () => void;
  onResize: (box: SectionBox) => void;
}
export type WFSectionNode = Node<SectionNodeData, 'section'>;

// Alças de redimensionar: quatro bordas e quatro cantos.
const HANDLES: { dir: ResizeDirection; style: React.CSSProperties; cursor: string }[] = [
  { dir: 'n', style: { top: -5, left: 14, right: 14, height: 10 }, cursor: 'ns-resize' },
  { dir: 's', style: { bottom: -5, left: 14, right: 14, height: 10 }, cursor: 'ns-resize' },
  { dir: 'w', style: { left: -5, top: 14, bottom: 14, width: 10 }, cursor: 'ew-resize' },
  { dir: 'e', style: { right: -5, top: 14, bottom: 14, width: 10 }, cursor: 'ew-resize' },
  { dir: 'nw', style: { top: -6, left: -6, width: 14, height: 14 }, cursor: 'nwse-resize' },
  { dir: 'ne', style: { top: -6, right: -6, width: 14, height: 14 }, cursor: 'nesw-resize' },
  { dir: 'sw', style: { bottom: -6, left: -6, width: 14, height: 14 }, cursor: 'nesw-resize' },
  { dir: 'se', style: { bottom: -6, right: -6, width: 14, height: 14 }, cursor: 'nwse-resize' },
];

// Seção do canvas: moldura com o nome do grupo em maiúsculas atrás das etapas. Arrasta pelo cabeçalho
// (as etapas de dentro vão junto), redimensiona pelas bordas e cantos e, recolhida, vira um bloco com a
// contagem ("4 etapas recolhidas") que abre ao clicar e recebe a linha que chega no grupo. De longe,
// quando as etapas viram pontos, o nome cresce para continuar legível.
export const SectionNode = memo(function SectionNode({ data }: NodeProps<WFSectionNode>) {
  const { c } = useFlowTheme();
  const zoom = useStore((state) => state.transform[2]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== data.name) data.onRename(name);
    else setDraft(data.name);
  };

  const far = zoom < 0.45;
  // Tamanho na tela de ~12px de perto; de longe compensa o zoom para continuar legível.
  const titleSize = far ? 12 / zoom : 13;

  const title = editing ? (
    <input
      ref={inputRef}
      value={draft}
      maxLength={80}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(data.name);
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="nodrag min-w-0 flex-1 text-[13px] font-semibold bg-transparent outline-none px-[4px] rounded"
      style={{ color: c.textPrimary, border: `1px solid ${c.accent}` }}
    />
  ) : (
    <span
      className="truncate font-bold uppercase cursor-text"
      style={{ color: data.tone === 'danger' ? c.danger : c.textSecondary, fontSize: titleSize, letterSpacing: '0.12em' }}
      title="Clique duas vezes para renomear"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.name);
        setEditing(true);
      }}
    >
      {data.name}
    </span>
  );

  const removeButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        data.onRemove();
      }}
      title="Desfazer seção (as etapas continuam no fluxo)"
      className="nodrag shrink-0 border-0 bg-transparent cursor-pointer p-0 flex opacity-0 group-hover/section:opacity-70 hover:!opacity-100 transition-opacity"
      style={{ color: c.textSecondary }}
    >
      <X size={13} />
    </button>
  );

  if (data.variant === 'header') {
    return (
      <div
        className="group/section px-[14px] pt-[10px] cursor-grab active:cursor-grabbing"
        style={{ width: data.width, height: data.height, pointerEvents: 'auto' }}
        title="Arraste para mover a seção com as etapas"
      >
        <div className="inline-flex items-center gap-[8px] max-w-full">
          {!far && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onToggle();
              }}
              title="Recolher seção"
              className="nodrag shrink-0 border-0 bg-transparent cursor-pointer p-[2px] -m-[2px] flex rounded hover:opacity-100 opacity-80"
              style={{ color: c.textSecondary }}
            >
              <Minimize2 size={14} />
            </button>
          )}
          {title}
          {!far && removeButton}
        </div>
      </div>
    );
  }

  if (data.variant === 'block') {
    const tone = data.tone === 'danger' ? c.danger : c.accent;
    return (
      <div
        onPointerDown={(e) => {
          pressRef.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          // Arrastar o bloco não conta como clique.
          const press = pressRef.current;
          if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) return;
          if (!editing) data.onToggle();
        }}
        title="Clique para abrir a seção; arraste para mover"
        className="group/section rounded-[14px] px-[18px] py-[12px] flex flex-col justify-center cursor-pointer"
        style={{
          width: data.width,
          height: data.height,
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          boxShadow: '0 6px 18px rgba(0,0,0,.18)',
          pointerEvents: 'auto',
        }}
      >
        <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
        <div className="flex items-center gap-[8px] min-w-0">
          <Maximize2 size={far ? titleSize : 14} style={{ color: tone, flexShrink: 0 }} />
          <span className="truncate font-bold uppercase" style={{ color: tone, fontSize: far ? titleSize : 14, letterSpacing: '0.1em' }}>
            {data.name}
          </span>
          <span className="flex-1" />
          {removeButton}
        </div>
        {!far && (
          <>
            <span className="text-[17px] font-semibold mt-[4px]" style={{ color: c.textPrimary }}>
              {data.count} {data.count === 1 ? 'etapa recolhida' : 'etapas recolhidas'}
            </span>
            <span className="text-[13.5px]" style={{ color: c.textSecondary }}>
              Clique para abrir
            </span>
          </>
        )}
        <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
      </div>
    );
  }

  // Moldura: o miolo não pega o mouse (o canvas continua arrastável por dentro dela); só as alças.
  const startResize = (dir: ResizeDirection) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const start: SectionBox = { x: data.x, y: data.y, width: data.width, height: data.height };
    const members = data.members;
    const px = e.clientX;
    const py = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    data.onResizeStart();
    const move = (ev: PointerEvent) => data.onResize(resizeBox(start, dir, (ev.clientX - px) / zoom, (ev.clientY - py) / zoom, members));
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  return (
    <div
      className="relative rounded-[16px]"
      style={{
        width: data.width,
        height: data.height,
        background: `color-mix(in srgb, ${c.textPrimary} 3%, transparent)`,
        border: `1.5px dashed ${c.border}`,
        pointerEvents: 'none',
      }}
    >
      {HANDLES.map(({ dir, style, cursor }) => (
        <div
          key={dir}
          onPointerDown={startResize(dir)}
          title="Arraste para redimensionar a seção"
          className="nodrag nopan absolute rounded-[4px] opacity-0 hover:opacity-100 transition-opacity"
          style={{ ...style, cursor, pointerEvents: 'auto', background: `color-mix(in srgb, ${c.accent} 35%, transparent)` }}
        />
      ))}
    </div>
  );
});
