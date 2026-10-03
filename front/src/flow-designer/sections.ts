import type { FlowSection } from '../api/flows';
import type { NodeType, WFNode } from './model';
import { labelReserve, nodeSize, type NodeDisplayMode } from './nodeMode';

// Seção do canvas: uma moldura com posição e tamanho próprios. As etapas que estão dentro dela fazem
// parte dela; isso é recalculado pela posição (centro da etapa dentro da moldura) a cada mudança,
// então soltar uma etapa dentro entra e arrastar para fora sai.

export const SECTION_PAD = 24;
export const SECTION_HEADER = 40;
// Moldura nova (vinda da paleta) e menor tamanho que ela pode ter.
export const SECTION_DEFAULT = { width: 380, height: 240 };
export const SECTION_MIN = { width: 200, height: 110 };

export interface SectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
// Seção no editor: moldura própria sempre preenchida; nodeIds é o que está dentro dela agora.
export interface SectionState extends SectionBox {
  id: string;
  name: string;
  nodeIds: string[];
}

const centerOf = (n: WFNode, mode: NodeDisplayMode) => {
  const size = nodeSize(n.type as NodeType, mode);
  return { x: n.position.x + size.width / 2, y: n.position.y + size.height / 2 };
};

// Caixa das etapas, com o nome escrito embaixo de cada uma, sem folga.
export function memberBounds(nodes: WFNode[], mode: NodeDisplayMode) {
  if (nodes.length === 0) return null;
  const boxes = nodes.map((n) => {
    const size = nodeSize(n.type as NodeType, mode);
    return { x: n.position.x, y: n.position.y, r: n.position.x + size.width, b: n.position.y + size.height + labelReserve(n.type as NodeType, mode) };
  });
  return {
    x0: Math.min(...boxes.map((b) => b.x)),
    y0: Math.min(...boxes.map((b) => b.y)),
    x1: Math.max(...boxes.map((b) => b.r)),
    y1: Math.max(...boxes.map((b) => b.b)),
  };
}

// Moldura que cabe em volta das etapas (com a folga e o espaço do cabeçalho).
export function fitBox(nodes: WFNode[], mode: NodeDisplayMode): SectionBox | null {
  const box = memberBounds(nodes, mode);
  if (!box) return null;
  return {
    x: Math.round(box.x0 - SECTION_PAD),
    y: Math.round(box.y0 - SECTION_HEADER),
    width: Math.round(box.x1 - box.x0 + SECTION_PAD * 2),
    height: Math.round(box.y1 - box.y0 + SECTION_HEADER + SECTION_PAD / 2),
  };
}

const hasBox = (s: FlowSection) =>
  typeof s.x === 'number' && typeof s.y === 'number' && typeof s.width === 'number' && typeof s.height === 'number';

// Seção gravada → seção do editor. Uma seção gravada antes de existir moldura própria (sem posição e
// tamanho) ganha a moldura que cabe em volta das etapas que já tinha; sem etapa nem moldura, some.
export function toSectionState(section: FlowSection, nodes: WFNode[], mode: NodeDisplayMode): SectionState | null {
  if (hasBox(section)) {
    return { id: section.id, name: section.name, nodeIds: section.nodeIds, x: section.x!, y: section.y!, width: section.width!, height: section.height! };
  }
  const ids = new Set(section.nodeIds);
  const box = fitBox(nodes.filter((n) => ids.has(n.id)), mode);
  return box ? { id: section.id, name: section.name, nodeIds: section.nodeIds, ...box } : null;
}

// O que está dentro de cada seção. Seção recolhida mantém as etapas que tinha ao recolher (a moldura
// dela some e as etapas ficam escondidas, então não competem pela posição); nas abertas, a etapa
// pertence à menor moldura que contém o centro dela, e uma etapa só tem uma seção.
export function withMembers(sections: SectionState[], nodes: WFNode[], collapsed: ReadonlySet<string>, mode: NodeDisplayMode): SectionState[] {
  const present = new Set(nodes.map((n) => n.id));
  const claimed = new Set<string>();
  const frozen = new Map<string, string[]>();
  sections.forEach((s) => {
    if (!collapsed.has(s.id)) return;
    const ids = s.nodeIds.filter((id) => present.has(id) && !claimed.has(id));
    ids.forEach((id) => claimed.add(id));
    frozen.set(s.id, ids);
  });
  const open = sections.filter((s) => !collapsed.has(s.id));
  const members = new Map<string, string[]>(open.map((s) => [s.id, []]));
  nodes.forEach((n) => {
    if (claimed.has(n.id)) return;
    const c = centerOf(n, mode);
    let best: SectionState | null = null;
    open.forEach((s) => {
      const inside = c.x >= s.x && c.x <= s.x + s.width && c.y >= s.y && c.y <= s.y + s.height;
      if (inside && (!best || s.width * s.height < best.width * best.height)) best = s;
    });
    if (best) members.get((best as SectionState).id)!.push(n.id);
  });
  return sections.map((s) => ({ ...s, nodeIds: collapsed.has(s.id) ? (frozen.get(s.id) ?? []) : (members.get(s.id) ?? []) }));
}

// Depois de reorganizar o fluxo: a seção recolhida anda junto com as etapas dela; a aberta se ajusta
// às etapas (mantém a moldura se não tiver etapa).
export function refitSections(
  sections: SectionState[],
  before: WFNode[],
  after: WFNode[],
  collapsed: ReadonlySet<string>,
  mode: NodeDisplayMode,
): SectionState[] {
  const beforeById = new Map(before.map((n) => [n.id, n]));
  const afterById = new Map(after.map((n) => [n.id, n]));
  return sections.map((s) => {
    const moved = s.nodeIds.map((id) => afterById.get(id)).filter((n): n is WFNode => !!n);
    if (moved.length === 0) return s;
    if (collapsed.has(s.id)) {
      const first = moved[0];
      const was = beforeById.get(first.id);
      if (!was) return s;
      return { ...s, x: s.x + Math.round(first.position.x - was.position.x), y: s.y + Math.round(first.position.y - was.position.y) };
    }
    const box = fitBox(moved, mode);
    return box ? { ...s, ...box } : s;
  });
}

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// Novo tamanho ao arrastar uma borda ou canto: nunca menor que o mínimo e nunca menor que a caixa das
// etapas que estão dentro (para tirar uma etapa, arraste a etapa para fora).
export function resizeBox(
  start: SectionBox,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  members: { x0: number; y0: number; x1: number; y1: number } | null,
): SectionBox {
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  let { x, y, width, height } = start;
  if (direction.includes('e')) {
    width = Math.max(start.width + dx, SECTION_MIN.width, members ? members.x1 + SECTION_PAD / 2 - start.x : 0);
  }
  if (direction.includes('w')) {
    x = Math.min(start.x + dx, right - SECTION_MIN.width, members ? members.x0 - SECTION_PAD / 2 : Infinity);
    width = right - x;
  }
  if (direction.includes('s')) {
    height = Math.max(start.height + dy, SECTION_MIN.height, members ? members.y1 + SECTION_PAD / 4 - start.y : 0);
  }
  if (direction.includes('n')) {
    y = Math.min(start.y + dy, bottom - SECTION_MIN.height, members ? members.y0 - SECTION_HEADER + 10 : Infinity);
    height = bottom - y;
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
