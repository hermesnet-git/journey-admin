import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type JourneyStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'INACTIVE';
export type JourneySort = 'CREATED_AT' | 'UPDATED_AT';

export interface Journey {
  journeyId: string;
  channelId: string;
  channelName: string;
  productId: string;
  productName: string;
  name: string;
  description: string | null;
  status: JourneyStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyCreateInput {
  channelId: string;
  name: string;
  description: string;
}

export interface JourneyUpdateInput {
  name: string;
  description: string;
}

export function listJourneys(
  params: { productId?: string; channelId?: string; q?: string; status?: JourneyStatus; sort?: JourneySort } = {},
): Promise<Journey[]> {
  const query = new URLSearchParams();
  if (params.productId) query.set('productId', params.productId);
  if (params.channelId) query.set('channelId', params.channelId);
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiGet<Journey[]>(`/journeys${qs ? `?${qs}` : ''}`);
}

export function createJourney(input: JourneyCreateInput): Promise<Journey> {
  return apiPost<Journey>('/journeys', input);
}

export function updateJourney(journeyId: string, input: JourneyUpdateInput): Promise<Journey> {
  return apiPut<Journey>(`/journeys/${journeyId}`, input);
}

export function deactivateJourney(journeyId: string): Promise<void> {
  return apiPost<void>(`/journeys/${journeyId}/deactivate`);
}

export function activateJourney(journeyId: string): Promise<void> {
  return apiPost<void>(`/journeys/${journeyId}/activate`);
}

export function deleteJourney(journeyId: string): Promise<void> {
  return apiDelete<void>(`/journeys/${journeyId}`);
}

export function publishJourney(journeyId: string): Promise<Journey> {
  return apiPost<Journey>(`/journeys/${journeyId}/publish`);
}

export function unpublishJourney(journeyId: string): Promise<Journey> {
  return apiPost<Journey>(`/journeys/${journeyId}/unpublish`);
}
