-- Registro de cada consulta a uma fonte de dados de referência feita ao montar uma tela (ADR-002).
-- A busca acontece fora do motor, então não aparece no histórico da instância — é daqui que o
-- Diagnóstico mostra "consulta da tela" (fonte, duração, status, quantidade de itens).
CREATE TABLE data_source_call (
    call_id UUID PRIMARY KEY,
    process_instance_id VARCHAR(64),
    journey_id UUID NOT NULL,
    journey_version INTEGER NOT NULL,
    node_id VARCHAR(200) NOT NULL,
    alias VARCHAR(150) NOT NULL,
    source_name VARCHAR(150) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'TIMEOUT')),
    http_status INTEGER,
    duration_ms BIGINT NOT NULL,
    item_count INTEGER,
    error_message VARCHAR(1000),
    called_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_source_call_instance ON data_source_call (process_instance_id, called_at);
