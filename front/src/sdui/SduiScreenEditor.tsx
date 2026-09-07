import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useFlowTheme } from '../flow-designer/theme';
import type { VariableOrigin } from '../flow-designer/model';
import { listComponentDefinitions, type ComponentDefinition } from '../api/componentDefinitions';
import type { ChannelType } from '../api/products';
import { createNode, findNode, findParent, insertNode, removeNode, collectIds, moveNode, moveWithinSiblings, updateProps, updateBindings, updateEvents, updateVisibility, type SduiNode } from './model';
import { SduiComponentPalette, type PaletteDragData } from './SduiComponentPalette';
import { SduiTreeCanvas, type CanvasDragData } from './SduiTreeCanvas';
import { SduiLayersPanel } from './SduiLayersPanel';
import { SduiPropertiesPanel } from './SduiPropertiesPanel';
import { iconFor, labelFor } from './componentMeta';
import type { PreviewTarget } from './previewTarget';

function registryKey(type: string, version: string): string {
  return `${type}@${version}`;
}

interface Props {
  root: SduiNode | null;
  onChange: (root: SduiNode) => void;
  onPushHistory: () => void;
  variables: VariableOrigin[];
  channelTypes: ChannelType[];
  previewTarget: PreviewTarget;
}

/** Compõe paleta + canvas recursivo + camadas + propriedades num único DndContext — o provider fica
 * aqui (não dentro do canvas) porque paleta e canvas são irmãos: draggable/droppable só se enxergam
 * dentro do MESMO DndContext. */
export function SduiScreenEditor({ root, onChange, onPushHistory, variables, channelTypes, previewTarget }: Props) {
  const { c } = useFlowTheme();
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(root?.id ?? null);
  const [dragging, setDragging] = useState<{ label: string; icon: ReturnType<typeof iconFor> } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    listComponentDefinitions().then(setDefinitions).catch(() => setDefinitions([]));
  }, []);

  const registry = useMemo(() => {
    const map = new Map<string, ComponentDefinition>();
    definitions.forEach((d) => map.set(registryKey(d.type, d.version), d));
    return map;
  }, [definitions]);

  useEffect(() => {
    setSelectedId(root?.id ?? null);
  }, [root?.id]);

  const screenDefinition = definitions.find((d) => d.type === 'ui.screen') ?? null;

  function handleCreateScreen() {
    if (!screenDefinition) return;
    onPushHistory();
    onChange(createNode(screenDefinition));
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as PaletteDragData | CanvasDragData | undefined;
    if (data?.source === 'palette') {
      setDragging({ label: labelFor(data.definition.type), icon: iconFor(data.definition.type) });
    } else if (data?.source === 'canvas' && root) {
      const node = findNode(root, data.nodeId);
      if (node) setDragging({ label: labelFor(node.type), icon: iconFor(node.type) });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!root || !over) return;
    const data = active.data.current as PaletteDragData | CanvasDragData | undefined;
    const targetId = String(over.id);
    const targetDefinition = registry.get(registryKey(findNode(root, targetId)?.type ?? '', findNode(root, targetId)?.version ?? ''));
    if (!targetDefinition?.allowsChildren) return;

    if (data?.source === 'palette') {
      onPushHistory();
      onChange(insertNode(root, targetId, createNode(data.definition)));
      return;
    }
    if (data?.source === 'canvas') {
      if (data.nodeId === targetId) return;
      const subtreeIds = collectIds(findNode(root, data.nodeId) ?? root);
      if (subtreeIds.has(targetId)) return; // não soltar um nó dentro de si mesmo/seus próprios filhos
      onPushHistory();
      onChange(moveNode(root, data.nodeId, targetId));
    }
  }

  function handleRemove(id: string) {
    if (!root) return;
    onPushHistory();
    onChange(removeNode(root, id));
    if (selectedId === id) setSelectedId(root.id);
  }

  function handleMove(id: string, direction: 'up' | 'down') {
    if (!root) return;
    onPushHistory();
    onChange(moveWithinSiblings(root, id, direction));
  }

  const selectedNode = root && selectedId ? findNode(root, selectedId) : null;
  const selectedDefinition = selectedNode ? registry.get(registryKey(selectedNode.type, selectedNode.version)) ?? null : null;

  /** Clique na paleta (sem arrastar): adiciona dentro do container selecionado, ou ao lado do item
   * selecionado (mesmo pai) quando ele é folha, ou na raiz se nada estiver selecionado — assim
   * cliques seguidos continuam empilhando no mesmo lugar sem exigir drag-and-drop. */
  function handleAddComponent(definition: ComponentDefinition) {
    if (!root) return;
    const targetId = selectedId && selectedDefinition?.allowsChildren ? selectedId : selectedId ? findParent(root, selectedId)?.id ?? root.id : root.id;
    onPushHistory();
    const node = createNode(definition);
    onChange(insertNode(root, targetId, node));
    setSelectedId(node.id);
  }

  if (!root) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3">
        <div className="text-[12.5px]" style={{ color: c.textSecondary }}>
          Esta Tarefa de Usuário ainda não tem tela desenhada.
        </div>
        <button
          onClick={handleCreateScreen}
          disabled={!screenDefinition}
          className="px-4 py-[8px] rounded-md border-0 cursor-pointer text-[12.5px] font-medium"
          style={{ background: c.accent, color: '#fff', opacity: screenDefinition ? 1 : 0.5 }}
        >
          Criar tela
        </button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="flex-1 flex min-h-0">
        <SduiComponentPalette definitions={definitions} onAdd={handleAddComponent} previewTarget={previewTarget} />
        <SduiTreeCanvas
          root={root}
          registry={registry}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={handleRemove}
          dragActive={!!dragging}
          previewTarget={previewTarget}
        />
        <SduiLayersPanel root={root} selectedId={selectedId} onSelect={setSelectedId} onMove={handleMove} />
        <SduiPropertiesPanel
          node={selectedNode}
          definition={selectedDefinition}
          variables={variables}
          channelTypes={channelTypes}
          previewTarget={previewTarget}
          onUpdateProps={(patch) => onChange(updateProps(root, selectedId!, patch))}
          onUpdateBindings={(bindings) => onChange(updateBindings(root, selectedId!, bindings))}
          onUpdateEvents={(events) => onChange(updateEvents(root, selectedId!, events))}
          onUpdateVisibility={(visibility) => onChange(updateVisibility(root, selectedId!, visibility))}
        />
      </div>
      <DragOverlay>
        {dragging && (
          <div
            className="flex items-center gap-[6px] px-3 py-2 rounded-md text-[12px] font-medium cursor-grabbing"
            style={{ background: c.cardBg, border: `1px solid ${c.accent}`, color: c.textPrimary, boxShadow: '0 8px 24px -8px rgba(0,0,0,.4)' }}
          >
            <dragging.icon size={14} color={c.accent} strokeWidth={1.8} />
            {dragging.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
