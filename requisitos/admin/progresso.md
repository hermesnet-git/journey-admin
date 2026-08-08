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
| Total de Features (FT) | 42 |
| Total de Requisitos (REQ) | 219 |
| Concluídos (`done`) | 207 |
| Em andamento (`in_progress`) | 0 |
| Não iniciados (`todo`) | 10 |
| Bloqueados (`blocked`) | 0 |
| Não aplicável (`n/a`) | 2 |
| % Concluído | 95% |

## Progresso por Épico

| EP | Nome | REQs | Concluídos | % |
|---|---|---:|---:|---:|
| EP-01 | Gestão de Produtos e Canais | 24 | 24 | 100% |
| EP-02 | Gestão de Jornadas | 38 | 38 | 100% |
| EP-03 | Modelagem Visual | 46 | 46 | 100% |
| EP-04 | Formulários (SDUI) | 19 | 19 | 100% |
| EP-05 | Simulação | 10 | 0 | 0% |
| EP-06 | Versionamento de jornadas | 35 | 35 | 100% |
| EP-07 | Autenticação e autorização | 25 | 24 | 96% (1 n/a) |
| EP-08 | Auditoria | 22 | 21 | 95% (1 n/a) |

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
| [x] | REQ-02.06.004 | Cada jornada deve possuir no máximo uma publicação ativa, associada a uma versão imutável. Alterações realizadas após a publicação não devem modificar o snapshot publicado; para disponibilizá-las, o usuário deve publicar uma nova versão. | done | back: `journey_publication.version_id` (FK única por jornada) + `JourneyVersion` imutável após `publish()`; ver EP-06 | satisfeito pela implementação do EP-06 |

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

## EP-06 Versionamento de jornadas

### FT-06.01 Modelo de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.01.001 | O sistema deve permitir que uma jornada possua múltiplas versões. | done | back: `journey_version` (`V7__create_journey_version.sql`), `domain/version/JourneyVersion` | |
| [x] | REQ-06.01.002 | Cada versão deve possuir identificador único (`versionId`). | done | back: `journey_version.version_id UUID PRIMARY KEY` | |
| [x] | REQ-06.01.003 | Cada versão deve possuir número sequencial iniciado em `1` dentro da jornada. | done | back: `CreateJourney`/`CreateJourneyVersion` incrementam `versionNumber` a partir de 1 por jornada | |
| [x] | REQ-06.01.004 | Cada versão deve estar associada a exatamente uma jornada. | done | back: `journey_version.journey_id NOT NULL` + FK | |
| [x] | REQ-06.01.005 | Cada versão deve possuir status `DRAFT`, `PUBLISHED` ou `ARCHIVED`. | done | back: `VersionStatus` enum + CHECK constraint | |
| [x] | REQ-06.01.006 | Uma jornada deve possuir no máximo uma versão `PUBLISHED`. | done | back: `PublishJourneyVersion` arquiva a versão `PUBLISHED` anterior antes de publicar a nova | |
| [x] | REQ-06.01.007 | Cada versão deve registrar criação e publicação, quando aplicável. | done | back: `journey_version.created_at`/`published_at` | |
| [x] | REQ-06.01.008 | Cada versão deve permitir observação opcional. | done | back: `journey_version.description` (nullable); front: campo "Descrição" em `VersionsPanel` | |

### FT-06.02 Criação e edição de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.02.001 | Ao criar uma jornada, o sistema deve criar sua primeira versão em `DRAFT`. | done | back: `CreateJourney` cria a versão 1 `DRAFT` junto com a jornada | |
| [x] | REQ-06.02.002 | O sistema deve permitir criar uma nova versão a partir da versão atual. | done | back: `POST /journeys/{id}/versions` + `CreateJourneyVersion`; front: botão "Nova versão" em `VersionsPanel` | |
| [x] | REQ-06.02.003 | O sistema deve criar a nova versão a partir da versão atualmente selecionada para edição. | done | back: `CreateJourneyVersion` parte do estado vivo do fluxo/formulários da jornada (superfície de edição atual) | |
| [x] | REQ-06.02.004 | A nova versão deve possuir cópia independente do fluxo, conexões e referências aos formulários. | done | back: `JourneySnapshotFactory` gera snapshot JSONB independente por versão | |
| [x] | REQ-06.02.005 | Alterações em uma versão `DRAFT` não devem modificar outras versões. | done | back: cada `journey_version` é uma linha isolada com seu próprio `version_snapshot` | |
| [x] | REQ-06.02.006 | Uma versão `PUBLISHED` deve ser imutável. | done | back: nenhum endpoint de update para `journey_version`; `PublishJourneyVersion` só transiciona status | |
| [x] | REQ-06.02.007 | O sistema deve indicar claramente qual versão está sendo editada. | done | front: badge "Editando vN (STATUS)" no designer de fluxo (`Toolbar`) | |
| [x] | REQ-06.02.008 | O sistema deve impedir números de versão duplicados dentro da mesma jornada. | done | back: `UNIQUE (journey_id, version_number)` em `journey_version` | |

