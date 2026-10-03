import ElkConstructor, { type ELK, type ElkNode } from 'elkjs/lib/elk-api.js';
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';
import type { FlowConnection, FlowNode } from '../api/flows';
import { BACKEND_TO_FRONT_TYPE, type NodeType, type WFEdge, type WFNode } from './model';
import { isTaskType, labelReserve, nodeSize, type NodeDisplayMode } from './nodeMode';
import { routeEdges, type Box, type EdgeRoute, type Port, type RouteRequest } from './edgeRouter';

// Layout em camadas (ELK, da esquerda para a direita) — substitui o dagre. Organiza só as posições;
// as linhas são roteadas à parte (edgeRouter), a partir das posições, para continuar valendo depois
// que o autor arrasta uma etapa. Roda num worker para não travar a tela num fluxo grande.

let elk: ELK | null = null;
function getElk() {
  if (!elk) elk = new ElkConstructor({ workerUrl: elkWorkerUrl });
  return elk;
}

const SPACING: Record<NodeDisplayMode, { layer: number; node: number }> = {
  circle: { layer: 110, node: 50 },
  compact: { layer: 66, node: 30 },
  detailed: { layer: 96, node: 48 },
};

export interface LayoutNode {
  id: string;
  type: NodeType;
  // Tamanho próprio (bloco de seção recolhida); sem ele, o tamanho do tipo no modo atual.
  width?: number | null;
  height?: number | null;
}

// Tamanho do bloco que representa uma seção recolhida (o mesmo que o editor desenha).
export const COLLAPSED_SECTION = { width: 280, height: 100 };

// Tamanho de uma etapa no layout e o espaço do nome escrito embaixo dela (o bloco não tem nome embaixo).
function layoutSizeOf(n: LayoutNode, mode: NodeDisplayMode) {
  return n.width && n.height
    ? { width: n.width, height: n.height, reserve: 0 }
    : { ...nodeSize(n.type, mode), reserve: labelReserve(n.type, mode) };
}
export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  onError?: boolean;
  isDefault?: boolean;
}

// Ordem de leitura do fluxo (a partir do início, seguindo as saídas): o ELK usa essa ordem para
// decidir quais ligações são "de volta", e elas viram laços em vez de empurrar etapas para trás.
export function flowOrder(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => n.type === 'start' || n.type === 'messageStartEvent' || !incoming.has(n.id));
  const seen = new Set<string>();
  const ordered: LayoutNode[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const n = queue.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    ordered.push(n);
    edges
      .filter((e) => e.source === n.id)
      .sort((a, b) => Number(!!a.onError) - Number(!!b.onError))
      .forEach((e) => {
        const t = byId.get(e.target);
        if (t && !seen.has(t.id)) queue.push(t);
      });
  }
  return [...ordered, ...nodes.filter((n) => !seen.has(n.id))];
}

// Seções do canvas: cada uma vira um grupo no ELK, organizado como um bloco com espaço para o
// cabeçalho — as molduras não se sobrepõem. A folga combina com a moldura desenhada (SECTION_* no editor).
export interface LayoutGroup {
  id: string;
  nodeIds: string[];
  // Moldura própria da seção no editor; sem ela, o cabeçalho segue a caixa das etapas.
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
}
const GROUP_PADDING = '[top=52,left=30,bottom=22,right=30]';

