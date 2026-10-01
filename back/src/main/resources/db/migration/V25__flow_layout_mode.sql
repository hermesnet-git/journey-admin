-- Modo de exibição do canvas (circle | compact | detailed) em que as posições dos nós foram
-- organizadas. Cada modo tem um espaçamento próprio: aberto num modo diferente, o editor reorganiza
-- na hora para o modo de quem está vendo. NULL = organizado antes desta coluna existir.
ALTER TABLE flow ADD COLUMN layout_mode VARCHAR(20);
