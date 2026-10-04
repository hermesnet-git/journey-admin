import { apiDelete, apiGet, apiPut } from './client';

export type AiProvider = 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'GITHUB_MODELS';

export interface AiProviderInfo {
  id: AiProvider;
  label: string;
  keyLabel: string;
  // Modelo usado quando a credencial não informa um; no Gemini o padrão vem da configuração do servidor.
  defaultModel: string | null;
}

// Gemini é o padrão: vale sempre que nenhum outro provedor estiver marcado como ativo.
export const AI_PROVIDERS: AiProviderInfo[] = [
  { id: 'GEMINI', label: 'Gemini', keyLabel: 'Chave de API do Gemini', defaultModel: null },
  { id: 'ANTHROPIC', label: 'Claude (Anthropic)', keyLabel: 'Chave de API da Anthropic', defaultModel: 'claude-sonnet-5-5' },
  { id: 'OPENAI', label: 'OpenAI', keyLabel: 'Chave de API da OpenAI', defaultModel: 'gpt-4.1' },
  { id: 'GITHUB_MODELS', label: 'GitHub Models', keyLabel: 'Token do GitHub (permissão models:read)', defaultModel: 'openai/gpt-4.1' },
];

export interface AiCredentialStatus {
  configured: boolean;
  model: string | null;
  active: boolean;
  updatedAt: string | null;
}

export interface AiCredentialInput {
  // Em branco mantém a chave já salva (só é obrigatória na primeira configuração do provedor).
  apiKey: string;
  model: string;
  active: boolean;
}

export function getAiCredentialStatus(provider: AiProvider): Promise<AiCredentialStatus> {
  return apiGet<AiCredentialStatus>(`/ai-credentials/${provider}`);
}

export function saveAiCredential(provider: AiProvider, input: AiCredentialInput): Promise<AiCredentialStatus> {
  return apiPut<AiCredentialStatus>(`/ai-credentials/${provider}`, input);
}

export function deleteAiCredential(provider: AiProvider): Promise<void> {
  return apiDelete<void>(`/ai-credentials/${provider}`);
}