export async function layoutPositions(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  mode: NodeDisplayMode,
  groups: LayoutGroup[] = [],
): Promise<Map<string, { x: number; y: number }>> {
  if (nodes.length === 0) return new Map();
  const ids = new Set(nodes.map((n) => n.id));
  const ordered = flowOrder(nodes, edges);
  const typeById = new Map(nodes.map((n) => [n.id, n.type]));
  const straightEdges = new Set(
    edges.filter((e) => typeById.get(e.source) === 'gateway' && !e.onError && !e.isDefault).map((e) => e.id),
  );
  const spacingOptions = {
    'elk.layered.spacing.nodeNodeBetweenLayers': String(SPACING[mode].layer),
    'elk.spacing.nodeNode': String(SPACING[mode].node),
    'elk.layered.spacing.edgeNodeBetweenLayers': '24',
    'elk.spacing.edgeNode': '20',
  };
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(SPACING[mode].layer),
      'elk.spacing.nodeNode': String(SPACING[mode].node),
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.spacing.edgeNode': '20',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '80',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: [] as ElkNode[],
    edges: [],
  };
  const elkNodes = ordered.map((n): ElkNode => {
      const { reserve, ...size } = layoutSizeOf(n, mode);
      const height = size.height + reserve;
      // Portas na altura do centro da FORMA (o rótulo embaixo aumenta a caixa): assim o ELK alinha
      // os pontos de conexão de verdade e a linha entre vizinhos sai reta.
      const mid = size.height / 2;
      return {
        id: n.id,
        width: size.width,
        height,
        layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
        ports: [
          { id: `${n.id}::in`, x: 0, y: mid, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
          { id: `${n.id}::out`, x: size.width, y: mid, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'EAST' } },
          { id: `${n.id}::err`, x: size.width / 2, y: height, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } },
        ],
      };
    });
  // Cada etapa fica no máximo numa seção; seção sem etapa presente é ignorada.
  const groupOf = new Map<string, string>();
  const liveGroups = groups
    .map((g) => ({ id: g.id, nodeIds: g.nodeIds.filter((id) => ids.has(id) && !groupOf.has(id) && groupOf.set(id, g.id)) }))
    .filter((g) => g.nodeIds.length > 0);
  graph.children = [
    ...elkNodes.filter((n) => !groupOf.has(n.id)),
    ...liveGroups.map((g) => ({
      id: `group::${g.id}`,
      // Mesmo espaçamento entre etapas do fluxo inteiro (sem isso o ELK usa o padrão dele, apertado).
      layoutOptions: { ...spacingOptions, 'elk.padding': GROUP_PADDING },
      children: elkNodes.filter((n) => groupOf.get(n.id) === g.id),
    })),
  ];
  // Grupos na ordem do fluxo: um grupo aparece onde sua primeira etapa apareceria.
  const firstIndex = (n: ElkNode) => {
    const ids2 = n.children ? n.children.map((c) => c.id) : [n.id];
    return Math.min(...ids2.map((id) => ordered.findIndex((o) => o.id === id)));
  };
  graph.children.sort((a, b) => firstIndex(a) - firstIndex(b));
  if (liveGroups.length > 0) graph.layoutOptions!['elk.hierarchyHandling'] = 'INCLUDE_CHILDREN';
  graph.edges = edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        id: e.id,
        sources: [`${e.source}::${e.onError ? 'err' : 'out'}`],
        targets: [`${e.target}::in`],
        // Saída com condição de uma Decisão segue reta (caminho principal); o "senão" desvia.
        layoutOptions: { 'elk.layered.priority.straightness': straightEdges.has(e.id) ? '20' : '1' },
      }));
  const result = await getElk().layout(graph);
  // Posições das etapas dentro de um grupo vêm relativas a ele: soma a posição do grupo.
  const positions = new Map<string, { x: number; y: number }>();
  (result.children ?? []).forEach((c) => {
    if (c.children) {
      c.children.forEach((k) => positions.set(k.id, { x: Math.round((c.x ?? 0) + (k.x ?? 0)), y: Math.round((c.y ?? 0) + (k.y ?? 0)) }));
    } else {
      positions.set(c.id, { x: Math.round(c.x ?? 0), y: Math.round(c.y ?? 0) });
    }
  });
  // Com seções o ELK já separa os blocos; mover o ramo de falha poderia jogar uma etapa para dentro
  // da moldura de outra seção.
  straightenMainPaths(positions, nodes, edges, mode);
  if (liveGroups.length === 0) alignFailureBranches(positions, nodes, edges, mode);
  return positions;
}

