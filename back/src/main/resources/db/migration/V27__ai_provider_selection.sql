-- Geração de fluxo por IA com mais de um provedor: Gemini segue como padrão (V6), e Claude, OpenAI e
-- GitHub Models passam a poder ter a própria chave. Cada linha guarda também o modelo escolhido e se
-- é o provedor ativo; no máximo um ativo por vez, e sem nenhum ativo vale o Gemini.
ALTER TABLE ai_provider_credential DROP CONSTRAINT IF EXISTS ai_provider_credential_provider_check;
ALTER TABLE ai_provider_credential
    ADD CONSTRAINT ai_provider_credential_provider_check
    CHECK (provider IN ('GEMINI', 'ANTHROPIC', 'OPENAI', 'GITHUB_MODELS'));
ALTER TABLE ai_provider_credential ADD COLUMN model VARCHAR(100);
ALTER TABLE ai_provider_credential ADD COLUMN active BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX uq_ai_provider_credential_active ON ai_provider_credential (active) WHERE active;
