import { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Maximize2, Minimize2, Monitor, Pin, PinOff, Smartphone } from 'lucide-react';
import { useFlowTheme } from './theme';
import { FormBuilder } from './form-builder/FormBuilder';
import { FormDesignPreview } from './form-preview/FormDesignPreview';
import { DESIGN_CHANNEL_LABEL, type DesignChannel } from './form-builder/designChannel';
import { UserTaskNavigator } from './UserTaskNavigator';
import type { WFNode, VariableOrigin } from './model';
import type { SduiNode } from '../sdui/model';
import type { ChannelType } from '../api/products';

interface Props {
  channelTypes: ChannelType[];
  nodeId: string;
  embeddedScreenRoot: SduiNode | null;
  onEmbeddedScreenRootChange: (root: SduiNode) => void;
  /** Mesmo histórico de undo/redo do fluxo (Ctrl+Z/Ctrl+Y) — chamado antes de qualquer ação
   * estrutural (adicionar/mover/remover), não em edição de propriedade dentro de um render. */
  onPushHistory: () => void;
  /** Variáveis do fluxo disponíveis até este nó — sugere autocompletar nos editores de vínculo/
   * visibilidade. */
  variables: VariableOrigin[];
  /** Todas as User Tasks do fluxo, na ordem de navegação (ver orderedUserTasks em model.ts). */
  userTasks: WFNode[];
  /** Troca qual nó está selecionado no canvas principal. */
  onNavigateTask: (nodeId: string) => void;
  /** Altura do modo docked, mantida em JourneyDesignerPage (não como state interno). */
  height: number;
  onHeightChange: (height: number) => void;
  /** Fixado: dock continua mostrando a última User Task mesmo depois de selecionar outra coisa. */
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

const MIN_HEIGHT = 160;
export const DOCK_DEFAULT_HEIGHT = 320;
const MIN_VISIBLE_FLOW = 140;

type ScreenMode = 'edit' | 'preview';
const SCREEN_TABS: { key: ScreenMode; label: string }[] = [
  { key: 'edit', label: 'Construir' },
  { key: 'preview', label: 'Preview' },
];

const CHANNEL_ICON = { WEB: Monitor, MOBILE: Smartphone, WHATSAPP: MessageCircle } as const;

/** Painel ancorado ao fundo do canvas — editor de tela SDUI embutido (catálogo corporativo v1)
 * sobre `embeddedScreenRoot`, o próprio FlowNode. Sucessor do antigo editor baseado em FormField[]:
 * este mantém o mesmo chrome (redimensionar/expandir/fixar/navegar entre User Tasks), só o corpo
 * O corpo de construção pertence ao Form Builder; o catálogo SDUI fornece apenas as definições e regras. */
export function FormDesignerDock({
  channelTypes,
  nodeId,
  embeddedScreenRoot,
  onEmbeddedScreenRootChange,
  onPushHistory,
  variables,
  userTasks,
  onNavigateTask,
  height,
  onHeightChange,
  pinned,
  onPinnedChange,
}: Props) {
  const { c } = useFlowTheme();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<ScreenMode>('edit');
  const [designChannel, setDesignChannel] = useState<DesignChannel>(channelTypes[0] ?? 'WEB');
  const currentTask = userTasks.find((task) => task.id === nodeId);

  useEffect(() => {
    if (!channelTypes.includes(designChannel)) {
      setDesignChannel(channelTypes[0] ?? 'WEB');
    }
  }, [channelTypes, designChannel]);

  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e: PointerEvent) {
    if (!dragState.current) return;
    const next = dragState.current.startHeight - (e.clientY - dragState.current.startY);
    const containerHeight = dockRef.current?.parentElement?.clientHeight;
    const maxHeight = containerHeight ? containerHeight - MIN_VISIBLE_FLOW : Infinity;
    onHeightChange(Math.min(maxHeight, Math.max(MIN_HEIGHT, next)));
  }

  function onResizeEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  const pinButton = (
    <button
      onClick={() => onPinnedChange(!pinned)}
      title={pinned ? 'Desafixar (esconde ao selecionar outro componente)' : 'Fixar (não esconde ao selecionar outro componente)'}
      className="shrink-0 w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
      style={{ background: pinned ? c.accentSoft : 'transparent', color: pinned ? c.accent : c.textSecondary }}
    >
      {pinned ? <Pin size={13} /> : <PinOff size={13} />}
    </button>
  );

