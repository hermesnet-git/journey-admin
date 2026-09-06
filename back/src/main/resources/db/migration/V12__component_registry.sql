-- Component Registry (seção 12 do catálogo SDUI corporativo v1) — fonte de verdade operacional do
-- que o Form Builder pode produzir e o que cada alvo de renderização consegue exibir. Substitui o
-- antigo enum hardcoded FormFieldType (24 valores, domain/form, removido nesta mesma rodada).
CREATE TABLE component_definition (
    component_definition_id UUID PRIMARY KEY,
    type VARCHAR(60) NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('EXPERIMENTAL', 'STABLE', 'DEPRECATED', 'REMOVED')),
    level SMALLINT NOT NULL CHECK (level BETWEEN 0 AND 4),
    category VARCHAR(20) NOT NULL CHECK (category IN ('CONTENT', 'LAYOUT', 'INPUT', 'ACTION', 'FEEDBACK')),
    allows_children BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_child_types JSONB NOT NULL DEFAULT '[]',
    props_schema JSONB NOT NULL DEFAULT '[]',
    events JSONB NOT NULL DEFAULT '[]',
    supported_targets JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_component_definition_type_version UNIQUE (type, version)
);

CREATE INDEX idx_component_definition_status ON component_definition(status);
CREATE INDEX idx_component_definition_category ON component_definition(category);
