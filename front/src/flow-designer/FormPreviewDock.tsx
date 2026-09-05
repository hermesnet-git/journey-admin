import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Pin, PinOff, type LucideIcon } from 'lucide-react';
import { useFlowTheme } from './theme';
import { FormFieldPalette } from './FormFieldPalette';
import { FormScreenCanvas } from './FormScreenCanvas';
import { FormScreenCanvasWeb } from './FormScreenCanvasWeb';
import { FormScreenLayersPanel } from './FormScreenLayersPanel';
import { FormScreenPreview } from './FormScreenPreview';
import { FormFieldConfigPanel } from './FormFieldConfigPanel';
import { UserTaskNavigator } from './UserTaskNavigator';
import {
  CHANNEL_PALETTE,
  COMPONENT_META,
  WEB_CANVAS_WIDTH,
  WEB_CANVAS_HEIGHT,
  MOBILE_FRAME_WIDTH,
  MOBILE_FRAME_HEIGHT,
  applyDragEnd,
  makeFormField,
  resolveWebPosition,
} from './formScreenModel';
import type { WFNode, VariableOrigin } from './model';
import { collectsValue } from '../api/forms';
import type { FormField, FormFieldType } from '../api/forms';
import type { ChannelType } from '../api/products';

interface Props {
  channelType: ChannelType;
  nodeId: string;
  embeddedScreen: FormField[];
  onEmbeddedScreenChange: (fields: FormField[]) => void;
  /** Mesmo histórico de undo/redo do fluxo (Ctrl+Z/Ctrl+Y) — chamado antes de ações estruturais
   * (adicionar/remover/reordenar/importar), não em edição de propriedade (mesma convenção de
   * Nome/Descrição do nó, que também não empilha história por tecla digitada). */
  onPushHistory: () => void;
  /** Variáveis do fluxo disponíveis até este nó — repassadas pro painel de configuração inserir em
   * campos de texto. */
  variables: VariableOrigin[];
  /** Todas as User Tasks do fluxo, na ordem de navegação (ver orderedUserTasks em model.ts). */
  userTasks: WFNode[];
  /** Troca qual nó está selecionado no canvas principal (mesmo selectOnlyNode de um clique no nó) —
   * propaga sozinho pra propertiesNodeId/previewNode em JourneyDesignerPage. */
  onNavigateTask: (nodeId: string) => void;
  /** Altura do modo docked, mantida em JourneyDesignerPage (não como state interno) — o dock
   * desmonta toda vez que a seleção sai de uma User Task, então um state local perderia o
   * redimensionamento do usuário a cada troca de nó. */
  height: number;
  onHeightChange: (height: number) => void;
  /** Fixado: dock continua mostrando a última User Task mesmo depois de selecionar outra coisa no
   * canvas (por padrão o dock some ao sair da seleção de uma User Task). Estado vive em
   * JourneyDesignerPage — é ele quem decide qual nó fica "preso" quando a seleção muda. */
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

const MIN_HEIGHT = 160;
export const DOCK_DEFAULT_HEIGHT = 320;
/** Fatia do canvas de fluxo que fica sempre visível acima do dock, mesmo redimensionado ao máximo. */
const MIN_VISIBLE_FLOW = 140;

// 'edit'/'preview' são os nomes internos históricos (Editar/Preview) — só relabelados na aba pra
// Build/Design. Logic/Sources/Result/Integrations não ficam mais aqui no topo — Logic virou
// sub-aba do painel de Configuração (escopo por campo, não a tela inteira), e as demais foram
// descartadas por não terem equivalente real neste editor embutido no dock da jornada.
type ScreenMode = 'edit' | 'preview';
const SCREEN_TABS: { key: ScreenMode; label: string }[] = [
  { key: 'edit', label: 'Build' },
  { key: 'preview', label: 'Preview' },
];

// Prévia que segue o cursor durante o arrasto (DragOverlay do dnd-kit) — sem isso a lib rastreia o
// arrasto por baixo dos panos, mas não desenha nada, então o componente parecia só "aparecer".
function DragChip({ label, Icon }: { label: string; Icon: LucideIcon }) {
  const { c } = useFlowTheme();
  return (
    <div
      className="flex items-center gap-[6px] px-3 py-2 rounded-md text-[12px] font-medium cursor-grabbing"
      style={{ background: c.cardBg, border: `1px solid ${c.accent}`, color: c.textPrimary, boxShadow: '0 8px 24px -8px rgba(0,0,0,.4)' }}
    >
      <Icon size={14} color={c.accent} strokeWidth={1.8} />
      {label}
    </div>
  );
}

// Resolução da prancheta (WEB) escolhida no seletor — persiste só neste navegador, por User Task
// (decisão explícita do usuário: sem migração de backend por enquanto). Falha silenciosa se
// localStorage estiver indisponível (modo privado/quota) — cai no padrão de sempre.
function canvasSizeStorageKey(nodeId: string): string {
  return `screen-canvas-size:${nodeId}`;
}

function loadCanvasSize(nodeId: string): { width: number; height: number } {
  try {
    const raw = localStorage.getItem(canvasSizeStorageKey(nodeId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Number(parsed.width) > 0 && Number(parsed.height) > 0) {
      return { width: Number(parsed.width), height: Number(parsed.height) };
    }
  } catch {
    // cai no padrão abaixo
  }
  return { width: WEB_CANVAS_WIDTH, height: WEB_CANVAS_HEIGHT };
}

// Mesma ideia acima, só que pra proporção do celular (MOBILE) — largura+altura de aparelho real,
// mesmo motivo do WEB: sem altura pareada, a moldura crescia com a quantidade de componentes.
function mobileSizeStorageKey(nodeId: string): string {
  return `screen-mobile-size:${nodeId}`;
}

function loadMobileSize(nodeId: string): { width: number; height: number } {
  try {
    const raw = localStorage.getItem(mobileSizeStorageKey(nodeId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Number(parsed.width) > 0 && Number(parsed.height) > 0) {
      return { width: Number(parsed.width), height: Number(parsed.height) };
    }
  } catch {
    // cai no padrão abaixo
  }
  return { width: MOBILE_FRAME_WIDTH, height: MOBILE_FRAME_HEIGHT };
}

// Painel ancorado ao fundo do canvas (dentro do wrapper relative do ReactFlow, nunca sobre a
// paleta/PropertiesDock). Segue a seleção diretamente (ver previewNode em JourneyDesignerPage):
// aparece assim que uma User Task é selecionada, some ao selecionar qualquer outra coisa (a menos
// que fixado, ver pinButton). Editor de tela embutido (paleta + canvas arrastável + configuração)
// sobre embeddedScreen, o próprio FlowNode.
export function FormPreviewDock({
  channelType,
  nodeId,
  embeddedScreen,
  onEmbeddedScreenChange,
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
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mode, setMode] = useState<ScreenMode>('edit');
  const [activeDrag, setActiveDrag] = useState<
    { source: 'palette'; fieldType: FormFieldType } | { source: 'canvas'; field: FormField } | null
  >(null);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [canvasSize, setCanvasSize] = useState(() => loadCanvasSize(nodeId));
  const [mobileSize, setMobileSize] = useState(() => loadMobileSize(nodeId));

  // O dock não remonta ao trocar de User Task fixada (ver `pinned`/UserTaskNavigator) — sem isto a
  // resolução salva de uma tela vazaria pra próxima ao navegar.
  useEffect(() => {
    setCanvasSize(loadCanvasSize(nodeId));
    setMobileSize(loadMobileSize(nodeId));
  }, [nodeId]);

  function handleCanvasSizeChange(width: number, height: number) {
    setCanvasSize({ width, height });
    try {
      localStorage.setItem(canvasSizeStorageKey(nodeId), JSON.stringify({ width, height }));
    } catch {
      // ponytail: localStorage indisponível (modo privado/quota) — só não persiste, resto funciona.
    }
  }

  function handleMobileSizeChange(width: number, height: number) {
    setMobileSize({ width, height });
    try {
      localStorage.setItem(mobileSizeStorageKey(nodeId), JSON.stringify({ width, height }));
    } catch {
      // ponytail: localStorage indisponível (modo privado/quota) — só não persiste, resto funciona.
    }
  }

  // Expandir/recolher o dock inteiro (tela cheia ↔ docked/fechado) arrasta paleta e configuração
  // junto — continuam ajustáveis à mão depois, isto só define o estado de partida de cada troca.
  useEffect(() => {
    setPaletteExpanded(expanded);
    setConfigExpanded(expanded);
  }, [expanded]);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedField = embeddedScreen.find((f) => f.name === selectedName) ?? null;

  // Nomes de campo (que coletam valor) já usados em OUTRAS User Tasks do fluxo — um campo novo
  // nunca pode nascer com um nome já em uso lá, já que toda tela embutida compartilha o mesmo
  // namespace de variável de processo da jornada inteira (REQ-03.09.011, FlowValidator.java).
  const otherTaskFieldNames = useMemo(() => {
    const names = new Set<string>();
    for (const task of userTasks) {
      if (task.id === nodeId) continue;
      for (const field of task.data.embeddedScreen ?? []) {
        if (collectsValue(field.type)) names.add(field.name);
      }
    }
    return names;
  }, [userTasks, nodeId]);

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e: PointerEvent) {
    if (!dragState.current) return;
    const next = dragState.current.startHeight - (e.clientY - dragState.current.startY);
    // O dock é absolute dentro do wrapper do canvas — o pai é literalmente o container do fluxo,
    // então dá pra usar a altura dele pra sempre sobrar MIN_VISIBLE_FLOW de fluxo visível acima.
    const containerHeight = dockRef.current?.parentElement?.clientHeight;
    const maxHeight = containerHeight ? containerHeight - MIN_VISIBLE_FLOW : Infinity;
    onHeightChange(Math.min(maxHeight, Math.max(MIN_HEIGHT, next)));
  }

  function onResizeEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { source?: string; fieldType?: FormFieldType } | undefined;
    if (data?.source === 'palette' && data.fieldType) {
      setActiveDrag({ source: 'palette', fieldType: data.fieldType });
      return;
    }
    if (data?.source === 'canvas') {
      const field = embeddedScreen.find((f) => f.name === event.active.id);
      if (field) setActiveDrag({ source: 'canvas', field });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const next = applyDragEnd(embeddedScreen, event, otherTaskFieldNames);
    if (next === embeddedScreen) return;
    onPushHistory();
    onEmbeddedScreenChange(next);
  }

  function handleAdd(type: FormFieldType) {
    onPushHistory();
    const field = makeFormField(type, embeddedScreen, otherTaskFieldNames);
    onEmbeddedScreenChange([...embeddedScreen, field]);
    setSelectedName(field.name);
  }

  // Selecionar um componente no canvas WEB já expande a Configuração — como o componente ali fica
  // desabilitado pra digitação direta (é um form BUILDER, não o formulário sendo preenchido), a
  // configuração é o único lugar pra editar o conteúdo, então precisa estar visível de cara.
  function handleSelectWeb(name: string | null) {
    // React Flow reporta de novo o MESMO selecionado sempre que o node muda de tamanho (ex.: o
    // conteúdo do campo muda ao digitar na Configuração, o que dispara um evento de "dimensions" do
    // canvas) — sem o `name !== selectedName`, isso reabria o painel a cada tecla, sem deixar
    // colapsar enquanto o cursor estava num campo de configuração.
    if (name && name !== selectedName) setConfigExpanded(true);
    setSelectedName(name);
  }

  // Clique adiciona com posição em cascata (a partir do que já existe) — caminho garantido, mesmo
  // espírito do resto do editor. Arrastar da paleta (handleAddWebAt) usa a posição real de onde
  // soltou, via drag nativo HTML5 (FormFieldPalette nativeDrag) + screenToFlowPosition
  // (FormScreenCanvasWeb.tsx) — motor de arrasto do próprio React Flow, incompatível com o dnd-kit
  // do canvas linear, por isso os dois caminhos de adicionar são funções separadas.
  function handleAddWeb(type: FormFieldType) {
    onPushHistory();
    const field = makeFormField(type, embeddedScreen, otherTaskFieldNames);
    const { x, y, width } = resolveWebPosition(field, embeddedScreen.length);
    const positioned = { ...field, positionX: x, positionY: y, width };
    onEmbeddedScreenChange([...embeddedScreen, positioned]);
    setSelectedName(field.name);
  }

  function handleAddWebAt(type: FormFieldType, x: number, y: number) {
    onPushHistory();
    const field = makeFormField(type, embeddedScreen, otherTaskFieldNames);
    const width = field.width ?? 320;
    const positioned = { ...field, positionX: x - width / 2, positionY: y - 20, width };
    onEmbeddedScreenChange([...embeddedScreen, positioned]);
    setSelectedName(field.name);
  }

  // Apagar uma SECTION leva junto os campos que estavam agrupados nela (entre o marcador e a
  // próxima seção, ou o fim da lista) — sem confirmação, pedido explícito do usuário; o Ctrl+Z
  // cobre o arrependimento.
  function handleRemove(name: string) {
    const index = embeddedScreen.findIndex((f) => f.name === name);
    if (index === -1) return;
    let end = index + 1;
    if (embeddedScreen[index].type === 'SECTION') {
      while (end < embeddedScreen.length && embeddedScreen[end].type !== 'SECTION') end += 1;
    }
    onPushHistory();
    const removedNames = new Set(embeddedScreen.slice(index, end).map((f) => f.name));
    onEmbeddedScreenChange([...embeddedScreen.slice(0, index), ...embeddedScreen.slice(end)]);
    if (selectedName && removedNames.has(selectedName)) setSelectedName(null);
  }

  // Remoção em lote (seleção múltipla no canvas WEB, tecla Delete ou o X de cada nó junto) — sem a
  // lógica de "levar filhos de SECTION junto" de handleRemove, porque SECTION não existe em telas
  // WEB (único chamador deste callback).
  function handleRemoveMany(names: string[]) {
    if (names.length === 0) return;
    const removed = new Set(names);
    onPushHistory();
    onEmbeddedScreenChange(embeddedScreen.filter((f) => !removed.has(f.name)));
    if (selectedName && removed.has(selectedName)) setSelectedName(null);
  }

  function handleFieldUpdate(patch: Partial<FormField>) {
    if (!selectedField) return;
    onEmbeddedScreenChange(embeddedScreen.map((f) => (f.name === selectedField.name ? { ...f, ...patch } : f)));
  }

  // Fixa o dock nesta User Task — selecionar outro tipo de nó (ou nada) no canvas deixa de
  // escondê-lo enquanto isto estiver ativo.
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

  // Só Build/Design — sublinhado no ativo, mesmo padrão visual da referência. Centralizado na
  // tela (pedido explícito), não só dentro do espaço sobrando ao lado de outros elementos.
  const modeToggle = (
    <div className="shrink-0 flex items-center gap-4">
      {SCREEN_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setMode(tab.key)}
          className="text-[12.5px] font-medium cursor-pointer border-0 bg-transparent pb-[6px]"
          style={{
            color: mode === tab.key ? c.accent : c.textSecondary,
            borderBottom: `2px solid ${mode === tab.key ? c.accent : 'transparent'}`,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // Faixa entre o cabeçalho e o editor: navegação entre User Tasks + alternância Build/Design. Só
  // aparece em tela cheia (pedido explícito) — no modo docked mostra só o modeToggle, sem a faixa
  // de navegação entre tarefas. Grid de 3 colunas (não flex simples) pra centralizar de verdade em
  // relação à faixa inteira, não só no espaço sobrando ao lado do navegador de tarefas.
  const navigatorRow = (
    <div className="shrink-0 grid grid-cols-3 items-center gap-3 px-3 py-[6px]" style={{ borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
      <div className="min-w-0">
        <UserTaskNavigator tasks={userTasks} currentId={nodeId} onNavigate={onNavigateTask} />
      </div>
      <div className="flex justify-center">{modeToggle}</div>
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

  const configPanel = (
    <FormFieldConfigPanel
      field={selectedField}
      fields={embeddedScreen}
      expanded={configExpanded}
      onExpandedChange={setConfigExpanded}
      onUpdate={handleFieldUpdate}
      variables={variables}
      sameScreenNames={new Set(embeddedScreen.filter((f) => f.name !== selectedField?.name).map((f) => f.name))}
      crossNodeNames={otherTaskFieldNames}
      channelType={channelType}
    />
  );

  const body = (
    <div className="flex-1 flex flex-col min-h-0">
      {mode === 'preview' ? (
        <FormScreenPreview
          fields={embeddedScreen}
          channelType={channelType}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          mobileWidth={mobileSize.width}
          mobileHeight={mobileSize.height}
        />
      ) : channelType === 'WEB' ? (
        // Sem DndContext aqui — WEB usa o motor de arrasto do próprio React Flow (posição livre),
        // incompatível com o dnd-kit do canvas linear. Paleta em modo drag nativo (HTML5), soltar
        // no canvas usa a posição real de onde caiu (handleAddWebAt); clique continua funcionando
        // como caminho garantido (handleAddWeb, cascata).
        <div className="flex-1 flex min-h-0">
          <FormFieldPalette types={CHANNEL_PALETTE.WEB} expanded={paletteExpanded} onExpandedChange={setPaletteExpanded} onAdd={handleAddWeb} nativeDrag />
          <FormScreenCanvasWeb
            fields={embeddedScreen}
            selectedName={selectedName}
            onSelect={handleSelectWeb}
            onRemove={handleRemove}
            onRemoveMany={handleRemoveMany}
            onFieldsChange={onEmbeddedScreenChange}
            onPushHistory={onPushHistory}
            onAddAt={handleAddWebAt}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onCanvasSizeChange={handleCanvasSizeChange}
          />
          <FormScreenLayersPanel
            fields={embeddedScreen}
            selectedName={selectedName}
            onSelect={handleSelectWeb}
            onReorder={(next) => {
              onPushHistory();
              onEmbeddedScreenChange(next);
            }}
          />
          {configPanel}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDrag(null)}>
          <div className="flex-1 flex min-h-0">
            <FormFieldPalette
              types={CHANNEL_PALETTE[channelType]}
              expanded={paletteExpanded}
              onExpandedChange={setPaletteExpanded}
              onAdd={handleAdd}
            />
            <FormScreenCanvas
              fields={embeddedScreen}
              channelType={channelType}
              selectedName={selectedName}
              dragActive={!!activeDrag}
              onSelect={setSelectedName}
              onRemove={handleRemove}
              mobileWidth={mobileSize.width}
              mobileHeight={mobileSize.height}
              onMobileSizeChange={handleMobileSizeChange}
            />
            <FormScreenLayersPanel
              fields={embeddedScreen}
              selectedName={selectedName}
              onSelect={setSelectedName}
              onReorder={(next) => {
                onPushHistory();
                onEmbeddedScreenChange(next);
              }}
            />
            {configPanel}
          </div>
          <DragOverlay>
            {activeDrag?.source === 'palette' && <DragChip label={COMPONENT_META[activeDrag.fieldType].label} Icon={COMPONENT_META[activeDrag.fieldType].icon} />}
            {activeDrag?.source === 'canvas' && <DragChip label={activeDrag.field.label} Icon={COMPONENT_META[activeDrag.field.type].icon} />}
          </DragOverlay>
        </DndContext>
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
        className="absolute bottom-0 left-0 right-0 w-full z-20 flex items-center justify-end gap-3 px-6 py-[10px]"
        style={{ background: c.cardBg, borderTop: `1px solid ${c.border}` }}
      >
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
      <div className="shrink-0 grid grid-cols-3 items-center px-3 py-[6px]" style={{ borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
        <div />
        <div className="flex justify-center">{modeToggle}</div>
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