  const modeToggle = (
    <div className="shrink-0 flex items-center rounded-lg p-1" style={{ background: c.chipBg }}>
      {SCREEN_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setMode(tab.key)}
          className="text-[12px] font-semibold cursor-pointer border-0 rounded-md px-3 py-1.5"
          style={{
            color: mode === tab.key ? c.accent : c.textSecondary,
            background: mode === tab.key ? c.cardBg : 'transparent',
            boxShadow: mode === tab.key ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const channelSelector = (
    <div className="shrink-0 flex items-center gap-1 rounded-lg p-1" style={{ border: `1px solid ${c.border}` }}>
      {channelTypes.map((channel) => {
        const Icon = CHANNEL_ICON[channel];
        const selected = designChannel === channel;
        if (channelTypes.length === 1) {
          return (
            <div key={channel} className="flex items-center gap-1 px-2 text-[11.5px]" style={{ color: c.textSecondary }}>
              <Icon size={13} />
              {DESIGN_CHANNEL_LABEL[channel]}
            </div>
          );
        }
        return (
          <button
            key={channel}
            onClick={() => setDesignChannel(channel)}
            title={`Visualizar como ${DESIGN_CHANNEL_LABEL[channel]}`}
            className="h-[28px] rounded-md flex items-center justify-center gap-1.5 px-2 cursor-pointer border-0"
            style={{ background: selected ? c.accentSoft : 'transparent', color: selected ? c.accent : c.textSecondary }}
          >
            <Icon size={13} />
            <span className="text-[11px] font-medium">{DESIGN_CHANNEL_LABEL[channel]}</span>
          </button>
        );
      })}
    </div>
  );

  const taskNavigator = (
    <div className="min-w-0">
      <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[.05em]" style={{ color: c.textSecondary }}>Tarefa em edição</div>
      <UserTaskNavigator tasks={userTasks} currentId={nodeId} onNavigate={onNavigateTask} />
    </div>
  );

  const contextualControls = (
    <div className="flex justify-center items-end gap-4">
      <div>
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[.05em]" style={{ color: c.textSecondary }}>Modo</div>
        {modeToggle}
      </div>
      <div>
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[.05em]" style={{ color: c.textSecondary }}>Canal de visualização</div>
        {channelSelector}
      </div>
    </div>
  );

  const navigatorRow = (
    <div className="shrink-0 grid items-center gap-3 px-3 py-2" style={{ gridTemplateColumns: 'minmax(220px, 1fr) auto minmax(100px, 1fr)', borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
      {taskNavigator}
      {contextualControls}
      <div className="flex items-center justify-end gap-1">
        {pinButton}
        <button
          onClick={() => setExpanded(false)}
          title="Sair da tela cheia"
          className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'transparent', color: c.textSecondary }}
        >
          <Minimize2 size={13} />
        </button>
      </div>
    </div>
  );

  const body = (
    <div className="flex-1 flex flex-col min-h-0">
      {mode === 'preview' ? (
        <div className="flex-1 overflow-y-auto p-6" style={{ background: c.canvasBg }}>
          {!embeddedScreenRoot ? (
            <div className="text-center text-[12.5px]" style={{ color: c.textSecondary }}>
              Nenhuma tela desenhada ainda.
            </div>
          ) : (
            <FormDesignPreview root={embeddedScreenRoot} channel={designChannel} />
          )}
        </div>
      ) : (
        <FormBuilder
          root={embeddedScreenRoot}
          onChange={onEmbeddedScreenRootChange}
          onPushHistory={onPushHistory}
          variables={variables}
          channelTypes={channelTypes}
          designChannel={designChannel}
        />
      )}
    </div>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-[1000] w-screen h-screen flex flex-col animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.cardBg }}
      >
        {navigatorRow}
        {body}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 w-full z-20 flex items-center justify-between gap-3 px-4 py-[10px]"
        style={{ background: c.cardBg, borderTop: `1px solid ${c.border}` }}
      >
        <div className="min-w-0">
          <span className="text-[11px] font-semibold" style={{ color: c.textPrimary }}>Form Designer</span>
          <span className="ml-2 text-[11px]" style={{ color: c.textSecondary }}>
            {currentTask?.data.name ?? 'Tarefa de Usuário'} · {embeddedScreenRoot ? 'Tela configurada' : 'Sem tela'}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {pinButton}
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir"
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dockRef}
      className="absolute bottom-0 left-0 right-0 w-full z-20 flex flex-col"
      style={{ height, background: c.cardBg, borderTop: `1px solid ${c.border}`, boxShadow: '0 -12px 32px -12px rgba(0,0,0,.3)' }}
    >
      <div
        onPointerDown={onResizeStart}
        title="Arrastar para redimensionar"
        className="absolute -top-[3px] left-0 right-0 h-[6px] cursor-row-resize z-10"
      />
      <div className="shrink-0 grid items-center gap-3 px-3 py-2" style={{ gridTemplateColumns: 'minmax(220px, 1fr) auto minmax(100px, 1fr)', borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
        {taskNavigator}
        {contextualControls}
        <div className="flex items-center justify-end gap-1">
          {pinButton}
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher"
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => setExpanded(true)}
            title="Expandir para tela cheia"
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
      {body}
    </div>
  );
}
