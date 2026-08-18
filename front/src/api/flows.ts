import { apiGet, apiPost, apiPut } from './client';

export type FlowNodeType = 'START' | 'USER_TASK' | 'END' | 'SERVICE_TASK' | 'RECEIVE_TASK' | 'MESSAGE_START_EVENT' | 'GATEWAY';
export type ConnectorType = 'REST' | 'KAFKA';

export interface ConnectorConfig {
  connectorType: ConnectorType;
  config: Record<string, unknown> | null;
  credentialRef: string | null;
}

export interface FlowNode {
  nodeId: string;
  nodeType: FlowNodeType;
  name: string;
  description: string | null;
  positionX: number;
  positionY: number;
  // REQ-04.01.005: formId may be absent (a display-only step) — messageText then holds what to
  // show instead, resolved by the simulator at execution time (may reference {{name}} tokens).
  userTaskConfig: { formId: string | null; messageText: string | null } | null;
  connectorConfig: ConnectorConfig | null;
  // REQ-03.12.001: {name, type} declarations, meaningful only on the START node.
  startVariables: { name: string; type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' }[] | null;
}

export interface FlowConnection {
  connectionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  // REQ-03.11.002/003: only meaningful when sourceNodeId is a GATEWAY node.
  condition: string | null;
  isDefault: boolean;
}

// A free-floating note on the designer canvas — never part of the executable flow (never reaches
// FlowValidator, publication, or Camunda), purely a design-time aid. linkedNodeIds is the (possibly
// empty) set of FlowNode ids it's tied to, drawn as a faint dashed line in the designer.
export interface FlowAnnotation {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
  linkedNodeIds: string[];
}

export interface Flow {
  flowId: string;
  journeyId: string;
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  annotations: FlowAnnotation[];
}

export interface FlowUpdateInput {
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  annotations: FlowAnnotation[];
}

export function getFlow(journeyId: string): Promise<Flow> {
  return apiGet<Flow>(`/journeys/${journeyId}/flow`);
}

export function updateFlow(journeyId: string, input: FlowUpdateInput): Promise<Flow> {
  return apiPut<Flow>(`/journeys/${journeyId}/flow`, input);
}

// REQ-03.10.001: test call executed server-side, never directly from the browser (REQ-03.10.002).
export interface ConnectorTestInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
  sampleVariables: Record<string, string>;
}

export interface ConnectorTestResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function testConnector(journeyId: string, nodeId: string, input: ConnectorTestInput): Promise<ConnectorTestResponse> {
  return apiPost<ConnectorTestResponse>(`/journeys/${journeyId}/flow/nodes/${nodeId}/connector-test`, input);
}
