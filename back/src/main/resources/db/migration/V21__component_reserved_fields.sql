-- Capacidades de autoria do componente. Este metadado orienta o Form Builder e não integra a UI Spec publicada.
ALTER TABLE component_definition
    ADD COLUMN allowed_reserved_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE component_definition
SET allowed_reserved_fields = CASE
    WHEN type IN ('ui.container', 'ui.stack', 'ui.card')
        THEN '["$visibility","$active"]'::jsonb
    WHEN type IN ('ui.text', 'ui.image', 'ui.progress')
        THEN '["$bindings","$visibility"]'::jsonb
    WHEN type IN ('ui.icon', 'ui.divider', 'ui.spacer', 'ui.loading')
        THEN '["$visibility"]'::jsonb
    WHEN type IN ('ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker')
        THEN '["$bindings","$visibility","$active"]'::jsonb
    WHEN type IN ('ui.button', 'ui.link')
        THEN '["$events","$visibility","$active"]'::jsonb
    WHEN type = 'ui.alert'
        THEN '["$bindings","$events","$visibility","$active"]'::jsonb
    ELSE '[]'::jsonb
END,
updated_at = now();