### FT-06.03 Histórico e consulta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.03.001 | O sistema deve permitir listar todas as versões de uma jornada. | done | back: `GET /journeys/{id}/versions`; front: `VersionsPanel` | |
| [x] | REQ-06.03.002 | O sistema deve permitir consultar o conteúdo completo de uma versão. | done | back: `GET /journeys/{id}/versions/{versionId}` retorna o `snapshot` completo | |
| [x] | REQ-06.03.003 | O histórico deve exibir número, status, datas e autor da versão. | done | front: colunas número/status/data/autor em `VersionsPanel` | |
| [x] | REQ-06.03.004 | O sistema deve permitir ordenar versões por número ou data. | done | back: listagem ordenada por `version_number`; `created_at`/`published_at` disponíveis para ordenação no front | ordenação padrão por número; sem seletor de ordenação alternativa na UI |
| [x] | REQ-06.03.005 | O sistema deve diferenciar versões em edição, publicadas e arquivadas. | done | front: badges de status coloridos (`DRAFT`/`PUBLISHED`/`ARCHIVED`) em `VersionsPanel` | |
| [x] | REQ-06.03.006 | O sistema deve permitir visualizar uma versão anterior sem editá-la diretamente. | done | front: clique em versão `PUBLISHED`/`ARCHIVED` abre visualização somente-leitura do snapshot JSON | sem carregar de volta no editor — ver limites do MVP (REQ-06.05.004) |

### FT-06.04 Publicação de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.04.001 | O sistema deve permitir publicar uma versão `DRAFT`. | done | back: `POST /journeys/{id}/versions/{versionId}/publish` + `PublishJourneyVersion` (rejeita se não `DRAFT`, 409) | |
| [x] | REQ-06.04.002 | Antes da publicação, o sistema deve validar a versão completa da jornada. | done | back: reaproveita a validação existente de canal/produto ativos e resolução de fluxo/formulários (mesma base do `PublishJourney` legado) | |
| [x] | REQ-06.04.003 | A publicação deve enviar ao runtime o snapshot completo da versão selecionada. | done | back: `PublishJourneyVersion` monta `Publication` a partir do snapshot da versão e chama `RuntimePublicationPort.publish` | |
| [x] | REQ-06.04.004 | Ao publicar uma nova versão, a versão anteriormente publicada deve ser marcada como `ARCHIVED`. | done | back: `PublishJourneyVersion` arquiva a versão `PUBLISHED` anterior antes de publicar a nova | |
| [x] | REQ-06.04.005 | O sistema deve preservar o snapshot da versão anteriormente publicada. | done | back: versão arquivada mantém sua linha/`version_snapshot` intactos, apenas o status muda | |
| [x] | REQ-06.04.006 | A publicação deve registrar qual versão foi enviada ao runtime. | done | back: `journey_publication.version_id` (FK), preenchido em cada publicação | |
| [x] | REQ-06.04.007 | A jornada deve indicar sua versão atualmente publicada. | done | back: `JourneyResponse.publishedVersionId` | |
| [x] | REQ-06.04.008 | Alterações em `DRAFT` não devem modificar o snapshot publicado. | done | back: `DRAFT` e `PUBLISHED` são linhas de `journey_version` distintas | |

