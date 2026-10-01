import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StickyNote, X } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import type { WFAnnotation } from './model';

// Menor que antes: só a nota solta vira post-it (a ligada a uma etapa é marcador numerado nela).
const ANNOTATION_WIDTH = 160;

// Deliberately its own warm palette (not FlowColors) — a post-it needs to read as "not part of the
// flow" at a glance, distinct from every task/gateway/event card's neutral surface. Sem borda
// própria (post-it de verdade não tem contorno, é só o papel) — o "fold" do canto é que dá a
// textura, não uma linha ao redor.
const PALETTE = {
  light: { bg: '#fef3b8', fold: '#fde68a', ring: 'rgba(234,179,8,0.28)', text: '#713f12', textSoft: '#a16207' },
  dark: { bg: '#4a3a10', fold: '#5c4913', ring: 'rgba(202,138,4,0.32)', text: '#fef3c7', textSoft: '#d1a53d' },
};

// Mesmo motivo do WorkflowNode: memoizado por valor pra não redesenhar todas as anotações a cada
// frame do arraste de qualquer nó do canvas (displayAnnotations também recria `data` a cada render).
export const AnnotationNode = memo(function AnnotationNode({ id, data, selected }: NodeProps<WFAnnotation>) {
  const actions = useWorkflowActions();
  const { dark } = useFlowTheme();
  const p = dark ? PALETTE.dark : PALETTE.light;
  const [editing, setEditing] = useState(!data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [editing]);

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        width: ANNOTATION_WIDTH,
        background: p.bg,
        // Rotação leve + sombra suave em vez de contorno — lê como um papel colado no canvas, não
        // como mais um componente do fluxo (que tem cantos retos, borda e sombra de elevação mais
        // forte). Some no hover/seleção pra não atrapalhar arrastar/clicar.
        transform: selected ? 'none' : 'rotate(-1.1deg)',
        boxShadow: selected ? `0 0 0 3px ${p.ring}, 0 3px 8px -2px rgba(0,0,0,.2)` : '0 2px 5px -1px rgba(0,0,0,.15)',
      }}
      className="group relative rounded-sm px-[10px] py-[9px] cursor-grab select-none transition-transform"
    >
      {/* Canto dobrado — o mesmo truque de gradiente diagonal que qualquer post-it de UI usa: um
          triângulo um tom mais escuro simulando o papel curvando no canto. */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: 16,
          height: 16,
          background: `linear-gradient(135deg, transparent 50%, ${p.fold} 50%)`,
          borderBottomLeftRadius: 3,
        }}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          actions.onDeleteAnnotation(id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Remover anotação"
        className="nodrag absolute -top-[7px] -right-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: p.fold, color: p.text, zIndex: 10 }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-[5px] mb-[6px] opacity-70">
        <StickyNote size={11} color={p.textSoft} strokeWidth={2} />
        <span className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: p.textSoft }}>
          Anotação
        </span>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={data.text}
          onChange={(e) => actions.onUpdateAnnotationText(id, e.target.value)}
          onBlur={() => setEditing(false)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Escreva a nota..."
          className="nodrag w-full text-[11.5px] leading-[1.4] bg-transparent border-0 outline-none resize-none"
          style={{ color: p.text, minHeight: 48, fontFamily: 'inherit' }}
        />
      ) : (
        <div className="text-[11.5px] leading-[1.4] whitespace-pre-wrap break-words" style={{ color: p.text, minHeight: 20 }}>
          {data.text || <span style={{ color: p.textSoft }}>Clique duas vezes para escrever...</span>}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        title="Arraste até uma etapa para ligar a anotação a ela"
        className="transition-transform duration-150 hover:scale-[1.8]"
        style={{ width: 7.5, height: 7.5, background: p.bg, border: `1.75px solid ${p.fold}`, zIndex: 5 }}
      />
    </div>
  );
},
(prev, next) =>
  prev.id === next.id &&
  prev.selected === next.selected &&
  prev.data.text === next.data.text &&
  prev.data.zoom === next.data.zoom &&
  prev.data.linkedNodeIds === next.data.linkedNodeIds,
);
