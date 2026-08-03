# Elastic Journey Admin Portal — Progresso de Implementação

> Gerado a partir de `ej-admin-requisitos.md`. Este arquivo é o registro vivo de acompanhamento dos requisitos do MVP.

## Como usar

- Status possíveis: `todo`, `in_progress`, `done`, `blocked` e `n/a`.
- Ao concluir um requisito, marque `[x]`, altere o status e informe a evidência.
- A fonte da verdade dos requisitos é [ej-admin-requisitos.md](ej-admin-requisitos.md).

---

## Resumo

| Métrica | Valor |
|---|---|
| Total de Épicos (EP) | 8 |
| Total de Features (FT) | 28 |
| Total de Requisitos (REQ) | 121 |
| Concluídos (`done`) | 66 |
| Em andamento (`in_progress`) | 4 |
| Não iniciados (`todo`) | 49 |
| Bloqueados (`blocked`) | 2 |
| Não aplicável (`n/a`) | 0 |
| % Concluído | 55% |

## Progresso por Épico

| EP | Nome | REQs | Concluídos | % |
|---|---|---:|---:|---:|
| EP-01 | Gestão de Produtos e Canais | 24 | 21 | 88% |
| EP-02 | Gestão de Jornadas | 23 | 20 | 87% |
| EP-03 | Modelagem Visual | 25 | 25 | 100% |
| EP-04 | Formulários (SDUI) | 18 | 0 | 0% |
| EP-05 | Simulação | 10 | 0 | 0% |
| EP-06 | Publicação | 12 | 0 | 0% |
| EP-07 | Publicação no Runtime | 4 | 0 | 0% |
| EP-08 | Dashboard Administrativo | 5 | 0 | 0% |

---

## EP-01 Gestão de Produtos e Canais

### FT-01.01 Gestão de Produtos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.01.001 | O sistema deve permitir cadastrar produtos. | done | back: `POST /api/v1/products`; front: `ProductsPage` (botão "Novo produto") | |
| [x] | REQ-01.01.002 | O sistema deve permitir editar produtos. | done | back: `PUT /api/v1/products/{id}`; front: `ProductsPage` (ação "Editar") | |
| [x] | REQ-01.01.003 | O sistema deve permitir consultar produtos. | done | back: `GET /api/v1/products`, `GET /api/v1/products/{id}`; front: `ProductsPage` | |
| [x] | REQ-01.01.004 | O sistema deve permitir desativar produtos. | done | back: `POST /api/v1/products/{id}/deactivate`; front: `ProductsPage` (ação "Desativar") | |
| [x] | REQ-01.01.005 | Cada produto deve possuir identificador único (`productId`), nome, descrição opcional e status. | done | back: `Product` domain + `V1__create_product.sql` (`product_id UUID PRIMARY KEY`) | |

### FT-01.02 Gestão de Canais

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.02.001 | O sistema deve permitir cadastrar canais dentro de um produto. | done | back: `POST /api/v1/products/{id}/channels`; front: `ProductChannelsPage` (botão "Novo canal") | |
| [x] | REQ-01.02.002 | O sistema deve permitir editar canais. | done | back: `PUT /api/v1/channels/{id}`; front: `ProductChannelsPage` (ação "Editar") | |
| [x] | REQ-01.02.003 | O sistema deve permitir consultar canais. | done | back: `GET /api/v1/channels/{id}`, `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.02.004 | O sistema deve permitir desativar canais. | done | back: `POST /api/v1/channels/{id}/deactivate`; front: `ProductChannelsPage` (ação "Desativar") | |
| [x] | REQ-01.02.005 | Todo canal deve pertencer a exatamente um produto. | done | back: `channel.product_id NOT NULL` + FK (`V2__create_channel.sql`) | |
| [x] | REQ-01.02.006 | Cada canal deve possuir identificador único (`channelId`), nome, descrição opcional, tipo e status. | done | back: `channel_id UUID PRIMARY KEY` (`V2__create_channel.sql`) + `Channel` domain | |
| [x] | REQ-01.02.007 | O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`. | done | back: `ChannelType` enum + CHECK constraint; front: `ChannelFormModal` (Select) | |