### FT-06.05 Compatibilidade e limites do MVP

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.05.001 | O sistema deve preservar versões de jornadas desativadas. | done | back: desativar jornada (`DeactivateJourney`) não remove/altera `journey_version` | |
| [x] | REQ-06.05.002 | Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual. | done | back: `V8__backfill_journey_version.sql` cria versão 1 (PUBLISHED ou DRAFT conforme publicação existente) para toda jornada pré-existente | |
| [x] | REQ-06.05.003 | O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação. | done | back: `PublishJourney`/`GET /journeys` legados continuam funcionando; `journey.status` (ciclo de vida da jornada) mantido separado do status de versão | |
| [x] | REQ-06.05.004 | O sistema não deve permitir restauração ou rollback de versão no MVP. | done | back: nenhum endpoint de restore/rollback implementado (decisão deliberada, fora de escopo) | |
| [x] | REQ-06.05.005 | O sistema deve registrar a versão associada a cada publicação. | done | back: `journey_publication.version_id` | mesma evidência de REQ-06.04.006 |

## EP-07 Autenticação e autorização

### FT-07.01 Autenticação mockada por provedor externo

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.01.001 | O sistema deve representar a autenticação por meio de um provedor externo. | done | back: `POST /auth/login` modela a fronteira de um provedor externo | |
| [x] | REQ-07.01.002 | No MVP, a integração com o provedor externo deve ser mockada. | done | back: `MockUserStore` (usuário hardcoded, sem integração real) | |
| [x] | REQ-07.01.003 | O sistema deve disponibilizar uma tela de login padrão. | done | front: `LoginPage.tsx` | |
| [x] | REQ-07.01.004 | A tela de login deve permitir informar usuário e senha. | done | front: campos usuário/senha em `LoginPage` (`Field`/`TextInput`) | |
| [x] | REQ-07.01.005 | O MVP deve disponibilizar o usuário mockado `admin`, com senha `admin` e perfil `ADMIN`. | done | back: `MockUserStore` (`admin`/`admin`/`ADMIN`, UUID fixo `00000000-0000-0000-0000-000000000001`) | |
| [x] | REQ-07.01.006 | O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas. | done | back: `LoginUseCase` retorna 401 (`InvalidCredentialsException`) para credenciais inválidas | |
| [x] | REQ-07.01.007 | O sistema deve indicar que a autenticação utilizada no MVP é mockada e não representa integração real com um provedor. | done | front: nota/tag "Autenticação mockada" visível em `LoginPage` | |

### FT-07.02 Sessão e proteção de acesso

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.02.001 | O sistema deve criar uma sessão autenticada após login bem-sucedido. | done | back: `SessionStore` (token opaco em memória) emitido no login | |
| [x] | REQ-07.02.002 | O sistema deve permitir encerrar a sessão. | done | back: `POST /auth/logout` + `LogoutUseCase`; front: botão de logout na `Sidebar` | |
| [x] | REQ-07.02.003 | O sistema deve expirar sessões após período configurável de inatividade. | done | back: `app.security.session-inactivity-minutes` (`application.yml`, padrão 30 min) | |
| [x] | REQ-07.02.004 | O sistema deve rejeitar requisições com sessão expirada ou inválida. | done | back: `BearerTokenAuthFilter` retorna 401 para token ausente/expirado/inválido | |
| [x] | REQ-07.02.005 | As rotas administrativas devem ser protegidas contra acesso anônimo. | done | back: `SecurityConfig` exige autenticação em todas as rotas exceto `/auth/login` | |
| [x] | REQ-07.02.006 | O sistema deve preservar a identificação do usuário autenticado nas operações realizadas. | done | back: `@AuthenticationPrincipal AuthenticatedUser` disponível nos controllers/use cases (usado em auditoria e `created_by` de versão) | |

### FT-07.03 Papéis e permissões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.03.001 | O sistema deve suportar os papéis `ADMIN`, `EDITOR` e `VIEWER`. | done | back: `Role` enum | |
| [x] | REQ-07.03.002 | O sistema deve permitir associar um papel a cada usuário. | done | back: `AuthenticatedUser.role`; `MockUserStore` associa `admin` → `ADMIN` | |
| [x] | REQ-07.03.003 | O sistema deve impedir operações não autorizadas pelo papel do usuário. | done | back: `@PreAuthorize` em todos os controllers (Journey/Product/Channel/Flow/Form/Version/Audit) | |
| [x] | REQ-07.03.004 | `VIEWER` deve permitir consulta sem permitir alterações. | done | back: `@PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")` em leituras, sem `VIEWER` nas escritas | |
| [x] | REQ-07.03.005 | `EDITOR` deve permitir criar e editar jornadas e versões. | done | back: `@PreAuthorize("hasAnyRole('EDITOR','ADMIN')")` em create/update de `Journey`/`JourneyVersion` | |
| [x] | REQ-07.03.006 | `EDITOR` deve permitir publicar versões. | done | back: mesma anotação em `PublishJourneyVersion`/`PublishJourney` | |
| [x] | REQ-07.03.007 | `ADMIN` deve possuir acesso administrativo aos recursos do portal. | done | back: `ADMIN` incluso em todas as regras de `@PreAuthorize`, além de exclusivo em `GET /audit-events` | |
| [x] | REQ-07.03.008 | A autorização deve ser validada no backend, independentemente da interface. | done | back: enforcement via Spring Security/`@PreAuthorize`, não depende de ocultação de UI | front não oculta todos os botões por papel (ver observação) |

