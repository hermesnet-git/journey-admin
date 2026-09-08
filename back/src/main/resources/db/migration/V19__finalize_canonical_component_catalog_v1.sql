-- Retira da autoria a versão antiga e completa os contratos normativos da versão canônica.
UPDATE component_definition
SET status = 'REMOVED', updated_at = now()
WHERE version = '1.0';

UPDATE component_definition
SET props_schema = '[{"name":"variant","kind":"ENUM","required":false,"defaultValue":"default","tokenGroup":null,"enumValues":["default","highlighted"]},{"name":"paddingToken","kind":"TOKEN","required":false,"defaultValue":"spacing.md","tokenGroup":"spacing","enumValues":null},{"name":"elevationToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"elevation","enumValues":null}]'::jsonb,
    updated_at = now()
WHERE type = 'ui.card' AND version = '1.0.0';

UPDATE component_definition
SET props_schema = '[{"name":"label","kind":"STRING","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},{"name":"mode","kind":"ENUM","required":true,"defaultValue":"date","tokenGroup":null,"enumValues":["date","time","datetime"]},{"name":"placeholder","kind":"STRING","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},{"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},{"name":"validation","kind":"OBJECT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]'::jsonb,
    updated_at = now()
WHERE type = 'ui.datePicker' AND version = '1.0.0';
