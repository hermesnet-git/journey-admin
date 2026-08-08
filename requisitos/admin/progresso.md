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
| Total de Épicos (EP) | 5 |
| Total de Features (FT) | 29 |
| Total de Requisitos (REQ) | 137 |
| Concluídos (`done`) | 127 |
| Em andamento (`in_progress`) | 0 |
| Não iniciados (`todo`) | 10 |
| Bloqueados (`blocked`) | 0 |
| Não aplicável (`n/a`) | 0 |
| % Concluído | 93% |

## Progresso por Épico

| EP | Nome | REQs | Concluídos | % |
|---|---|---:|---:|---:|
| EP-01 | Gestão de Produtos e Canais | 24 | 24 | 100% |
| EP-02 | Gestão de Jornadas | 38 | 38 | 100% |
| EP-03 | Modelagem Visual | 46 | 46 | 100% |
| EP-04 | Formulários (SDUI) | 19 | 19 | 100% |
| EP-05 | Simulação | 10 | 0 | 0% |

---

## EP-01 Gestão de Produtos e Canais

### FT-01.01 Gestão de produtos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.01.001 | O sistema deve permitir cadastrar produtos. | done | back: `POST /api/v1/products`; front: `ProductsPage` (botão "Novo produto") | |
| [x] | REQ-01.01.002 | O sistema deve permitir editar produtos. | done | back: `PUT /api/v1/products/{id}`; front: `ProductsPage` (ação "Editar") | |
| [x] | REQ-01.01.003 | O sistema deve permitir consultar produtos. | done | back: `GET /api/v1/products`, `GET /api/v1/products/{id}`; front: `ProductsPage` | |
| [x] | REQ-01.01.004 | O sistema deve permitir desativar produtos. | done | back: `POST /api/v1/products/{id}/deactivate`; front: `ProductsPage` (ação "Desativar") | |
| [x] | REQ-01.01.005 | Cada produto deve possuir identificador único (`productId`), nome, descrição opcional e status. | done | back: `Product` domain + `V1__create_product.sql` (`product_id UUID PRIMARY KEY`) | |

### FT-01.02 Gestão de canais

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.02.001 | O sistema deve permitir cadastrar canais dentro de um produto. | done | back: `POST /api/v1/products/{id}/channels`; front: `ProductChannelsPage` (botão "Novo canal") | |
| [x] | REQ-01.02.002 | O sistema deve permitir editar canais. | done | back: `PUT /api/v1/channels/{id}`; front: `ProductChannelsPage` (ação "Editar") | |
| [x] | REQ-01.02.003 | O sistema deve permitir consultar canais. | done | back: `GET /api/v1/channels/{id}`, `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.02.004 | O sistema deve permitir desativar canais. | done | back: `POST /api/v1/channels/{id}/deactivate`; front: `ProductChannelsPage` (ação "Desativar") | |
| [x] | REQ-01.02.005 | Todo canal deve pertencer a exatamente um produto. | done | back: `channel.product_id NOT NULL` + FK (`V2__create_channel.sql`) | |
| [x] | REQ-01.02.006 | Cada canal deve possuir identificador único (`channelId`), nome, descrição opcional, tipo e status. | done | back: `channel_id UUID PRIMARY KEY` (`V2__create_channel.sql`) + `Channel` domain | |
| [x] | REQ-01.02.007 | O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`. | done | back: `ChannelType` enum + CHECK constraint; front: `ChannelFormModal` (Select) | |