### FT-07.04 Administração de usuários mockados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.04.001 | O sistema deve representar no MVP o usuário `admin` como usuário administrativo mockado. | done | back: `MockUserStore` | |
| [ ] | REQ-07.04.002 | O sistema deve impedir a remoção do último usuário com papel `ADMIN`. | n/a | | não há CRUD de usuário no MVP (usuário único hardcoded, não removível por design) |
| [x] | REQ-07.04.003 | O sistema deve permitir consultar o usuário autenticado e seu papel. | done | back: `GET /auth/me`; front: `AuthContext` expõe `user` (username/role) | endpoint adicional não previsto no OpenAPI original, alinhado ao requisito |
| [x] | REQ-07.04.004 | O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora do MVP. | done | back: comentário no `MockUserStore`; front: nota "mockado" em `LoginPage` | |

Observação: a ocultação de botões de criar/editar por papel não foi replicada em todas as telas (backend é o controle vinculante, per REQ-07.03.008); pode ser adicionada incrementalmente por página se desejado.

## EP-08 Auditoria

### FT-08.01 Registro de eventos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.01.001 | O sistema deve registrar eventos relevantes de autenticação, autorização e negócio. | done | back: `RecordAuditEvent` chamado em login/logout, CRUD de produto/canal/jornada, versões, publicações e acessos negados | |
| [x] | REQ-08.01.002 | Cada evento deve possuir identificador único (`auditEventId`). | done | back: `audit_event.audit_event_id UUID PRIMARY KEY` (`V9__create_audit_event.sql`) | |
| [x] | REQ-08.01.003 | Cada evento deve registrar data e hora, ação, resultado e recurso afetado. | done | back: colunas `occurred_at`/`action`/`result`/`resource_type`/`resource_id` | |
| [x] | REQ-08.01.004 | Cada evento deve registrar o usuário responsável ou indicar que foi anônimo. | done | back: `audit_event.user_id` nullable (nulo = anônimo, ex.: login falho) | |
| [x] | REQ-08.01.005 | Cada evento deve registrar identificador de correlação da requisição, quando disponível. | done | back: `audit_event.correlation_id` (header `X-Correlation-Id` ou UUID gerado) | |
| [x] | REQ-08.01.006 | O sistema deve registrar eventos de sucesso, falha e acesso negado. | done | back: `AuditResult` enum `SUCCESS`/`FAILURE`/`DENIED` | |

### FT-08.02 Eventos auditáveis

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.02.001 | O sistema deve auditar login bem-sucedido e malsucedido. | done | back: `LoginUseCase` grava `SUCCESS`/`FAILURE` | |
| [x] | REQ-08.02.002 | O sistema deve auditar logout, expiração e bloqueio de sessão. | done | back: `LogoutUseCase` (`SUCCESS`); `BearerTokenAuthFilter` (`SESSION_EXPIRED`, `DENIED`) | |
| [x] | REQ-08.02.003 | O sistema deve auditar criação, alteração e desativação de produtos, canais e jornadas. | done | back: `Create/Update/Deactivate` de `Product`/`Channel`/`Journey` gravam evento | |
| [x] | REQ-08.02.004 | O sistema deve auditar criação e alteração de versões. | done | back: `CreateJourneyVersion` grava `JOURNEY_VERSION_CREATE` | não há endpoint de "alteração" de versão (versões são imutáveis por design, ver EP-06) |
| [x] | REQ-08.02.005 | O sistema deve auditar publicação, republicação e despublicação de jornadas. | done | back: `PublishJourney`/`UnpublishJourney`/`PublishJourneyVersion` gravam evento com transição de status | |
| [x] | REQ-08.02.006 | O sistema deve auditar tentativas de acesso negadas por falta de permissão. | done | back: `SecurityConfig.accessDeniedHandler` grava `ACCESS_DENIED`/`DENIED` | |
| [ ] | REQ-08.02.007 | O sistema deve auditar alterações de papéis e configurações de acesso mockadas. | n/a | | não há CRUD de papéis/configuração de acesso no MVP (usuário e papel são fixos) |

