-- Alinha os nomes funcionais do contrato aos enums usados internamente pelo Form Builder.
UPDATE component_definition
SET props_schema = replace(
        replace(props_schema::text, '"kind": "STRING"', '"kind": "TEXT"'),
        '"kind": "OBJECT"', '"kind": "VALIDATION_LIST"'
    )::jsonb,
    updated_at = now()
WHERE version = '1.0.0'
  AND type IN ('ui.card', 'ui.datePicker');
