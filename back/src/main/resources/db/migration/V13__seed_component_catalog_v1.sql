-- Seed dos 19 componentes do catálogo SDUI corporativo v1 (seções 5, 7 e 12). Status EXPERIMENTAL
-- e só react.web como SUPPORTED: reflete o estado real do repositório hoje (único renderer
-- implementado é o React Web/Mística do admin/front) — regra de compatibilidade 1 do catálogo diz
-- que um componente só vira STABLE quando homologado nos 4 alvos, não antes. react.mobile/
-- flutter.web/flutter.mobile entram como PLANNED até existir adapter de verdade em algum canal.
-- Editável depois via tela "Catálogo de Componentes" (Component Registry) — este seed é só o ponto
-- de partida.

-- Nível 0 — Primitivos visuais (categoria CONTENT)
INSERT INTO component_definition (component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets)
VALUES
('cd000000-0000-0000-0000-000000000001', 'ui.text', '1.0', 'EXPERIMENTAL', 0, 'CONTENT', false, '[]',
 '[{"name":"text","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"variant","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"colorToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},
   {"name":"align","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"maxLines","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000002', 'ui.image', '1.0', 'EXPERIMENTAL', 0, 'CONTENT', false, '[]',
 '[{"name":"source","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"alt","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"fit","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"aspectRatio","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000003', 'ui.icon', '1.0', 'EXPERIMENTAL', 0, 'CONTENT', false, '[]',
 '[{"name":"name","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"sizeToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"size","enumValues":null},
   {"name":"colorToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},
   {"name":"accessibilityLabel","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000004', 'ui.divider', '1.0', 'EXPERIMENTAL', 0, 'CONTENT', false, '[]',
 '[{"name":"orientation","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"colorToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},
   {"name":"spacingToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"spacing","enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000005', 'ui.spacer', '1.0', 'EXPERIMENTAL', 0, 'CONTENT', false, '[]',
 '[{"name":"sizeToken","kind":"TOKEN","required":true,"defaultValue":null,"tokenGroup":"spacing","enumValues":null},
   {"name":"axis","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}');

-- Nível 1 — Layout e composição (categoria LAYOUT, allows_children = true)
INSERT INTO component_definition (component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets)
VALUES
('cd000000-0000-0000-0000-000000000006', 'ui.screen', '1.0', 'EXPERIMENTAL', 1, 'LAYOUT', true, '[]',
 '[{"name":"title","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"backgroundToken","kind":"TOKEN","required":false,"defaultValue":"color.background.primary","tokenGroup":"color","enumValues":null},
   {"name":"scrollable","kind":"BOOLEAN","required":false,"defaultValue":true,"tokenGroup":null,"enumValues":null},
   {"name":"paddingToken","kind":"TOKEN","required":false,"defaultValue":"spacing.md","tokenGroup":"spacing","enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000007', 'ui.container', '1.0', 'EXPERIMENTAL', 1, 'LAYOUT', true, '[]',
 '[{"name":"paddingToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"spacing","enumValues":null},
   {"name":"marginToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"spacing","enumValues":null},
   {"name":"backgroundToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},
   {"name":"borderToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"color","enumValues":null},
   {"name":"maxWidthToken","kind":"TOKEN","required":false,"defaultValue":null,"tokenGroup":"layout","enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000008', 'ui.stack', '1.0', 'EXPERIMENTAL', 1, 'LAYOUT', true, '[]',
 '[{"name":"direction","kind":"ENUM","required":true,"defaultValue":"vertical","tokenGroup":null,"enumValues":["vertical","horizontal","responsive"]},
   {"name":"gapToken","kind":"TOKEN","required":false,"defaultValue":"spacing.md","tokenGroup":"spacing","enumValues":null},
   {"name":"align","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"justify","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"wrap","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000009', 'ui.card', '1.0', 'EXPERIMENTAL', 1, 'LAYOUT', true, '[]',
 '[{"name":"variant","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"paddingToken","kind":"TOKEN","required":false,"defaultValue":"spacing.md","tokenGroup":"spacing","enumValues":null},
   {"name":"elevationToken","kind":"TOKEN","required":false,"defaultValue":"elevation.low","tokenGroup":"elevation","enumValues":null},
   {"name":"interactive","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onPress"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}');

-- Nível 2 — Entrada de dados (categoria INPUT)
INSERT INTO component_definition (component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets)
VALUES
('cd000000-0000-0000-0000-000000000010', 'ui.textInput', '1.0', 'EXPERIMENTAL', 2, 'INPUT', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"placeholder","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"inputMode","kind":"ENUM","required":false,"defaultValue":"text","tokenGroup":null,"enumValues":["text","email","tel","number","decimal","url"]},
   {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"readOnly","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"maxLength","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"validation","kind":"VALIDATION_LIST","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '["onChange","onBlur"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000011', 'ui.textArea', '1.0', 'EXPERIMENTAL', 2, 'INPUT', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"placeholder","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"minLines","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"maxLines","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"maxLength","kind":"NUMBER","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"validation","kind":"VALIDATION_LIST","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '["onChange","onBlur"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000012', 'ui.select', '1.0', 'EXPERIMENTAL', 2, 'INPUT', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"placeholder","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"options","kind":"OPTIONS_LIST","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"searchable","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onChange"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000013', 'ui.checkbox', '1.0', 'EXPERIMENTAL', 2, 'INPUT', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"indeterminate","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onChange"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000014', 'ui.datePicker', '1.0', 'EXPERIMENTAL', 2, 'INPUT', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"mode","kind":"ENUM","required":false,"defaultValue":"date","tokenGroup":null,"enumValues":["date","time","dateTime"]},
   {"name":"minDate","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"maxDate","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"format","kind":"TEXT","required":false,"defaultValue":"locale","tokenGroup":null,"enumValues":null},
   {"name":"required","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onChange"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}');

-- Nível 3 — Ação (categoria ACTION)
INSERT INTO component_definition (component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets)
VALUES
('cd000000-0000-0000-0000-000000000015', 'ui.button', '1.0', 'EXPERIMENTAL', 3, 'ACTION', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"variant","kind":"TEXT","required":false,"defaultValue":"primary","tokenGroup":null,"enumValues":null},
   {"name":"size","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"fullWidth","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"loading","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"disabled","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onPress"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000016', 'ui.link', '1.0', 'EXPERIMENTAL', 3, 'ACTION', false, '[]',
 '[{"name":"label","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"emphasis","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"external","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null},
   {"name":"accessibilityLabel","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null}]',
 '["onPress"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}');

-- Nível 3 — Feedback (categoria FEEDBACK)
INSERT INTO component_definition (component_definition_id, type, version, status, level, category, allows_children,
    allowed_child_types, props_schema, events, supported_targets)
VALUES
('cd000000-0000-0000-0000-000000000017', 'ui.alert', '1.0', 'EXPERIMENTAL', 3, 'FEEDBACK', false, '[]',
 '[{"name":"severity","kind":"TEXT","required":false,"defaultValue":"informative","tokenGroup":null,"enumValues":null},
   {"name":"title","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"message","kind":"TEXT","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"dismissible","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '["onDismiss"]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000018', 'ui.progress', '1.0', 'EXPERIMENTAL', 3, 'FEEDBACK', false, '[]',
 '[{"name":"value","kind":"NUMBER","required":true,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"label","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"showValue","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}'),

('cd000000-0000-0000-0000-000000000019', 'ui.loading', '1.0', 'EXPERIMENTAL', 3, 'FEEDBACK', false, '[]',
 '[{"name":"label","kind":"TEXT","required":false,"defaultValue":null,"tokenGroup":null,"enumValues":null},
   {"name":"sizeToken","kind":"TOKEN","required":false,"defaultValue":"size.icon.md","tokenGroup":"size","enumValues":null},
   {"name":"overlay","kind":"BOOLEAN","required":false,"defaultValue":false,"tokenGroup":null,"enumValues":null}]',
 '[]',
 '{"react.web":{"status":"SUPPORTED","minRendererVersion":"1.0.0"},"react.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.web":{"status":"PLANNED","minRendererVersion":"1.0.0"},"flutter.mobile":{"status":"PLANNED","minRendererVersion":"1.0.0"}}');
