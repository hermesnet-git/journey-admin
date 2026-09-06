-- V12 criou "level" como SMALLINT, mas ComponentDefinitionJpaEntity.level é um int Java simples —
-- Hibernate mapeia isso pra INTEGER por padrão, não SMALLINT, e a validação de schema no boot
-- rejeita a diferença. Corrige aqui em vez de editar V12 (já aplicada, checksum travado).
ALTER TABLE component_definition ALTER COLUMN level TYPE INTEGER;
