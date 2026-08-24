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
import { ChevronDown, ChevronUp, Eye, Import, Maximize2, Minimize2, Pin, PinOff, Save, SquarePen, type LucideIcon } from 'lucide-react';
import { useFlowTheme } from './theme';
import { FormFieldPalette } from './FormFieldPalette';
import { FormScreenCanvas } from './FormScreenCanvas';
import { FormScreenPreview } from './FormScreenPreview';
import { FormFieldConfigPanel } from './FormFieldConfigPanel';
import { UserTaskNavigator } from './UserTaskNavigator';
import { FormSearchSelect } from './PropertiesPanel';
import { CHANNEL_PALETTE, COMPONENT_META, applyDragEnd, makeFormField } from './formScreenModel';
import { promoteEmbeddedScreen } from '../api/flows';
import { useToast } from '../products/Toast';
import type { WFNode, VariableOrigin } from './model';
import { collectsValue } from '../api/forms';
import type { Form, FormField, FormFieldType } from '../api/forms';
import type { ChannelType } from '../api/products';

interface Props {
  nodeName: string;
  channelType: ChannelType;
  journeyId: string;
  nodeId: string;
  embeddedScreen: FormField[];
  onEmbeddedScreenChange: (fields: FormField[]) => void;
  /** Mesmo histórico de undo/redo do fluxo (Ctrl+Z/Ctrl+Y) — chamado antes de ações estruturais
   * (adicionar/remover/reordenar/importar), não em edição de propriedade (mesma convenção de
   * Nome/Descrição do nó, que também não empilha história por tecla digitada). */
  onPushHistory: () => void;
  /** Catálogo de formulários salvos — usado só como ponto de partida opcional ("importar"), nunca
   * como referência viva: escolher um copia os campos pro embeddedScreen, sem guardar o id. */
  forms: Form[];
  onRefreshForms: () => void;
  onOpenNewForm: () => void;
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

// Garante nome único dentro do embeddedScreen ao importar campos de um formulário do catálogo —
// só entra em ação em colisão de verdade (reimportar o mesmo formulário, ou um nome que já existe
// no rascunho atual); preserva o nome original do campo importado sempre que possível.
function dedupedFieldName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  let i = 1;
  let candidate = `${name}_${i}`;
  while (taken.has(candidate)) {
    i += 1;
    candidate = `${name}_${i}`;
  }
  return candidate;
}

