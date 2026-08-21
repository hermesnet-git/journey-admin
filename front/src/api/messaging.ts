import { apiGet, apiPost, apiPut } from './client';
import type { Status } from './products';

export type ClusterType = 'KAFKA' | 'EVENT_HUBS' | 'SERVICE_BUS';

export interface MessagingCluster {
  clusterId: string;
  name: string;
  type: ClusterType;
  connectionAddress: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterInput {
  name: string;
  type: ClusterType;
  connectionAddress: string;
}

export interface CredentialReference {
  credentialId: string;
  referenceName: string;
  clusterId: string;
  keyVaultUri: string;
  secretName: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialInput {
  referenceName: string;
  clusterId: string;
  keyVaultUri: string;
  secretName: string;
}

export function listClusters(params: { q?: string; type?: ClusterType; status?: Status } = {}): Promise<MessagingCluster[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<MessagingCluster[]>(`/messaging-clusters${qs ? `?${qs}` : ''}`);
}

export function createCluster(input: ClusterInput): Promise<MessagingCluster> {
  return apiPost<MessagingCluster>('/messaging-clusters', input);
}

export function updateCluster(clusterId: string, input: ClusterInput): Promise<MessagingCluster> {
  return apiPut<MessagingCluster>(`/messaging-clusters/${clusterId}`, input);
}

export function deactivateCluster(clusterId: string): Promise<void> {
  return apiPost<void>(`/messaging-clusters/${clusterId}/deactivate`);
}

export function activateCluster(clusterId: string): Promise<void> {
  return apiPost<void>(`/messaging-clusters/${clusterId}/activate`);
}

export function listCredentials(
  params: { q?: string; clusterId?: string; status?: Status } = {},
): Promise<CredentialReference[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.clusterId) query.set('clusterId', params.clusterId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<CredentialReference[]>(`/credential-references${qs ? `?${qs}` : ''}`);
}

export function createCredential(input: CredentialInput): Promise<CredentialReference> {
  return apiPost<CredentialReference>('/credential-references', input);
}

export function updateCredential(credentialId: string, input: CredentialInput): Promise<CredentialReference> {
  return apiPut<CredentialReference>(`/credential-references/${credentialId}`, input);
}

export function deactivateCredential(credentialId: string): Promise<void> {
  return apiPost<void>(`/credential-references/${credentialId}/deactivate`);
}

export function activateCredential(credentialId: string): Promise<void> {
  return apiPost<void>(`/credential-references/${credentialId}/activate`);
}

export interface ConnectionTestResponse {
  ok: boolean;
  message: string;
}

// REQ-14.04: só valida conectividade/credencial — nunca publica ou consome uma mensagem real.
export function testCredentialConnection(credentialId: string): Promise<ConnectionTestResponse> {
  return apiPost<ConnectionTestResponse>(`/credential-references/${credentialId}/connection-test`);
}
