-- Chave de API de um provedor de IA (FT-03 "gerar fluxo por prompt"), configurada pela tela de
-- Integrações em vez de application-local.yml. Em texto plano por enquanto (TODO(segurança): ver
-- javadoc de AiProviderCredential) — decisão explícita, pendente de criptografia antes de produção.
CREATE TABLE ai_provider_credential (
    credential_id UUID PRIMARY KEY,
    provider VARCHAR(30) NOT NULL UNIQUE CHECK (provider IN ('GEMINI')),
    api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
