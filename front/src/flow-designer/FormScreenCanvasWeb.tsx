import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Panel,
  applyNodeChanges,
  useReactFlow,
  useViewport,
  type Node,
  type NodeProps,
  type OnNodesChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Trash2,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Lock,
  Unlock,
} from 'lucide-react';
import { useFlowTheme } from './theme';
import { useAppTheme } from '../shell/theme';
import { SduiFieldPreview } from '../execution/SduiFormRenderer';
import { autoArrangeWeb, resolveWebPosition, FALLBACK_ROW_HEIGHT, CANVAS_SIZE_PRESETS, fieldToSduiNode } from './formScreenModel';
import type { FormField, FormFieldType } from '../api/forms';

type ScreenNode = Node<
  {
    field: FormField;
    onRemove: (name: string) => void;
    onResize: (name: string, width: number, height: number) => void;
    onResizeCommit: () => void;
    locked: boolean;
    onToggleLock: (name: string) => void;
  },
  'screenField'
>;

const MIN_NODE_WIDTH = 120;
const MIN_NODE_HEIGHT = 32;
const ALIGN_THRESHOLD = 6;

// Sem <Handle> nenhum (campos de tela não se conectam entre si) — chrome de seleção/remover + um
// handle de redimensionar no canto inferior direito (largura E altura juntas, arrastando na
// diagonal), mesmo padrão Pointer Events já usado pelo resize do dock (FormPreviewDock.tsx
// onResizeStart/onResizeMove/onResizeEnd). "nodrag" impede que arrastar o handle também mova o nó.
function ScreenFieldNode({ data, selected }: NodeProps<ScreenNode>) {
  const { c } = useFlowTheme();
  const { field, onRemove, onResize, onResizeCommit, locked, onToggleLock } = data;
  const dragState = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  // rafId: só 1 atualização de estado por frame de tela (não 1 por pointermove, que costuma
  // disparar muito mais rápido que 60fps) — sem isso o resize competia por re-render com o próprio
  // navegador pintando a tela, sentido como travado/pouco responsivo.
  const rafId = useRef<number | null>(null);
  const pendingSize = useRef<{ width: number; height: number } | null>(null);

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.parentElement as HTMLElement;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: field.width ?? el.offsetWidth,
      startHeight: field.height ?? el.offsetHeight,
    };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e: PointerEvent) {
    if (!dragState.current) return;
    const nextWidth = Math.max(MIN_NODE_WIDTH, dragState.current.startWidth + (e.clientX - dragState.current.startX));
    const nextHeight = Math.max(MIN_NODE_HEIGHT, dragState.current.startHeight + (e.clientY - dragState.current.startY));
    pendingSize.current = { width: nextWidth, height: nextHeight };
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (pendingSize.current) onResize(field.name, pendingSize.current.width, pendingSize.current.height);
    });
  }

  function onResizeEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (pendingSize.current) onResize(field.name, pendingSize.current.width, pendingSize.current.height);
    pendingSize.current = null;
    onResizeCommit();
  }

  return (
    <div
      className="group relative rounded-lg px-2 py-1 w-full h-full"
      style={{
        // Contorno pontilhado sempre visível (não só selecionado) — o tamanho real do componente
        // (largura/altura, sobretudo quando altura é "auto" pelo conteúdo) senão fica imperceptível
        // até selecionar; ao selecionar, vira contorno sólido na cor de destaque de sempre.
        // c.border é sutil demais no tema claro pra um tracejado (pensado pra divisórias finas, não
        // contorno) — c.textSecondary tem contraste bem maior nos dois temas.
        border: selected ? `1px solid ${c.accent}` : `1.5px dashed ${c.textSecondary}`,
        background: selected ? c.accentSoft : 'transparent',
        overflow: 'visible',
      }}
    >
      {/* pointerEvents:none — isto é um builder, não o formulário sendo preenchido. Digitar/marcar
          direto no componente aqui dentro não faz sentido; editar é sempre via painel de
          Configuração (que abre sozinho ao selecionar, ver handleSelectWeb em FormPreviewDock). */}
      <div style={{ pointerEvents: 'none' }}>
        <SduiFieldPreview node={fieldToSduiNode(field)} />
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(field.name);
        }}
        className={`nodrag absolute -top-2 -left-2 w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer border-0 ${locked ? '' : 'opacity-0 group-hover:opacity-100'}`}
        style={{
          background: locked ? c.accent : c.cardBg,
          color: locked ? '#fff' : c.textSecondary,
          border: `1px solid ${c.border}`,
        }}
        title={locked ? 'Destravar' : 'Travar (impede mover/redimensionar sem querer)'}
      >
        {locked ? <Lock size={9} /> : <Unlock size={9} />}
      </button>
      {!locked && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(field.name);
          }}
          className="nodrag absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer border-0 opacity-0 group-hover:opacity-100"
          style={{ background: c.danger, color: '#fff' }}
          title="Remover"
        >
          <Trash2 size={10} />
        </button>
      )}
      {!locked && (
        <div
          onPointerDown={onResizeStart}
          title="Arrastar para redimensionar (largura e altura)"
          className="nodrag absolute -bottom-[7px] -right-[7px] w-[16px] h-[16px] flex items-center justify-center cursor-nwse-resize opacity-0 group-hover:opacity-100"
        >
          <div style={{ width: 9, height: 9, background: c.accent, borderRadius: 2, border: `1.5px solid ${c.cardBg}` }} />
        </div>
      )}
    </div>
  );
}