### FT-01.03 Catálogo e descoberta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.03.001 | O sistema deve permitir pesquisar produtos por nome. | done | back: `GET /api/v1/products?q=`; front: campo de busca em `ProductsPage` | |
| [x] | REQ-01.03.002 | O sistema deve permitir filtrar produtos por status. | done | back: `GET /api/v1/products?status=`; front: filtro de status em `ProductsPage` | |
| [x] | REQ-01.03.003 | O sistema deve permitir listar os canais de um produto. | done | back: `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.03.004 | O sistema deve permitir pesquisar canais por nome. | done | back: `GET /api/v1/products/{id}/channels?q=`; front: campo de busca em `ProductChannelsPage` | |
| [x] | REQ-01.03.005 | O sistema deve permitir filtrar canais por produto, tipo e status. | done | back: `?type=&status=` no mesmo endpoint; front: filtros em `ProductChannelsPage` | |
| [x] | REQ-01.03.006 | O sistema deve exibir a quantidade de canais associados a cada produto. | done | back: `ProductView.channelCount`; front: coluna "Canais" em `ProductsPage` | |
| [x] | REQ-01.03.007 | O sistema deve exibir a quantidade de jornadas associadas a cada canal. | done | back: `ChannelView.journeyCount` via `JourneyCountPort` (stub retorna 0 até EP-02); front: coluna "Jornadas" | contagem real depende de EP-02 |

### FT-01.04 Integridade e ciclo de vida

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.04.001 | A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes. | done | back: `DeactivateProduct` apenas altera `status`, sem exclusão | |
| [x] | REQ-01.04.002 | A desativação de um canal não deve remover suas jornadas ou publicações existentes. | done | back: `DeactivateChannel` apenas altera `status`, sem exclusão | |
| [x] | REQ-01.04.003 | O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo. | done | back: `CreateJourney` (criação) e `PublishJourney` (publicação) validam canal e produto ativos (`ChannelInactiveException`/`ProductInactiveException`, 422) | |
| [x] | REQ-01.04.004 | O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa. | done | back: `DeactivateProduct` + `ActivePublicationPort` real (`JourneyPublicationStatusAdapter.existsForProduct`) | testado via curl: 409 com jornada `PUBLISHED`, 200 após despublicar |
| [x] | REQ-01.04.005 | O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa. | done | back: `DeactivateChannel` + `ActivePublicationPort` real (`JourneyPublicationStatusAdapter.existsForChannel`) | testado via curl: 409 com jornada `PUBLISHED`, 200 após despublicar |

---

## EP-02 Gestão de Jornadas

### FT-02.01 Cadastro de jornadas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.01.001 | O sistema deve permitir criar jornadas. | done | back: `POST /api/v1/journeys`; front: `JourneysPage` (botão "Nova jornada") | |
| [x] | REQ-02.01.002 | O sistema deve permitir editar jornadas. | done | back: `PUT /api/v1/journeys/{id}`; front: ação "Editar" | |
| [x] | REQ-02.01.003 | O sistema deve permitir consultar jornadas. | done | back: `GET /api/v1/journeys`, `GET /api/v1/journeys/{id}`; front: `JourneysPage` | |
| [x] | REQ-02.01.004 | O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas. | done | back: `DELETE /api/v1/journeys/{id}` + `DeleteJourney` + `HasEverBeenPublishedPort` (stub `NeverPublishedAdapter` retorna sempre `false`) | front: ação "Excluir" com confirmação |
| [x] | REQ-02.01.005 | Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; o sistema deve permitir apenas sua desativação, preservando o registro de publicação. | done | back: `DeleteJourney` lança `JourneyDeletionBlockedException` (409) quando `HasEverBeenPublishedPort.hasEverBeenPublished` (real, via `journey_publication`) | testado via curl: 409 mesmo após despublicar (registro preservado) |
| [x] | REQ-02.01.006 | O sistema deve impedir a desativação de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes da desativação. | done | back: `DeactivateJourney` + `ActivePublicationPort.existsForJourney` real | |

### FT-02.02 Identificação e metadados

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

### FT-02.05 Jornadas específicas por canal

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.05.001 | O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto. | done | back: cada `Journey` pertence a um único `channel_id`, sem restrição entre canais do mesmo produto | |
| [x] | REQ-02.05.002 | Cada jornada deve possuir definição independente de fluxo e formulários. | done | back: `flow.journey_id UNIQUE` — um `Flow` por jornada; `FlowNode.formId` referencia `Form` por nó, sem acoplamento entre jornadas | satisfeito desde EP-03/EP-04 |
| [x] | REQ-02.05.003 | Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais. | done | back: cada `Flow` é uma linha isolada por `journey_id`; `UpdateFlow` só afeta o `flow` da própria jornada | satisfeito desde EP-03 |
| [x] | REQ-02.05.004 | O sistema deve exibir o produto e o canal durante toda a edição da jornada. | done | front: breadcrumb "Produto › Canal" nos cards/linhas e no modal de edição | |

---

## EP-03 Modelagem Visual

### FT-03.01 Flow designer

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.01.001 | O sistema deve suportar eventos de início. | done | back: `FlowNodeType.START`; front: `NODE_META.start`, `Palette` | |
| [x] | REQ-03.01.002 | O sistema deve suportar eventos de término. | done | back: `FlowNodeType.END`; front: `NODE_META.end`, `Palette` | |
| [x] | REQ-03.01.003 | O sistema deve suportar User Tasks. | done | back: `FlowNodeType.USER_TASK`; front: `NODE_META.userTask`, `Palette` | |
| [x] | REQ-03.01.004 | Cada fluxo deve possuir exatamente um nó `START` e exatamente um nó `END`. | done | back: `FlowValidator.validate` (contagem de `starts`/`ends`); front: `validation.ts` + bloqueio de exclusão do último START/END em `JourneyDesignerPage.onBeforeDelete` | |
| [x] | REQ-03.01.005 | Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o nó `START`, cabendo ao usuário adicionar o nó `END` e os demais elementos antes de salvar. | done | back: `Flow.initial` (`domain/flow/Flow.java`) agora persiste só o nó `START`, sem `END`/conexão; front: `initialFlowNodes`/`initialFlowEdges` (`model.ts`) idem para o estado local antes do load | corrigido: `Flow.initial` criava `START`+`END` já conectados; validação de salvamento (`validateFlow`/`FlowValidator`) exige exatamente um `END` antes de permitir salvar |

### FT-03.02 Conexões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.02.001 | O sistema deve permitir criar conexões entre elementos. | done | front: `JourneyDesignerPage.onConnect` (drag entre handles) | |
| [x] | REQ-03.02.002 | O sistema deve permitir remover conexões. | done | front: seleção da aresta + `Delete`/`Backspace` (`deleteKeyCode`) | |
| [x] | REQ-03.02.003 | O sistema deve permitir editar conexões. | done | front: reconectar arrastando a extremidade da aresta (React Flow `onEdgesChange`) | |
| [x] | REQ-03.02.004 | O nó `START` não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída. | done | back: `FlowValidator.validate`; front: `validation.ts` (mesma regra espelhada) | |
| [x] | REQ-03.02.005 | Todos os nós devem pertencer a um caminho contínuo e alcançável entre `START` e `END`. | done | back: `FlowValidator` (BFS a partir de START/END); front: `validation.ts` (`reachableFrom`) | |
| [x] | REQ-03.02.006 | O editor deve impedir ações incompatíveis, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que viole as restrições estruturais. | done | back: `FlowValidationException` + `GlobalExceptionHandler` (422); front: `ErrorModal` exibe violações antes de salvar | |
| [x] | REQ-03.02.007 | Uma `USER_TASK` deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma `USER_TASK` que já possua saída. | done | front: `SINGLE_OUTPUT_TYPES` (`model.ts`) usado em `onConnect`/`onQuickAdd`/`displayNodes` (`JourneyDesignerPage.tsx`) e no handle/quick-add de `WorkflowNode.tsx`; back: `FlowValidator` (`in < 1 \|\| out != 1`) | regra estendida também a `SERVICE_TASK`/`RECEIVE_TASK` (mesma restrição estrutural de saída única) |

### FT-03.03 Navegação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.03.001 | O usuário deve visualizar o fluxo completo da jornada. | done | front: `getFlow` carrega todos os nós/conexões no `JourneyDesignerPage`; `MiniMap` do React Flow | |
| [x] | REQ-03.03.002 | O usuário deve navegar livremente pelo fluxo. | done | front: pan/zoom nativos do `ReactFlow` | |
| [x] | REQ-03.03.003 | O sistema deve destacar o elemento selecionado. | done | front: `WorkflowNode` (estado `selected`) + arestas conectadas destacadas em `displayEdges` | |

### FT-03.04 Experiência de edição

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

### FT-03.07 Elementos de integração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.07.001 | O sistema deve suportar nós de integração `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`. | done | back: `FlowNodeType` (`domain/flow`); front: `NodeType`/`NODE_META`/`TYPE_COLOR` (`model.ts`) | |
| [x] | REQ-03.07.002 | Uma `SERVICE_TASK` deve representar a execução de uma integração externa durante a jornada. | done | back: `FlowNode.connectorConfig` associável a `SERVICE_TASK`; front: `ConnectorFields` no `PropertiesPanel` para o tipo | |
| [x] | REQ-03.07.003 | Uma `RECEIVE_TASK` deve representar a espera por uma mensagem externa em uma instância de jornada já iniciada. | done | idem REQ-03.07.002, para `RECEIVE_TASK` | |
| [x] | REQ-03.07.004 | Uma `MESSAGE_START_EVENT` deve permitir iniciar uma nova instância de jornada a partir de uma mensagem externa. | done | back/front: `MESSAGE_START_EVENT` tratado como elemento inicial alternativo (`FlowValidator`/`validation.ts`), com `connectorConfig` associável | |
| [x] | REQ-03.07.005 | O fluxo deve possuir exatamente um elemento inicial, que pode ser `START` ou `MESSAGE_START_EVENT`. | done | back: `FlowValidator.START_TYPES` (conta `START`+`MESSAGE_START_EVENT` juntos, exige exatamente 1); front: `validation.ts` (mesma regra); `start` passou a ser removível em `WorkflowNode.tsx` para permitir a troca | |
| [x] | REQ-03.07.006 | O sistema deve permitir editar, mover, remover, copiar e duplicar elementos de integração, respeitando as regras de unicidade do elemento inicial. | done | front: `SERVICE_TASK`/`RECEIVE_TASK` incluídos em `SINGLE_OUTPUT_TYPES` (copiáveis/duplicáveis, `JourneyDesignerPage.tsx`); `MESSAGE_START_EVENT` fica fora (mantém unicidade, como `start`/`end`); mover/editar/remover já são genéricos no React Flow | |

### FT-03.08 Framework de conectores

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.08.001 | O sistema deve representar a integração por meio de um framework conceitual de conectores. | done | back: `ConnectorType`/`ConnectorConfig` (`domain/flow`) | |
| [x] | REQ-03.08.002 | O framework deve permitir associar um conector a uma `SERVICE_TASK`, `RECEIVE_TASK` ou `MESSAGE_START_EVENT`. | done | back: `FlowNode.connectorConfig`; front: `ConnectorFields` renderizado só para esses 3 tipos (`PropertiesPanel.tsx`) | |
| [x] | REQ-03.08.003 | O catálogo deve possuir os conectores `REST` e `KAFKA` habilitados para uso no MVP. | done | back: `ConnectorType.REST`/`KAFKA` (`enabled = true`); front: `CONNECTOR_TYPES` (`model.ts`) só oferece os dois | |
| [x] | REQ-03.08.004 | O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos. | done | back: `ConnectorType.SOAP` (`enabled = false`) + `FlowValidator` rejeita nó com conector desabilitado (violação estrutural, 422) | |
| [x] | REQ-03.08.005 | O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível. | done | back: `ConnectorConfig.config` como `Map<String,Object>` livre, serializado em JSONB junto do node (`FlowNodeRecord.ConnectorConfigRecord`) — sem migration nova, extensível por natureza | |

### FT-03.09 Configuração REST e Kafka

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.09.001 | O sistema deve permitir configurar `REST` em `SERVICE_TASK` e `RECEIVE_TASK`. | done | front: `ConnectorFields` (`PropertiesPanel.tsx`), catálogo por tipo de nó em `CONNECTOR_TYPES_BY_NODE` (`model.ts`) | `REST` não é oferecido para `MESSAGE_START_EVENT` (REQ-03.09.007) |
| [x] | REQ-03.09.002 | A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body, mapeamento de entrada e mapeamento de saída. | done | front: campos dedicados de método/URL; headers em editor próprio (REQ-03.09.009); params/body/mapeamentos no bloco JSON "Configuração adicional" | |
| [x] | REQ-03.09.003 | O sistema deve permitir configurar `KAFKA` em `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`. | done | front: mesmo `ConnectorFields`, formulário Kafka disponível para os 3 tipos | |
| [x] | REQ-03.09.004 | A configuração Kafka deve suportar tópico, operação, headers, payload, mapeamento de entrada e mapeamento de saída. | done | front: campo "Tópico" dedicado; headers em editor próprio (REQ-03.09.009); payload/mapeamentos no bloco JSON "Configuração adicional" | campo "fila" removido — Kafka só tem tópico |
| [x] | REQ-03.09.005 | Configurações de integração devem suportar referência de credencial sem armazenar secrets diretamente no fluxo ou no snapshot. | done | back: `ConnectorConfig.credentialRef` (string de referência, sem campo de secret); front: campo "Referência de credencial" | |
| [x] | REQ-03.09.006 | O snapshot publicado deve incluir o tipo do elemento, o conector, a configuração declarativa e os mapeamentos necessários para execução pelo runtime. | done | back: `Publication` guarda os `FlowNode` de domínio diretamente (`PublishJourney`), e `PublicationRepositoryAdapter`/`FlowNodeRecord` persistem `connectorConfig` junto — propagação automática, sem código extra no fluxo de publicação | |
| [x] | REQ-03.09.007 | `REST` não é um conector válido para `MESSAGE_START_EVENT`; deve suportar apenas `KAFKA`. | done | front: `CONNECTOR_TYPES_BY_NODE.messageStartEvent = ['KAFKA']` (`model.ts`); back: `FlowValidator` rejeita `MESSAGE_START_EVENT` + `REST` (422) | |
| [x] | REQ-03.09.008 | A operação Kafka é determinada pelo tipo de nó: `SERVICE_TASK` = `PRODUCE`; `RECEIVE_TASK`/`MESSAGE_START_EVENT` = `CONSUME`. | done | front: `KAFKA_OPERATION_BY_NODE` (`model.ts`), campo somente leitura em `ConnectorFields`; back: `FlowValidator.KAFKA_OPERATION_BY_TYPE` valida o valor persistido | |
| [x] | REQ-03.09.009 | Headers devem ser editados como lista de pares nome/valor, não como texto declarativo livre; params/body/payload/mapeamentos permanecem declarativos (formato ainda não padronizado). | done | front: `HeadersEditor` (`PropertiesPanel.tsx`) — linhas de nome/valor com adicionar/remover; excluído do bloco JSON "Configuração adicional" via `structuredFields` | |

## EP-04 Formulários (SDUI)

### FT-04.01 Form builder

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.01.001 | O sistema deve permitir criar formulários. | done | back: `POST /api/v1/forms`; front: `FormsPage` (botão "Novo formulário") → `FormBuilderPage` | |
| [x] | REQ-04.01.002 | O sistema deve permitir editar formulários. | done | back: `PUT /api/v1/forms/{id}`; front: `FormsPage` (ação "Editar") | |
| [x] | REQ-04.01.003 | O sistema deve permitir remover formulários. | done | back: `DELETE /api/v1/forms/{id}`; front: `FormsPage` (ação "Excluir" + `ConfirmDialog`) | exclusão física, sem guarda de uso — ver nota |
| [x] | REQ-04.01.004 | O sistema deve permitir associar formulários a User Tasks. | done | back: `FlowNode.formId` (já existente); front: seletor "Formulário associado" em `PropertiesPanel` (só para nós `userTask`), `formId` persistido via `updateFlow` | |
| [x] | REQ-04.01.005 | O sistema deve permitir manter uma User Task sem formulário associado. | done | front: opção "Nenhum" no seletor de formulário (`formId: null`) | |
| [x] | REQ-04.01.006 | Ao associar formulário a uma User Task, o editor deve permitir criar um novo formulário sem sair do editor de fluxo e atualizar a lista de formulários disponíveis. | done | front: botões "Novo formulário" e "Atualizar" na seção "Formulário" do `PropertiesPanel.tsx`; `App.tsx` (`openNewFormScreen`) abre a aba Formulários já em modo de criação; `refreshForms` recarrega `listForms()` sem sair do designer | |

### FT-04.02 Componentes

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.02.001 | O sistema deve suportar componente de texto. | done | back: `FormFieldType.TEXT`; front: `FIELD_TYPE_META.TEXT`, renderizado como rótulo/parágrafo no preview | |
| [x] | REQ-04.02.002 | O sistema deve suportar campo de entrada. | done | back: `FormFieldType.INPUT`; front: renderizado como `<input>` no preview | |
| [x] | REQ-04.02.003 | O sistema deve suportar seleção simples. | done | back: `FormFieldType.SINGLE_SELECT`; front: editor de opções + preview `<select>` | |
| [x] | REQ-04.02.004 | O sistema deve suportar seleção múltipla. | done | back: `FormFieldType.MULTI_SELECT`; front: editor de opções + preview checkboxes | |
| [x] | REQ-04.02.005 | O sistema deve suportar upload de arquivo. | done | back: `FormFieldType.FILE_UPLOAD`; front: preview `<input type="file">` | |
| [x] | REQ-04.02.006 | O sistema deve suportar conteúdo estático. | done | back: `FormFieldType.STATIC_CONTENT`; front: renderizado como bloco de conteúdo no preview | |

### FT-04.03 Reutilização

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.03.001 | O sistema deve permitir reutilizar formulários em múltiplas jornadas. | done | back: `Form` é uma entidade independente, sem vínculo de jornada; `FlowNode.formId` de qualquer jornada pode apontar para o mesmo `formId` | |
| [x] | REQ-04.03.002 | O sistema deve permitir reutilizar formulários em múltiplas User Tasks. | done | back: idem — múltiplos `FlowNode` (mesma ou diferentes jornadas) podem compartilhar o mesmo `formId` | |

### FT-04.04 Configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.04.001 | O usuário deve poder definir campos obrigatórios. | done | back: `FormField.required`; front: checkbox "Campo obrigatório" em `FieldCard` | |
| [x] | REQ-04.04.002 | O usuário deve poder definir valores padrão. | done | back: `FormField.defaultValue`; front: campo "Valor padrão" em `FieldCard` | não aplicável a `TEXT`/`STATIC_CONTENT`/`FILE_UPLOAD` |
| [x] | REQ-04.04.003 | O usuário deve poder definir textos de ajuda. | done | back: `FormField.helpText`; front: campo "Texto de ajuda" em `FieldCard`, exibido no preview | |

### FT-04.05 Preview

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.05.001 | O sistema deve permitir visualizar o formulário durante a edição. | done | front: painel "Preview" fixo em `FormBuilderPage` (`FormPreview`) | |
| [x] | REQ-04.05.002 | O preview deve refletir alterações em tempo real. | done | front: `FormPreview` renderiza diretamente o state `fields` da própria página, sem etapa de sincronização | |

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

### FT-05.03 Visualização da execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-05.03.001 | O sistema deve destacar o caminho percorrido durante a simulação. | todo | | |
| [ ] | REQ-05.03.002 | O sistema deve destacar as User Tasks e os formulários executados. | todo | | |

---

## EP-02 Gestão de Jornadas — continuação: publicação

### FT-02.06 Publicação de jornadas

#### Publicação de Jornadas — requisitos consolidados no EP-02

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.06.001 | O sistema deve permitir publicar jornadas. | done | back: `POST /api/v1/journeys/{id}/publish` + `PublishJourney`; front: `JourneysPage` (ação "Publicar"/"Republicar") | |
| [x] | REQ-02.06.002 | O sistema deve permitir despublicar jornadas por meio da API do runtime. | done | back: `POST /api/v1/journeys/{id}/unpublish` + `UnpublishJourney` (chama `RuntimePublicationPort.unpublish`); front: ação "Despublicar" | |
| [x] | REQ-02.06.003 | O sistema deve permitir consultar jornadas publicadas. | done | back: `GET /api/v1/journeys?status=PUBLISHED`; front: filtro "Publicadas" em `JourneysPage` | |
| [x] | REQ-02.06.004 | Cada jornada deve possuir no máximo uma publicação. Alterações realizadas após a publicação não devem modificar automaticamente o snapshot publicado; para disponibilizá-las, o usuário deve publicar novamente, substituindo integralmente o snapshot anterior. | done | back: `journey_publication.journey_id UNIQUE`; `PublishJourney` reaproveita o `id` existente (upsert) ao republicar, substituindo o `snapshot` por inteiro | testado via curl (republicar troca `publishedAt`) |

### FT-02.07 Estado da publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.07.001 | O sistema deve indicar se uma jornada está publicada. | done | back: `JourneyResponse.status`; front: `JourneyStatusTag` | |
| [x] | REQ-02.07.002 | O sistema deve indicar a data da publicação. | done | back: `JourneyResponse.publishedAt` (via `JourneyViewAssembler` + `PublicationRepository`); front: "Publicada em ..." em `JourneyCard`/`JourneyRow` | |
| [x] | REQ-02.07.003 | O sistema deve indicar o produto associado à publicação. | done | front: `journey.productName` já exibido em todo lugar da listagem (produto é imutável por jornada) | |
| [x] | REQ-02.07.004 | O sistema deve indicar o canal associado à publicação. | done | front: `journey.channelName` já exibido em todo lugar da listagem | |

### FT-02.08 Catálogo de publicações

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.08.001 | O sistema deve permitir listar jornadas publicadas. | done | back/front: mesma listagem de Jornadas, filtro de status "Publicadas" — sem menu novo, por decisão de produto | |
| [x] | REQ-02.08.002 | O sistema deve permitir pesquisar jornadas publicadas. | done | front: campo de busca de `JourneysPage`, combinável com o filtro "Publicadas" | |
| [x] | REQ-02.08.003 | O sistema deve permitir filtrar jornadas publicadas por produto. | done | back: `GET /api/v1/journeys?productId=&status=PUBLISHED`; front: `FilterDropdown` "Produto" | |
| [x] | REQ-02.08.004 | O sistema deve permitir filtrar jornadas publicadas por canal. | done | back: `GET /api/v1/journeys?channelId=&status=PUBLISHED`; front: `FilterDropdown` "Canal" | |

---

### FT-02.09 Publicação no runtime

#### Chamadas de Publicação e Despublicação — requisitos consolidados no EP-02

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.09.001 | O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime. | done | back: `PublishJourney`/`UnpublishJourney` chamam `RuntimePublicationPort` (`MockRuntimePublicationAdapter`) | |
| [x] | REQ-02.09.002 | A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários. | done | back: `Publication` (passada para `RuntimePublicationPort.publish`) carrega jornada, produto, canal, `FlowNode`/`FlowConnection` e `Form`s referenciados | |
| [x] | REQ-02.09.003 | No MVP, a API de publicação do runtime deve ser representada por um mock. Após o retorno de sucesso do mock, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`. | done | back: `MockRuntimePublicationAdapter` sempre "sucede" (loga e retorna); `PublishJourney` só persiste `Publication`/`journey.publish()` depois da chamada não lançar | |
| [x] | REQ-02.09.004 | Ao despublicar no MVP, o Admin Portal deve chamar a API mockada do runtime. Após o sucesso, jornada e publicação assumem `UNPUBLISHED`; em caso de falha, os estados atuais são preservados. | done | back: `UnpublishJourney` só chama `journey.unpublish()`/`save` após `runtimePublicationPort.unpublish` retornar sem exceção; se lançasse, nada seria persistido | jornada assume `UNPUBLISHED` (não existe estado "publicação" separado — o registro é preservado, ver REQ-02.06.004) |

