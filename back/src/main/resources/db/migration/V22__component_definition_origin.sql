-- Diferencia a massa oficial do catálogo dos componentes criados pelos usuários da instalação.
ALTER TABLE component_definition
    ADD COLUMN origin VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    ADD CONSTRAINT ck_component_definition_origin CHECK (origin IN ('SYSTEM', 'CUSTOM'));

UPDATE component_definition
SET origin = 'SYSTEM'
WHERE version IN ('1.0', '1.0.0')
  AND type IN (
      'ui.screen', 'ui.container', 'ui.stack', 'ui.card',
      'ui.text', 'ui.image', 'ui.icon', 'ui.divider', 'ui.spacer',
      'ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker',
      'ui.button', 'ui.link', 'ui.alert', 'ui.progress', 'ui.loading'
  );

-- A versão canônica é a massa estável instalada de fábrica; a versão 1.0 permanece removida como histórico.
UPDATE component_definition
SET status = 'STABLE', updated_at = now()
WHERE origin = 'SYSTEM' AND version = '1.0.0';

CREATE INDEX idx_component_definition_origin ON component_definition(origin);
