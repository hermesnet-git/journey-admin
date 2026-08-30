import { apiGet, apiPost, apiPostSse, apiPut, ApiClientError } from './client';
import type { Form, FormField } from './forms';

export type FlowNodeType = 'START' | 'USER_TASK' | 'END' | 'SERVICE_TASK' | 'RECEIVE_TASK' | 'MESSAGE_START_EVENT' | 'GATEWAY';
export type ConnectorType = 'REST' | 'KAFKA' | 'EVENT_HUBS' | 'SERVICE_BUS';

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
  // REQ-04.01.005: embeddedScreen may be absent/empty (a display-only step) — messageText then
  // holds what to show instead, resolved by the simulator at execution time (may reference
  // {{name}} tokens). embeddedScreen é a tela desenhada no editor embutido do dock — nunca uma
  // referência a um Form do catálogo, sempre uma cópia embutida no próprio nó.
  userTaskConfig: { messageText: string | null; embeddedScreen: FormField[] } | null;
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

// Roda a mesma checagem estrutural do back (FlowValidator) contra o input dado, sem persistir
// nada — usado pelo botão "Validar" do Flow Designer pra checar o fluxo atual (mesmo com edições
// ainda não salvas), já que salvar não exige mais consistência (só a publicação exige).
export function validateFlow(journeyId: string, input: FlowUpdateInput): Promise<void> {
  return apiPost<void>(`/journeys/${journeyId}/flow/validate`, input);
}

// Protótipo (FT-03 "gerar fluxo por prompt"): só preview, mesmo formato de getFlow — essa chamada
// nunca persiste nada, o canvas só carrega o resultado como se fosse uma edição manual não salva.
// Via SSE: o back pode levar até 3 tentativas de correção, cada uma vira um evento "progress"
// entregue a onProgress conforme acontece, antes do "result" final (ou "error" se todas falharem).
export function generateFlow(journeyId: string, prompt: string, onProgress: (message: string) => void): Promise<Flow> {
  return new Promise((resolve, reject) => {
    apiPostSse(`/journeys/${journeyId}/flow/generate`, { prompt }, (event, data) => {
      if (event === 'progress') {
        onProgress(data);
      } else if (event === 'result') {
        resolve(JSON.parse(data) as Flow);
      } else if (event === 'error') {
        const err = JSON.parse(data) as {
          status: number;
          message: string;
          code?: string;
          details?: { field: string; code: string; message: string }[];
        };
        reject(new ApiClientError(err.status, err.message, err.code, err.details));
      }
    }).catch(reject);
  });
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

// "Salvar como formulário reutilizável" — copia embeddedScreen pra um Form novo no catálogo; não
// altera o nó (não mexe em embeddedScreen).
export function promoteEmbeddedScreen(
  journeyId: string,
  nodeId: string,
  input: { name: string; description: string },
): Promise<Form> {
  return apiPost<Form>(`/journeys/${journeyId}/flow/nodes/${nodeId}/promote-form`, input);
}
