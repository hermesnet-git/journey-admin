import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { ListTree, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { VariableOrigin } from '../model';
import { listAuthoringComponentDefinitions, listComponentDefinitions, type ComponentDefinition } from '../../api/componentDefinitions';
import type { ChannelType } from '../../api/products';
import { createNode, findNode, findParent, insertNode, removeNode, collectIds, moveNode, moveWithinSiblings, updateProps, updateBindings, updateEvents, updateVisibility, updateActive, type SduiNode } from '../../sdui/model';
import { ComponentPalette, type PaletteDragData } from './ComponentPalette';
import { FormCanvas, type CanvasDragData } from './FormCanvas';
import { LayerPanel } from './LayerPanel';
import { PropertyInspector } from './PropertyInspector';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import { compatibilityForDesignChannel, type DesignChannel } from './designChannel';

function registryKey(type: string, version: string): string {
  return `${type}@${version}`;
}

interface Props {
  root: SduiNode | null;
  onChange: (root: SduiNode) => void;
  onPushHistory: () => void;
  variables: VariableOrigin[];
  channelTypes: ChannelType[];
  designChannel: DesignChannel;
}

/** Compõe paleta + canvas recursivo + camadas + propriedades num único DndContext — o provider fica
 * aqui (não dentro do canvas) porque paleta e canvas são irmãos: draggable/droppable só se enxergam
 * dentro do MESMO DndContext. */
export function FormBuilder({ root, onChange, onPushHistory, variables, channelTypes, designChannel }: Props) {
  const { c } = useFlowTheme();
  const [authoringDefinitions, setAuthoringDefinitions] = useState<ComponentDefinition[]>([]);
  const [registryDefinitions, setRegistryDefinitions] = useState<ComponentDefinition[]>([]);
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(root?.id ?? null);
  const [dragging, setDragging] = useState<{ label: string; icon: ReturnType<typeof iconFor> } | null>(null);
  const [compositionError, setCompositionError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    // A paleta recebe somente versões vigentes. O catálogo completo resolve componentes antigos
    // pela chave exata tipo+versão, sem promover ou migrar a árvore silenciosamente.
    Promise.all([listAuthoringComponentDefinitions(), listComponentDefinitions()])
      .then(([authoring, registryEntries]) => {
        setAuthoringDefinitions(authoring);
        setRegistryDefinitions(registryEntries);
      })
      .catch(() => {
        setAuthoringDefinitions([]);
        setRegistryDefinitions([]);
      })
      .finally(() => setRegistryLoaded(true));
  }, []);

  const registry = useMemo(() => {
    const map = new Map<string, ComponentDefinition>();
    registryDefinitions.forEach((d) => map.set(registryKey(d.type, d.version), d));
    return map;
  }, [registryDefinitions]);

  useEffect(() => {
    setSelectedId(root?.id ?? null);
  }, [root?.id]);

  const screenDefinition = authoringDefinitions.find((d) => d.type === 'ui.screen') ?? null;

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
      if (compatibilityForDesignChannel(data.definition, designChannel) !== 'COMPATIBLE') {
        setCompositionError(`${labelFor(data.definition.type)} não está disponível para este canal.`);
        return;
      }
      if (!canAcceptChild(targetDefinition, data.definition)) {
        setCompositionError(invalidCompositionMessage(data.definition, targetDefinition));
        return;
      }
      setCompositionError(null);
      onPushHistory();
      const node = createNode(data.definition);
      onChange(insertNode(root, targetId, node));
      handleSelect(node.id);
      return;
    }
    if (data?.source === 'canvas') {
      if (data.nodeId === targetId) return;
      const subtreeIds = collectIds(findNode(root, data.nodeId) ?? root);
      if (subtreeIds.has(targetId)) return; // não soltar um nó dentro de si mesmo/seus próprios filhos
      const movedNode = findNode(root, data.nodeId);
      const movedDefinition = movedNode ? registry.get(registryKey(movedNode.type, movedNode.version)) : null;
      if (movedDefinition && !canAcceptChild(targetDefinition, movedDefinition)) {
        setCompositionError(invalidCompositionMessage(movedDefinition, targetDefinition));
        return;
      }
      setCompositionError(null);
      onPushHistory();
      onChange(moveNode(root, data.nodeId, targetId));
      handleSelect(data.nodeId);
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

  function handleSelect(id: string) {
    setSelectedId(id);
    setInspectorOpen(true);
  }

  /** Clique na paleta (sem arrastar): adiciona dentro do container selecionado, ou ao lado do item
   * selecionado (mesmo pai) quando ele é folha, ou na raiz se nada estiver selecionado — assim
   * cliques seguidos continuam empilhando no mesmo lugar sem exigir drag-and-drop. */
  function handleAddComponent(definition: ComponentDefinition) {
    if (!root) return;
    if (compatibilityForDesignChannel(definition, designChannel) !== 'COMPATIBLE') {
      setCompositionError(`${labelFor(definition.type)} não está disponível para este canal.`);
      return;
    }
    const targetId = selectedId && selectedDefinition?.allowsChildren ? selectedId : selectedId ? findParent(root, selectedId)?.id ?? root.id : root.id;
    const targetNode = findNode(root, targetId);
    const targetDefinition = targetNode ? registry.get(registryKey(targetNode.type, targetNode.version)) : null;
    if (!targetDefinition || !canAcceptChild(targetDefinition, definition)) {
      if (targetDefinition) setCompositionError(invalidCompositionMessage(definition, targetDefinition));
      return;
    }
    setCompositionError(null);
    onPushHistory();
    const node = createNode(definition);
    onChange(insertNode(root, targetId, node));
    handleSelect(node.id);
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
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-3 py-2"
          style={{ borderBottom: `1px solid ${c.border}`, background: c.cardBg }}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: c.textSecondary }}>Tela em construção</div>
            <div className="truncate text-[12px] font-semibold" style={{ color: c.textPrimary }}>
              {selectedNode ? `${labelFor(selectedNode.type)} selecionado` : 'Selecione um componente'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ToolButton
              title={paletteOpen ? 'Recolher componentes' : 'Mostrar componentes'}
              active={paletteOpen}
              onClick={() => setPaletteOpen((value) => !value)}
              icon={paletteOpen ? PanelLeftClose : PanelLeftOpen}
            />
            <ToolButton title="Mostrar ou ocultar estrutura da tela" active={layersOpen} onClick={() => setLayersOpen((value) => !value)} icon={ListTree} />
            <ToolButton
              title={inspectorOpen ? 'Recolher configurações' : 'Mostrar configurações'}
              active={inspectorOpen}
              onClick={() => setInspectorOpen((value) => !value)}
              icon={inspectorOpen ? PanelRightClose : PanelRightOpen}
            />
          </div>
        </div>
        {registryLoaded && selectedNode && !selectedDefinition && (
          <div className="px-3 py-2 text-[11px]" style={{ background: c.dangerSoft, color: c.danger }}>
            A definição {selectedNode.type}@{selectedNode.version} não foi encontrada no catálogo. O componente foi preservado, mas não pode ser configurado.
          </div>
        )}
        {compositionError && (
          <div className="shrink-0 px-3 py-2 text-[11.5px]" style={{ color: c.danger, background: c.dangerSoft }}>
            {compositionError}
          </div>
        )}
        <div className="flex-1 flex min-h-0">
          {paletteOpen && <ComponentPalette definitions={authoringDefinitions} onAdd={handleAddComponent} designChannel={designChannel} />}
          <FormCanvas
            root={root}
            registry={registry}
            selectedId={selectedId}
            onSelect={handleSelect}
            onRemove={handleRemove}
            dragActive={!!dragging}
            designChannel={designChannel}
          />
          {layersOpen && <LayerPanel root={root} selectedId={selectedId} onSelect={handleSelect} onMove={handleMove} />}
          {inspectorOpen && <PropertyInspector
            node={selectedNode}
            definition={selectedDefinition}
            variables={variables}
            channelTypes={channelTypes}
            designChannel={designChannel}
            onUpdateProps={(patch) => onChange(updateProps(root, selectedId!, patch))}
            onUpdateBindings={(bindings) => onChange(updateBindings(root, selectedId!, bindings))}
            onUpdateEvents={(events) => onChange(updateEvents(root, selectedId!, events))}
            onUpdateVisibility={(visibility) => onChange(updateVisibility(root, selectedId!, visibility))}
            onUpdateActive={(active) => onChange(updateActive(root, selectedId!, active))}
          />}
        </div>
      </div>
      {/* O item da paleta é um modelo que cria outra instância no canvas. A animação padrão do
       * dnd-kit tenta devolvê-lo à origem após a criação e comunica falsamente um cancelamento. */}
      <DragOverlay dropAnimation={null}>
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

function ToolButton({ title, active, onClick, icon: Icon }: {
  title: string;
  active: boolean;
  onClick: () => void;
  icon: typeof ListTree;
}) {
  const { c } = useFlowTheme();
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className="w-8 h-8 rounded-md border-0 flex items-center justify-center cursor-pointer"
      style={{ background: active ? c.accentSoft : 'transparent', color: active ? c.accent : c.textSecondary }}
    >
      <Icon size={16} />
    </button>
  );
}

function canAcceptChild(parent: ComponentDefinition, child: ComponentDefinition): boolean {
  if (!parent.allowsChildren || child.type === 'ui.screen') return false;
  return parent.allowedChildTypes.length === 0 || parent.allowedChildTypes.includes(child.type);
}

function invalidCompositionMessage(child: ComponentDefinition, parent: ComponentDefinition): string {
  return `${labelFor(child.type)} não pode ser adicionado dentro de ${labelFor(parent.type)}.`;
}
