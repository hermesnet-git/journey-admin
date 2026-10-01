import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type { ChannelType } from './products';
import type { BackendConnectorType, BackendNodeType } from '../execution/api';

export type JourneyStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'INACTIVE';
export type JourneySort = 'CREATED_AT' | 'UPDATED_AT';

export interface Journey {
  journeyId: string;
  productId: string;
  productName: string;
  channelTypes: ChannelType[];
  name: string;
  description: string | null;
  status: JourneyStatus;
  publishedAt: string | null;
  publishedVersionId: string | null;
  publishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyCreateInput {
  productId: string;
  channelTypes: ChannelType[];
  name: string;
  description: string;
  templateId?: string;
}

export type JourneyTemplateTrack = 'primeiros-passos' | 'integracoes' | 'canais' | 'negocio' | 'arquitetura';

export interface JourneyTemplate {
  templateId: string;
  name: string;
  description: string;
  track: JourneyTemplateTrack;
  area: string | null;
  channelTypes: ChannelType[];
  highlights: string[];
  // Derivadas do próprio fluxo pelo back (o que o exemplo usa de verdade).
  capabilities: string[];
  // Partes que dependem do ambiente e vêm em branco de propósito — o autor escolhe no editor.
  pendingSetup: string[];
  preview: {
    nodes: {
      nodeId: string;
      nodeType: BackendNodeType;
      name: string;
      positionX: number;
      positionY: number;
      connectorType: BackendConnectorType | null;
    }[];
    connections: { connectionId: string; sourceNodeId: string; targetNodeId: string; condition: string | null; isDefault: boolean }[];
  };
}

export interface JourneyUpdateInput {
  name: string;
  description: string;
}

export function listJourneys(
  params: { productId?: string; channelType?: ChannelType; q?: string; status?: JourneyStatus; sort?: JourneySort } = {},
): Promise<Journey[]> {
  const query = new URLSearchParams();
  if (params.productId) query.set('productId', params.productId);
  if (params.channelType) query.set('channelType', params.channelType);
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiGet<Journey[]>(`/journeys${qs ? `?${qs}` : ''}`);
}

export function createJourney(input: JourneyCreateInput): Promise<Journey> {
  return apiPost<Journey>('/journeys', input);
}

export function listJourneyTemplates(): Promise<JourneyTemplate[]> {
  return apiGet<JourneyTemplate[]>('/journey-templates');
}

export function updateJourney(journeyId: string, input: JourneyUpdateInput): Promise<Journey> {
  return apiPut<Journey>(`/journeys/${journeyId}`, input);
}

export function updateJourneyChannels(journeyId: string, channelTypes: ChannelType[]): Promise<Journey> {
  return apiPut<Journey>(`/journeys/${journeyId}/channels`, { channelTypes });
}

export function deleteJourney(journeyId: string): Promise<void> {
  return apiDelete<void>(`/journeys/${journeyId}`);
}

export function unpublishJourney(journeyId: string): Promise<Journey> {
  return apiPost<Journey>(`/journeys/${journeyId}/unpublish`);
}

// Raw JSON sent to the runtime's publication API (REQ-02.10.001) — shape mirrors the backend's
// PublicationSnapshotRecord; kept loose here since this is a read-only inspection view.
export function getJourneyPublication(journeyId: string): Promise<unknown> {
  return apiGet<unknown>(`/journeys/${journeyId}/publication`);
}