// Decorativo/fixo — fundo da prancheta, contorno-fantasma da posição original durante um arrasto,
// origem da linha de rastro, guias de alinhamento e o rótulo de coordenadas. Nenhum tem interação
// própria (não seleciona/arrasta/deleta), só o `style`/`data.label` do node é visível.
function DecorNode({ data }: NodeProps<Node<{ label?: string }, 'decor'>>) {
  if (!data.label) return null;
  return (
    <div style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', padding: '2px 6px', pointerEvents: 'none' }}>{data.label}</div>
  );
}

const nodeTypes = { screenField: ScreenFieldNode, decor: DecorNode };

function buildNodes(
  fields: FormField[],
  selectedNames: Set<string>,
  lockedNames: Set<string>,
  onRemove: (name: string) => void,
  onResize: (name: string, width: number, height: number) => void,
  onResizeCommit: () => void,
  onToggleLock: (name: string) => void,
): ScreenNode[] {
  // SECTION não existe mais em telas WEB (ver formScreenModel.ts) — um marcador legado de uma tela
  // criada antes desta mudança é só ignorado aqui, igual o backend faz na serialização.
  return fields
    .filter((f) => f.type !== 'SECTION')
    .map((field, i) => {
      const { x, y, width, height } = resolveWebPosition(field, i);
      const locked = lockedNames.has(field.name);
      return {
        id: field.name,
        type: 'screenField',
        position: { x, y },
        selected: selectedNames.has(field.name),
        draggable: !locked,
        style: { width, height: height ?? undefined },
        data: { field, onRemove, onResize, onResizeCommit, locked, onToggleLock },
      };
    });
}

