import { apiDelete, apiGet, apiPut } from './client';

export type AiProvider = 'GEMINI';

export interface AiCredentialStatus {
  configured: boolean;
  updatedAt: string | null;
}

export function getAiCredentialStatus(provider: AiProvider): Promise<AiCredentialStatus> {
  return apiGet<AiCredentialStatus>(`/ai-credentials/${provider}`);
}

export function saveAiCredential(provider: AiProvider, apiKey: string): Promise<AiCredentialStatus> {
  return apiPut<AiCredentialStatus>(`/ai-credentials/${provider}`, { apiKey });
}

export function deleteAiCredential(provider: AiProvider): Promise<void> {
  return apiDelete<void>(`/ai-credentials/${provider}`);
}
