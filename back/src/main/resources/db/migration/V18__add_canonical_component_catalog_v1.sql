-- Cria a versão canônica do catálogo sem reescrever definições já auditadas.
INSERT INTO component_definition (
    component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets, created_at, updated_at)
SELECT
    gen_random_uuid(), type, '1.0.0', status, level, category, allows_children,
    allowed_child_types,
    CASE type
      WHEN 'ui.stack' THEN '[{"name":"direction","kind":"ENUM","required":false,"defaultValue":"vertical","tokenGroup":null,"enumValues":["vertical","horizontal"]},{"name":"spacingToken","kind":"TOKEN","required":false,"defaultValue":"spacing.md","tokenGroup":"spacing","enumValues":null},{"name":"alignment","kind":"ENUM","required":false,"defaultValue":"stretch","tokenGroup":null,"enumValues":["start","center","end","stretch"]}]'::jsonb
      WHEN 'ui.container' THEN '[{"name":"backgroundToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},{"name":"paddingToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"spacing","enumValues":null},{"name":"borderRadiusToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"radius","enumValues":null}]'::jsonb
      ELSE props_schema
    END,
    CASE WHEN type IN ('ui.card','ui.textInput','ui.textArea','ui.select','ui.checkbox','ui.datePicker')
         THEN '[]'::jsonb ELSE events END,
    '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"whatsapp":{"status":"SUPPORTED","minRendererVersion":"1.0.0"}}'::jsonb,
    now(), now()
FROM component_definition source
WHERE source.version = '1.0'
  AND NOT EXISTS (
      SELECT 1 FROM component_definition current_version
      WHERE current_version.type = source.type AND current_version.version = '1.0.0'
  );

UPDATE component_definition
SET props_schema = jsonb_set(props_schema, '{0,required}', 'true'::jsonb)
WHERE type = 'ui.alert' AND version = '1.0.0';

UPDATE component_definition
SET props_schema = jsonb_set(props_schema, '{1,required}', 'true'::jsonb)
WHERE type = 'ui.datePicker' AND version = '1.0.0';