export function FormScreenCanvasWeb(props: {
  fields: FormField[];
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onRemove: (name: string) => void;
  onRemoveMany: (names: string[]) => void;
  onFieldsChange: (fields: FormField[]) => void;
  onPushHistory: () => void;
  onAddAt: (type: FormFieldType, x: number, y: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (width: number, height: number) => void;
}) {
  // Instância própria de ReactFlowProvider — isolada da que já envolve o canvas principal de
  // jornada (JourneyDesignerPage), o React Flow suporta múltiplos providers independentes na
  // mesma árvore sem conflito, cada <ReactFlow> usa o provider ancestral mais próximo.
  return (
    <ReactFlowProvider>
      <FormScreenCanvasWebInner {...props} />
    </ReactFlowProvider>
  );
}

type DragTrace = { nodeId: string; startX: number; startY: number; currentX: number; currentY: number; width: number; height: number } | null;

function FormScreenCanvasWebInner({
  fields,
  selectedName,
  onSelect,
  onRemove,
  onRemoveMany,
  onFieldsChange,
  onPushHistory,
  onAddAt,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
}: {
  fields: FormField[];
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onRemove: (name: string) => void;
  onRemoveMany: (names: string[]) => void;
  onFieldsChange: (fields: FormField[]) => void;
  onPushHistory: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (width: number, height: number) => void;
  /** Arrastar da paleta solta aqui — converte a coordenada de tela (onde soltou) pra coordenada de
   * flow via screenToFlowPosition, mesmo padrão de onDrop em JourneyDesignerPage.tsx. */
  onAddAt: (type: FormFieldType, x: number, y: number) => void;
}) {
  const { c } = useFlowTheme();
  const { dark } = useAppTheme();
  const { zoomIn, zoomOut, zoomTo, getZoom, getInternalNode, screenToFlowPosition, setViewport } = useReactFlow();
  // Só pro traçado que demarca o layout da resolução escolhida (pageOutlineStyle abaixo) — sem
  // câmera livre nenhuma dependendo disto, é puramente visual.
  const viewport = useViewport();
  const [zoom, setZoom] = useState(1);
  const [dragTrace, setDragTrace] = useState<DragTrace>(null);
  const [guides, setGuides] = useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });

  // onNodeDragStop/onResizeCommit disparam depois de vários setNodes intermediários (um por frame
  // de arrasto) que ainda podem não ter voltado pro render — ler o valor "atual" de dentro desses
  // callbacks pelo `nodes`/`fields` fechados no closure arriscaria pegar um valor de 1+ renders
  // atrás. Refs espelhando o state resolvem isto (mesmo padrão de nodesRef/edgesRef em
  // JourneyDesignerPage.tsx).
  const nodesRef = useRef<ScreenNode[]>([]);
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const commitNodes = useCallback(() => {
    onPushHistory();
    const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
    onFieldsChange(
      fieldsRef.current.map((f) => {
        const node = byId.get(f.name);
        if (!node) return f;
        const width = typeof node.style?.width === 'number' ? node.style.width : f.width;
        const height = typeof node.style?.height === 'number' ? node.style.height : f.height ?? null;
        return { ...f, positionX: Math.round(node.position.x), positionY: Math.round(node.position.y), width, height };
      }),
    );
  }, [onFieldsChange, onPushHistory]);

  const handleResize = useCallback((name: string, width: number, height: number) => {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === name ? { ...n, style: { ...n.style, width, height } } : n));
      nodesRef.current = next;
      return next;
    });
  }, []);

  // Travar/destravar — front-only, não persiste no backend (conveniência de edição, não um dado da
  // tela). Zera ao reabrir a tela.
  const [lockedNames, setLockedNames] = useState<Set<string>>(new Set());
  const handleToggleLock = useCallback((name: string) => {
    setLockedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectedNamesInitial = new Set(selectedName ? [selectedName] : []);
  const [nodes, setNodes] = useState<ScreenNode[]>(() =>
    buildNodes(fields, selectedNamesInitial, lockedNames, onRemove, handleResize, commitNodes, handleToggleLock),
  );
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Sincroniza conteúdo/posição a partir de fora (undo/redo, troca de User Task, importar
  // formulário, o próprio commit desta tela voltando como prop, travar/destravar) — preserva a
  // seleção ATUAL do canvas (inclusive seleção múltipla), que não tem representação em
  // `selectedName` (só um nome).
  useEffect(() => {
    setNodes((nds) => {
      const currentSelected = new Set(nds.filter((n) => n.selected).map((n) => n.id));
      const next = buildNodes(fields, currentSelected, lockedNames, onRemove, handleResize, commitNodes, handleToggleLock);
      nodesRef.current = next;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, lockedNames]);

  // `selectedName` só carrega 1 nome (ou nulo) — uma seleção múltipla feita aqui dentro reporta
  // null pro pai (ver onNodesChange), que devolveria esse null bem aqui e desfaria a seleção
  // múltipla que acabou de ser feita. O ref guarda o último valor que ESTE canvas reportou; só
  // resincroniza a seleção quando o valor recebido é genuinamente de fora (painel de Camadas,
  // fechar, trocar de User Task) — não um eco do que ele mesmo acabou de mandar.
  const lastReportedSelectionRef = useRef(selectedName);
  useEffect(() => {
    if (selectedName === lastReportedSelectionRef.current) return;
    lastReportedSelectionRef.current = selectedName;
    setNodes((nds) => {
      const next = nds.map((n) => (n.selected === (n.id === selectedName) ? n : { ...n, selected: n.id === selectedName }));
      nodesRef.current = next;
      return next;
    });
  }, [selectedName]);

  // Ancora a origem (0,0) — onde os componentes começam — sempre no canto superior esquerdo do
  // canvas ao abrir, de forma explícita (setViewport, não só zoomTo) pra não depender de nenhum
  // comportamento implícito da lib. Arrastar em área vazia continua livre pra navegar dali; só o
  // PONTO DE PARTIDA é fixo. Ctrl+arraste não interfere aqui — vira caixa de seleção
  // (selectionKeyCode abaixo), nunca pan, então também não desloca essa origem.
  useEffect(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
    setZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNodesChange = useCallback<OnNodesChange<ScreenNode>>((changes) => {
    const removedIds: string[] = [];
    for (const change of changes) {
      if (change.type === 'remove') removedIds.push(change.id);
    }
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      nodesRef.current = next;
      const selected = next.filter((n) => n.selected).map((n) => n.id);
      const reported = selected.length === 1 ? selected[0] : null;
      lastReportedSelectionRef.current = reported;
      onSelect(reported);
      return next;
    });
    if (removedIds.length > 0) onRemoveMany(removedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rastro do componente sendo arrastado: (1) contorno-fantasma da posição original, (2) linha
  // tracejada início→posição atual, (3) guias de alinhamento com outros componentes/prancheta
  // (só visual, sem forçar a posição — ver nota abaixo), (4) rótulo de coordenadas/delta — tudo
  // decorativo, some no fim do arrasto (onNodeDragStop).
  const onNodeDragStart = useCallback<OnNodeDrag<ScreenNode>>((_, node) => {
    const width = typeof node.style?.width === 'number' ? node.style.width : 320;
    const height = getInternalNode(node.id)?.measured?.height ?? (typeof node.style?.height === 'number' ? node.style.height : 60);
    setDragTrace({ nodeId: node.id, startX: node.position.x, startY: node.position.y, currentX: node.position.x, currentY: node.position.y, width, height });
  }, [getInternalNode]);

  const onNodeDrag = useCallback<OnNodeDrag<ScreenNode>>((_, node) => {
    setDragTrace((prev) => (prev && prev.nodeId === node.id ? { ...prev, currentX: node.position.x, currentY: node.position.y } : prev));

    const width = typeof node.style?.width === 'number' ? node.style.width : 320;
    const left = node.position.x;
    const right = left + width;
    const centerX = left + width / 2;
    const top = node.position.y;

    const targetsX: number[] = [0, canvasWidth / 2, canvasWidth];
    const targetsY: number[] = [0];
    for (const other of nodesRef.current) {
      if (other.id === node.id) continue;
      const ow = typeof other.style?.width === 'number' ? other.style.width : 320;
      const oh = getInternalNode(other.id)?.measured?.height ?? 60;
      targetsX.push(other.position.x, other.position.x + ow / 2, other.position.x + ow);
      targetsY.push(other.position.y, other.position.y + oh / 2, other.position.y + oh);
    }

    // Só mostra a guia — NÃO força a posição. Um encaixe automático aqui brigava com o movimento
    // livre do cursor (o node "grudava" no alinhamento em vez de seguir 1:1), deixando o arrasto
    // menos solto/suave que o canvas de jornada, que não tem esse tipo de correção. A guia visual
    // sozinha já ajuda a alinhar a olho, sem tirar a fluidez.
    let guideX: number | null = null;
    for (const candidate of [left, centerX, right]) {
      const hit = targetsX.find((t) => Math.abs(candidate - t) <= ALIGN_THRESHOLD);
      if (hit !== undefined) {
        guideX = hit;
        break;
      }
    }
    const guideY = targetsY.find((t) => Math.abs(top - t) <= ALIGN_THRESHOLD) ?? null;

    setGuides({ vertical: guideX !== null ? [guideX] : [], horizontal: guideY !== null ? [guideY] : [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getInternalNode]);

  const onNodeDragStop = useCallback(() => {
    setDragTrace(null);
    setGuides({ vertical: [], horizontal: [] });
    commitNodes();
  }, [commitNodes]);

  function handleZoom(next: number) {
    zoomTo(next);
    setZoom(next);
  }

  // "Organizar": auto-arranjar reempilha tudo numa coluna (resolve sobreposição de uma vez);
  // alinhar/distribuir opera nos selecionados (2+), mesmos botões de qualquer editor de design.
  function handleAutoArrange() {
    onPushHistory();
    onFieldsChange(autoArrangeWeb(fields, canvasWidth));
  }

  const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);

  function withMeasured(id: string) {
    const n = nodesRef.current.find((x) => x.id === id);
    const width = typeof n?.style?.width === 'number' ? n.style.width : 320;
    const height = getInternalNode(id)?.measured?.height ?? 60;
    return { x: n?.position.x ?? 0, y: n?.position.y ?? 0, width, height };
  }

  function alignSelected(mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') {
    if (selectedIds.length < 2) return;
    onPushHistory();
    const boxes = selectedIds.map((id) => ({ id, ...withMeasured(id) }));
    let target: number;
    if (mode === 'left') target = Math.min(...boxes.map((b) => b.x));
    else if (mode === 'right') target = Math.max(...boxes.map((b) => b.x + b.width));
    else if (mode === 'centerX') target = boxes.reduce((s, b) => s + (b.x + b.width / 2), 0) / boxes.length;
    else if (mode === 'top') target = Math.min(...boxes.map((b) => b.y));
    else if (mode === 'bottom') target = Math.max(...boxes.map((b) => b.y + b.height));
    else target = boxes.reduce((s, b) => s + (b.y + b.height / 2), 0) / boxes.length;

    const byId = new Map(boxes.map((b) => [b.id, b]));
    onFieldsChange(
      fields.map((f) => {
        const b = byId.get(f.name);
        if (!b) return f;
        if (mode === 'left') return { ...f, positionX: Math.round(target) };
        if (mode === 'right') return { ...f, positionX: Math.round(target - b.width) };
        if (mode === 'centerX') return { ...f, positionX: Math.round(target - b.width / 2) };
        if (mode === 'top') return { ...f, positionY: Math.round(target) };
        if (mode === 'bottom') return { ...f, positionY: Math.round(target - b.height) };
        return { ...f, positionY: Math.round(target - b.height / 2) };
      }),
    );
  }

  // Distribuir espaçamento igual: ordena os selecionados pelo eixo, calcula o vão entre o início do
  // primeiro e o fim do último, reparte esse vão em partes iguais descontando as próprias
  // larguras/alturas — só os do MEIO se movem (primeiro e último ficam onde já estavam).
  function distributeSelected(axis: 'horizontal' | 'vertical') {
    if (selectedIds.length < 3) return;
    onPushHistory();
    const boxes = selectedIds
      .map((id) => ({ id, ...withMeasured(id) }))
      .sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    const span = axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y;
    const sizeSum = boxes.reduce((s, b) => s + (axis === 'horizontal' ? b.width : b.height), 0);
    const gap = (span - sizeSum) / (boxes.length - 1);

    const nextPosition = new Map<string, number>();
    let cursor = axis === 'horizontal' ? first.x : first.y;
    for (const b of boxes) {
      nextPosition.set(b.id, cursor);
      cursor += (axis === 'horizontal' ? b.width : b.height) + gap;
    }

    onFieldsChange(
      fields.map((f) => {
        const pos = nextPosition.get(f.name);
        if (pos === undefined) return f;
        return axis === 'horizontal' ? { ...f, positionX: Math.round(pos) } : { ...f, positionY: Math.round(pos) };
      }),
    );
  }

  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  });

  // Duplicar (Ctrl+D) e mover com setas (1px, Shift+seta 10px) — fase de captura (mesmo motivo já
  // documentado em Toolbar.tsx/EdgeShapePicker: o canvas do React Flow intercepta eventos na fase
  // de bolha pro próprio pan/drag). Ignora quando o foco está num campo de texto/select, pra não
  // brigar com digitação em qualquer lugar do dock (ex.: painel de Configuração ao lado).
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    }

    function handleDuplicate() {
      const ids = new Set(selectedIdsRef.current);
      if (ids.size === 0) return;
      onPushHistory();
      const taken = new Set(fieldsRef.current.map((f) => f.name));
      const clones: FormField[] = [];
      for (const f of fieldsRef.current) {
        if (!ids.has(f.name)) continue;
        let candidate = `${f.name}_copy`;
        let i = 1;
        while (taken.has(candidate)) {
          i += 1;
          candidate = `${f.name}_copy_${i}`;
        }
        taken.add(candidate);
        clones.push({ ...f, name: candidate, positionX: (f.positionX ?? 40) + 24, positionY: (f.positionY ?? 40) + 24 });
      }
      onFieldsChange([...fieldsRef.current, ...clones]);
      onSelect(clones.length === 1 ? clones[0].name : null);
    }

    function handleNudge(dx: number, dy: number) {
      const ids = new Set(selectedIdsRef.current);
      if (ids.size === 0) return;
      onPushHistory();
      onFieldsChange(
        fieldsRef.current.map((f) => (ids.has(f.name) ? { ...f, positionX: (f.positionX ?? 40) + dx, positionY: (f.positionY ?? 40) + dy } : f)),
      );
    }

    const NUDGE_KEYS: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      const delta = NUDGE_KEYS[e.key];
      if (delta && selectedIdsRef.current.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        handleNudge(delta[0] * step, delta[1] * step);
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canvas livre (igual ao design de jornada): sem prancheta/janela fixa nem resolução — desenha
  // direto no fundo do canvas. maxBottom só existe pra dar folga de arrasto (nodeExtent) conforme
  // o conteúdo cresce, usando a altura real de cada node (um chute fixo subestimava campos mais
  // altos, tipo tabela redimensionada).
  const maxBottom = nodes.reduce((max, n) => {
    const h = typeof n.style?.height === 'number' ? n.style.height : FALLBACK_ROW_HEIGHT;
    return Math.max(max, n.position.y + h + 40);
  }, 600);
  // Componentes ficam soltos, mas com um limite generoso (nodeExtent) pra não se perderem longe
  // demais. A câmera (translateExtent) agora usa o MESMO limite, sem folga nenhuma — arrastar pra
  // navegar já está desligado (panOnDrag=false), então a única coisa que translateExtent ainda
  // precisa impedir é o auto-pan da caixa de seleção (Ctrl+arraste) quando o cursor passa da borda
  // do canvas — isso já é bloqueado por autoPanOnNodeDrag={false} lá embaixo, não pela folga da
  // extent, então dá pra manter um piso mínimo aqui sem reabrir aquele bug.
  const nodeExtent: [[number, number], [number, number]] = [
    [0, 0],
    [canvasWidth, maxBottom],
  ];
  // Piso mínimo pra câmera (translateExtent) — sem ele, quando o conteúdo fica mais compacto que a
  // área visível (ex.: logo depois de auto-organizar, que agora aproveita a largura em vez de
  // empilhar numa coluna só), o React Flow re-clampa a câmera pra caber na extent nova e ela some
  // do (0,0) sozinha, mesmo sem nenhum arraste — foi isso que "perdeu a referência" depois de
  // organizar.
  const CAMERA_MIN_HEIGHT = 2000;
  const cameraExtent: [[number, number], [number, number]] = [
    [0, 0],
    [canvasWidth, Math.max(maxBottom, CAMERA_MIN_HEIGHT)],
  ];

  const decorNodes: ScreenNode[] = [];
  if (dragTrace) {
    decorNodes.push({
      id: '__drag_ghost__',
      type: 'decor',
      position: { x: dragTrace.startX, y: dragTrace.startY },
      draggable: false,
      selectable: false,
      focusable: false,
      deletable: false,
      connectable: false,
      zIndex: 5,
      data: {},
      style: { width: dragTrace.width, height: dragTrace.height, border: `2px dashed ${c.accent}`, borderRadius: 8, opacity: 0.5, pointerEvents: 'none' },
    } as unknown as ScreenNode);
    decorNodes.push({
      id: '__drag_origin__',
      type: 'decor',
      position: { x: dragTrace.startX, y: dragTrace.startY },
      draggable: false,
      selectable: false,
      focusable: false,
      deletable: false,
      connectable: false,
      zIndex: 5,
      data: {},
      style: { width: 1, height: 1 },
    } as unknown as ScreenNode);
    const dx = Math.round(dragTrace.currentX - dragTrace.startX);
    const dy = Math.round(dragTrace.currentY - dragTrace.startY);
    decorNodes.push({
      id: '__drag_info__',
      type: 'decor',
      position: { x: dragTrace.currentX, y: dragTrace.currentY - 22 },
      draggable: false,
      selectable: false,
      focusable: false,
      deletable: false,
      connectable: false,
      zIndex: 6,
      data: { label: `x:${Math.round(dragTrace.currentX)} y:${Math.round(dragTrace.currentY)}  Δx:${dx} Δy:${dy}` },
      style: { background: c.cardBg, border: `1px solid ${c.accent}`, borderRadius: 4, color: c.textPrimary, pointerEvents: 'none' },
    } as unknown as ScreenNode);
  }
  for (const vx of guides.vertical) {
    decorNodes.push({
      id: `__guide_v_${vx}__`,
      type: 'decor',
      position: { x: vx, y: 0 },
      draggable: false,
      selectable: false,
      focusable: false,
      deletable: false,
      connectable: false,
      zIndex: 4,
      data: {},
      style: { width: 1, height: maxBottom, background: c.accent, opacity: 0.7, pointerEvents: 'none' },
    } as unknown as ScreenNode);
  }
  for (const gy of guides.horizontal) {
    decorNodes.push({
      id: `__guide_h_${gy}__`,
      type: 'decor',
      position: { x: 0, y: gy },
      draggable: false,
      selectable: false,
      focusable: false,
      deletable: false,
      connectable: false,
      zIndex: 4,
      data: {},
      style: { width: canvasWidth, height: 1, background: c.accent, opacity: 0.7, pointerEvents: 'none' },
    } as unknown as ScreenNode);
  }

  const toolbarButtonStyle = {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 0,
    background: 'transparent',
    color: c.textSecondary,
  } as const;

  const disabledToolbarStyle = { opacity: 0.35, cursor: 'not-allowed' } as const;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain') as FormFieldType;
    if (!type) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onAddAt(type, Math.round(pos.x), Math.round(pos.y));
  }

  // Traçado só decorativo (sem fundo, sem clip, sem scroll) marcando onde a resolução escolhida
  // começa e termina — puramente um guia visual pro usuário saber o tamanho da tela que está
  // desenhando, os componentes continuam soltos por fora dele se precisar. CSS overlay comum (não
  // um "node" do React Flow) acompanhando viewport.x/y/zoom — mesma técnica que já funcionou antes
  // pro fundo da prancheta, ao contrário de node decorativo sem conteúdo próprio, que nunca
  // renderizava de forma confiável.
  const pageOutlineStyle: React.CSSProperties = {
    position: 'absolute',
    left: viewport.x,
    top: viewport.y,
    width: canvasWidth * viewport.zoom,
    height: canvasHeight * viewport.zoom,
    border: `3px dashed ${c.accent}`,
    borderRadius: 4,
    background: c.accentSoft,
    pointerEvents: 'none',
  };

  return (
    <div className="flex-1 relative min-w-0 overflow-hidden" onClick={() => onSelect(null)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div style={pageOutlineStyle} />
      <ReactFlow
        nodes={[...decorNodes, ...nodes]}
        edges={
          dragTrace
            ? [{ id: '__drag_line__', source: '__drag_origin__', target: dragTrace.nodeId, type: 'straight', style: { strokeDasharray: '4 4', stroke: c.accent, strokeWidth: 1.5 } }]
            : []
        }
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => onSelect(null)}
        onMoveEnd={() => setZoom(getZoom())}
        translateExtent={cameraExtent}
        nodeExtent={nodeExtent}
        deleteKeyCode={['Delete', 'Backspace']}
        selectionKeyCode={['Control', 'Meta']}
        multiSelectionKeyCode={['Control', 'Meta']}
        // Clicar e arrastar no fundo vazio não move mais nada — nem os componentes (óbvio, nunca
        // moveu) nem a câmera (que é o que de fato acontecia e parecia "arrastar tudo junto" pelo
        // deslocamento visual). Zoom continua só pelos botões/roda do mouse.
        panOnDrag={false}
        // Sem isto, o React Flow auto-arrasta a câmera sozinho quando o cursor passa da borda do
        // canvas durante um arraste (nó OU caixa de seleção) — foi isso que empurrou tudo pra baixo
        // ao selecionar com Ctrl e sair pela esquerda/cima. translateExtent (acima, sem folga) já
        // limita até onde esse auto-pan poderia ir; isto aqui evita que ele comece.
        autoPanOnNodeDrag={false}
        minZoom={0.25}
        maxZoom={2.5}
        colorMode={dark ? 'dark' : 'light'}
        style={{ background: c.canvasBg, backgroundImage: `radial-gradient(circle, ${c.dotColor} 1.2px, transparent 1.2px)`, backgroundSize: '20px 20px' }}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left">
          <div className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
            <button onClick={() => zoomOut()} title="Diminuir zoom" style={toolbarButtonStyle}>
              <ZoomOut size={13} />
            </button>
            <button onClick={() => handleZoom(1)} title="Zoom 100%" className="text-[11px] font-medium px-1" style={{ ...toolbarButtonStyle, width: 40 }}>
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => zoomIn()} title="Aumentar zoom" style={toolbarButtonStyle}>
              <ZoomIn size={13} />
            </button>
            <div className="w-px h-[18px] mx-1" style={{ background: c.border }} />
            <select
              value={canvasWidth}
              onChange={(e) => {
                const preset = CANVAS_SIZE_PRESETS.find((p) => p.width === Number(e.target.value));
                if (preset) onCanvasSizeChange(preset.width, preset.height);
              }}
              title="Resolução da prancheta"
              className="text-[11px] font-medium"
              style={{ ...toolbarButtonStyle, width: 100, cursor: 'pointer' }}
            >
              {CANVAS_SIZE_PRESETS.map((p) => (
                <option key={p.width} value={p.width}>
                  {p.label} · {p.width}×{p.height}
                </option>
              ))}
            </select>
            <div className="w-px h-[18px] mx-1" style={{ background: c.border }} />
            <button onClick={handleAutoArrange} title="Auto-arranjar (reempilhar em coluna)" style={toolbarButtonStyle}>
              <LayoutGrid size={13} />
            </button>
            <div className="w-px h-[18px] mx-1" style={{ background: c.border }} />
            {(
              [
                { icon: AlignStartVertical, title: 'Alinhar à esquerda', action: () => alignSelected('left') },
                { icon: AlignCenterVertical, title: 'Centralizar horizontalmente', action: () => alignSelected('centerX') },
                { icon: AlignEndVertical, title: 'Alinhar à direita', action: () => alignSelected('right') },
                { icon: AlignStartHorizontal, title: 'Alinhar ao topo', action: () => alignSelected('top') },
                { icon: AlignCenterHorizontal, title: 'Centralizar verticalmente', action: () => alignSelected('centerY') },
                { icon: AlignEndHorizontal, title: 'Alinhar à base', action: () => alignSelected('bottom') },
              ] as const
            ).map(({ icon: Icon, title, action }) => {
              const disabled = selectedIds.length < 2;
              return (
                <button key={title} onClick={action} disabled={disabled} title={title} style={{ ...toolbarButtonStyle, ...(disabled ? disabledToolbarStyle : null) }}>
                  <Icon size={13} />
                </button>
              );
            })}
            <div className="w-px h-[18px] mx-1" style={{ background: c.border }} />
            <button
              onClick={() => distributeSelected('horizontal')}
              disabled={selectedIds.length < 3}
              title="Distribuir espaçamento horizontal"
              style={{ ...toolbarButtonStyle, ...(selectedIds.length < 3 ? disabledToolbarStyle : null) }}
            >
              <AlignHorizontalDistributeCenter size={13} />
            </button>
            <button
              onClick={() => distributeSelected('vertical')}
              disabled={selectedIds.length < 3}
              title="Distribuir espaçamento vertical"
              style={{ ...toolbarButtonStyle, ...(selectedIds.length < 3 ? disabledToolbarStyle : null) }}
            >
              <AlignVerticalDistributeCenter size={13} />
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