// Faixa própria para a falha: o ELK põe o destino do "Se falhar" na coluna seguinte, como qualquer
// ligação. Aqui ele (e as etapas que só esse ramo alimenta) vai para baixo da etapa que falhou, desde
// que o ramo já esteja abaixo dela e o espaço esteja livre — a linha de falha desce reta.
// Etapas que só um ramo alimenta (a partir do destino), para mover o ramo inteiro de uma vez.
function exclusiveBranch(start: string, incoming: Map<string, LayoutEdge[]>, outgoing: Map<string, LayoutEdge[]>, has: (id: string) => boolean): Set<string> {
  const branch = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of outgoing.get(id) ?? []) {
      if (branch.has(e.target) || !has(e.target)) continue;
      if ((incoming.get(e.target) ?? []).every((i) => branch.has(i.source))) {
        branch.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return branch;
}

// Caminho principal reto: quando a Decisão ficou alinhada com o "senão" e não com a saída que tem
// condição (acontece entre seções, onde o ELK não respeita a prioridade de linha reta), as duas
// fileiras trocam de altura.
function straightenMainPaths(positions: Map<string, { x: number; y: number }>, nodes: LayoutNode[], edges: LayoutEdge[], mode: NodeDisplayMode) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, LayoutEdge[]>();
  const outgoing = new Map<string, LayoutEdge[]>();
  edges.forEach((e) => {
    incoming.set(e.target, [...(incoming.get(e.target) ?? []), e]);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e]);
  });
  const centerY = (id: string) => positions.get(id)!.y + layoutSizeOf(byId.get(id)!, mode).height / 2;
  nodes.filter((n) => n.type === 'gateway' && positions.has(n.id)).forEach((g) => {
    const outs = (outgoing.get(g.id) ?? []).filter((e) => !e.onError && positions.has(e.target) && positions.get(e.target)!.x > positions.get(g.id)!.x);
    const main = outs.find((e) => !e.isDefault);
    const aligned = outs.find((e) => e !== main && Math.abs(centerY(e.target) - centerY(g.id)) < 4);
    if (!main || !aligned || Math.abs(centerY(main.target) - centerY(g.id)) < 4) return;
    if (Math.abs(positions.get(main.target)!.x - positions.get(aligned.target)!.x) > 4) return;
    const has = (id: string) => positions.has(id);
    const a = exclusiveBranch(main.target, incoming, outgoing, has);
    const b = exclusiveBranch(aligned.target, incoming, outgoing, has);
    if ([...a].some((id) => b.has(id)) || a.has(g.id) || b.has(g.id)) return;
    const dy = centerY(aligned.target) - centerY(main.target);
    a.forEach((id) => positions.set(id, { ...positions.get(id)!, y: positions.get(id)!.y + dy }));
    b.forEach((id) => positions.set(id, { ...positions.get(id)!, y: positions.get(id)!.y - dy }));
  });
}

const FAILURE_GAP = 72;

function alignFailureBranches(
  positions: Map<string, { x: number; y: number }>,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  mode: NodeDisplayMode,
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, LayoutEdge[]>();
  const outgoing = new Map<string, LayoutEdge[]>();
  edges.forEach((e) => {
    incoming.set(e.target, [...(incoming.get(e.target) ?? []), e]);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e]);
  });
  const box = (id: string, p: { x: number; y: number }) => {
    const size = layoutSizeOf(byId.get(id)!, mode);
    return { x: p.x, y: p.y, r: p.x + size.width, b: p.y + size.height + size.reserve };
  };
  for (const err of edges.filter((e) => e.onError)) {
    const src = positions.get(err.source);
    const tgt = positions.get(err.target);
    if (!src || !tgt || (incoming.get(err.target)?.length ?? 0) !== 1) continue;
    const branch = new Set([err.target]);
    const queue = [err.target];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of outgoing.get(id) ?? []) {
        if (branch.has(e.target) || !positions.has(e.target)) continue;
        if ((incoming.get(e.target) ?? []).every((i) => branch.has(i.source))) {
          branch.add(e.target);
          queue.push(e.target);
        }
      }
    }
    if (branch.has(err.source)) continue;
    const s = box(err.source, src);
    const t = box(err.target, tgt);
    const dx = Math.round((s.x + s.r) / 2 - (t.x + t.r) / 2);
    if (dx >= 0 || t.y < s.b) continue;
    // Espaço entre o nome da etapa que falhou e o topo da faixa de falha, para a linha descer reta.
    const dy = Math.max(0, s.b + FAILURE_GAP - t.y);
    const others = [...positions].filter(([id]) => !branch.has(id)).map(([id, p]) => box(id, p));
    const fits = [...branch].every((id) => {
      const p = positions.get(id)!;
      const m = box(id, { x: p.x + dx, y: p.y + dy });
      // Folga pequena: as caixas já incluem o nome escrito embaixo de cada etapa.
      return others.every((o) => m.r + 12 <= o.x || o.r + 12 <= m.x || m.b + 12 <= o.y || o.b + 12 <= m.y);
    });
    if (!fits) continue;
    branch.forEach((id) => {
      const p = positions.get(id)!;
      positions.set(id, { x: p.x + dx, y: p.y + dy });
    });
  }
}

