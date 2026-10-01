import { flowOrder } from './layout';
import type { NodeType, WFAnnotation, WFEdge, WFNode } from './model';

// Notas ligadas a etapas viram marcadores numerados nas próprias etapas; a numeração segue a ordem
// do fluxo (a primeira etapa ligada de cada nota), a mesma do painel "Guia deste modelo" e do tour.
export interface GuideNote {
  id: string;
  number: number;
  text: string;
  nodeIds: string[];
}

export function guideNotes(annotations: WFAnnotation[], nodes: WFNode[], edges: WFEdge[]): GuideNote[] {
  const order = new Map(
    flowOrder(
      nodes.map((n) => ({ id: n.id, type: n.type as NodeType })),
      edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    ).map((n, i) => [n.id, i]),
  );
  const rank = (a: WFAnnotation) => Math.min(...a.data.linkedNodeIds.map((id) => order.get(id) ?? Infinity));
  return annotations
    .filter((a) => a.data.linkedNodeIds.length > 0)
    .sort((a, b) => rank(a) - rank(b))
    .map((a, i) => ({ id: a.id, number: i + 1, text: a.data.text, nodeIds: a.data.linkedNodeIds }));
}

// Jornada recém-criada a partir de um modelo: o editor abre o tour na primeira vez e desmarca.
const TOUR_KEY = 'flow:tour-pending:';

export function markTourPending(journeyId: string) {
  try {
    localStorage.setItem(TOUR_KEY + journeyId, '1');
  } catch {
    // sem armazenamento: o tour continua disponível pelo botão "Ver guia"
  }
}

export function isTourPending(journeyId: string): boolean {
  try {
    return localStorage.getItem(TOUR_KEY + journeyId) === '1';
  } catch {
    return false;
  }
}

export function clearTourPending(journeyId: string) {
  try {
    localStorage.removeItem(TOUR_KEY + journeyId);
  } catch {
    // nada a limpar
  }
}