---

## Changelog deste arquivo

| Data | Alteração |
|---|---|
| 2026-08-08 | REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop `onOpenNewForm` propagada de `App.tsx` → `JourneysPage` → `JourneyDesignerPage` → `PropertiesDock` → `PropertiesPanel`) e "Atualizar" (recarrega `listForms()` sem sair do editor de fluxo, via `refreshForms`). `FormsPage.tsx` ganhou suporte a abrir direto em modo `'new'` (props `openNew`/`onOpenNewHandled`), espelhando o padrão já existente de `openFormId`. Progresso geral de 93% para 93% (arredondamento; 127/137). |
| 2026-08-08 | REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (`HeadersEditor` em `PropertiesPanel.tsx`) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136). |
| 2026-08-08 | Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) `REST` deixou de ser oferecido para `MESSAGE_START_EVENT` — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só `KAFKA` continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (`SERVICE_TASK` → `PRODUCE`, `RECEIVE_TASK`/`MESSAGE_START_EVENT` → `CONSUME`), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em `model.ts` (`CONNECTOR_TYPES_BY_NODE`, `KAFKA_OPERATION_BY_NODE`) e `FlowValidator` (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em `PropertiesDock.tsx` (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam `findFreeSpot` para não empilhar. Progresso geral de 92% para 93%. |
| 2026-08-08 | EP-03 (Modelagem Visual) fechado a 100%: FT-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: `FlowNodeType` ganhou `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT`; novos `ConnectorType` (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e `ConnectorConfig` (tipo + config declarativa `Map<String,Object>` + `credentialRef`, sem secret) associáveis a esses 3 tipos; `FlowValidator` estendido (elemento inicial = `START` ou `MESSAGE_START_EVENT`, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga `connectorConfig` automaticamente (reaproveita `FlowNode`/`FlowNodeRecord`). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no `PropertiesPanel` (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: `Flow.initial` criava `START`+`END` já conectados na criação da jornada; agora só cria o `START`, como o requisito manda. Progresso geral de 80% para 92% (só falta EP-05 Simulação). |
| 2026-08-03 | EP-06 (Publicação) + EP-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (`domain/application/infrastructure/interfaces` para `publication`, migration `V6__create_journey_publication.sql`, endpoints `POST /journeys/{id}/publish`\|`unpublish`, filtro `?status=` em `GET /journeys`) e mock do runtime (`MockRuntimePublicationAdapter`, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (`ActivePublicationPort`/`HasEverBeenPublishedPort`, antes sempre `false`), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram `in_progress`) e REQ-02.05.002/003 (eram `blocked`, já satisfeitos desde EP-03/EP-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (`JourneysPage`), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os `in_progress`/`blocked` restantes. |
| 2026-08-03 | EP-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (`domain/application/infrastructure/interfaces/form`, migration `V5__create_form.sql`, CRUD `/api/v1/forms`) e frontend novo (`front/src/forms/FormsPage.tsx` + `FormBuilderPage.tsx`, `api/forms.ts`, item "Formulários" na sidebar). `FlowNode.formId` (já existente no backend) agora é editável de fato: `PropertiesPanel` ganhou o seletor "Formulário associado" para nós User Task e `JourneyDesignerPage` para de mandar `formId: null` fixo. EP-04 avança de 0% para 100%; progresso geral de 55% para 69%. |
| 2026-08-02 | Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos `Ctrl+C`/`Ctrl+V`/`Ctrl+D` e botão "Duplicar nó" no `NodePropertiesPanel`, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como `n/a`: decisão de produto de não implementar no MVP, salvamento permanece manual. EP-03 avança para 25/26 (96%). |
| 2026-08-02 | Atualização do EP-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam `todo`: copiar elementos, duplicar elementos e salvamento automático. |
| 2026-08-02 | Sincronização com `ej-admin-requisitos.md`: 122 REQs em 8 EPs / 28 FTs, todos como `todo`. |