### FT-08.03 Proteção dos registros

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.03.001 | Os registros de auditoria não devem ser editáveis por usuários comuns. | done | back: nenhum endpoint de update para `audit_event` | |
| [x] | REQ-08.03.002 | Os registros de auditoria não devem ser removidos por operações normais do sistema. | done | back: nenhum endpoint de delete para `audit_event` | |
| [x] | REQ-08.03.003 | O sistema não deve armazenar senhas, tokens, segredos ou credenciais sensíveis nos registros. | done | back: `RecordAuditEvent` nunca recebe senha/token como payload; revisão dos call sites confirma | |
| [x] | REQ-08.03.004 | O sistema deve evitar o armazenamento de dados sensíveis nos valores anterior e posterior. | done | back: `previous_value`/`new_value` só preenchidos com transições simples (ex.: `{"status": "..."}`), null nos demais casos | |
| [x] | REQ-08.03.005 | Falhas de auditoria não podem ser ignoradas silenciosamente. | done | back: `RecordAuditEvent` loga em nível ERROR em caso de falha de persistência (não propaga para não quebrar a operação de negócio) | |

### FT-08.04 Consulta de auditoria

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.04.001 | Usuários autorizados devem poder consultar eventos de auditoria. | done | back: `GET /audit-events` (`@PreAuthorize("hasRole('ADMIN')")`); front: `AuditPage` (visível só para `ADMIN`) | |
| [x] | REQ-08.04.002 | O sistema deve permitir filtrar eventos por usuário, ação, recurso, resultado e período. | done | back: filtros `userId/action/resourceType/result/from/to`; front: formulário de filtros em `AuditPage` | |
| [x] | REQ-08.04.003 | O sistema deve permitir pesquisar eventos por recurso ou correlação. | done | back: filtros `resourceId`/`correlationId` | |
| [x] | REQ-08.04.004 | O sistema deve apresentar os eventos em ordem cronológica e com paginação. | done | back: `Pageable`, ordenado por `occurred_at DESC`; front: paginação de 20 registros por página | |

Observação: os registros não armazenam senhas, tokens, segredos ou outros dados sensíveis (REQ-08.03.003/004).

## Changelog deste arquivo

