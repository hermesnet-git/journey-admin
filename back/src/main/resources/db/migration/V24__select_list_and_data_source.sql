-- Lista de seleção (ui.selectList) e catálogo de fontes de dados de referência (ADR-002).
--
-- ui.selectList: o usuário escolhe um item de uma lista vinda de uma variável do tipo lista
-- ($bindings.items → data.x) e, opcionalmente, uma ação sobre o item escolhido. Os itens chegam ao
-- canal já montados pelo ms-espec-registry — itemTitle/itemDescription/itemHint (ITEM_TEMPLATE,
-- aceitam {{item.campo}}) e a regra "liberada quando" de cada ação (ACTION_LIST) nunca saem do
-- servidor. Tocar numa ação dispara onAction (action.submit), gravando item e ação nos vínculos
-- value e action. Versão 1.0.0, como todo o catálogo por enquanto.
INSERT INTO component_definition (component_definition_id, type, version, status, level, category,
    allows_children, allowed_child_types, props_schema, events, supported_targets, created_at, updated_at,
    allowed_reserved_fields, origin)
VALUES ('5c1e2f7a-4b8d-4c3e-9a61-7d2b0e4f8a13', 'ui.selectList', '1.0.0', 'STABLE', 2, 'INPUT', false, '[]',
    '[
      {"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"itemValue","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"itemTitle","kind":"ITEM_TEMPLATE","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"itemDescription","kind":"ITEM_TEMPLATE","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"itemHint","kind":"ITEM_TEMPLATE","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"emptyMessage","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"maxItems","kind":"NUMBER","required":false,"defaultValue":50,"tokenGroup":null,"enumValues":null},
      {"name":"actions","kind":"ACTION_LIST","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
      {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":true,"tokenGroup":null,"enumValues":null}
    ]'::jsonb,
    '["onAction"]'::jsonb,
    '{"whatsapp": {"status": "SUPPORTED", "minRendererVersion": "1.0.0"}, "react.web": {"status": "SUPPORTED", "minRendererVersion": "1.0.0"}, "flutter.web": {"status": "SUPPORTED", "minRendererVersion": "1.0.0"}, "react.mobile": {"status": "SUPPORTED", "minRendererVersion": "1.0.0"}, "flutter.mobile": {"status": "SUPPORTED", "minRendererVersion": "1.0.0"}}'::jsonb,
    now(), now(), '["$bindings", "$events", "$visibility", "$active"]'::jsonb, 'SYSTEM')
ON CONFLICT DO NOTHING;

-- Fonte de dados de referência (FT-14): consulta REST GET que uma tela declara em dataSources e o
-- ms-espec-registry executa ao montar a tela. Parâmetros = marcadores {nome} da URL.
CREATE TABLE data_source (
    data_source_id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500),
    url VARCHAR(500) NOT NULL,
    timeout_ms INTEGER NOT NULL CHECK (timeout_ms BETWEEN 100 AND 30000),
    items_path VARCHAR(200) NOT NULL,
    exposed_fields JSONB NOT NULL,
    credential_ref VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
