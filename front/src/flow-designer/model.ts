import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'start' | 'userTask' | 'end';

export interface WFNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  // Client-only highlight set by validation; never sent to the backend.
  invalid?: boolean;
}

export type WFNode = Node<WFNodeData, NodeType>;
export type WFEdge = Edge;

export const NODE_META: Record<NodeType, { title: string; subtitle: string }> = {
  start: { title: 'Início', subtitle: 'Inicia o fluxo' },
  userTask: { title: 'Tarefa de Usuário', subtitle: 'Coleta dados do usuário' },
  end: { title: 'Fim', subtitle: 'Encerra o fluxo' },
};

export const TYPE_COLOR: Record<NodeType, string> = {
  start: '#16a34a',
  userTask: '#019DF4',
  end: '#dc2626',
};

export const NODE_WIDTH = 220;

// Node/connection ids are later embedded verbatim as BPMN element ids by the
// runtime; XML NCName forbids an id starting with a digit, which a bare UUID
// cannot guarantee, so every id carries a fixed non-numeric prefix.
export function newNodeId() {
  return `Node_${crypto.randomUUID()}`;
}

export function newConnectionId() {
  return `Flow_${crypto.randomUUID()}`;
}

export function makeNode(type: NodeType, x: number, y: number): WFNode {
  const meta = NODE_META[type];
  return { id: newNodeId(), type, position: { x, y }, data: { name: meta.title, description: meta.subtitle } };
}

export function initialFlowNodes(): WFNode[] {
  return [makeNode('start', 80, 80)];
}

export function initialFlowEdges(_nodes: WFNode[]): WFEdge[] {
  return [];
}

const LAYER_GAP_X = 320;
const NODE_HEIGHT = 70;
const GAP_Y = 40;

// Layered auto-layout (topological layering + barycenter sweep), ported from
// the wf-designer reference project. All node types share a fixed height here
// (no branch rows like the reference's decision nodes), so spacing is constant.
export function computeLayout(nodes: WFNode[], edges: WFEdge[]): WFNode[] {
  const incoming: Record<string, string[]> = {};
  const outgoing: Record<string, string[]> = {};
  nodes.forEach((n) => {
    incoming[n.id] = [];
    outgoing[n.id] = [];
  });
  edges.forEach((e) => {
    if (outgoing[e.source] && incoming[e.target] !== undefined) {
      outgoing[e.source].push(e.target);
      incoming[e.target].push(e.source);
    }
  });

  const layer: Record<string, number> = {};
  const indeg: Record<string, number> = {};
  nodes.forEach((n) => {
    indeg[n.id] = incoming[n.id].length;
  });
  const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  queue.forEach((id) => {
    layer[id] = 0;
  });
  const seen = new Set(queue);
  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    (outgoing[id] || []).forEach((t) => {
      const candidate = (layer[id] || 0) + 1;
      if (layer[t] === undefined || candidate > layer[t]) layer[t] = candidate;
      if (!seen.has(t)) {
        seen.add(t);
        queue.push(t);
      }
    });
  }
  nodes.forEach((n) => {
    if (layer[n.id] === undefined) layer[n.id] = 0;
  });

  const maxLayer = Math.max(0, ...nodes.map((n) => layer[n.id]));
  const byLayer: WFNode[][] = [];
  for (let l = 0; l <= maxLayer; l++) byLayer.push(nodes.filter((n) => layer[n.id] === l));

  const orderIndex: Record<string, number> = {};
  byLayer.forEach((group) => group.forEach((n, idx) => {
    orderIndex[n.id] = idx;
  }));

  const sweepDown = () => {
    for (let l = 1; l <= maxLayer; l++) {
      const scored = byLayer[l].map((n) => {
        const parents = incoming[n.id].filter((pid) => layer[pid] === l - 1);
        const avg = parents.length ? parents.reduce((s, pid) => s + orderIndex[pid], 0) / parents.length : orderIndex[n.id];
        return { n, avg };
      });
      scored.sort((a, b) => a.avg - b.avg);
      byLayer[l] = scored.map((s) => s.n);
      byLayer[l].forEach((n, idx) => {
        orderIndex[n.id] = idx;
      });
    }
  };
  const sweepUp = () => {
    for (let l = maxLayer - 1; l >= 0; l--) {
      const scored = byLayer[l].map((n) => {
        const children = outgoing[n.id].filter((cid) => layer[cid] === l + 1);
        const avg = children.length ? children.reduce((s, cid) => s + orderIndex[cid], 0) / children.length : orderIndex[n.id];
        return { n, avg };
      });
      scored.sort((a, b) => a.avg - b.avg);
      byLayer[l] = scored.map((s) => s.n);
      byLayer[l].forEach((n, idx) => {
        orderIndex[n.id] = idx;
      });
    }
  };
  sweepDown();
  sweepUp();
  sweepDown();
  sweepUp();

  const newNodes = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  byLayer.forEach((group, l) => {
    let y = 80;
    group.forEach((n) => {
      const target = newNodes.find((x) => x.id === n.id)!;
      target.position.x = 80 + l * LAYER_GAP_X;
      target.position.y = y;
      y += NODE_HEIGHT + GAP_Y;
    });
  });
  return newNodes;
}