const toLayoutNodes = (nodes: WFNode[]): LayoutNode[] => nodes.map((n) => ({ id: n.id, type: n.type as NodeType }));
const toLayoutEdges = (edges: WFEdge[]): LayoutEdge[] =>
  edges.map((e) => ({ id: e.id, source: e.source, target: e.target, onError: !!e.data?.onError, isDefault: !!e.data?.isDefault }));

// Organiza o canvas inteiro. Seção recolhida entra no cálculo como um bloco do tamanho em que aparece
// recolhida (COLLAPSED_SECTION), não do tamanho que teria aberta; as etapas dela acompanham o bloco,
// mantendo o arranjo interno que já tinham.
export async function computeLayout(
  nodes: WFNode[],
  edges: WFEdge[],
  mode: NodeDisplayMode,
  groups: LayoutGroup[] = [],
  collapsed: ReadonlySet<string> = new Set(),
): Promise<WFNode[]> {
  const present = new Set(nodes.map((n) => n.id));
  const blocks = groups
    .filter((g) => collapsed.has(g.id))
    .map((g) => ({ blockId: `block::${g.id}`, memberIds: g.nodeIds.filter((id) => present.has(id)) }))
    .filter((b) => b.memberIds.length > 0);
  if (blocks.length === 0) {
    const positions = await layoutPositions(toLayoutNodes(nodes), toLayoutEdges(edges), mode, groups);
    return nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
  }

  const blockOf = new Map<string, string>();
  blocks.forEach((b) => b.memberIds.forEach((id) => !blockOf.has(id) && blockOf.set(id, b.blockId)));
  const layoutNodes: LayoutNode[] = [
    ...toLayoutNodes(nodes.filter((n) => !blockOf.has(n.id))),
    ...blocks.map((b): LayoutNode => ({ id: b.blockId, type: 'userTask', ...COLLAPSED_SECTION })),
  ];
  // Ligações reescritas para o bloco; as de dentro da mesma seção somem e as repetidas entre os mesmos
  // dois pontos viram uma só.
  const seen = new Set<string>();
  const layoutEdges = toLayoutEdges(edges).flatMap((e): LayoutEdge[] => {
    const source = blockOf.get(e.source) ?? e.source;
    const target = blockOf.get(e.target) ?? e.target;
    const key = `${source}>${target}|${e.onError ? 'err' : 'ok'}`;
    if (source === target || seen.has(key)) return [];
    seen.add(key);
    return [{ ...e, source, target }];
  });
  const openGroups = groups.filter((g) => !collapsed.has(g.id));
  const positions = await layoutPositions(layoutNodes, layoutEdges, mode, openGroups);

  // As etapas de cada seção recolhida vão para onde o bloco ficou: o canto superior esquerdo do grupo
  // coincide com o do bloco.
  const shift = new Map<string, { dx: number; dy: number }>();
  blocks.forEach((b) => {
    const members = nodes.filter((n) => blockOf.get(n.id) === b.blockId);
    const at = positions.get(b.blockId);
    if (!at || members.length === 0) return;
    const minX = Math.min(...members.map((n) => n.position.x));
    const minY = Math.min(...members.map((n) => n.position.y));
    members.forEach((n) => shift.set(n.id, { dx: at.x - minX, dy: at.y - minY }));
  });
  return nodes.map((n) => {
    const d = shift.get(n.id);
    if (d) return { ...n, position: { x: Math.round(n.position.x + d.dx), y: Math.round(n.position.y + d.dy) } };
    return { ...n, position: positions.get(n.id) ?? n.position };
  });
}

// Reabrir uma seção: reorganiza só o conteúdo dela e o recoloca com o canto superior esquerdo em
// `anchor` (o canto da moldura, descontada a folga) ou, sem ele, onde as etapas já estavam. Nada fora
// da seção se mexe.
export async function computeLayoutForSection(
  nodes: WFNode[],
  edges: WFEdge[],
  memberIds: string[],
  mode: NodeDisplayMode,
  anchor?: { x: number; y: number },
): Promise<WFNode[]> {
  const ids = new Set(memberIds);
  const members = nodes.filter((n) => ids.has(n.id));
  if (members.length === 0) return nodes;
  const inner = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  const positions = await layoutPositions(toLayoutNodes(members), toLayoutEdges(inner), mode);
  const minX = anchor?.x ?? Math.min(...members.map((n) => n.position.x));
  const minY = anchor?.y ?? Math.min(...members.map((n) => n.position.y));
  const laid = members.map((n) => positions.get(n.id) ?? n.position);
  const dx = minX - Math.min(...laid.map((p) => p.x));
  const dy = minY - Math.min(...laid.map((p) => p.y));
  return nodes.map((n) => {
    const p = ids.has(n.id) ? positions.get(n.id) : undefined;
    return p ? { ...n, position: { x: Math.round(p.x + dx), y: Math.round(p.y + dy) } } : n;
  });
}

