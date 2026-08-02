import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'start' | 'userTask' | 'end';

export interface WFNodeData extends Record<string, unknown> {
  name: string;
  description: string;
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
  return [makeNode('start', 80, 80), makeNode('end', 400, 80)];
}

export function initialFlowEdges(nodes: WFNode[]): WFEdge[] {
  return [{ id: newConnectionId(), source: nodes[0].id, target: nodes[1].id }];
}
