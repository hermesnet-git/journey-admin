import { apiGet, apiPost } from './client';

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface FlowNodeSnapshot {
  id: string;
  type: string;
  name: string;
  description: string | null;
  positionX: number;
  positionY: number;
  formId: string | null;
  connectorConfig: unknown;
}

export interface FlowConnectionSnapshot {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface FormSnapshot {
  id: string;
  name: string;
  description: string | null;
  fields: unknown[];
}

export interface VersionSnapshot {
  journeyName: string;
  journeyDescription: string | null;
  productId: string;
  productName: string;
  channelId: string;
  channelName: string;
  channelType: string;
  flowNodes: FlowNodeSnapshot[];
  flowConnections: FlowConnectionSnapshot[];
  forms: FormSnapshot[];
}

export interface JourneyVersion {
  versionId: string;
  journeyId: string;
  versionNumber: number;
  status: VersionStatus;
  description: string | null;
  snapshot: VersionSnapshot;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
}

export function listJourneyVersions(journeyId: string): Promise<JourneyVersion[]> {
  return apiGet<JourneyVersion[]>(`/journeys/${journeyId}/versions`);
}

export function getJourneyVersion(journeyId: string, versionId: string): Promise<JourneyVersion> {
  return apiGet<JourneyVersion>(`/journeys/${journeyId}/versions/${versionId}`);
}

export function createJourneyVersion(journeyId: string, description?: string): Promise<JourneyVersion> {
  return apiPost<JourneyVersion>(`/journeys/${journeyId}/versions`, description ? { description } : undefined);
}

export function publishJourneyVersion(journeyId: string, versionId: string): Promise<JourneyVersion> {
  return apiPost<JourneyVersion>(`/journeys/${journeyId}/versions/${versionId}/publish`);
}
