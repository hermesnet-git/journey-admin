import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type ClusterType = 'KAFKA' | 'EVENT_HUBS' | 'SERVICE_BUS';

export interface MessagingCluster {
  clusterId: string;
  name: string;
  type: ClusterType;
  connectionAddress: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CredentialInput {
  referenceName: string;
  clusterId: string;
  keyVaultUri: string;
  secretName: string;
}

export function listClusters(params: { q?: string; type?: ClusterType } = {}): Promise<MessagingCluster[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  const qs = query.toString();
  return apiGet<MessagingCluster[]>(`/messaging-clusters${qs ? `?${qs}` : ''}`);
}

export function createCluster(input: ClusterInput): Promise<MessagingCluster> {
  return apiPost<MessagingCluster>('/messaging-clusters', input);
}

export function updateCluster(clusterId: string, input: ClusterInput): Promise<MessagingCluster> {
  return apiPut<MessagingCluster>(`/messaging-clusters/${clusterId}`, input);
}

export function deleteCluster(clusterId: string): Promise<void> {
  return apiDelete<void>(`/messaging-clusters/${clusterId}`);
}

export interface TopicListingResponse {
  ok: boolean;
  message: string | null;
  topics: string[];
}

// Sugestão pro seletor de tópico do editor de fluxo — sempre volta 200 (ok:false + mensagem em vez
// de erro HTTP quando o broker está inacessível), pra nunca bloquear o campo de texto livre.
export function listClusterTopics(clusterId: string, credentialReferenceName?: string | null): Promise<TopicListingResponse> {
  const qs = credentialReferenceName ? `?credentialReferenceName=${encodeURIComponent(credentialReferenceName)}` : '';
  return apiGet<TopicListingResponse>(`/messaging-clusters/${clusterId}/topics${qs}`);
}

export function listCredentials(params: { q?: string; clusterId?: string } = {}): Promise<CredentialReference[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.clusterId) query.set('clusterId', params.clusterId);
  const qs = query.toString();
  return apiGet<CredentialReference[]>(`/credential-references${qs ? `?${qs}` : ''}`);
}

export function createCredential(input: CredentialInput): Promise<CredentialReference> {
  return apiPost<CredentialReference>('/credential-references', input);
}

export function updateCredential(credentialId: string, input: CredentialInput): Promise<CredentialReference> {
  return apiPut<CredentialReference>(`/credential-references/${credentialId}`, input);
}

export function deleteCredential(credentialId: string): Promise<void> {
  return apiDelete<void>(`/credential-references/${credentialId}`);
}

export interface ConnectionTestResponse {
  ok: boolean;
  message: string;
}

// REQ-14.04: só valida conectividade/credencial — nunca publica ou consome uma mensagem real.
export function testCredentialConnection(credentialId: string): Promise<ConnectionTestResponse> {
  return apiPost<ConnectionTestResponse>(`/credential-references/${credentialId}/connection-test`);
}