// Painel ancorado ao fundo do canvas (dentro do wrapper relative do ReactFlow, nunca sobre a
// paleta/PropertiesDock). Segue a seleção diretamente (ver previewNode em JourneyDesignerPage):
// aparece assim que uma User Task é selecionada, some ao selecionar qualquer outra coisa (a menos
// que fixado, ver pinButton). Editor de tela embutido (paleta + canvas arrastável + configuração)
// sobre embeddedScreen, o próprio FlowNode — formulários do catálogo servem só como ponto de
// partida opcional ("Importar formulário" no rodapé, copia os campos, nunca guarda referência).
export function FormPreviewDock({
  nodeName,
  channelType,
  journeyId,
  nodeId,
  embeddedScreen,
  onEmbeddedScreenChange,
  onPushHistory,
  forms,
  onRefreshForms,
  onOpenNewForm,
  variables,
  userTasks,
  onNavigateTask,
  height,
  onHeightChange,
  pinned,
  onPinnedChange,
}: Props) {
  const { c } = useFlowTheme();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [footerAction, setFooterAction] = useState<'import' | 'promote' | null>(null);
  const [promoteName, setPromoteName] = useState('');
  const [savingPromote, setSavingPromote] = useState(false);
  const [activeDrag, setActiveDrag] = useState<
    { source: 'palette'; fieldType: FormFieldType } | { source: 'canvas'; field: FormField } | null
  >(null);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

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

  function handleFieldUpdate(patch: Partial<FormField>) {
    if (!selectedField) return;
    onEmbeddedScreenChange(embeddedScreen.map((f) => (f.name === selectedField.name ? { ...f, ...patch } : f)));
  }

  // "Importar formulário" — só copia os campos pro rascunho local (ponto de partida), nunca guarda
  // o id do formulário nem cria vínculo nenhum. Nomes que colidirem com o que já existe no
  // embeddedScreen ganham sufixo (ex.: reimportar o mesmo formulário duas vezes).
  function handleImportForm(formId: string | null) {
    const form = forms.find((f) => f.formId === formId);
    if (!form) return;
    onPushHistory();
    const taken = new Set(embeddedScreen.map((f) => f.name));
    const imported = form.fields.map((f) => {
      const name = dedupedFieldName(f.name, taken);
      taken.add(name);
      return { ...f, name };
    });
    onEmbeddedScreenChange([...embeddedScreen, ...imported]);
    setFooterAction(null);
  }

  async function handlePromote() {
    if (!promoteName.trim()) return;
    setSavingPromote(true);
    try {
      await promoteEmbeddedScreen(journeyId, nodeId, { name: promoteName.trim(), description: '' });
      showToast('Formulário salvo no catálogo.', 'success');
      setFooterAction(null);
      setPromoteName('');
      onRefreshForms();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar formulário', 'error');
    } finally {
      setSavingPromote(false);
    }
  }

  const header = (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textSecondary }}>
        Tela
      </div>
      <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
        {nodeName}
      </div>
    </div>
  );

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

  // Alternância Editar/Preview — disponível nos dois tamanhos (docked e tela cheia).
  const modeToggle = (
    <div className="shrink-0 flex items-center gap-[6px]">
      <button
        onClick={() => setMode('edit')}
        className="inline-flex items-center gap-[5px] h-[29px] rounded-md px-3 text-[12.5px] font-medium cursor-pointer"
        style={
          mode === 'edit'
            ? { background: c.accent, color: '#fff', border: 0 }
            : { border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }
        }
      >
        <SquarePen size={13} /> Editar
      </button>
      <button
        onClick={() => setMode('preview')}
        className="inline-flex items-center gap-[5px] h-[29px] rounded-md px-3 text-[12.5px] font-medium cursor-pointer"
        style={
          mode === 'preview'
            ? { background: c.accent, color: '#fff', border: 0 }
            : { border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }
        }
      >
        <Eye size={13} /> Preview
      </button>
    </div>
  );

  // Faixa entre o cabeçalho e o editor: navegação entre User Tasks + alternância Editar/Preview.
  // Só aparece em tela cheia (pedido explícito) — no modo docked mostra só o modeToggle, sem a
  // faixa de navegação entre tarefas.
  const navigatorRow = (
    <div className="shrink-0 flex items-center gap-3 px-3 py-[6px]" style={{ borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
      <div className="flex-1 min-w-0">
        <UserTaskNavigator tasks={userTasks} currentId={nodeId} onNavigate={onNavigateTask} />
      </div>
      {modeToggle}
    </div>
  );

  const body = (
    <div className="flex-1 flex flex-col min-h-0">
      {mode === 'edit' ? (
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
            />
            <FormFieldConfigPanel
              field={selectedField}
              expanded={configExpanded}
              onExpandedChange={setConfigExpanded}
              onUpdate={handleFieldUpdate}
              variables={variables}
              sameScreenNames={new Set(embeddedScreen.filter((f) => f.name !== selectedField?.name).map((f) => f.name))}
              crossNodeNames={otherTaskFieldNames}
            />
          </div>
          <DragOverlay>
            {activeDrag?.source === 'palette' && <DragChip label={COMPONENT_META[activeDrag.fieldType].label} Icon={COMPONENT_META[activeDrag.fieldType].icon} />}
            {activeDrag?.source === 'canvas' && <DragChip label={activeDrag.field.label} Icon={COMPONENT_META[activeDrag.field.type].icon} />}
          </DragOverlay>
        </DndContext>
      ) : (
        <FormScreenPreview fields={embeddedScreen} channelType={channelType} />
      )}
    </div>
  );

  const footer = (
    <div className="shrink-0 px-6 py-[10px]" style={{ borderTop: `1px solid ${c.border}` }}>
      {footerAction === 'import' ? (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1">
            <FormSearchSelect forms={forms} value={null} onChange={handleImportForm} onRefresh={onRefreshForms} onOpenNew={onOpenNewForm} />
          </div>
          <button
            onClick={() => setFooterAction(null)}
            className="text-[12.5px] border-0 bg-transparent cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            Cancelar
          </button>
        </div>
      ) : footerAction === 'promote' ? (
        <div className="flex items-center gap-2 w-full">
          <input
            autoFocus
            value={promoteName}
            onChange={(e) => setPromoteName(e.target.value)}
            placeholder="Nome do formulário"
            className="flex-1 rounded-md border px-2 py-[6px] text-[12.5px]"
            style={{ borderColor: c.border, background: c.cardBg, color: c.textPrimary }}
          />
          <button
            onClick={handlePromote}
            disabled={savingPromote || !promoteName.trim()}
            className="text-[12.5px] font-semibold border-0 bg-transparent cursor-pointer disabled:opacity-50"
            style={{ color: c.accent }}
          >
            Salvar
          </button>
          <button
            onClick={() => setFooterAction(null)}
            className="text-[12.5px] border-0 bg-transparent cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={() => setFooterAction('import')}
            className="flex items-center gap-[6px] text-[12.5px] font-semibold border-0 bg-transparent cursor-pointer"
            style={{ color: c.accent }}
          >
            <Import size={12} /> Importar formulário
          </button>
          <button
            onClick={() => setFooterAction('promote')}
            disabled={embeddedScreen.length === 0}
            className="flex items-center gap-[6px] text-[12.5px] font-semibold border-0 bg-transparent cursor-pointer disabled:opacity-40"
            style={{ color: c.accent }}
          >
            <Save size={12} /> Salvar como formulário reutilizável
          </button>
        </div>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-[1000] w-screen h-screen flex flex-col animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.cardBg }}
      >
        <div className="shrink-0 px-6 py-[10px] flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${c.border}` }}>
          {header}
          <div className="shrink-0 flex items-center gap-1">
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
        {navigatorRow}
        {body}
        {footer}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 w-full z-20 flex items-center justify-between gap-3 px-6 py-[10px]"
        style={{ background: c.cardBg, borderTop: `1px solid ${c.border}` }}
      >
        {header}
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
      <div className="shrink-0 px-6 py-[10px] flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${c.border}` }}>
        {header}
        <div className="shrink-0 flex items-center gap-1">
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
      <div className="shrink-0 flex items-center justify-end px-3 py-[6px]" style={{ borderBottom: `1px solid ${c.border}`, background: c.sidebarBg }}>
        {modeToggle}
      </div>
      {body}
      {footer}
    </div>
  );
}