function boundsCenter(nodes: WFNode[], mode: NodeDisplayMode): { cx: number; cy: number } {
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const xe = nodes.map((n) => n.position.x + nodeSize(n.type as NodeType, mode).width);
  const ye = nodes.map((n) => n.position.y + nodeSize(n.type as NodeType, mode).height);
  return { cx: (Math.min(...xs) + Math.max(...xe)) / 2, cy: (Math.min(...ys) + Math.max(...ye)) / 2 };
}

// Organiza só as etapas selecionadas (2+) e as recoloca onde o grupo já estava.
export async function computeLayoutForSelection(
  nodes: WFNode[],
  edges: WFEdge[],
  selectedIds: Set<string>,
  mode: NodeDisplayMode,
): Promise<WFNode[]> {
  const selected = nodes.filter((n) => selectedIds.has(n.id));
  if (selected.length < 2) return nodes;
  const inner = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
  const before = boundsCenter(selected, mode);
  const positions = await layoutPositions(toLayoutNodes(selected), toLayoutEdges(inner), mode);
  const laidOut = selected.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
  const after = boundsCenter(laidOut, mode);
  const dx = before.cx - after.cx;
  const dy = before.cy - after.cy;
  const moved = new Map(laidOut.map((n) => [n.id, { x: n.position.x + dx, y: n.position.y + dy }]));
  return nodes.map((n) => (moved.has(n.id) ? { ...n, position: moved.get(n.id)! } : n));
}

// Mesmo layout no formato do backend — fluxo gerado por IA ou importado do Figma nasce organizado.
export async function layoutFlowNodes(nodes: FlowNode[], connections: FlowConnection[], mode: NodeDisplayMode): Promise<FlowNode[]> {
  const positions = await layoutPositions(
    nodes.map((n) => ({ id: n.nodeId, type: BACKEND_TO_FRONT_TYPE[n.nodeType] })),
    connections.map((c) => ({ id: c.connectionId, source: c.sourceNodeId, target: c.targetNodeId, onError: c.onError, isDefault: c.isDefault })),
    mode,
  );
  return nodes.map((n) => {
    const pos = positions.get(n.nodeId);
    return pos ? { ...n, positionX: pos.x, positionY: pos.y } : n;
  });
}

export interface PositionedNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  // Tamanho próprio (bloco de seção recolhida); sem ele, o tamanho do tipo no modo atual.
  width?: number | null;
  height?: number | null;
}

