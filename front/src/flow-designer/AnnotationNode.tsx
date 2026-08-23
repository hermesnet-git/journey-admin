import { useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StickyNote, X, Link2, Link2Off } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import type { WFAnnotation } from './model';

const ANNOTATION_WIDTH = 190;

// Deliberately its own warm palette (not FlowColors) — a post-it needs to read as "not part of the
// flow" at a glance, distinct from every task/gateway/event card's neutral surface.
const PALETTE = {
  light: { bg: '#fef9c3', border: '#eab308', ring: 'rgba(234,179,8,0.28)', text: '#713f12', textSoft: '#a16207' },
  dark: { bg: '#3f2f05', border: '#ca8a04', ring: 'rgba(202,138,4,0.32)', text: '#fef3c7', textSoft: '#d1a53d' },
};

export function AnnotationNode({ id, data, selected }: NodeProps<WFAnnotation>) {
  const actions = useWorkflowActions();
  const { dark } = useFlowTheme();
  const p = dark ? PALETTE.dark : PALETTE.light;
  const [editing, setEditing] = useState(!data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showDetails = (data.zoom ?? 1) >= 0.5;

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
        borderColor: p.border,
        boxShadow: selected ? `0 0 0 3px ${p.ring}` : '0 2px 6px -2px rgba(0,0,0,.18)',
      }}
      className="group relative rounded-lg border px-[10px] py-[9px] cursor-grab select-none"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          actions.onDeleteAnnotation(id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Remover anotação"
        className="nodrag absolute -top-[7px] -right-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: p.border, color: '#fff', zIndex: 10 }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-[6px] mb-[6px]">
        <StickyNote size={13} color={p.textSoft} strokeWidth={2} />
        <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: p.textSoft }}>
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
          className="nodrag w-full text-[12px] leading-[1.4] bg-transparent border-0 outline-none resize-none"
          style={{ color: p.text, minHeight: 48, fontFamily: 'inherit' }}
        />
      ) : (
        <div className="text-[12px] leading-[1.4] whitespace-pre-wrap break-words" style={{ color: p.text, minHeight: 20 }}>
          {data.text || <span style={{ color: p.textSoft }}>Clique duas vezes para escrever...</span>}
        </div>
      )}

      {showDetails && data.linkedNodeIds.length > 0 && (
        <div className="flex flex-col gap-[3px] mt-[7px] pt-[6px]" style={{ borderTop: `1px solid ${p.border}66` }}>
          {data.linkedNodeIds.map((nodeId) => (
            <div key={nodeId} className="flex items-center gap-[4px] text-[10px]" style={{ color: p.textSoft }}>
              <Link2 size={10} className="shrink-0" />
              <span className="truncate flex-1">{actions.getNodeName(nodeId) ?? nodeId}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onUnlinkAnnotation(id, nodeId);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Desvincular"
                className="nodrag shrink-0 border-0 bg-transparent cursor-pointer p-0 flex items-center"
                style={{ color: p.textSoft }}
              >
                <Link2Off size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        title="Arraste até um nó do fluxo para vincular"
        className="transition-transform duration-150 hover:scale-[1.8]"
        style={{ width: 7.5, height: 7.5, background: p.bg, border: `1.75px solid ${p.border}`, zIndex: 5 }}
      />
    </div>
  );
}
