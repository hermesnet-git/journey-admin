import { apiGet, apiPut } from './client';

export type FlowNodeType = 'START' | 'USER_TASK' | 'END';

export interface FlowNode {
  nodeId: string;
  nodeType: FlowNodeType;
  name: string;
  description: string | null;
  positionX: number;
  positionY: number;
  formId: string | null;
}

export interface FlowConnection {
  connectionId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface Flow {
  flowId: string;
  journeyId: string;
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

export interface FlowUpdateInput {
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

export function getFlow(journeyId: string): Promise<Flow> {
  return apiGet<Flow>(`/journeys/${journeyId}/flow`);
}

export function updateFlow(journeyId: string, input: FlowUpdateInput): Promise<Flow> {
  return apiPut<Flow>(`/journeys/${journeyId}/flow`, input);
}