// Rotas das linhas a partir das posições atuais, desviando de todas as etapas e do nome escrito
// embaixo delas. Toda saída de etapa sai pela direita — para a frente ou de volta (laço) —, e a única
// exceção é o "Se falhar", que sai por baixo. A Decisão sai pelos vértices (direita, cima ou baixo).
// Chega pela esquerda; o laço pode chegar também por cima. O roteador escolhe o caminho mais curto.
export function computeRoutes(nodes: PositionedNode[], edges: LayoutEdge[], mode: NodeDisplayMode, groups: LayoutGroup[] = []): Map<string, EdgeRoute> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sizeOf = (n: PositionedNode) => (n.width && n.height ? { width: n.width, height: n.height } : nodeSize(n.type, mode));
  const reserveOf = (n: PositionedNode) => (n.width ? 0 : labelReserve(n.type, mode));
  // Forma e rótulo em caixas separadas: o rótulo (mais largo que a forma) fica só embaixo, então o
  // corredor na altura das conexões entre etapas vizinhas continua livre.
  const obstacles: Box[] = nodes.flatMap((n) => {
    const size = sizeOf(n);
    const reserve = reserveOf(n);
    const shape = { x: n.x, y: n.y, width: size.width, height: size.height };
    if (reserve === 0) return [shape];
    // Largura do nome escrito embaixo (até 150px, quebrando em duas linhas).
    const width = Math.max(size.width, 140);
    return [shape, { x: n.x + size.width / 2 - width / 2, y: n.y + size.height + 6, width, height: reserve - 6 }];
  });
  // Cabeçalho de cada seção (nome em maiúsculas no topo da moldura): nenhuma linha passa por cima.
  groups.forEach((g) => {
    if (typeof g.x === 'number' && typeof g.y === 'number' && typeof g.width === 'number') {
      obstacles.push({ x: g.x, y: g.y, width: g.width, height: 22 });
      return;
    }
    const members = g.nodeIds.map((id) => byId.get(id)).filter((n): n is PositionedNode => !!n);
    if (members.length === 0) return;
    const x0 = Math.min(...members.map((n) => n.x)) - 24;
    const x1 = Math.max(...members.map((n) => n.x + sizeOf(n).width)) + 24;
    const y0 = Math.min(...members.map((n) => n.y)) - 40;
    obstacles.push({ x: x0, y: y0, width: x1 - x0, height: 22 });
  });
  // Dentro de uma seção o topo da etapa fica colado no cabeçalho: sem saída nem chegada por cima.
  const inSection = new Set(groups.flatMap((g) => g.nodeIds));
  const requests: RouteRequest[] = [];
  edges.forEach((e) => {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) return;
    const ss = sizeOf(s);
    const ts = sizeOf(t);
    const right = { x: s.x + ss.width, y: s.y + ss.height / 2 };
    const bottom = { x: s.x + ss.width / 2, y: s.y + ss.height };
    const reserve = reserveOf(s);
    // Saindo por baixo, a linha começa depois do nome escrito embaixo da etapa — nunca passa por cima dele.
    const below = { x: bottom.x, y: bottom.y + reserve };
    const top = { x: s.x + ss.width / 2, y: s.y };
    const left = { x: t.x, y: t.y + ts.height / 2 };
    const belowCost = reserve > 0 ? 12 : 0;
    const backward = t.x + ts.width / 2 <= s.x + ss.width / 2;
    // Decisão: o caminho que vai para cima sai pelo vértice de cima, o que vai para baixo pelo de baixo.
    const sy = s.y + ss.height / 2;
    const ty = t.y + ts.height / 2;
    const gatewayForks: Port[] =
      s.type === 'gateway' && !backward
        ? [...(ty < sy - 10 && !inSection.has(s.id) ? [{ pt: top, dir: 'N' as const }] : []), ...(ty > sy + 10 ? [{ pt: below, dir: 'S' as const }] : [])]
        : [];
    requests.push({
      id: e.id,
      loop: backward,
      anchorStart: e.onError ? bottom : right,
      anchorEnd: left,
      starts: e.onError
        ? [{ pt: below, dir: 'S' }]
        : backward && s.type === 'gateway'
          ? [{ pt: right, dir: 'E' }, ...(inSection.has(s.id) ? [] : [{ pt: top, dir: 'N' as const }]), { pt: below, dir: 'S', cost: belowCost }]
          : [{ pt: right, dir: 'E' }, ...gatewayForks],
      // Chegada por baixo ficaria em cima da saída "Se falhar" e do nome das etapas: só esquerda ou topo.
      ends: e.onError
        ? // Falha: sai por baixo e é a única ligação que chega por cima ou pela direita da etapa alvo; o topo
          // prevalece (também dentro de seção) e a direita só serve se o topo estiver bloqueado.
          [
            { pt: { x: t.x + ts.width / 2, y: t.y }, dir: 'S' as const },
            { pt: { x: t.x + ts.width, y: t.y + ts.height / 2 }, dir: 'W' as const, cost: 60 },
          ]
        : backward
        ? [
            { pt: left, dir: 'E' },
            // Segunda entrada pela esquerda, um pouco abaixo: não disputa a chegada da linha principal.
            ...(isTaskType(t.type) ? [{ pt: { x: t.x, y: left.y + 18 }, dir: 'E' as const }] : []),
            ...(inSection.has(t.id) ? [] : [{ pt: { x: t.x + ts.width / 2, y: t.y }, dir: 'S' as const }]),
          ]
        : [{ pt: left, dir: 'E' }],
    });
  });
  // Para a frente primeiro; os laços por último, contornando o que já foi traçado.
  requests.sort((a, b) => Number(!!a.loop) - Number(!!b.loop));
  return routeEdges(requests, obstacles);
}