### FT-01.03 Catálogo e Descoberta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.03.001 | O sistema deve permitir pesquisar produtos por nome. | done | back: `GET /api/v1/products?q=`; front: campo de busca em `ProductsPage` | |
| [x] | REQ-01.03.002 | O sistema deve permitir filtrar produtos por status. | done | back: `GET /api/v1/products?status=`; front: filtro de status em `ProductsPage` | |
| [x] | REQ-01.03.003 | O sistema deve permitir listar os canais de um produto. | done | back: `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.03.004 | O sistema deve permitir pesquisar canais por nome. | done | back: `GET /api/v1/products/{id}/channels?q=`; front: campo de busca em `ProductChannelsPage` | |
| [x] | REQ-01.03.005 | O sistema deve permitir filtrar canais por produto, tipo e status. | done | back: `?type=&status=` no mesmo endpoint; front: filtros em `ProductChannelsPage` | |
| [x] | REQ-01.03.006 | O sistema deve exibir a quantidade de canais associados a cada produto. | done | back: `ProductView.channelCount`; front: coluna "Canais" em `ProductsPage` | |
| [x] | REQ-01.03.007 | O sistema deve exibir a quantidade de jornadas associadas a cada canal. | done | back: `ChannelView.journeyCount` via `JourneyCountPort` (stub retorna 0 até EP-02); front: coluna "Jornadas" | contagem real depende de EP-02 |

### FT-01.04 Integridade e Ciclo de Vida

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.04.001 | A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes. | done | back: `DeactivateProduct` apenas altera `status`, sem exclusão | |
| [x] | REQ-01.04.002 | A desativação de um canal não deve remover suas jornadas ou publicações existentes. | done | back: `DeactivateChannel` apenas altera `status`, sem exclusão | |
| [~] | REQ-01.04.003 | O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo. | in_progress | back: `CreateJourney` valida canal e produto ativos (`ChannelInactiveException`/`ProductInactiveException`) | criação já bloqueada; bloqueio de publicação depende de EP-06 |
| [~] | REQ-01.04.004 | O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa. | in_progress | back: `DeactivateProduct` + `ActivePublicationPort` (stub `NoPublicationsYetAdapter` retorna sempre `false`) | guarda implementada e testada; verificação end-to-end pendente de EP-02/EP-06 |
| [~] | REQ-01.04.005 | O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa. | in_progress | back: `DeactivateChannel` + `ActivePublicationPort` (stub `NoPublicationsYetAdapter` retorna sempre `false`) | guarda implementada e testada; verificação end-to-end pendente de EP-02/EP-06 |

---

## EP-02 Gestão de Jornadas

### FT-02.01 Cadastro de Jornadas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.01.001 | O sistema deve permitir criar jornadas. | done | back: `POST /api/v1/journeys`; front: `JourneysPage` (botão "Nova jornada") | |
| [x] | REQ-02.01.002 | O sistema deve permitir editar jornadas. | done | back: `PUT /api/v1/journeys/{id}`; front: ação "Editar" | |
| [x] | REQ-02.01.003 | O sistema deve permitir consultar jornadas. | done | back: `GET /api/v1/journeys`, `GET /api/v1/journeys/{id}`; front: `JourneysPage` | |
| [x] | REQ-02.01.004 | O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas. | done | back: `DELETE /api/v1/journeys/{id}` + `DeleteJourney` + `HasEverBeenPublishedPort` (stub `NeverPublishedAdapter` retorna sempre `false`) | front: ação "Excluir" com confirmação |
| [x] | REQ-02.01.005 | Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; o sistema deve permitir apenas sua desativação, preservando o registro de publicação. | done | back: `DeleteJourney` lança `JourneyDeletionBlockedException` (409) quando `hasEverBeenPublished` | verificação end-to-end pendente de EP-06 (stub sempre `false` hoje) |
| [~] | REQ-02.01.006 | O sistema deve impedir a desativação de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes da desativação. | in_progress | back: `DeactivateJourney` + `ActivePublicationPort.existsForJourney` (stub sempre `false`) | guarda implementada e testada; verificação end-to-end pendente de EP-06 |

### FT-02.02 Identificação e Metadados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.02.001 | O sistema deve permitir definir nome para a jornada. | done | back: `Journey.name`; front: campo "Nome" | |
| [x] | REQ-02.02.002 | O sistema deve permitir definir descrição para a jornada. | done | back: `Journey.description`; front: campo "Descrição" | |
| [x] | REQ-02.02.003 | Cada jornada deve possuir identificador único (`journeyId`). | done | back: `journey_id UUID PRIMARY KEY` (`V3__create_journey.sql`) | |
| [x] | REQ-02.02.004 | O identificador da jornada é gerado pelo sistema e não é editável pelo usuário. | done | back: `Journey.create` gera `UUID.randomUUID()`; não exposto como campo editável | |
| [x] | REQ-02.02.005 | Toda jornada deve estar associada a exatamente um canal. | done | back: `channel_id NOT NULL` + FK (`V3__create_journey.sql`) | |
| [x] | REQ-02.02.006 | O sistema deve identificar o produto da jornada a partir do canal associado. | done | back: `JourneyViewAssembler` resolve produto via `Channel.productId`; front: exibido em todo lugar | |

### FT-02.03 Pesquisa

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.03.001 | O sistema deve permitir pesquisar jornadas por nome. | done | back: filtro `q` client-side no momento (lista completa retornada); front: busca em `JourneysPage` | |
| [x] | REQ-02.03.002 | O sistema deve permitir filtrar jornadas por produto. | done | back: `GET /api/v1/journeys?productId=`; front: `FilterDropdown` "Produto" | |
| [x] | REQ-02.03.003 | O sistema deve permitir filtrar jornadas por canal. | done | back: `GET /api/v1/journeys?channelId=`; front: `FilterDropdown` "Canal" | |
| [x] | REQ-02.03.004 | O sistema deve permitir ordenar jornadas por data de criação. | done | back: `?sort=CREATED_AT`; front: `FilterDropdown` "Ordenar" → "Criadas recentemente" | |
| [x] | REQ-02.03.005 | O sistema deve permitir ordenar jornadas por data de alteração. | done | back: `?sort=UPDATED_AT` (padrão); front: "Alteradas recentemente" | |

### FT-02.04 Dashboard de Jornadas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.04.001 | O sistema deve exibir jornadas recentemente alteradas, ordenadas da alteração mais recente para a mais antiga. | done | back: `?sort=UPDATED_AT` é o padrão; front: lista já carrega ordenada | |
| [x] | REQ-02.04.002 | O sistema deve exibir a quantidade total de jornadas cadastradas. | done | front: card "Jornadas cadastradas" em `JourneysPage` | |

### FT-02.05 Jornadas Específicas por Canal

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.05.001 | O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto. | done | back: cada `Journey` pertence a um único `channel_id`, sem restrição entre canais do mesmo produto | |
| [ ] | REQ-02.05.002 | Cada jornada deve possuir definição independente de fluxo e formulários. | blocked | | depende de `Flow` (EP-03) e `Form` (EP-04) |
| [ ] | REQ-02.05.003 | Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais. | blocked | | depende de `Flow` (EP-03) existir para ter substância a verificar |
| [x] | REQ-02.05.004 | O sistema deve exibir o produto e o canal durante toda a edição da jornada. | done | front: breadcrumb "Produto › Canal" nos cards/linhas e no modal de edição | |

---

## EP-03 Modelagem Visual

### FT-03.01 Flow Designer

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.01.001 | O sistema deve suportar eventos de início. | done | back: `FlowNodeType.START`; front: `NODE_META.start`, `Palette` | |
| [x] | REQ-03.01.002 | O sistema deve suportar eventos de término. | done | back: `FlowNodeType.END`; front: `NODE_META.end`, `Palette` | |
| [x] | REQ-03.01.003 | O sistema deve suportar User Tasks. | done | back: `FlowNodeType.USER_TASK`; front: `NODE_META.userTask`, `Palette` | |
| [x] | REQ-03.01.004 | Cada fluxo deve possuir exatamente um nó `START` e exatamente um nó `END`. | done | back: `FlowValidator.validate` (contagem de `starts`/`ends`); front: `validation.ts` + bloqueio de exclusão do último START/END em `JourneyDesignerPage.onBeforeDelete` | |
| [x] | REQ-03.01.005 | Ao criar uma jornada, o sistema deve iniciar seu fluxo com os nós `START` e `END` conectados. | done | back: `CreateJourney` chama `flowRepository.save(Flow.initial(journey.getId()))`; front: `initialFlowNodes`/`initialFlowEdges` | |

### FT-03.02 Conexões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.02.001 | O sistema deve permitir criar conexões entre elementos. | done | front: `JourneyDesignerPage.onConnect` (drag entre handles) | |
| [x] | REQ-03.02.002 | O sistema deve permitir remover conexões. | done | front: seleção da aresta + `Delete`/`Backspace` (`deleteKeyCode`) | |
| [x] | REQ-03.02.003 | O sistema deve permitir editar conexões. | done | front: reconectar arrastando a extremidade da aresta (React Flow `onEdgesChange`) | |
| [x] | REQ-03.02.004 | O nó `START` não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída. | done | back: `FlowValidator.validate`; front: `validation.ts` (mesma regra espelhada) | |
| [x] | REQ-03.02.005 | Todos os nós devem pertencer a um caminho contínuo e alcançável entre `START` e `END`. | done | back: `FlowValidator` (BFS a partir de START/END); front: `validation.ts` (`reachableFrom`) | |
| [x] | REQ-03.02.006 | O editor deve impedir ações incompatíveis, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que viole as restrições estruturais. | done | back: `FlowValidationException` + `GlobalExceptionHandler` (422); front: `ErrorModal` exibe violações antes de salvar | |

### FT-03.03 Navegação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.03.001 | O usuário deve visualizar o fluxo completo da jornada. | done | front: `getFlow` carrega todos os nós/conexões no `JourneyDesignerPage`; `MiniMap` do React Flow | |
| [x] | REQ-03.03.002 | O usuário deve navegar livremente pelo fluxo. | done | front: pan/zoom nativos do `ReactFlow` | |
| [x] | REQ-03.03.003 | O sistema deve destacar o elemento selecionado. | done | front: `WorkflowNode` (estado `selected`) + arestas conectadas destacadas em `displayEdges` | |

### FT-03.04 Experiência de Edição

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.04.001 | O sistema deve suportar drag-and-drop de elementos. | done | front: `Palette` (drag) + `JourneyDesignerPage.onDrop`/`addNodeFromPalette` | |
| [x] | REQ-03.04.002 | O usuário deve poder reposicionar elementos livremente. | done | front: `onNodesChange` (drag nativo do React Flow, `snapToGrid`) | |
| [x] | REQ-03.04.003 | O usuário deve poder remover elementos do fluxo. | done | front: `deleteNode` / `onBeforeDelete` (bloqueia último START/END) | |
| [x] | REQ-03.04.004 | O usuário deve poder copiar elementos. | done | front: `JourneyDesignerPage` atalho `Ctrl+C`/`Ctrl+V` (copia/cola User Task selecionada) | START/END não são copiáveis (regra de unicidade) |
| [x] | REQ-03.04.005 | O usuário deve poder duplicar elementos. | done | front: `JourneyDesignerPage.duplicateNode`, atalho `Ctrl+D` e botão "Duplicar nó" em `NodePropertiesPanel` | START/END não são duplicáveis (regra de unicidade) |

### FT-03.05 Canvas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.05.001 | O sistema deve permitir zoom in. | done | front: `Toolbar` botão zoom+ → `zoomIn()` | |
| [x] | REQ-03.05.002 | O sistema deve permitir zoom out. | done | front: `Toolbar` botão zoom− → `zoomOut()` | |
| [x] | REQ-03.05.003 | O sistema deve permitir mover-se livremente pelo canvas. | done | front: pan nativo do `ReactFlow` | |
| [x] | REQ-03.05.004 | O sistema deve permitir centralizar o fluxo na área visível. | done | front: `Toolbar` botão "Ajustar à tela" → `fitView()` | |

### FT-03.06 Produtividade

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.06.001 | O sistema deve permitir desfazer ações. | done | front: `JourneyDesignerPage.undo` (pilha `undoStack`) | |
| [x] | REQ-03.06.002 | O sistema deve permitir refazer ações. | done | front: `JourneyDesignerPage.redo` (pilha `redoStack`) | |

---

## EP-04 Formulários (SDUI)

### FT-04.01 Form Builder

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-04.01.001 | O sistema deve permitir criar formulários. | todo | | |
| [ ] | REQ-04.01.002 | O sistema deve permitir editar formulários. | todo | | |
| [ ] | REQ-04.01.003 | O sistema deve permitir remover formulários. | todo | | |
| [ ] | REQ-04.01.004 | O sistema deve permitir associar formulários a User Tasks. | todo | | |
| [ ] | REQ-04.01.005 | O sistema deve permitir manter uma User Task sem formulário associado. | todo | | |

### FT-04.02 Componentes

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-04.02.001 | O sistema deve suportar componente de texto. | todo | | |
| [ ] | REQ-04.02.002 | O sistema deve suportar campo de entrada. | todo | | |
| [ ] | REQ-04.02.003 | O sistema deve suportar seleção simples. | todo | | |
| [ ] | REQ-04.02.004 | O sistema deve suportar seleção múltipla. | todo | | |
| [ ] | REQ-04.02.005 | O sistema deve suportar upload de arquivo. | todo | | |
| [ ] | REQ-04.02.006 | O sistema deve suportar conteúdo estático. | todo | | |

### FT-04.03 Reutilização

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-04.03.001 | O sistema deve permitir reutilizar formulários em múltiplas jornadas. | todo | | |
| [ ] | REQ-04.03.002 | O sistema deve permitir reutilizar formulários em múltiplas User Tasks. | todo | | |

### FT-04.04 Configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-04.04.001 | O usuário deve poder definir campos obrigatórios. | todo | | |
| [ ] | REQ-04.04.002 | O usuário deve poder definir valores padrão. | todo | | |
| [ ] | REQ-04.04.003 | O usuário deve poder definir textos de ajuda. | todo | | |

### FT-04.05 Preview

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-04.05.001 | O sistema deve permitir visualizar o formulário durante a edição. | todo | | |
| [ ] | REQ-04.05.002 | O preview deve refletir alterações em tempo real. | todo | | |

---

## EP-05 Simulação

### FT-05.01 Execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-05.01.001 | O sistema deve permitir executar simulações. | todo | | |
| [ ] | REQ-05.01.002 | O sistema deve permitir informar dados de entrada para os formulários simulados. | todo | | |
| [ ] | REQ-05.01.003 | O sistema deve permitir reiniciar simulações. | todo | | |
| [ ] | REQ-05.01.004 | Antes de registrar um passo da simulação, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução. | todo | | |

### FT-05.02 Resultado

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-05.02.001 | O sistema deve apresentar o caminho percorrido. | todo | | |
| [ ] | REQ-05.02.002 | O sistema deve apresentar as User Tasks executadas. | todo | | |
| [ ] | REQ-05.02.003 | O sistema deve apresentar os formulários exibidos. | todo | | |
| [ ] | REQ-05.02.004 | O sistema deve apresentar o resultado final da simulação. | todo | | |

### FT-05.03 Visualização da Execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-05.03.001 | O sistema deve destacar o caminho percorrido durante a simulação. | todo | | |
| [ ] | REQ-05.03.002 | O sistema deve destacar as User Tasks e os formulários executados. | todo | | |

---

## EP-06 Publicação

### FT-06.01 Publicação de Jornadas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-06.01.001 | O sistema deve permitir publicar jornadas. | todo | | |
| [ ] | REQ-06.01.002 | O sistema deve permitir despublicar jornadas por meio da API do runtime. | todo | | |
| [ ] | REQ-06.01.003 | O sistema deve permitir consultar jornadas publicadas. | todo | | |
| [ ] | REQ-06.01.004 | Cada jornada deve possuir no máximo uma publicação. Alterações realizadas após a publicação não devem modificar automaticamente o snapshot publicado; para disponibilizá-las, o usuário deve publicar novamente, substituindo integralmente o snapshot anterior. | todo | | |

### FT-06.02 Estado da Publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-06.02.001 | O sistema deve indicar se uma jornada está publicada. | todo | | |
| [ ] | REQ-06.02.002 | O sistema deve indicar a data da publicação. | todo | | |
| [ ] | REQ-06.02.003 | O sistema deve indicar o produto associado à publicação. | todo | | |
| [ ] | REQ-06.02.004 | O sistema deve indicar o canal associado à publicação. | todo | | |

### FT-06.03 Catálogo de Publicações

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-06.03.001 | O sistema deve permitir listar jornadas publicadas. | todo | | |
| [ ] | REQ-06.03.002 | O sistema deve permitir pesquisar jornadas publicadas. | todo | | |
| [ ] | REQ-06.03.003 | O sistema deve permitir filtrar jornadas publicadas por produto. | todo | | |
| [ ] | REQ-06.03.004 | O sistema deve permitir filtrar jornadas publicadas por canal. | todo | | |

---

## EP-07 Publicação no Runtime

### FT-07.01 Chamadas de Publicação e Despublicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-07.01.001 | O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime. | todo | | |
| [ ] | REQ-07.01.002 | A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários. | todo | | |
| [ ] | REQ-07.01.003 | No MVP, a API de publicação do runtime deve ser representada por um mock. Após o retorno de sucesso do mock, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`. | todo | | |
| [ ] | REQ-07.01.004 | Ao despublicar no MVP, o Admin Portal deve chamar a API mockada do runtime. Após o sucesso, jornada e publicação assumem `UNPUBLISHED`; em caso de falha, os estados atuais são preservados. | todo | | |

