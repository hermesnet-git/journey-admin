import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, X } from 'lucide-react';
import { useFlowTheme } from '../flow-designer/theme';
import type { ComponentDefinition } from '../api/componentDefinitions';
import type { SduiNode } from './model';
import { iconFor, labelFor } from './componentMeta';

export interface CanvasDragData {
  source: 'canvas';
  nodeId: string;
}

function registryKey(node: SduiNode): string {
  return `${node.type}@${node.version}`;
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
}: {
  node: SduiNode;
  depth: number;
  isRoot?: boolean;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
}) {
  const { c } = useFlowTheme();
  const definition = registry.get(registryKey(node));
  const isContainer = !!definition?.allowsChildren;
  const Icon = iconFor(node.type);
  const dragData: CanvasDragData = { source: 'canvas', nodeId: node.id };
  const draggable = useDraggable({ id: node.id, data: dragData, disabled: isRoot });
  const droppable = useDroppable({ id: node.id, data: { source: 'canvas-container', nodeId: node.id }, disabled: !isContainer });
  const selected = selectedId === node.id;
  const children = node.children ?? [];

  return (
    <div
      ref={draggable.setNodeRef}
      style={{ opacity: draggable.isDragging ? 0.35 : 1, marginLeft: isRoot ? 0 : 14 }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        className="flex items-center gap-[6px] px-2 rounded-md cursor-pointer"
        style={{
          height: 28,
          marginTop: 3,
          border: `1px solid ${selected ? c.accent : dragActive && isContainer ? c.accent : 'transparent'}`,
          borderStyle: dragActive && isContainer && !selected ? 'dashed' : 'solid',
          background: droppable.isOver ? c.accentSoft : selected ? c.hoverBg : 'transparent',
        }}
      >
        {!isRoot && (
          <span {...draggable.listeners} {...draggable.attributes} style={{ cursor: 'grab', display: 'flex' }}>
            <GripVertical size={12} color={c.textSecondary} />
          </span>
        )}
        <Icon size={13} color={c.accent} strokeWidth={1.8} />
        <span className="text-[12px] flex-1 truncate" style={{ color: c.textPrimary }}>
          {labelFor(node.type)}
        </span>
        {!definition && (
          <span className="text-[10px] px-1 rounded" style={{ color: c.danger, background: 'transparent' }} title="Este componente não foi encontrado no catálogo — pode ter sido removido">
            ?
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
            minHeight: children.length === 0 ? 22 : 0,
            marginLeft: 14,
            marginTop: children.length === 0 ? 2 : 0,
            border: children.length === 0 ? `1px dashed ${droppable.isOver ? c.accent : c.border}` : 'none',
            borderRadius: 4,
            display: children.length === 0 ? 'flex' : 'block',
            alignItems: 'center',
            paddingLeft: children.length === 0 ? 8 : 0,
          }}
        >
          {children.length === 0 && (
            <span className="text-[11px]" style={{ color: c.textSecondary }}>
              Solte um componente aqui
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
 * Puramente apresentacional — o DndContext vive em SduiScreenEditor (paleta e canvas são irmãos,
 * precisam do mesmo provider). */
export function SduiTreeCanvas({
  root,
  registry,
  selectedId,
  onSelect,
  onRemove,
  dragActive,
}: {
  root: SduiNode;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
}) {
  const { c } = useFlowTheme();
  return (
    <div className="flex-1 overflow-y-auto p-3" style={{ background: c.canvasBg }} onClick={() => onSelect(root.id)}>
      <CanvasNode node={root} depth={0} isRoot registry={registry} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} dragActive={dragActive} />
    </div>
  );
}
