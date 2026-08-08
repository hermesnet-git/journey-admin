import type { Node, Edge } from '@xyflow/react';
import type { FlowNodeType } from '../api/flows';

export type NodeType = 'start' | 'userTask' | 'end' | 'serviceTask' | 'receiveTask' | 'messageStartEvent';
export type ConnectorType = 'REST' | 'KAFKA';

export const FRONT_TO_BACKEND_TYPE: Record<NodeType, FlowNodeType> = {
  start: 'START',
  userTask: 'USER_TASK',
  end: 'END',
  serviceTask: 'SERVICE_TASK',
  receiveTask: 'RECEIVE_TASK',
  messageStartEvent: 'MESSAGE_START_EVENT',
};

export const BACKEND_TO_FRONT_TYPE: Record<FlowNodeType, NodeType> = {
  START: 'start',
  USER_TASK: 'userTask',
  END: 'end',
  SERVICE_TASK: 'serviceTask',
  RECEIVE_TASK: 'receiveTask',
  MESSAGE_START_EVENT: 'messageStartEvent',
};

export interface ConnectorConfig {
  connectorType: ConnectorType;
  config: Record<string, unknown> | null;
  credentialRef: string | null;
}

export interface WFNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  formId: string | null;
  connectorConfig: ConnectorConfig | null;
  // Client-only highlight set by validation; never sent to the backend.
  invalid?: boolean;
  // Client-only flag: these node types may have at most one outgoing path (REQ-03.02.007/03.02.004).
  outgoingLimitReached?: boolean;
}

export type WFNode = Node<WFNodeData, NodeType>;
export type WFEdge = Edge;

// Node types that may have at most one outgoing connection (REQ-03.02.004/03.02.007).
export const SINGLE_OUTPUT_TYPES: NodeType[] = ['userTask', 'serviceTask', 'receiveTask'];

// Enabled connectors only (REQ-03.08.003/004) — SOAP and others exist in the backend
// catalog but are registered disabled, so they're never offered here.
export const CONNECTOR_TYPES: ConnectorType[] = ['REST', 'KAFKA'];

// REST models an outbound call (method/URL to reach), which doesn't fit a
// MESSAGE_START_EVENT — it starts the flow from an incoming message, it never
// calls out. Only KAFKA (consume) applies there (REQ-03.09.007).
export const CONNECTOR_TYPES_BY_NODE: Partial<Record<NodeType, ConnectorType[]>> = {
  serviceTask: ['REST', 'KAFKA'],
  receiveTask: ['REST', 'KAFKA'],
  messageStartEvent: ['KAFKA'],
};

// Kafka operation is implied by the node's role, not a free choice: a
// SERVICE_TASK publishes as a side effect of running; RECEIVE_TASK and
// MESSAGE_START_EVENT only ever wait for a message (REQ-03.09.008).
export const KAFKA_OPERATION_BY_NODE: Partial<Record<NodeType, 'PRODUCE' | 'CONSUME'>> = {
  serviceTask: 'PRODUCE',
  receiveTask: 'CONSUME',
  messageStartEvent: 'CONSUME',
};

export const NODE_META: Record<NodeType, { title: string; subtitle: string }> = {
  start: { title: 'Início', subtitle: 'Inicia o fluxo' },
  userTask: { title: 'Tarefa de Usuário', subtitle: 'Coleta dados do usuário' },
  end: { title: 'Fim', subtitle: 'Encerra o fluxo' },
  serviceTask: { title: 'Tarefa de Serviço', subtitle: 'Executa uma integração externa' },
  receiveTask: { title: 'Tarefa de Recebimento', subtitle: 'Aguarda uma mensagem externa' },
  messageStartEvent: { title: 'Início por Mensagem', subtitle: 'Inicia o fluxo a partir de uma mensagem externa' },
};

export const TYPE_COLOR: Record<NodeType, string> = {
  start: '#16a34a',
  userTask: '#019DF4',
  end: '#dc2626',
  serviceTask: '#9333ea',
  receiveTask: '#d97706',
  messageStartEvent: '#16a34a',
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
  return {
    id: newNodeId(),
    type,
    position: { x, y },
    data: { name: meta.title, description: meta.subtitle, formId: null, connectorConfig: null },
  };
}

// Nudges (x, y) diagonally, step by step, until it clears every existing
// node's position — keeps repeated palette clicks/drops from stacking nodes
// exactly on top of each other.
export function findFreeSpot(nodes: WFNode[], x: number, y: number): { x: number; y: number } {
  const STEP = 32;
  const CLEARANCE = 24;
  let candidate = { x, y };
  let i = 0;
  while (
    nodes.some((n) => Math.abs(n.position.x - candidate.x) < CLEARANCE && Math.abs(n.position.y - candidate.y) < CLEARANCE) &&
    i < 20
  ) {
    i += 1;
    candidate = { x: x + i * STEP, y: y + i * STEP };
  }
  return candidate;
}

export function initialFlowNodes(): WFNode[] {
  return [];
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
