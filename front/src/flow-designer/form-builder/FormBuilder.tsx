import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { AlertTriangle, FileInput, Info, ListTree, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { VariableOrigin } from '../model';
import { listAuthoringComponentDefinitions, listComponentDefinitions, type ComponentDefinition } from '../../api/componentDefinitions';
import type { ChannelType } from '../../api/products';
import { createNode, findNode, findParent, insertNode, removeNode, collectIds, moveNode, moveWithinSiblings, renameNode, updateProps, updateBindings, updateEvents, updateVisibility, updateActive, type SduiNode } from '../../sdui/model';
import { ComponentPalette, type PaletteDragData } from './ComponentPalette';
import { FormCanvas, type CanvasDragData } from './FormCanvas';
import { LayerPanel } from './LayerPanel';
import { PropertyInspector } from './PropertyInspector';
import { iconFor, labelFor } from '../../sdui/componentMeta';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';
import { ConfirmDialog } from '../../products/ConfirmDialog';

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
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
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
    const target = findNode(root, id);
    if ((target?.children?.length ?? 0) > 0) {
      setPendingRemovalId(id);
      return;
    }
    performRemove(id);
  }

  function performRemove(id: string) {
    if (!root) return;
    onPushHistory();
    onChange(removeNode(root, id));
    if (selectedId === id) setSelectedId(root.id);
    setPendingRemovalId(null);
  }

  function handleMove(id: string, direction: 'up' | 'down') {
    if (!root) return;
    onPushHistory();
    onChange(moveWithinSiblings(root, id, direction));
  }

  const selectedNode = root && selectedId ? findNode(root, selectedId) : null;
  const selectedDefinition = selectedNode ? registry.get(registryKey(selectedNode.type, selectedNode.version)) ?? null : null;
  const reservedNodeIds = useMemo(() => {
    if (!root) return new Set<string>();
    const ids = collectIds(root);
    if (selectedId) ids.delete(selectedId);
    return ids;
  }, [root, selectedId]);
  const authoringIssues = useMemo(
    () => root ? collectAuthoringIssues(root, registry, designChannel) : [],
    [root, registry, designChannel],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key !== 'Delete' && event.key !== 'Backspace') || !root || !selectedId || selectedId === root.id) return;
      const target = event.target as HTMLElement | null;
      const editingText = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (editingText) return;
      event.preventDefault();
      handleRemove(selectedId);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [root, selectedId]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setInspectorOpen(true);
  }

  function handleRenameNode(id: string, nextId: string) {
    if (!root || id === nextId) return;
    onPushHistory();
    onChange(renameNode(root, id, nextId));
    setSelectedId(nextId);
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

  function applyStarterTemplate(kind: 'information' | 'basicForm') {
    if (!root) return;
    const definitionFor = (type: string) => authoringDefinitions.find(
      (definition) => definition.type === type && compatibilityForDesignChannel(definition, designChannel) === 'COMPATIBLE',
    );
    const textDefinition = definitionFor('ui.text');
    const buttonDefinition = definitionFor('ui.button');
    const inputDefinition = definitionFor('ui.textInput');
    if (!textDefinition || !buttonDefinition || (kind === 'basicForm' && !inputDefinition)) {
      setCompositionError('Os componentes necessários para este modelo não estão disponíveis no canal selecionado.');
      return;
    }
    const textNode = createNode(textDefinition);
    const buttonNode = createNode(buttonDefinition);
    const children: SduiNode[] = [
      { ...textNode, props: { ...textNode.props, text: kind === 'information' ? 'Insira aqui a informação que deseja apresentar.' : 'Preencha as informações abaixo.' } },
    ];
    if (kind === 'basicForm' && inputDefinition) {
      const inputNode = createNode(inputDefinition);
      children.push({ ...inputNode, props: { ...inputNode.props, label: 'Informação', required: true } });
    }
    children.push({ ...buttonNode, props: { ...buttonNode.props, label: 'Continuar' } });
    onPushHistory();
    onChange({ ...root, children });
    setCompositionError(null);
    setSelectedId(children[0].id);
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
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: c.textSecondary }}>Tela em design</div>
            <div className="truncate text-[12px] font-semibold" style={{ color: c.textPrimary }}>
              {selectedNode ? `${labelFor(selectedNode.type)} selecionado` : 'Selecione um componente'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {authoringIssues.length > 0 && (
              <button
                type="button"
                onClick={() => setIssuesOpen((value) => !value)}
                className="mr-1 rounded-full px-2 py-1 text-[9.5px] font-semibold border-0 cursor-pointer"
                style={{ background: c.dangerSoft, color: c.danger }}
                title="Mostrar pendências da tela"
              >
                {authoringIssues.length} {authoringIssues.length === 1 ? 'pendência' : 'pendências'}
              </button>
            )}
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
            Este componente não está mais disponível para configuração. Ele foi preservado para que nenhum conteúdo seja perdido.
          </div>
        )}
        {compositionError && (
          <div className="shrink-0 px-3 py-2 text-[11.5px]" style={{ color: c.danger, background: c.dangerSoft }}>
            {compositionError}
          </div>
        )}
        {issuesOpen && authoringIssues.length > 0 && (
          <div className="shrink-0 px-3 py-2" style={{ borderBottom: `1px solid ${c.border}`, background: c.dangerSoft }}>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: c.danger }}>
              <AlertTriangle size={13} />
              Pendências encontradas nesta tela
            </div>
            <div className="flex flex-wrap gap-1.5">
              {authoringIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => {
                    handleSelect(issue.nodeId);
                    setInspectorOpen(true);
                  }}
                  className="rounded-md px-2 py-1 text-left text-[10.5px] cursor-pointer"
                  style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}
                  title={issue.message}
                >
                  <span className="font-semibold">{issue.componentLabel}</span>
                  <span style={{ color: c.textSecondary }}> - {issue.message}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {(root.children?.length ?? 0) === 0 && (
          <div className="shrink-0 flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${c.border}`, background: c.accentSoft }}>
            <Sparkles size={15} color={c.accent} />
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-semibold" style={{ color: c.textPrimary }}>Comece a desenhar esta tela</div>
              <div className="text-[10.5px]" style={{ color: c.textSecondary }}>Escolha um modelo inicial ou adicione componentes pela paleta.</div>
            </div>
            <button type="button" onClick={() => applyStarterTemplate('information')} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium cursor-pointer" style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}><Info size={13} /> Informativa</button>
            <button type="button" onClick={() => applyStarterTemplate('basicForm')} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium cursor-pointer" style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}><FileInput size={13} /> Coleta básica</button>
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
            reservedNodeIds={reservedNodeIds}
            onRenameNode={(nextId) => selectedId && handleRenameNode(selectedId, nextId)}
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
      {pendingRemovalId && (
        <ConfirmDialog
          title="Remover grupo de componentes?"
          message="Todos os componentes contidos neste grupo também serão removidos da tela."
          confirmLabel="Remover grupo"
          onConfirm={() => performRemove(pendingRemovalId)}
          onCancel={() => setPendingRemovalId(null)}
        />
      )}
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

interface AuthoringIssue {
  id: string;
  nodeId: string;
  componentLabel: string;
  message: string;
}

/** Lista operacional das pendências que o autor consegue corrigir no próprio Form Builder. */
function collectAuthoringIssues(root: SduiNode, registry: Map<string, ComponentDefinition>, channel: DesignChannel): AuthoringIssue[] {
  const issues: AuthoringIssue[] = [];
  function visit(node: SduiNode) {
    const definition = registry.get(registryKey(node.type, node.version));
    const componentLabel = labelFor(node.type);
    const addIssue = (suffix: string, message: string) => issues.push({
      id: `${node.id}:${suffix}`,
      nodeId: node.id,
      componentLabel,
      message,
    });
    if (!definition) {
      addIssue('definition', 'componente ausente no catálogo');
      return;
    }
    const compatibility = compatibilityForDesignChannel(definition, channel);
    if (compatibility !== 'COMPATIBLE' && isVisibleInChannel(node, channel)) {
      addIssue('compatibility', compatibilityMessage(compatibility, channel) ?? 'incompatível com o canal selecionado');
    }
    definition.propsSchema.forEach((prop) => {
      if (prop.required && (
        node.props[prop.name] === undefined || node.props[prop.name] === null || String(node.props[prop.name]).trim() === ''
      )) {
        addIssue(`prop:${prop.name}`, `preencha ${prop.name}`);
      }
    });
    if (definition.category === 'INPUT' && !node.bindings?.value?.path) addIssue('binding:value', 'configure o campo Valor');
    if ((definition.type === 'ui.button' || definition.type === 'ui.link') && !node.events?.onPress) addIssue('event:onPress', 'configure a ação principal');
    (node.children ?? []).forEach(visit);
  }
  visit(root);
  return issues;
}

function isVisibleInChannel(node: SduiNode, channel: DesignChannel): boolean {
  const condition = node.visibility;
  if (!condition || condition.path !== 'session.channel') return true;
  if (condition.rule === 'equals') return condition.value === channel;
  if (condition.rule === 'notEquals') return condition.value !== channel;
  if (condition.rule === 'in') return Array.isArray(condition.value) && condition.value.includes(channel);
  if (condition.rule === 'notIn') return Array.isArray(condition.value) && !condition.value.includes(channel);
  return true;
}

function canAcceptChild(parent: ComponentDefinition, child: ComponentDefinition): boolean {
  if (!parent.allowsChildren || child.type === 'ui.screen') return false;
  return parent.allowedChildTypes.length === 0 || parent.allowedChildTypes.includes(child.type);
}

function invalidCompositionMessage(child: ComponentDefinition, parent: ComponentDefinition): string {
  return `${labelFor(child.type)} não pode ser adicionado dentro de ${labelFor(parent.type)}.`;
}
