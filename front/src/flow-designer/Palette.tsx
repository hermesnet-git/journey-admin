import { useState } from 'react';
import { StickyNote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_META, NODE_ICON, TYPE_COLOR, type NodeType } from './model';
import { NodeShape } from './NodeShape';

// Both start-type elements are offered since 'start' is now deletable/re-addable
// (only one of start/messageStartEvent may exist at a time — validated at save).
const PALETTE_TYPES: NodeType[] = ['start', 'messageStartEvent', 'userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];
// Matches AnnotationNode's own post-it palette — an annotation isn't a flow component, so it
// deliberately doesn't borrow a TYPE_COLOR.
const ANNOTATION_COLOR = '#eab308';

const THUMB_COLLAPSED = 32;
const THUMB_EXPANDED = 48;

// Mesma forma do nó real no canvas (círculo de evento/task, losango de decisão), só numa miniatura
// fixa — a paleta deixa de ter um formato próprio (chip quadrado) que não corresponde a nada que o
// usuário vê depois de soltar o componente no canvas.
function PaletteNodeIcon({ type, size = THUMB_COLLAPSED }: { type: NodeType; size?: number }) {
  const { c } = useFlowTheme();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <NodeShape
        nodeType={type}
        name=""
        background={c.cardBg}
        borderColor={c.border}
        iconColor={TYPE_COLOR[type]}
        labelColor={c.textPrimary}
        boxShadow="none"
        surfaceColor={c.cardBg}
        badgeColor={c.accent}
        showLabel={false}
        connectorType={null}
      />
    </div>
  );
}

// Rich hover hint with the type's full explanation (NODE_META.help) — the native `title` tooltip
// can't carry this much text legibly, especially with the palette collapsed to icon-only.
function PaletteHint({ type }: { type: NodeType }) {
  const { c } = useFlowTheme();
  const Icon = NODE_ICON[type];
  const color = TYPE_COLOR[type];
  return (
    <div
      className="absolute left-full top-0 ml-2 w-[260px] p-3 rounded-xl opacity-0 scale-95 pointer-events-none origin-left transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-30"
      style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -8px ${color}40, 0 4px 14px -4px rgba(0,0,0,.18)` }}
    >
      <div className="flex items-center gap-[8px] mb-[6px]">
        <div className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
          <Icon size={12} color={color} strokeWidth={1.8} />
        </div>
        <div className="text-[12.5px] font-bold" style={{ color: c.textPrimary }}>
          {NODE_META[type].title}
        </div>
      </div>
      <div className="text-[11.5px] leading-[1.5]" style={{ color: c.textSecondary }}>
        {NODE_META[type].help}
      </div>
      <div className="text-[10px] font-semibold mt-[8px] pt-[7px] border-t" style={{ color, borderColor: c.border }}>
        Arraste para o canvas ou clique para adicionar
      </div>
    </div>
  );
}

// Same rich-hint pattern as PaletteHint, for the one non-NodeType palette entry.
function AnnotationHint() {
  const { c } = useFlowTheme();
  return (
    <div
      className="absolute left-full top-0 ml-2 w-[260px] p-3 rounded-xl opacity-0 scale-95 pointer-events-none origin-left transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-30"
      style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -8px ${ANNOTATION_COLOR}40, 0 4px 14px -4px rgba(0,0,0,.18)` }}
    >
      <div className="flex items-center gap-[8px] mb-[6px]">
        <div className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0" style={{ background: `${ANNOTATION_COLOR}22` }}>
          <StickyNote size={12} color={ANNOTATION_COLOR} strokeWidth={1.8} />
        </div>
        <div className="text-[12.5px] font-bold" style={{ color: c.textPrimary }}>
          Anotação
        </div>
      </div>
      <div className="text-[11.5px] leading-[1.5]" style={{ color: c.textSecondary }}>
        Uma nota livre no canvas, só para documentação — não faz parte do fluxo executável e nunca é
        transformada em BPMN. Arraste a partir dela até um nó para vinculá-la (linha pontilhada).
      </div>
      <div className="text-[10px] font-semibold mt-[8px] pt-[7px] border-t" style={{ color: ANNOTATION_COLOR, borderColor: c.border }}>
        Clique para adicionar
      </div>
    </div>
  );
}

export function Palette({
  onAdd,
  onAddAnnotation,
}: {
  onAdd: (type: NodeType) => void;
  onAddAnnotation: () => void;
}) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <div
        className="w-[52px] shrink-0 border-r flex flex-col items-center gap-[6px] pt-2"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir painel"
          className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={14} />
        </button>
        <div className="w-5 h-px" style={{ background: c.border }} />
        {PALETTE_TYPES.map((type) => (
          <div key={type} className="group relative">
            <div draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', type)} onClick={() => onAdd(type)} className="cursor-grab">
              <PaletteNodeIcon type={type} />
            </div>
            <PaletteHint type={type} />
          </div>
        ))}
        <div className="w-5 h-px" style={{ background: c.border }} />
        <div className="group relative">
          <div
            onClick={onAddAnnotation}
            className="w-[32px] h-[32px] rounded-md flex items-center justify-center shrink-0 cursor-pointer"
            style={{ background: `${ANNOTATION_COLOR}22` }}
          >
            <StickyNote size={14} color={ANNOTATION_COLOR} strokeWidth={1.8} />
          </div>
          <AnnotationHint />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[160px] shrink-0 border-r flex flex-col"
      style={{ background: c.sidebarBg, borderColor: c.border }}
    >
      <div className="flex flex-col">
        <div
          className="relative flex items-center justify-center px-2 py-[6px] border-b border-l-[3px]"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
        >
          <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
            Componentes
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            title="Recolher painel"
            className="absolute right-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronLeft size={13} />
          </button>
        </div>
        <div className="p-2 flex flex-col gap-[8px]">
          {PALETTE_TYPES.map((type) => (
            <div key={type} className="group relative">
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
                onClick={() => onAdd(type)}
                className="flex flex-col items-center gap-[8px] py-[10px] px-[6px] rounded-lg cursor-grab hover:opacity-80 transition-opacity"
              >
                <PaletteNodeIcon type={type} size={THUMB_EXPANDED} />
                <div className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: c.textSecondary }}>
                  {NODE_META[type].title}
                </div>
              </div>
              <PaletteHint type={type} />
            </div>
          ))}
          <div className="h-px my-[2px]" style={{ background: c.border }} />
          <div className="group relative">
            <div
              onClick={onAddAnnotation}
              className="flex flex-col items-center gap-[8px] py-[10px] px-[6px] rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            >
              {/* Mesmo post-it do canvas (papel + canto dobrado, sem contorno) numa miniatura,
                  em vez do ícone dentro de um chip — igual ao tratamento dos outros componentes. */}
              <div className="relative shrink-0" style={{ width: THUMB_EXPANDED, height: THUMB_EXPANDED, background: `${ANNOTATION_COLOR}26`, borderRadius: 3 }}>
                <div
                  className="absolute top-0 right-0"
                  style={{ width: 12, height: 12, background: `linear-gradient(135deg, transparent 50%, ${ANNOTATION_COLOR}55 50%)` }}
                />
                <div className="w-full h-full flex items-center justify-center">
                  <StickyNote size={18} color={ANNOTATION_COLOR} strokeWidth={1.8} />
                </div>
              </div>
              <div className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: c.textSecondary }}>
                Anotação
              </div>
            </div>
            <AnnotationHint />
          </div>
        </div>
      </div>
    </div>
  );
}
