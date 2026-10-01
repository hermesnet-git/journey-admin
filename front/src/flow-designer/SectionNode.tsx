import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, useStore, type Node, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { useFlowTheme } from './theme';

export interface SectionNodeData extends Record<string, unknown> {
  name: string;
  count: number;
  // block = seção recolhida; frame = moldura atrás das etapas; header = nome e ações, por cima.
  variant: 'block' | 'frame' | 'header';
  // danger = faixa de falha (contém o destino de um "Se falhar"): nome em vermelho.
  tone?: 'danger';
  width: number;
  height: number;
  onToggle: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}
export type WFSectionNode = Node<SectionNodeData, 'section'>;

// Seção do canvas: moldura com o nome do grupo em maiúsculas atrás das etapas. Recolhida, vira um
// bloco com a contagem ("4 etapas recolhidas") que abre ao clicar e recebe as linhas do grupo. De
// longe, quando as etapas viram pontos, o nome cresce para continuar legível.
export const SectionNode = memo(function SectionNode({ data }: NodeProps<WFSectionNode>) {
  const { c } = useFlowTheme();
  const zoom = useStore((state) => state.transform[2]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);

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
      className="min-w-0 flex-1 text-[13px] font-semibold bg-transparent outline-none px-[4px] rounded"
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
      className="shrink-0 border-0 bg-transparent cursor-pointer p-0 flex opacity-0 group-hover/section:opacity-70 hover:!opacity-100 transition-opacity"
      style={{ color: c.textSecondary }}
    >
      <X size={13} />
    </button>
  );

  if (data.variant === 'header') {
    return (
      <div className="px-[14px] pt-[10px]" style={{ width: data.width, height: data.height, pointerEvents: 'none' }}>
        <div className="nodrag group/section inline-flex items-center gap-[8px] max-w-full" style={{ pointerEvents: 'auto' }}>
          {!far && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onToggle();
              }}
              title="Recolher seção"
              className="shrink-0 border-0 bg-transparent cursor-pointer p-0 flex text-[10px]"
              style={{ color: c.textSecondary }}
            >
              ▾
            </button>
          )}
          {title}
          {!far && removeButton}
        </div>
      </div>
    );
  }

  if (data.variant === 'block') {
    return (
      <div
        onClick={() => !editing && data.onToggle()}
        title="Clique para abrir a seção"
        className="nodrag group/section rounded-[14px] px-[18px] py-[12px] flex flex-col justify-center cursor-pointer"
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
          <span className="text-[10px]" style={{ color: data.tone === 'danger' ? c.danger : c.accent }}>
            ▸
          </span>
          <span
            className="truncate font-bold uppercase"
            style={{ color: data.tone === 'danger' ? c.danger : c.accent, fontSize: far ? titleSize : 14, letterSpacing: '0.1em' }}
          >
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

  return (
    <div
      className="rounded-[16px]"
      style={{
        width: data.width,
        height: data.height,
        background: `color-mix(in srgb, ${c.textPrimary} 3%, transparent)`,
        border: `1.5px dashed ${c.border}`,
        pointerEvents: 'none',
      }}
    />
  );
});
