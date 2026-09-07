import type { SduiDocument } from '@elastic-journey/sdui-contract';

export const CHANNEL_TYPES = ['WEB', 'MOBILE', 'WHATSAPP'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export interface StartVariableDefinition {
  name?: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | string;
  label?: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface FlowNode {
  id: string;
  type: string;
  name: string;
  startVariables: StartVariableDefinition[];
}

export interface FlowBundle {
  channelTypes: ChannelType[];
  flowNodes: FlowNode[];
}

export interface FormPayload {
  id: string;
  name: string;
  description: string | null;
  sdui: SduiDocument | unknown;
}

export interface JourneyStep {
  type: 'USER_TASK' | 'WAITING' | 'ENDED';
  taskId: string | null;
  nodeId: string | null;
  nodeName: string | null;
  nodeType: string | null;
  form: FormPayload | null;
  errorMessage: string | null;
}

export interface JourneyInstance {
  processInstanceId: string;
  businessKey: string;
  flow: FlowBundle;
  step: JourneyStep;
}

export interface CompleteTaskRequest {
  answers: Record<string, unknown>;
}

export interface ProblemDetails {
  status?: number;
  code?: string;
  title?: string;
  detail?: string;
  correlationId?: string;
  timestamp?: string;
  [key: string]: unknown;
}
