import type {
  ChannelType,
  FlowBundle,
  StartVariableDefinition,
} from '@elastic-journey/journey-client';

export type { ChannelType, FlowBundle, StartVariableDefinition };

export type LabTarget = 'react.web' | 'flutter.web' | 'react.mobile' | 'flutter.mobile' | 'whatsapp.wce';

export interface TargetDefinition {
  id: LabTarget;
  label: string;
  description: string;
  channel: ChannelType;
  mode: 'iframe' | 'device';
  url?: string;
}

export interface AdminJourneySummary {
  journeyId: string;
  productId: string;
  productName: string;
  channelTypes: ChannelType[];
  name: string;
  description: string | null;
  status: 'PUBLISHED';
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabBootstrap {
  token: string;
  journeyId: string;
  target: Exclude<LabTarget, 'whatsapp.wce'>;
  variables: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export interface AndroidLaunchResult {
  status: 'RUNNING';
  target: 'react.mobile' | 'flutter.mobile';
  deviceId: string;
  avdName: string | null;
  detail: string;
}

export interface WhatsAppSessionSummary {
  from: string;
  journeyId: string;
  processInstanceId: string;
  stepType: string;
  taskId: string | null;
  rendererDiagnostic: string | null;
}

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error';
  operation: string;
  detail: string;
  correlationId?: string;
}
