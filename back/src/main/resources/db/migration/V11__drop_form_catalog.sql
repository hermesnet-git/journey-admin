-- Remove o catálogo de Formulários reutilizáveis (FT-04): a tela de uma User Task (embeddedScreen,
-- coluna JSONB de flow_node) já vive independente desde o desacoplamento formId/embeddedScreen
-- (2026-08-24) — este catálogo virou só um atalho de "importar campos"/"salvar como reutilizável"
-- no editor, removido junto com a tela de Formulários do portal admin.
DROP TABLE IF EXISTS form;