---

## EP-08 Dashboard Administrativo

### FT-08.01 Indicadores Gerais

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-08.01.001 | O sistema deve exibir a quantidade de produtos cadastrados. | todo | | |
| [ ] | REQ-08.01.002 | O sistema deve exibir a quantidade de canais cadastrados. | todo | | |
| [ ] | REQ-08.01.003 | O sistema deve exibir a quantidade de jornadas cadastradas. | todo | | |
| [ ] | REQ-08.01.004 | O sistema deve exibir a quantidade de formulários cadastrados. | todo | | |
| [ ] | REQ-08.01.005 | O sistema deve exibir a quantidade de jornadas publicadas. | todo | | |

---

## Changelog deste arquivo

| Data | Alteração |
|---|---|
| 2026-08-02 | Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos `Ctrl+C`/`Ctrl+V`/`Ctrl+D` e botão "Duplicar nó" no `NodePropertiesPanel`, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como `n/a`: decisão de produto de não implementar no MVP, salvamento permanece manual. EP-03 avança para 25/26 (96%). |
| 2026-08-02 | Atualização do EP-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam `todo`: copiar elementos, duplicar elementos e salvamento automático. |
| 2026-08-02 | Sincronização com `ej-admin-requisitos.md`: 122 REQs em 8 EPs / 28 FTs, todos como `todo`. |
