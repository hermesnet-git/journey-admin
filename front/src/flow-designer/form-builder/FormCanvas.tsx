import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AlertTriangle, Boxes, GripVertical, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { ComponentDefinition } from '../../api/componentDefinitions';
import type { SduiNode } from '../../sdui/model';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';

export interface CanvasDragData {
  source: 'canvas';
  nodeId: string;
}

function registryKey(node: SduiNode): string {
  return `${node.type}@${node.version}`;
}

function componentSummary(node: SduiNode): string | null {
  const props = node.props;
  const preferredKeys = node.type === 'ui.text'
    ? ['text', 'content', 'value']
    : ['label', 'title', 'placeholder', 'alt'];
  for (const key of preferredKeys) {
    const value = props[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (node.type === 'ui.select' && Array.isArray(props.options)) {
    return `${props.options.length} ${props.options.length === 1 ? 'opção' : 'opções'}`;
  }
  if (node.type === 'ui.stack' && typeof props.direction === 'string') {
    return props.direction === 'horizontal' ? 'Organização horizontal' : 'Organização vertical';
  }
  return null;
}

function CanvasNode({
  node,
  depth,
  isRoot,
  registry,
  selectedId,
  onSelect,
  onRemove,
  dragActive,
  designChannel,
}: {
  node: SduiNode;
  depth: number;
  isRoot?: boolean;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  const definition = registry.get(registryKey(node));
  const isContainer = !!definition?.allowsChildren;
  const Icon = iconFor(node.type);
  const compatibility = compatibilityForDesignChannel(definition ?? null, designChannel);
  const compatible = compatibility === 'COMPATIBLE';
  const dragData: CanvasDragData = { source: 'canvas', nodeId: node.id };
  const draggable = useDraggable({ id: node.id, data: dragData, disabled: isRoot });
  const droppable = useDroppable({ id: node.id, data: { source: 'canvas-container', nodeId: node.id }, disabled: !isContainer });
  const selected = selectedId === node.id;
  const children = node.children ?? [];
  const summary = componentSummary(node);

  return (
    <div
      ref={draggable.setNodeRef}
      style={{ opacity: draggable.isDragging ? 0.35 : 1, marginLeft: isRoot ? 0 : 18 }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
        style={{
          marginTop: isRoot ? 0 : 8,
          border: `${selected ? 2 : 1}px solid ${selected ? c.accent : dragActive && isContainer ? c.accent : c.border}`,
          borderStyle: dragActive && isContainer && !selected ? 'dashed' : 'solid',
          background: droppable.isOver || selected ? c.accentSoft : c.cardBg,
          boxShadow: selected ? `0 0 0 2px ${c.accentSoft}` : '0 1px 2px rgba(0,0,0,.04)',
        }}
      >
        {!isRoot && (
          <span {...draggable.listeners} {...draggable.attributes} style={{ cursor: 'grab', display: 'flex' }}>
            <GripVertical size={14} color={c.textSecondary} />
          </span>
        )}
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}>
          <Icon size={16} color={c.accent} strokeWidth={1.8} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[12px] font-semibold truncate" style={{ color: c.textPrimary }}>{labelFor(node.type)}</span>
            {isContainer && !isRoot && (
              <span className="text-[9px] rounded px-1.5 py-0.5" style={{ color: c.textSecondary, background: c.canvasBg }}>
                {children.length} {children.length === 1 ? 'item' : 'itens'}
              </span>
            )}
          </span>
          {summary && <span className="block mt-0.5 text-[10.5px] truncate" style={{ color: c.textSecondary }}>{summary}</span>}
          {isRoot && <span className="block mt-0.5 text-[10.5px]" style={{ color: c.textSecondary }}>Estrutura principal da tela</span>}
        </span>
        {!definition && (
          <span className="text-[10px] px-1 rounded" style={{ color: c.danger, background: 'transparent' }} title="Este componente não está mais disponível para edição. Substitua-o antes de publicar.">
            ?
          </span>
        )}
        {definition && !compatible && (
          <span title={compatibilityMessage(compatibility, designChannel) ?? undefined} style={{ display: 'flex' }}>
            <AlertTriangle size={12} color={c.danger} />
          </span>
        )}
        {!isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(node.id);
            }}
            title="Remover"
            className="w-[18px] h-[18px] rounded flex items-center justify-center cursor-pointer border-0 shrink-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {isContainer && (
        <div
          ref={droppable.setNodeRef}
          style={{
            minHeight: children.length === 0 ? 72 : 0,
            marginLeft: isRoot ? 16 : 28,
            marginTop: 8,
            padding: children.length === 0 ? 12 : '0 0 4px 12px',
            border: `1px dashed ${droppable.isOver ? c.accent : c.border}`,
            borderRadius: 8,
            display: children.length === 0 ? 'flex' : 'block',
            alignItems: 'center',
            justifyContent: children.length === 0 ? 'center' : undefined,
            background: droppable.isOver ? c.accentSoft : 'transparent',
          }}
        >
          {children.length === 0 && (
            <span className="flex flex-col items-center gap-1 text-[11px]" style={{ color: c.textSecondary }}>
              <Boxes size={18} color={droppable.isOver ? c.accent : c.textSecondary} />
              <span>{dragActive ? 'Solte para adicionar aqui' : 'Arraste ou adicione um componente'}</span>
            </span>
          )}
          {children.map((child) => (
            <CanvasNode
              key={child.id}
              node={child}
              depth={depth + 1}
              registry={registry}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
              dragActive={dragActive}
              designChannel={designChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Canvas único recursivo — aninhamento arbitrário via dnd-kit puro (useDraggable/useDroppable),
 * sem @dnd-kit/sortable: soltar sempre insere no FIM dos filhos do container alvo (sem reordenar
 * por posição exata dentro de um nível — upgrade natural depois via Camadas, que já tem subir/
 * descer). Escolhido deliberadamente no lugar do padrão "achatar com depth/parentId" de sortable
 * tree: entrega o requisito real (profundidade arbitrária) com bem menos superfície de bug.
 * Puramente apresentacional — o DndContext vive no FormBuilder (paleta e canvas são irmãos,
 * precisam do mesmo provider). */
export function FormCanvas({
  root,
  registry,
  selectedId,
  onSelect,
  onRemove,
  dragActive,
  designChannel,
}: {
  root: SduiNode;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: c.canvasBg }} onClick={() => onSelect(root.id)}>
      <div className="mx-auto w-full max-w-[760px]">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <div className="text-[12px] font-semibold" style={{ color: c.textPrimary }}>Estrutura da tela</div>
            <div className="text-[10.5px]" style={{ color: c.textSecondary }}>Selecione um bloco para configurar suas propriedades.</div>
          </div>
          <span className="rounded-full px-2 py-1 text-[9px] font-semibold" style={{ background: c.accentSoft, color: c.accent }}>
            {designChannel}
          </span>
        </div>
        <CanvasNode
          node={root}
          depth={0}
          isRoot
          registry={registry}
          selectedId={selectedId}
          onSelect={onSelect}
          onRemove={onRemove}
          dragActive={dragActive}
          designChannel={designChannel}
        />
      </div>
    </div>
  );
}
