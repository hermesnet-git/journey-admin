// Client fino contra o próprio BFF (bff-canal-web, porta 8086) — sem auth, sem retry: canal digital
// de simulação, não precisa da resiliência do client interno do admin (front/src/execution/api.ts).

const BASE_URL = 'http://localhost:8087/api/v1';

export type SduiNode = [tag: string, props: Record<string, unknown>, children: SduiNode[]];

export interface FormPayload {
  id: string | null;
  name: string;
  description: string | null;
  sdui: SduiNode;
}

export interface StepResponse {
  type: 'USER_TASK' | 'WAITING' | 'ENDED';
  taskId: string | null;
  nodeId: string | null;
  nodeName: string | null;
  nodeType: string | null;
  form: FormPayload | null;
  errorMessage: string | null;
}

export interface FlowNodeInfo {
  id: string;
  type: string;
  name: string;
  startVariables: { name: string; type: string }[] | null;
}

export interface FlowBundle {
  channelType: string;
  flowNodes: FlowNodeInfo[];
}

export interface JourneySummary {
  journeyId: string;
  name: string;
  description: string | null;
  productName: string;
  channelName: string;
  publishedVersionNumber: number | null;
  channelType: string;
}

export interface InstanceResponse {
  processInstanceId: string;
  businessKey: string;
  flow: FlowBundle;
  step: StepResponse;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? response.statusText);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return response.json();
}

export function listJourneys(): Promise<JourneySummary[]> {
  return request('/journeys');
}

export function getFlow(journeyId: string): Promise<FlowBundle> {
  return request(`/journeys/${journeyId}/flow`);
}

export function startInstance(journeyId: string, variables?: Record<string, unknown>): Promise<InstanceResponse> {
  return request(`/journeys/${journeyId}/instances`, { method: 'POST', body: JSON.stringify(variables ?? {}) });
}

export function getCurrentStep(processInstanceId: string): Promise<StepResponse> {
  return request(`/instances/${processInstanceId}/current-step`);
}

export function completeTask(processInstanceId: string, taskId: string, answers: Record<string, unknown>): Promise<StepResponse> {
  return request(`/instances/${processInstanceId}/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function stopInstance(processInstanceId: string): Promise<void> {
  return request(`/instances/${processInstanceId}`, { method: 'DELETE' });
}