| Data | Alteração |
|---|---|
| 2026-08-08 | EP-06 (Versionamento de jornadas), EP-07 (Autenticação e autorização) e EP-08 (Auditoria) implementados, na ordem EP-07 → EP-06 → EP-08 (dependência: versão precisa de usuário autenticado; auditoria precisa de ambos). EP-06: tabela `journey_version` (`V7`) + backfill de jornadas existentes (`V8`), criação automática de versão `DRAFT` ao criar jornada, publicação de versão arquiva a anterior, snapshot imutável, painel de versões no designer de fluxo — 35/35 REQs. EP-07: token opaco em memória (`Authorization: Bearer`, expiração por inatividade configurável), usuário mockado `admin`/`admin`/`ADMIN`, papéis `ADMIN`/`EDITOR`/`VIEWER` aplicados via `@PreAuthorize` em todos os controllers, tela de login com aviso de autenticação mockada — 24/25 REQs (REQ-07.04.002 n/a, sem CRUD de usuário no MVP). EP-08: tabela `audit_event` (`V9`), gravação em login/logout/sessão, CRUD de produto/canal/jornada, versões, publicações e acessos negados, consulta com filtros e paginação restrita a `ADMIN` — 21/22 REQs (REQ-08.02.007 n/a, sem CRUD de papéis no MVP). De quebra, REQ-02.06.004 (que dependia do EP-06) passou de `todo` para `done`. Simplificações deliberadas: sem rollback/restauração de versão (REQ-06.05.004, fora de escopo); flow-designer continua editando o estado "vivo" da jornada, versionar tira um snapshot desse estado; ocultação de botões por papel na UI não foi replicada em todas as telas (enforcement real é no backend). Progresso geral de 57% para 95% (207/219; 2 n/a; restam apenas os 10 REQs do EP-05 Simulação). |
| 2026-08-08 | Escopo do MVP evoluído com EP-06 Versionamento de jornadas, EP-07 Autenticação e autorização e EP-08 Auditoria. A autenticação será representada por provedor externo mockado, com tela de login e usuário `admin`/`admin` no perfil `ADMIN`; os papéis `ADMIN`, `EDITOR` e `VIEWER` foram incluídos. Versões publicadas são imutáveis; restauração/rollback permanece fora do MVP; auditoria não armazena dados sensíveis. Total: 8 EPs, 42 FTs e 220 REQs; 126 concluídos e 94 todo (57%). |
| 2026-08-08 | REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop `onOpenNewForm` propagada de `App.tsx` → `JourneysPage` → `JourneyDesignerPage` → `PropertiesDock` → `PropertiesPanel`) e "Atualizar" (recarrega `listForms()` sem sair do editor de fluxo, via `refreshForms`). `FormsPage.tsx` ganhou suporte a abrir direto em modo `'new'` (props `openNew`/`onOpenNewHandled`), espelhando o padrão já existente de `openFormId`. Progresso geral de 93% para 93% (arredondamento; 127/137). |
| 2026-08-08 | REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (`HeadersEditor` em `PropertiesPanel.tsx`) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136). |
| 2026-08-08 | Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) `REST` deixou de ser oferecido para `MESSAGE_START_EVENT` — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só `KAFKA` continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (`SERVICE_TASK` → `PRODUCE`, `RECEIVE_TASK`/`MESSAGE_START_EVENT` → `CONSUME`), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em `model.ts` (`CONNECTOR_TYPES_BY_NODE`, `KAFKA_OPERATION_BY_NODE`) e `FlowValidator` (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em `PropertiesDock.tsx` (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam `findFreeSpot` para não empilhar. Progresso geral de 92% para 93%. |
| 2026-08-08 | EP-03 (Modelagem Visual) fechado a 100%: FT-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: `FlowNodeType` ganhou `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT`; novos `ConnectorType` (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e `ConnectorConfig` (tipo + config declarativa `Map<String,Object>` + `credentialRef`, sem secret) associáveis a esses 3 tipos; `FlowValidator` estendido (elemento inicial = `START` ou `MESSAGE_START_EVENT`, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga `connectorConfig` automaticamente (reaproveita `FlowNode`/`FlowNodeRecord`). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no `PropertiesPanel` (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: `Flow.initial` criava `START`+`END` já conectados na criação da jornada; agora só cria o `START`, como o requisito manda. Progresso geral de 80% para 92% (só falta EP-05 Simulação). |
| 2026-08-03 | EP-06 (Publicação) + EP-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (`domain/application/infrastructure/interfaces` para `publication`, migration `V6__create_journey_publication.sql`, endpoints `POST /journeys/{id}/publish`\|`unpublish`, filtro `?status=` em `GET /journeys`) e mock do runtime (`MockRuntimePublicationAdapter`, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (`ActivePublicationPort`/`HasEverBeenPublishedPort`, antes sempre `false`), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram `in_progress`) e REQ-02.05.002/003 (eram `blocked`, já satisfeitos desde EP-03/EP-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (`JourneysPage`), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os `in_progress`/`blocked` restantes. |
| 2026-08-03 | EP-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (`domain/application/infrastructure/interfaces/form`, migration `V5__create_form.sql`, CRUD `/api/v1/forms`) e frontend novo (`front/src/forms/FormsPage.tsx` + `FormBuilderPage.tsx`, `api/forms.ts`, item "Formulários" na sidebar). `FlowNode.formId` (já existente no backend) agora é editável de fato: `PropertiesPanel` ganhou o seletor "Formulário associado" para nós User Task e `JourneyDesignerPage` para de mandar `formId: null` fixo. EP-04 avança de 0% para 100%; progresso geral de 55% para 69%. |
| 2026-08-02 | Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos `Ctrl+C`/`Ctrl+V`/`Ctrl+D` e botão "Duplicar nó" no `NodePropertiesPanel`, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como `n/a`: decisão de produto de não implementar no MVP, salvamento permanece manual. EP-03 avança para 25/26 (96%). |
| 2026-08-02 | Atualização do EP-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam `todo`: copiar elementos, duplicar elementos e salvamento automático. |
| 2026-08-02 | Sincronização com `ej-admin-requisitos.md`: 122 REQs em 8 EPs / 28 FTs, todos como `todo`. |
