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
| Total de Épicos (EP) | 12 |
| Total de Features (FT) | 59 |
| Total de Requisitos (REQ) | 276 |
| Concluídos (`done`) | 232 |
| Em andamento (`in_progress`) | 2 |
| Não iniciados (`todo`) | 40 |
| Bloqueados (`blocked`) | 0 |
| Não aplicável (`n/a`) | 2 |
| % Concluído | 84% |

> 3 requisitos permanecem reclassificados de `done` para `todo` por serem atendidos apenas por mocks/simulações no MVP (sem integração real): REQ-07.01.002, REQ-07.01.005, REQ-07.04.001. Ver nota em cada requisito.
>
> REQ-02.09.003/004 deixaram de ser mock: a publicação/despublicação agora faz uma chamada HTTP real para a API de publicação do runtime (ver evidência dos próprios requisitos).
>
> Correção de contagem: o total de requisitos do EP-02 estava divergente entre este resumo (38) e a seção detalhada (37 linhas). Ajustado para 37, refletido no total geral.
>
> EP-04 refinado e implementado: REQ-04.02.006 (`STATIC_CONTENT`) foi removido/colapsado em `TEXT` (REQ-04.02.001); adicionados e implementados REQ-04.01.007 (`name` técnico do campo), REQ-04.02.007 a REQ-04.02.010 (subtipos/validação de `INPUT`, opções rótulo/valor, regras de arquivo) e a FT-04.06 (imutabilidade do formulário em snapshot de publicação + serialização SDUI). Ver `ej-admin-requisitos.md` para os itens de evolução futura registrados fora do MVP.

## Progresso por Épico

| EP | Nome | REQs | Concluídos | % |
|---|---|---:|---:|---:|
| EP-01 | Gestão de Produtos e Canais | 24 | 24 | 100% |
| EP-02 | Gestão de Jornadas | 39 | 39 | 100% |
| EP-03 | Modelagem Visual | 46 | 46 | 100% |
| EP-04 | Formulários (SDUI) | 25 | 25 | 100% |
| EP-05 | Simulação | 10 | 0 | 0% |
| EP-06 | Versionamento de jornadas | 40 | 40 | 100% |
| EP-07 | Autenticação e autorização | 25 | 21 | 84% (1 n/a) |
| EP-08 | Auditoria | 22 | 21 | 95% (1 n/a) |
| EP-09 | Ajuda e Suporte | 5 | 5 | 100% |
| EP-10 | Observabilidade | 12 | 11 | 92% (1 in_progress) |
| EP-11 | Testes | 12 | 0 | 0% |
| EP-12 | Infraestrutura | 16 | 0 | 0% (1 in_progress) |

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
| [x] | REQ-02.01.004 | O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas. | done | back: `DELETE /api/v1/journeys/{id}` + `DeleteJourney` — quando `HasEverBeenPublishedPort.hasEverBeenPublished` é `false`, apaga fisicamente `journey_version` e `flow` da jornada antes da própria jornada (evita violação de FK) | testado via curl: 204, e as 3 tabelas ficam com 0 linhas para o id |
| [x] | REQ-02.01.005 | Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; ao ser excluída, o sistema deve desativá-la automaticamente (em vez de bloquear a operação), preservando o registro de publicação. | done | back: `DeleteJourney` — quando `hasEverBeenPublished` é `true` e não há publicação ativa, chama `journey.deactivate()` em vez de lançar exceção | regra revisada: antes bloqueava com 409 (`JourneyDeletionBlockedException`, removida) sempre que a jornada já tinha sido publicada, mesmo despublicada há muito tempo; testado via curl: 204, jornada vira `INACTIVE` |
| [x] | REQ-02.01.006 | O sistema deve impedir a exclusão de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes. | done | back: `DeleteJourney` usa a guarda `ActivePublicationPort.existsForJourney` (409 `ActivePublicationExistsException`) | testado via curl: 409 ao tentar excluir jornada `PUBLISHED`; requisito revisado após remoção de `DeactivateJourney` (não existe mais desativação manual separada de exclusão) |
| [x] | REQ-02.01.008 | Ao excluir uma jornada que já foi publicada (REQ-02.01.005), o sistema deve marcar todas as suas versões (`journey_version`) como `INACTIVE`, junto com a desativação da jornada. | done | back: `DeleteJourney` itera `JourneyVersionRepository.findByJourneyId` e chama `JourneyVersion.deactivate()` (novo status `INACTIVE`, substitui o extinto `ARCHIVED`) em cada uma, salvando dentro da mesma `@Transactional` | testado via curl: jornada com 6 versões, todas viram `INACTIVE` após o `DELETE` |
| [x] | REQ-02.01.009 | Uma jornada `INACTIVE` não deve poder ser editada (nem seus dados nem seu fluxo) nem excluída novamente; as ações "Editar" e "Excluir" devem ficar desabilitadas para essas jornadas. | done | back: `UpdateJourney`, `UpdateFlow` e `DeleteJourney` lançam `JourneyInactiveException` (409) quando `journey.status == INACTIVE`; front: botões "Editar" e "Excluir" desabilitados (cinza, sem clique) para jornadas `INACTIVE` em `JourneysPage` | testado via curl: 409 em `PUT /journeys/{id}`, `PUT /journeys/{id}/flow` e `DELETE /journeys/{id}` para jornada `INACTIVE` |

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
| [x] | REQ-04.01.007 | Cada campo de formulário deve possuir um `name` técnico, único no formulário e imutável após criado, substituindo o identificador interno atual como chave de referência do campo. | done | back: `FormField.name` (substitui `id`); `Form.create` valida nomes únicos (`DuplicateFieldNameException`, 422); front: campo "Nome técnico" em `FieldCard`, travado para campos já existentes no formulário carregado | testado via curl: criação com nomes únicos (201) e duplicados (422 `Duplicate form field name`) |

### FT-04.02 Componentes

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.02.001 | O sistema deve suportar componente de texto. | done | back: `FormFieldType.TEXT`; front: `FIELD_TYPE_META.TEXT`, renderizado como rótulo/parágrafo no preview | absorve o antigo `STATIC_CONTENT` (ver REQ-04.02.006) |
| [x] | REQ-04.02.002 | O sistema deve suportar campo de entrada. | done | back: `FormFieldType.INPUT`; front: renderizado como `<input>` no preview | subtipo suportado, ver REQ-04.02.007 |
| [x] | REQ-04.02.003 | O sistema deve suportar seleção simples. | done | back: `FormFieldType.SINGLE_SELECT`; front: editor de opções + preview `<select>` | opções como pares rótulo/valor, ver REQ-04.02.009 |
| [x] | REQ-04.02.004 | O sistema deve suportar seleção múltipla. | done | back: `FormFieldType.MULTI_SELECT`; front: editor de opções + preview checkboxes | opções como pares rótulo/valor, ver REQ-04.02.009 |
| [x] | REQ-04.02.005 | O sistema deve suportar upload de arquivo. | done | back: `FormFieldType.FILE_UPLOAD`; front: preview `<input type="file">` | regra de extensão/tamanho suportada, ver REQ-04.02.010 |
| [~] | ~~REQ-04.02.006~~ | ~~O sistema deve suportar conteúdo estático.~~ | removido | | colapsado em `TEXT` (REQ-04.02.001); não conta mais no total de requisitos |
| [x] | REQ-04.02.007 | O campo `INPUT` deve suportar subtipos: texto, número, e-mail e data. | done | back: `InputSubtype` (TEXT/NUMBER/EMAIL/DATE), `FormField.inputSubtype`; front: seletor "Subtipo" em `FieldCard`, `<input type>` correspondente no preview | |
| [x] | REQ-04.02.008 | O sistema deve permitir validação de formato por subtipo de `INPUT` (min/max para número; regex/máscara para texto). | done | back: `FormField.minValue`/`maxValue`/`validationPattern`; front: campos "Mínimo"/"Máximo" (subtipo `NUMBER`) e "Expressão regular" (subtipo `TEXT`) em `FieldCard` | testado via curl: form com `age` (`min:0,max:120`) criado e publicado com sucesso |
| [x] | REQ-04.02.009 | As opções de seleção simples/múltipla devem ser pares rótulo/valor, não apenas rótulo. | done | back: `FormFieldOption(label,value)` (substitui `List<String>`); front: editor de opções com dois campos (rótulo/valor) em `FieldCard` | leitura retrocompatível de opções antigas (string simples) via `FormFieldOption.LegacyDeserializer`, para não quebrar publicações já existentes |
| [x] | REQ-04.02.010 | O upload de arquivo deve permitir configurar extensões aceitas e tamanho máximo. | done | back: `FormField.acceptedExtensions`/`maxFileSizeBytes`; front: campos "Extensões aceitas" e "Tamanho máximo (MB)" em `FieldCard`, `accept` aplicado no preview | testado via curl: campo `document` com `[".pdf",".jpg"]` e `5242880` bytes |

### FT-04.03 Reutilização

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.03.001 | O sistema deve permitir reutilizar formulários em múltiplas jornadas. | done | back: `Form` é uma entidade independente, sem vínculo de jornada; `FlowNode.formId` de qualquer jornada pode apontar para o mesmo `formId` | |
| [x] | REQ-04.03.002 | O sistema deve permitir reutilizar formulários em múltiplas User Tasks. | done | back: idem — múltiplos `FlowNode` (mesma ou diferentes jornadas) podem compartilhar o mesmo `formId` | |

### FT-04.04 Configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.04.001 | O usuário deve poder definir campos obrigatórios. | done | back: `FormField.required`; front: checkbox "Campo obrigatório" em `FieldCard` | |
| [x] | REQ-04.04.002 | O usuário deve poder definir valores padrão. | done | back: `FormField.defaultValue`; front: campo "Valor padrão" em `FieldCard` | não aplicável a `TEXT`/`FILE_UPLOAD`/campos de seleção |
| [x] | REQ-04.04.003 | O usuário deve poder definir textos de ajuda. | done | back: `FormField.helpText`; front: campo "Texto de ajuda" em `FieldCard`, exibido no preview | |

### FT-04.05 Preview

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.05.001 | O sistema deve permitir visualizar o formulário durante a edição. | done | front: painel "Preview" fixo em `FormBuilderPage` (`FormPreview`) | |
| [x] | REQ-04.05.002 | O preview deve refletir alterações em tempo real. | done | front: `FormPreview` renderiza diretamente o state `fields` da própria página, sem etapa de sincronização | |

### FT-04.06 Imutabilidade e serialização para publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.06.001 | Ao publicar uma jornada, o conteúdo de cada formulário referenciado pelas User Tasks deve ser copiado integralmente para o snapshot da publicação, tornando-se imutável a alterações futuras no formulário original. | done | back: `PublicationRepositoryAdapter.save` copia `Form`/`FormField` para `SnapshotFormRecord`/`FormFieldRecord` e persiste como JSON da publicação, independente da linha mutável do formulário | requisito novo (refino do EP-04), documentando comportamento já existente no código |
| [x] | REQ-04.06.002 | O snapshot de publicação deve conter, para cada formulário, uma representação em árvore `[tag, props, children]` (SDUI), derivada do conteúdo congelado do formulário. | done | back: `FormSduiSerializer.serialize` gera a árvore (`ui.form`/`ui.text`/`ui.input`/`ui.select`/`ui.multiselect`/`ui.upload`); campo `sdui` em `SnapshotFormRecord`, populado em `PublicationRepositoryAdapter` e `JourneyVersionRepositoryAdapter` | testado via curl + consulta direta ao Postgres: árvore gerada no `journey_publication.snapshot` bate com o formato esperado |

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
| [x] | REQ-02.09.001 | O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime. | done | back: `PublishJourney`/`UnpublishJourney` chamam `RuntimePublicationPort` (`PublicationAdapter`, chamada HTTP real via `RestClient`) | |
| [x] | REQ-02.09.002 | A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários. | done | back: `Publication` (passada para `RuntimePublicationPort.publish`) carrega jornada, produto, canal, `FlowNode`/`FlowConnection` e `Form`s referenciados | |
| [x] | REQ-02.09.003 | O Admin Portal deve realizar uma chamada de saída real (HTTP) para a API de publicação do runtime. Após sucesso, substitui o snapshot anterior e altera o estado da jornada para `PUBLISHED`; em caso de falha, o erro propaga e nenhum estado é alterado. | done | back: `PublicationAdapter.publish` faz `POST` real via `RestClient`; falhas de rede/HTTP lançam `RuntimePublicationException` (mapeada para 502 `RUNTIME_UNAVAILABLE`), e `PublishJourney` só persiste `Publication`/`journey.publish()` depois da chamada não lançar | Deixou de ser mock: testado via curl ponta a ponta publicando de fato no runtime configurado |
| [x] | REQ-02.09.004 | Ao despublicar, o Admin Portal deve chamar a API de publicação do runtime para remover/desfazer a publicação. Após sucesso, jornada e publicação assumem `UNPUBLISHED`; em caso de falha, os estados atuais são preservados. | done | back: `PublicationAdapter.unpublish` faz `DELETE` real via `RestClient`; falha lança `RuntimePublicationException` (502); `UnpublishJourney` só chama `journey.unpublish()`/`save` após a chamada não lançar | Deixou de ser mock: testado via curl ponta a ponta despublicando de fato no runtime configurado; jornada assume `UNPUBLISHED` (registro preservado, ver REQ-02.06.004) |

### FT-02.10 Inspeção da publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.10.001 | Para uma jornada com publicação ativa (`PUBLISHED`), o sistema deve permitir visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários, incluindo a árvore SDUI de cada formulário), por meio de uma ação na listagem de jornadas ao lado de "Editar" e "Excluir". | done | back: `GET /api/v1/journeys/{id}/publication` (`GetPublicationSnapshot` + `PublicationSnapshotRecord.from`, 409 se a jornada não estiver `PUBLISHED`); front: ícone "Ver publicação" (`FileJson`) em `JourneyActions`, abre `PublicationSnapshotModal` com o JSON completo e botão "Copiar JSON" | testado via curl: 200 com JSON completo em jornada `PUBLISHED`, 409 em jornada não publicada; escopo mais restrito que o `REQ-06.03.006` removido (só a publicação ativa da jornada, não qualquer versão histórica) |

---

## EP-06 Versionamento de jornadas

### FT-06.01 Modelo de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.01.001 | O sistema deve permitir que uma jornada possua múltiplas versões. | done | back: `journey_version` (`V7__create_journey_version.sql`), `domain/version/JourneyVersion` | |
| [x] | REQ-06.01.002 | Cada versão deve possuir identificador único (`versionId`). | done | back: `journey_version.version_id UUID PRIMARY KEY` | |
| [x] | REQ-06.01.003 | Cada versão deve possuir número sequencial iniciado em `1` dentro da jornada. | done | back: `CreateJourney`/`CreateJourneyVersion` incrementam `versionNumber` a partir de 1 por jornada | |
| [x] | REQ-06.01.004 | Cada versão deve estar associada a exatamente uma jornada. | done | back: `journey_version.journey_id NOT NULL` + FK | |
| [x] | REQ-06.01.005 | Cada versão deve possuir status `DRAFT`, `PUBLISHED`, `UNPUBLISHED` ou `INACTIVE`. | done | back: `VersionStatus` enum + CHECK constraint (`V2__replace_archived_version_status_with_inactive.sql`) | `ARCHIVED` removido (não era mais produzido por nenhum fluxo); `INACTIVE` substitui, com novo significado: versão de jornada excluída (REQ-02.01.008) |
| [x] | REQ-06.01.006 | Uma jornada deve possuir no máximo uma versão `PUBLISHED`. | done | back: `PublishJourneyVersion` arquiva a versão `PUBLISHED` anterior antes de publicar a nova | |
| [x] | REQ-06.01.007 | Cada versão deve registrar criação e publicação, quando aplicável. | done | back: `journey_version.created_at`/`published_at` | |
| [x] | REQ-06.01.008 | Cada versão deve permitir observação opcional. | done | back: `journey_version.description` (nullable); front: exibida na linha da versão em `JourneysPage` | |

### FT-06.02 Criação e edição de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.02.001 | Ao criar uma jornada, o sistema deve criar sua primeira versão em `DRAFT`. | done | back: `CreateJourney` cria a versão 1 `DRAFT` junto com a jornada | |
| [x] | REQ-06.02.002 | O sistema deve permitir criar uma nova versão a partir da versão atual. | done | back: `POST /journeys/{id}/versions` + `CreateJourneyVersion`; front: linha de versão expansível em `JourneysPage` | |
| [x] | REQ-06.02.003 | O sistema deve criar a nova versão a partir da versão atualmente selecionada para edição. | done | back: `CreateJourneyVersion` parte do estado vivo do fluxo/formulários da jornada (superfície de edição atual) | |
| [x] | REQ-06.02.004 | A nova versão deve possuir cópia independente do fluxo, conexões e referências aos formulários. | done | back: `JourneySnapshotFactory` gera snapshot JSONB independente por versão | |
| [x] | REQ-06.02.005 | Alterações em uma versão `DRAFT` não devem modificar outras versões. | done | back: cada `journey_version` é uma linha isolada com seu próprio `version_snapshot` | |
| [x] | REQ-06.02.006 | Uma versão `PUBLISHED` deve ser imutável. | done | back: nenhum endpoint de update para `journey_version`; `PublishJourneyVersion` só transiciona status | |
| [x] | REQ-06.02.007 | O sistema deve indicar claramente qual versão está sendo editada. | done | front: badge "Editando vN (STATUS)" no designer de fluxo (`Toolbar`) | |
| [x] | REQ-06.02.008 | O sistema deve impedir números de versão duplicados dentro da mesma jornada. | done | back: `UNIQUE (journey_id, version_number)` em `journey_version` | |
| [x] | REQ-06.02.009 | Ao salvar o fluxo de uma jornada, o sistema deve manter a versão `DRAFT` atual sincronizada com o conteúdo salvo: se já existir uma `DRAFT`, seu conteúdo é substituído (mesmo id/versionNumber); caso não exista, uma nova `DRAFT` é criada. Outras versões nunca são alteradas. | done | back: `UpdateFlow` chama `CreateJourneyVersion.execute` incondicionalmente a cada salvamento; `CreateJourneyVersion` decide entre `JourneyVersion.replaceContent(...)` (DRAFT existente) e `JourneyVersion.createDraft(...)` (nenhuma DRAFT) | substitui a versão anterior deste requisito, que só sincronizava quando a jornada estava `PUBLISHED` — deixava a v1 (criada vazia com a jornada) sem nunca refletir o fluxo editado em jornadas ainda não publicadas |
| [x] | REQ-06.02.010 | Antes de salvar a edição de uma jornada `PUBLISHED`, o sistema deve avisar o usuário de que a alteração será registrada em uma versão em rascunho separada da publicada. | done | front: `ConfirmDialog` em `JourneyDesignerPage.handleSave` quando `activeJourney.status === 'PUBLISHED'` | |

### FT-06.03 Histórico e consulta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.03.001 | O sistema deve permitir listar todas as versões de uma jornada. | done | back: `GET /journeys/{id}/versions`; front: linhas aninhadas ao expandir a jornada em `JourneysPage` | |
| [x] | REQ-06.03.002 | O sistema deve permitir consultar o conteúdo completo de uma versão. | done | back: `GET /journeys/{id}/versions/{versionId}` retorna o `snapshot` completo | |
| [x] | REQ-06.03.003 | O histórico deve exibir número, status, datas e autor da versão. | done | front: colunas número/status/data/autor nas linhas de versão de `JourneysPage` | |
| [x] | REQ-06.03.004 | O sistema deve permitir ordenar versões por número ou data. | done | back: listagem ordenada por `version_number`; `created_at`/`published_at` disponíveis para ordenação no front | ordenação padrão por número; sem seletor de ordenação alternativa na UI |
| [x] | REQ-06.03.005 | O sistema deve diferenciar versões em edição, publicadas, arquivadas e despublicadas. | done | front: badges de status coloridos (`DRAFT`/`PUBLISHED`/`ARCHIVED`/`UNPUBLISHED`) nas linhas de versão de `JourneysPage` | |

### FT-06.04 Publicação de versões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.04.001 | O sistema deve permitir publicar uma versão `DRAFT`. | done | back: `POST /journeys/{id}/versions/{versionId}/publish` + `PublishJourneyVersion` (rejeita se não `DRAFT`, 409) | |
| [x] | REQ-06.04.002 | Antes da publicação, o sistema deve validar a versão completa da jornada. | done | back: reaproveita a validação existente de canal/produto ativos e resolução de fluxo/formulários (mesma base do `PublishJourney` legado) | |
| [x] | REQ-06.04.003 | A publicação deve enviar ao runtime o snapshot completo da versão selecionada. | done | back: `PublishJourneyVersion` monta `Publication` a partir do snapshot da versão e chama `RuntimePublicationPort.publish` | |
| [x] | REQ-06.04.004 | Ao publicar uma nova versão, a versão anteriormente publicada deve ser marcada como `UNPUBLISHED` (não `ARCHIVED`). | done | back: `PublishJourneyVersion.goLive` marca a versão `PUBLISHED` anterior como `UNPUBLISHED` antes de publicar a nova | requisito revisado: usava `ARCHIVED`, alterado para `UNPUBLISHED` para permitir republicação |
| [x] | REQ-06.04.005 | O sistema deve preservar o snapshot da versão anteriormente publicada. | done | back: versão despublicada mantém sua linha/`version_snapshot` intactos, apenas o status muda | |
| [x] | REQ-06.04.006 | A publicação deve registrar qual versão foi enviada ao runtime. | done | back: `journey_publication.version_id` (FK), preenchido em cada publicação | |
| [x] | REQ-06.04.007 | A jornada deve indicar sua versão atualmente publicada. | done | back: `JourneyResponse.publishedVersionId`/`publishedVersionNumber`; front: "vN publicada" no grid de `JourneysPage` | |
| [x] | REQ-06.04.008 | Alterações em `DRAFT` não devem modificar o snapshot publicado. | done | back: `DRAFT` e `PUBLISHED` são linhas de `journey_version` distintas | |
| [x] | REQ-06.04.009 | Ao despublicar uma jornada, a versão `PUBLISHED` correspondente deve ser marcada como `UNPUBLISHED` (não `ARCHIVED`, reservado a quando a versão é substituída por uma nova publicação), preservando seu snapshot; a jornada deixa de indicar uma versão atualmente publicada. | done | back: `UnpublishJourney` chama `JourneyVersion.unpublish()` na `journey_version` `PUBLISHED` da jornada antes de gravar `journey.unpublish()` | corrige bug: versão continuava `PUBLISHED` (e o grid continuava mostrando "vN publicada") após despublicar; status inicialmente usava `ARCHIVED` por engano, corrigido para `UNPUBLISHED` |
| [x] | REQ-06.04.010 | O sistema deve permitir despublicar a versão atualmente `PUBLISHED` de uma jornada diretamente pela versão; a despublicação de uma versão deve refletir no status da jornada, que passa a `UNPUBLISHED`. | done | back: `POST /journeys/{id}/versions/{versionId}/unpublish` + `UnpublishJourneyVersion` (valida versão publicada, 409 caso contrário, e delega em `UnpublishJourney` para reaproveitar a mesma regra); front: botão "Despublicar" na linha da versão em `JourneysPage`, que recarrega jornada e versões | |
| [x] | REQ-06.04.011 | O sistema deve permitir republicar qualquer versão `UNPUBLISHED` de uma jornada (não apenas a mais recente), sem alterar seu conteúdo/snapshot, retornando-a a `PUBLISHED` e refletindo no status da jornada, que volta a `PUBLISHED`. Se já existir uma versão `PUBLISHED` na jornada no momento da republicação, essa versão deve ser marcada como `UNPUBLISHED` antes (mesmo comportamento de REQ-06.04.004). `ARCHIVED` continua fora de alcance (REQ-06.05.004). | done | back: `POST /journeys/{id}/versions/{versionId}/republish` + `RepublishJourneyVersion` (valida só que a versão é `UNPUBLISHED`, sem checar se é a mais recente) reaproveita `PublishJourneyVersion.goLive(...)` — mesma lógica de validar canal/produto ativos, publicar no runtime e despublicar a `PUBLISHED` atual, extraída do antigo `execute()` — só muda o status de origem (`UNPUBLISHED` em vez de `DRAFT`) e o nome do evento de auditoria (`JOURNEY_VERSION_REPUBLISH`) | regra revisada: antes só a `UNPUBLISHED` mais recente podia ser republicada (`VersionNotLatestUnpublishedException`, removida); agora qualquer `UNPUBLISHED` pode |
| [x] | REQ-06.04.012 | Antes de republicar uma versão, se já existir uma versão `PUBLISHED` na jornada, o sistema deve informar ao usuário que a versão publicada atual será substituída e solicitar confirmação antes de prosseguir. | done | front: `ConfirmDialog` em `JourneyVersionsRows` com mensagem condicional (`hasPublishedVersion`) — avisa que a publicada atual será substituída/despublicada, ou mensagem simples se não houver nenhuma `PUBLISHED` | |

### FT-06.05 Compatibilidade e limites do MVP

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.05.001 | O sistema deve preservar versões de jornadas desativadas. | done | back: `DeleteJourney` (soft-delete de jornada com publicação) marca `journey_version` como `INACTIVE`, sem apagar as linhas/snapshots | evidência atualizada após remoção de `DeactivateJourney` — não existe mais desativação manual isolada, só via exclusão (REQ-02.01.005/008/009) |
| [x] | REQ-06.05.002 | Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual. | done | back: `V8__backfill_journey_version.sql` cria versão 1 (PUBLISHED ou DRAFT conforme publicação existente) para toda jornada pré-existente | |
| [x] | REQ-06.05.003 | O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação. | done | back: `PublishJourney`/`GET /journeys` legados continuam funcionando; `journey.status` (ciclo de vida da jornada) mantido separado do status de versão | |
| [x] | REQ-06.05.004 | O sistema não deve permitir restauração ou rollback de versão no MVP. | done | back: nenhum endpoint de restore/rollback implementado (decisão deliberada, fora de escopo) | |
| [x] | REQ-06.05.005 | O sistema deve registrar a versão associada a cada publicação. | done | back: `journey_publication.version_id` | mesma evidência de REQ-06.04.006 |

## EP-07 Autenticação e autorização

### FT-07.01 Autenticação mockada por provedor externo

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.01.001 | O sistema deve representar a autenticação por meio de um provedor externo. | done | back: `POST /auth/login` modela a fronteira de um provedor externo | |
| [ ] | REQ-07.01.002 | No MVP, a integração com o provedor externo deve ser mockada. | todo | back: `MockUserStore` (usuário hardcoded, sem integração real) | Implementado, porém mockado — não é uma integração real |
| [x] | REQ-07.01.003 | O sistema deve disponibilizar uma tela de login padrão. | done | front: `LoginPage.tsx` | |
| [x] | REQ-07.01.004 | A tela de login deve permitir informar usuário e senha. | done | front: campos usuário/senha em `LoginPage` (`Field`/`TextInput`) | |
| [ ] | REQ-07.01.005 | O MVP deve disponibilizar o usuário mockado `admin`, com senha `admin` e perfil `ADMIN`. | todo | back: `MockUserStore` (`admin`/`admin`/`ADMIN`, UUID fixo `00000000-0000-0000-0000-000000000001`) | Implementado, porém mockado — não é uma integração real |
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
| [ ] | REQ-07.04.001 | O sistema deve representar no MVP o usuário `admin` como usuário administrativo mockado. | todo | back: `MockUserStore` | Implementado, porém mockado — não é uma integração real |
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

## EP-09 Ajuda e Suporte

### FT-09.01 Central de ajuda

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-09.01.001 | O sistema deve disponibilizar uma tela de ajuda acessível a partir do menu do Admin Portal. | done | front: item "Ajuda e suporte" em `Sidebar.tsx` abre `HELP_TAB` (`App.tsx`, `kind: 'help'`) | |
| [x] | REQ-09.01.002 | A tela de ajuda deve apresentar um conjunto de perguntas frequentes (FAQ) organizadas por tema. | done | front: `HelpPage.tsx` (`FAQ_ITEMS` agrupado por `topic`, `TOPIC_LABELS`) | |
| [x] | REQ-09.01.003 | O sistema deve permitir pesquisar textualmente o conteúdo do FAQ. | done | front: campo de busca em `HelpPage.tsx`, filtra por pergunta/resposta | |
| [x] | REQ-09.01.004 | O conteúdo do FAQ deve ser mantido como conteúdo estático versionado com o sistema. | done | front: `FAQ_ITEMS` é um array estático no próprio `HelpPage.tsx`, sem backend/CMS | |
| [x] | REQ-09.01.005 | A tela de ajuda deve exibir o contato do time de sustentação (`sustentacao@telefonica.com`) como link `mailto:`, abrindo o cliente de e-mail padrão do usuário. | done | front: link `mailto:sustentacao@telefonica.com` no rodapé de `HelpPage.tsx` | |

## EP-10 Observabilidade

### FT-10.01 Log de requisições de API

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.01.001 | O sistema deve registrar em log a entrada de toda requisição HTTP recebida pela API, incluindo método e caminho. | done | back: `HttpRequestLoggingFilter.doFilterInternal` loga `--> {method} {uri}` antes de `filterChain.doFilter` | |
| [x] | REQ-10.01.002 | O sistema deve registrar em log a saída de toda requisição HTTP, incluindo status de resposta e duração do processamento. | done | back: `HttpRequestLoggingFilter` loga `<-- {method} {uri} status={} durationMs={}` no `finally` | |
| [x] | REQ-10.01.003 | O log de requisição e resposta não deve registrar o corpo (body) da requisição por padrão, para evitar exposição de dados sensíveis. | done | back: `HttpRequestLoggingFilter` não lê/loga `HttpServletRequest`/`HttpServletResponse` body, só metadados (método, path, status, duração) | simplificação deliberada — sem `ContentCachingRequestWrapper`; adicionar log de body em `DEBUG` se necessário no futuro |

### FT-10.02 Log de transações de persistência

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.02.001 | O sistema deve registrar em log o início de toda transação da camada de aplicação que represente uma operação de persistência em banco de dados. | done | back: `TransactionLoggingAspect.logTransaction` (`@Around`) loga `BEGIN {signature}`; pointcut cobre todo `@Service` em `com.jouney.admin.application..*` | |
| [x] | REQ-10.02.002 | O sistema deve registrar em log a conclusão de uma transação bem-sucedida, incluindo sua duração. | done | back: `TransactionLoggingAspect` loga `COMMIT {signature} durationMs={}` após `joinPoint.proceed()` | |
| [x] | REQ-10.02.003 | O sistema deve registrar em log a falha de uma transação, incluindo a causa do erro, sem interromper a propagação da exceção original. | done | back: `TransactionLoggingAspect` loga `ROLLBACK {signature} durationMs={} error={}` em `catch (Throwable ex)` e relança (`throw ex`) | |

### FT-10.03 Correlação de logs

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.03.001 | Toda requisição de API deve ser associada a um identificador de correlação. | done | back: `HttpRequestLoggingFilter.resolveCorrelationId` | mesmo conceito de correlação já usado pela auditoria (`RecordAuditEvent.correlationId`, EP-08) |
| [x] | REQ-10.03.002 | O identificador de correlação deve ser reaproveitado do cabeçalho `X-Correlation-Id` da requisição quando presente, ou gerado pelo sistema quando ausente. | done | back: `HttpRequestLoggingFilter.resolveCorrelationId` lê o header `X-Correlation-Id`; se ausente/vazio, gera `UUID.randomUUID()` | |
| [x] | REQ-10.03.003 | O identificador de correlação deve estar presente em todas as linhas de log emitidas durante o processamento da requisição, incluindo as de transação de persistência. | done | back: `HttpRequestLoggingFilter` grava o id no `MDC` (`correlationId`) antes de `filterChain.doFilter`; `logback-spring.xml` inclui `%X{correlationId}` no pattern, aplicado a toda linha da thread da requisição — inclusive as do `TransactionLoggingAspect`, que roda na mesma thread | `MDC.remove` no `finally` evita vazamento entre requisições (pool de threads) |
| [x] | REQ-10.03.004 | O identificador de correlação deve ser retornado ao cliente no cabeçalho de resposta. | done | back: `HttpRequestLoggingFilter` faz `response.setHeader("X-Correlation-Id", correlationId)` | |

### FT-10.04 Preparação para integração com ELK

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-10.04.001 | O sistema deve estar tecnicamente preparado para o envio dos logs de aplicação a uma stack ELK (Elasticsearch/Logstash/Kibana), permanecendo essa integração desativada no MVP por não haver ambiente ELK disponível. | in_progress | back: `logback-spring.xml` centraliza toda a configuração de log (appender único `CONSOLE`); bloco de comentário reserva o ponto de extensão para um appender Logstash, ainda não adicionado/habilitado | pendente apenas a configuração do appender/conexão quando houver um ambiente ELK disponível — resto já está pronto |
| [x] | REQ-10.04.002 | O sistema deve documentar o procedimento (how-to) para habilitar a integração com o ELK quando um ambiente estiver disponível. | done | doc: seção "HOW TO — habilitar integração com ELK" abaixo | |

#### HOW TO — habilitar integração com ELK

Pré-requisito: stack ELK (Elasticsearch + Logstash + Kibana) acessível pela
rede do backend, com um input Logstash TCP ou Beats configurado para receber
logs.

1. Adicionar a dependência ao `back/pom.xml`:
   ```xml
   <dependency>
       <groupId>net.logstash.logback</groupId>
       <artifactId>logstash-logback-encoder</artifactId>
       <version>8.0</version> <!-- checar versão compatível com Logback do Spring Boot 4.1 -->
   </dependency>
   ```
2. Em `back/src/main/resources/logback-spring.xml`, adicionar um appender TCP
   apontando para o Logstash, no lugar do comentário existente:
   ```xml
   <appender name="LOGSTASH" class="net.logstash.logback.appender.LogstashTcpSocketAppender">
       <destination>${LOGSTASH_HOST:-logstash}:${LOGSTASH_PORT:-5000}</destination>
       <encoder class="net.logstash.logback.encoder.LogstashEncoder">
           <includeMdcKeyName>correlationId</includeMdcKeyName>
       </encoder>
   </appender>
   ```
3. Referenciar o novo appender em `<root>` (mantendo o `CONSOLE` para
   observação local):
   ```xml
   <root level="INFO">
       <appender-ref ref="CONSOLE"/>
       <appender-ref ref="LOGSTASH"/>
   </root>
   ```
4. Parametrizar `LOGSTASH_HOST`/`LOGSTASH_PORT` via variável de ambiente no
   deploy (não versionar endpoint fixo de produção).
5. No Kibana, criar um index pattern para os documentos recebidos e validar
   que `correlationId` chega como campo pesquisável — ele é o que permite
   juntar, numa mesma busca, os logs de entrada/saída de API
   (`com.jouney.admin.http`) com os de transação
   (`com.jouney.admin.transaction`) de uma mesma requisição.
6. Rodar um smoke test: disparar uma requisição autenticada, confirmar no
   Kibana que apareceram as linhas `-->`/`<--` e `BEGIN`/`COMMIT` com o mesmo
   `correlationId`.

Nenhum código Java precisa mudar para habilitar isso — a instrumentação
(filtro + aspecto + MDC) já está pronta; a integração é só configuração de
appender.

---

## EP-11 Testes

### FT-11.01 Testes unitários de domínio (back)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.01.001 | O sistema deve possuir testes unitários para as regras estruturais do fluxo (`FlowValidator`): cardinalidade de START/END, caminho contínuo entre início e fim, elemento inicial único. | todo | | |
| [ ] | REQ-11.01.002 | O sistema deve possuir testes unitários para as regras de versionamento de jornada: criação de DRAFT, publicação, despublicação, republicação, imutabilidade de versão `PUBLISHED`. | todo | | |
| [ ] | REQ-11.01.003 | O sistema deve possuir testes unitários para as regras de formulário: nome de campo único, tipos/subtipos de campo, geração da árvore SDUI. | todo | | |
| [ ] | REQ-11.01.004 | O sistema deve possuir testes unitários para as regras de integridade entre produto/canal/jornada (bloqueio de desativação com publicação ativa). | todo | | |

### FT-11.02 Testes de integração de API (back)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.02.001 | O sistema deve possuir testes de integração cobrindo o CRUD completo de produtos, canais e jornadas via API. | todo | | |
| [ ] | REQ-11.02.002 | O sistema deve possuir testes de integração cobrindo o ciclo de publicação/despublicação/republicação de versões, incluindo o registro de auditoria de sucesso e falha. | todo | | |
| [ ] | REQ-11.02.003 | O sistema deve possuir testes de integração cobrindo autenticação e autorização por papel (`ADMIN`/`EDITOR`/`VIEWER`) nos principais endpoints. | todo | | |
| [ ] | REQ-11.02.004 | O sistema deve possuir testes de integração cobrindo o CRUD de formulários e a associação a User Tasks. | todo | | |

### FT-11.03 Testes de frontend

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.03.001 | O sistema deve possuir testes automatizados para o form builder (adicionar/remover campo, validação de nome técnico único, subtipos de `INPUT`). | todo | | |
| [ ] | REQ-11.03.002 | O sistema deve possuir testes automatizados para a validação estrutural do editor de fluxo (bloqueio de ações inválidas). | todo | | |

### FT-11.04 Cenários end-to-end

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.04.001 | O sistema deve possuir um cenário end-to-end cobrindo o fluxo completo: criar produto → canal → jornada → formulário → fluxo → publicar → despublicar. | todo | | |
| [ ] | REQ-11.04.002 | O sistema deve possuir um cenário end-to-end cobrindo criação, publicação e republicação de múltiplas versões de uma mesma jornada. | todo | | |

---

## EP-12 Infraestrutura

### FT-12.01 Identidade da solução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.01.001 | Definição da sigla sistêmica e disponibilização de ambiente na Azure. | in_progress | | sigla `ELJY` já criada; falta a disponibilização do ambiente na Azure |

### FT-12.02 Containerização (Docker)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.02.001 | Criar Dockerfile para o admin-back. | todo | | |
| [ ] | REQ-12.02.002 | Criar Dockerfile para o admin-front (build estático servido por um servidor web). | todo | | |
| [ ] | REQ-12.02.003 | Criar docker-compose para ambiente de desenvolvimento local (back + front + banco de dados). | todo | | |

### FT-12.03 Orquestração (Kubernetes)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.03.001 | Criar manifests/Helm chart para deploy do admin-back no cluster. | todo | | |
| [ ] | REQ-12.03.002 | Criar manifests/Helm chart para deploy do admin-front no cluster. | todo | | |
| [ ] | REQ-12.03.003 | Configurar ConfigMap/Secret para variáveis de ambiente e credenciais por ambiente. | todo | | |
| [ ] | REQ-12.03.004 | Definir requests/limits de recursos e health checks (liveness/readiness) para os workloads. | todo | | |
| [ ] | REQ-12.03.005 | Configurar ingress/roteamento externo para os serviços expostos. | todo | | |

### FT-12.04 Esteira CI/CD

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.04.001 | Pipeline de build e testes automatizados a cada push/PR (integrado ao EP-11 Testes). | todo | | |
| [ ] | REQ-12.04.002 | Pipeline de build e publicação de imagem Docker em um registry. | todo | | |
| [ ] | REQ-12.04.003 | Pipeline de deploy automatizado por ambiente (dev/qa/prod), com aprovação manual obrigatória para produção. | todo | | |
| [ ] | REQ-12.04.004 | Versionamento semântico e tagueamento de releases. | todo | | |

### FT-12.05 Ambientes e configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.05.001 | Formalizar a configuração dos perfis dev/qa/prod, com variáveis de ambiente próprias por ambiente. | todo | | |
| [ ] | REQ-12.05.002 | Documentar o procedimento de subida de cada ambiente (how-to). | todo | | |

### FT-12.06 Banco de dados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.06.001 | Indicar a necessidade de criação da base de dados por ambiente. | todo | | |

## Changelog deste arquivo

| Data/Hora | Alteração |
|---|---|
| 2026-08-10 02:54 (não commitado) | EP-11 Testes e EP-12 Infraestrutura novos, aprovados pelo usuário. EP-11: 4 FTs / 12 REQs (`todo`) cobrindo testes unitários de domínio, testes de integração de API, testes de frontend e cenários end-to-end — hoje o projeto não tem nenhum teste automatizado. EP-12: 6 FTs / 16 REQs cobrindo identidade da solução, containerização (Docker), orquestração (Kubernetes), esteira CI/CD, configuração de ambientes e banco de dados; `REQ-12.01.001` (sigla + ambiente Azure) já nasce `in_progress` — a sigla `ELJY` já foi criada, falta a disponibilização do ambiente. Nenhuma sugestão fora de escopo foi registrada para esses dois épicos, por pedido do usuário. Totais: de 10 EPs/49 FTs/248 REQs (94%) para 12 EPs/59 FTs/276 REQs (84% — a queda no percentual reflete só a base maior de requisitos, nada foi desfeito). |
| 2026-08-10 02:21 (não commitado) | REQ-10.04.001 reclassificado de `done` para `in_progress`: a preparação técnica (log centralizado, ponto de extensão reservado para appender Logstash) está pronta, mas falta a configuração/conexão de fato com um ambiente ELK real, ainda não disponível. EP-10 vai de 12/12 (100%) para 11/12 (92%, 1 in_progress); progresso geral de 94% (233/248) para 94% (232/248, 1 in_progress). |
| 2026-08-10 02:21 (não commitado) | Corrigida lacuna de auditoria (REQ-08.01.006/REQ-08.02.005): `UnpublishJourney.execute` e `PublishJourneyVersion.goLive` só registravam `AuditResult.SUCCESS`, nunca `FAILURE` — quando a chamada ao runtime (`RuntimePublicationPort`) falhava, a exceção interrompia o método antes da linha de auditoria, e a falha não deixava nenhum rastro. Agora a chamada ao runtime é envolvida em `try/catch`: em caso de exceção, grava `AuditResult.FAILURE` com a mensagem de erro antes de relançá-la (o response HTTP `502 RUNTIME_UNAVAILABLE` continua igual). Testado via curl: derrubei o `ms-transform-publication` de propósito, tentei despublicar uma jornada (502 como esperado) e confirmei o evento `FAILURE` em `GET /audit-events`. |
| 2026-08-10 02:21 (não commitado) | REQ-02.10.001 novo e implementado (FT-02.10 Inspeção da publicação): para uma jornada `PUBLISHED`, visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários com a árvore SDUI), via ação na listagem de jornadas ao lado de "Editar"/"Excluir". Back: `GET /api/v1/journeys/{id}/publication` (`GetPublicationSnapshot`, 409 se não publicada) + `PublicationSnapshotRecord.from(Publication)` extraído como factory compartilhada entre esse endpoint e `PublicationAdapter` (mesma serialização, uma só fonte). Front: ícone "Ver publicação" em `JourneyActions`, `PublicationSnapshotModal` novo (JSON formatado + copiar). Escopo mais restrito que o `REQ-06.03.006` removido anteriormente: só a publicação ativa da jornada, não qualquer versão histórica. Testado via curl (200 com JSON completo / 409 sem publicação). EP-02 fecha em 39/39 (100%). |
| 2026-08-10 02:21 (não commitado) | REQ-02.09.003/004 deixaram de ser mock: `MockRuntimePublicationAdapter` removido, substituído por `PublicationAdapter` (`infrastructure/publication`), que faz uma chamada HTTP real (`POST`/`DELETE` via `RestClient`) para a API de publicação do runtime — o Admin Portal não conhece nem depende de qual engine implementa essa API do outro lado. Endereço do serviço configurável por ambiente em `app.transform-publication.base-url` (perfil `dev`, com override via variável de ambiente `TRANSFORM_PUBLICATION_BASE_URL`; `qa`/`prod` ainda pendentes de valor próprio). Falhas de rede/HTTP agora propagam como `RuntimePublicationException`, mapeada para `502 RUNTIME_UNAVAILABLE` no `GlobalExceptionHandler`, em vez de sempre "suceder" como o mock fazia — `PublishJourney`/`UnpublishJourney` só persistem o novo estado se a chamada não lançar. Testado via curl ponta a ponta publicando e despublicando de fato contra o serviço configurado localmente. EP-02 fecha em 38/38 (100%). |
| 2026-08-09 23:50 (não commitado) | EP-04 (Formulários/SDUI) implementado: `FormField.id`→`name` (chave técnica única, imutável após criada, validada em `Form.create` via `DuplicateFieldNameException`, 422); `options` migrado de `List<String>` para `FormFieldOption(label,value)`; `InputSubtype` (TEXT/NUMBER/EMAIL/DATE) com `minValue`/`maxValue`/`validationPattern`; `FILE_UPLOAD` com `acceptedExtensions`/`maxFileSizeBytes`; novo `FormSduiSerializer` gera a árvore `[tag,props,children]` (`ui.form`/`ui.text`/`ui.input`/`ui.select`/`ui.multiselect`/`ui.upload`), persistida no campo `sdui` de `SnapshotFormRecord` em `PublicationRepositoryAdapter`/`JourneyVersionRepositoryAdapter`. Sem migration — os campos do formulário já eram um blob JSON, não colunas relacionais. Compatibilidade retroativa: `FormFieldOption.LegacyDeserializer` aceita o formato antigo (string simples) e `FormFieldType.fromJson` mapeia o extinto `STATIC_CONTENT` para `TEXT`, para publicações/versões já existentes no banco continuarem legíveis (a validação de nome único também não roda na reidratação a partir de snapshot, só na criação/edição pelo usuário). Front (`FormBuilderPage.tsx`): campo "Nome técnico" (travado para campos pré-existentes), seletor de subtipo com min/max ou regex condicionais, editor de opções rótulo+valor, configuração de extensões/tamanho em upload. Testado via curl ponta a ponta (criação com os novos campos, rejeição de nome duplicado, publicação de jornada com inspeção direta do snapshot no Postgres confirmando a árvore SDUI) e build de produção do front (`tsc -b && vite build`). |
| 2026-08-09 22:11 | EP-04 (Formulários/SDUI) refinado com foco em compatibilidade com o formato de renderização SDUI (`[tag, props, children]`) usado pelas ferramentas de renderização React/Flutter. `REQ-04.02.006` (`STATIC_CONTENT`) removido/colapsado em `TEXT` — mesmo modelo de dados, diferença só visual. Adicionados `REQ-04.01.007` (`name` técnico do campo, único e imutável, substituindo o `id` interno), `REQ-04.02.007`-`REQ-04.02.010` (subtipo/validação de `INPUT`, opções como pares rótulo/valor, regras de extensão/tamanho em `FILE_UPLOAD`) e a nova `FT-04.06` (`REQ-04.06.001`, já implementado pelo `PublicationRepositoryAdapter` — imutabilidade do formulário no snapshot de publicação; `REQ-04.06.002`, novo — serialização do formulário para árvore SDUI no momento da publicação). Nenhum código alterado nesta rodada, só documentação (`ej-admin-requisitos.md`, `progresso.md`, modelo conceitual/físico, dicionário de dados, arquitetura lógica, OpenAPI e nota de aviso na massa de dados de seed). Itens fora do MVP (fontes de dados dinâmicas para opções, `$dataSource`, prefetch, paginação de opções, formulários multi-etapas) registrados em `§5 Fora do Escopo do MVP → Formulários Avançados`. Nomenclatura dos documentos de modelo de dados alinhada de `FormComponent`/`component_id` para `FormField`/`name`, batendo com o domínio já implementado no back. |
| 2026-08-09 03:13 | "Desativar jornada" removido: com "Excluir" já cobrindo o caso (soft-delete para `INACTIVE` quando a jornada já foi publicada, exclusão física quando não), manter um botão de desativação manual separado — que virava a jornada `INACTIVE` sem tocar nas versões, resultado diferente e inconsistente com o significado que `INACTIVE` passou a ter (jornada excluída) — não fazia mais sentido. Removidos `DeactivateJourney` (back), `POST /journeys/{id}/deactivate`, `deactivateJourney` (front), estado `deactivatingJourney`, seu `ConfirmDialog` e o botão (ícone `PowerOff`) do grid de jornadas. REQ-02.01.006 reformulado para falar só de bloqueio de exclusão (não mais "desativação ou exclusão"); REQ-06.05.001 com evidência atualizada para `DeleteJourney`. `Journey.deactivate()` (método de domínio) continua existindo — é o que `DeleteJourney` chama internamente no caminho de soft-delete. |
| 2026-08-09 03:04 | REQ-02.01.009 estendido: além de editar, uma jornada `INACTIVE` também não pode ser excluída de novo (era possível reexecutar `DELETE` sem efeito colateral perigoso, mas sem sentido de produto). `DeleteJourney` passou a checar `journey.status == INACTIVE` logo no início e lançar `JourneyInactiveException` (409), mesma exceção do bloqueio de edição — mensagem generalizada de "Cannot edit" para "Cannot modify an inactive journey" para cobrir os dois casos. Front: botão "Excluir" também desabilitado (cinza, sem clique) para jornadas `INACTIVE` em `JourneysPage`, ao lado do "Editar" já desabilitado. Testado via curl: 409 em `DELETE /journeys/{id}` para jornada `INACTIVE`. |
| 2026-08-09 03:04 | REQ-02.01.007 removido: reativar uma jornada `INACTIVE` deixou de fazer sentido, já que `INACTIVE` agora significa "jornada excluída" (REQ-02.01.005/008), não mais um estado reversível de "pausada". Removidos `ActivateJourney` (back), `POST /journeys/{id}/activate`, `Journey.activate()`, `activateJourney` (front) e o botão "Ativar" do grid de jornadas. REQ-02.01.009 novo em seu lugar: jornada `INACTIVE` não pode mais ser editada — `UpdateJourney` e `UpdateFlow` passam a checar `journey.status == INACTIVE` e lançam a nova `JourneyInactiveException` (409); front desabilita visualmente o botão "Editar" (`IconAction` ganhou suporte a `disabled`) para essas jornadas. Testado via curl: 409 em ambos os endpoints para jornada `INACTIVE`, endpoint de ativar removido (rota inexistente). |
| 2026-08-09 03:04 | REQ-02.01.005/006/008 revisados e `VersionStatus.ARCHIVED` aposentado, virando `INACTIVE` com significado novo. Antes, `DeleteJourney` bloqueava (409, `JourneyDeletionBlockedException`, removida) a exclusão de qualquer jornada que já tivesse sido publicada, mesmo há muito despublicada — bug relatado (jornada "Troca de titularidade 15", só com versões despublicadas/arquivadas, não podia ser excluída). Agora: se a jornada está `PUBLISHED` no momento, bloqueia (409, mesma guarda `ActivePublicationPort.existsForJourney` de `DeactivateJourney`); senão, se já foi publicada alguma vez, faz soft-delete — `journey.deactivate()` + `JourneyVersion.deactivate()` (novo status `INACTIVE`) em cada versão, tudo dentro de um `@Transactional` novo no método; senão (nunca publicada), exclusão física como antes. Migration `V2__replace_archived_version_status_with_inactive.sql`: converte as `ARCHIVED` existentes (só dado sintético de seed, nenhum fluxo real produzia esse status desde a troca para `UNPUBLISHED`) para `UNPUBLISHED`, e a CHECK constraint passa a aceitar `('DRAFT','PUBLISHED','UNPUBLISHED','INACTIVE')`. De quebra, corrigido bug latente: excluir fisicamente uma jornada nunca publicada falhava por violação de FK (suas `journey_version`/`flow` não eram apagadas antes) — `DeleteJourney` agora apaga essas dependências primeiro. Front: `VersionStatus` em `versions.ts` e o badge de status de versão trocam `ARCHIVED`/"Arquivada" por `INACTIVE`/"Inativa"; diálogo e toast de exclusão de jornada diferenciam exclusão física de soft-delete. Testado via curl contra o banco local nos três caminhos (bloqueado, soft-delete, exclusão física). |
| 2026-08-09 03:04 | REQ-06.04.011 revisado: qualquer versão `UNPUBLISHED` de uma jornada pode ser republicada agora, não só a mais recente. `RepublishJourneyVersion` simplificado — removida a checagem `isLatestUnpublished` e a exceção `VersionNotLatestUnpublishedException` (409, também removida do `GlobalExceptionHandler`); passou a só validar que a versão é `UNPUBLISHED` antes de delegar em `PublishJourneyVersion.goLive`. Front: botão "Republicar" agora aparece em toda versão `UNPUBLISHED` da lista (`JourneysPage`), não só na mais recente. |
| 2026-08-09 03:04 | REQ-06.04.004/011 corrigidos: ao publicar uma nova versão (inclusive via republicação), a versão anteriormente `PUBLISHED` agora é marcada como `UNPUBLISHED`, não mais `ARCHIVED` — `ARCHIVED` fica reservado a versões legadas, sem uso em nenhum fluxo atual. `PublishJourneyVersion.goLive` passou a chamar `previous.unpublish()` em vez de `previous.archive()`; textos de requisito, comentários e o diálogo de confirmação de republicação (`JourneysPage`) atualizados de "arquivada" para "despublicada". Sem mudança de contagem de REQs (ambos continuam `done`), só de comportamento/redação. |
| 2026-08-09 01:12 | REQ-06.03.006 removido: a opção "Ver" (abria o snapshot JSON de uma versão em modal somente-leitura) foi tirada do grid de jornadas (`JourneysPage`) — decisão de produto, sem substituto no MVP. Registrada como fora de escopo, em nova seção "Evolução da Gestão de Jornadas" em `ej-admin-requisitos.md` §5, a comparação (diff) visual entre versões de uma jornada — não havia nada equivalente registrado até então. EP-06 vai de 41/41 para 40/40 REQs (ainda 100%); progresso geral de 93% (224/241) para 93% (223/240). |
| 2026-08-09 01:12 | REQ-06.04.011/012 implementados: republicar a versão `UNPUBLISHED` mais recente de uma jornada. Backend: `PublishJourneyVersion` refatorado — extraído `goLive(journeyId, version, previousStatus, auditAction)` (validação de canal/produto ativos, checagem de flow, publicação no runtime, arquivamento da `PUBLISHED` atual) do antigo `execute()`, agora reaproveitado por `execute()` (DRAFT) e pelo novo `RepublishJourneyVersion` (UNPUBLISHED). `RepublishJourneyVersion` valida que a versão é `UNPUBLISHED` (`VersionNotUnpublishedException`, 409) e que é a mais recente entre as `UNPUBLISHED` da jornada (`VersionNotLatestUnpublishedException`, 409) antes de delegar. Endpoint `POST /journeys/{id}/versions/{versionId}/republish`. Front: botão "Republicar" só na versão `UNPUBLISHED` mais recente (`JourneysPage`), com `ConfirmDialog` cuja mensagem muda se já existe uma `PUBLISHED` que será substituída/arquivada. De quebra, corrigido texto desatualizado no diálogo de despublicar que ainda dizia "passa a arquivada" (era `UNPUBLISHED` desde a correção anterior). EP-06 fecha em 41/41 (100%); progresso geral de 92% (222/241) para 93% (224/241). |
| 2026-08-09 01:12 | REQ-06.04.011/012 novos (ainda não implementados): republicar a versão `UNPUBLISHED` mais recente de uma jornada, voltando-a a `PUBLISHED` sem alterar seu snapshot. Se já houver uma versão `PUBLISHED` na jornada (possível: publicar um `DRAFT` novo depois de despublicar deixa a versão antiga `UNPUBLISHED` coexistindo com a nova `PUBLISHED`), essa versão deve ser arquivada e o usuário avisado/consultado antes de confirmar a substituição — mesmo padrão de REQ-06.02.009/010. Republicar não é rollback: só a `UNPUBLISHED` mais recente pode ser republicada, `ARCHIVED` continua fora de alcance (REQ-06.05.004). EP-06 vai de 40/40 para 41/39 REQs (2 novos `todo`); progresso geral de 93% (222/239) para 92% (222/241). |
| 2026-08-09 00:35 | Migrations Flyway resetadas: as antigas `V1`...`V9`/`V11` foram substituídas por uma única `V1__baseline.sql` com o schema final resultante de todas elas (motivo: um arquivo de migration antigo — `V10__adjust_journey_versioning.sql`, nunca commitado — havia rodado contra o banco local e ficado órfão no `target/` após ser apagado, quebrando a inicialização do Flyway). Banco local `journey_admin` recriado do zero (`DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`); histórico de `flyway_schema_history` reiniciado. Nenhuma mudança de comportamento da aplicação — é só reorganização das migrations. Evidências de requisitos que citam nomes de arquivo antigos (`V7__create_journey_version.sql` etc.) continuam corretas como registro histórico do que foi implementado quando, mesmo que o arquivo em si não exista mais isoladamente. |
| 2026-08-09 00:35 | REQ-06.01.005/06.04.009 corrigidos: versão despublicada agora vira `UNPUBLISHED`, não `ARCHIVED`. Novo status `UNPUBLISHED` em `VersionStatus` (`ARCHIVED` continua reservado ao caso de a versão ser substituída por uma nova publicação); migration `V11__add_unpublished_version_status.sql` estende a CHECK constraint de `journey_version.version_status`; `JourneyVersion` ganhou `unpublish()` ao lado de `archive()`; `UnpublishJourney` passou a chamar `unpublish()` na versão `PUBLISHED` da jornada. Front: badge "Despublicada" para o novo status em `JourneysPage`. REQ-06.03.005 atualizado para citar o novo status. |
| 2026-08-09 00:35 | REQ-06.02.009 redefinido: sincronização automática do DRAFT com o fluxo salvo, em vez de só criar uma versão nova quando a jornada estava `PUBLISHED`. `JourneyVersion` ganhou `replaceContent(...)` (permitido só em `DRAFT`, torna a maior parte dos campos da versão não mais `final`); `CreateJourneyVersion.execute` agora decide entre atualizar a `DRAFT` existente in place (mesmo id/versionNumber) ou criar uma nova quando não há nenhuma; `UpdateFlow` chama isso incondicionalmente a cada salvamento de fluxo (removida a checagem `journey.status == PUBLISHED` e a lógica de apagar/recriar a `DRAFT`); `PublishJourney` (atalho legado) simplificado pelo mesmo motivo. Corrige o caso relatado: jornada nunca publicada, com fluxo desenhado no designer, cuja v1 (criada vazia junto com a jornada) nunca refletia o fluxo editado — o botão "Publicar" da versão ficava desabilitado (snapshot vazio) mesmo com o fluxo pronto. REQ-06.02.010 reformulado para não prometer "nova versão" a cada salvamento (às vezes é só atualização da DRAFT existente). |
| 2026-08-08 00:35 | REQ-06.04.010 novo: despublicação por versão. Endpoint `POST /journeys/{id}/versions/{versionId}/unpublish` + `UnpublishJourneyVersion` (valida que `versionId` é a versão `PUBLISHED` da jornada, senão 409 via nova `VersionNotPublishedException`; delega em `UnpublishJourney` para reaproveitar runtime-unpublish + arquivamento de versão + `journey.unpublish()`, em vez de duplicar a regra). Front: botão "Publicar" removido do nível de jornada no grid (`JourneysPage`) — publicação passa a existir só por versão; nova ação "Despublicar" na linha da versão `PUBLISHED`, que ao concluir recarrega tanto a lista de versões quanto a jornada (status e "vN publicada" ficam consistentes de imediato). EP-06 avança de 38/38 para 39/39 REQs; progresso geral de 93% (221/238) para 93% (222/239). |
| 2026-08-08 00:35 | REQ-06.04.009 novo: ao despublicar uma jornada (`UnpublishJourney`), a `journey_version` `PUBLISHED` correspondente agora é arquivada (`ARCHIVED`) antes de gravar `journey.unpublish()`, preservando o snapshot. Corrige inconsistência em que a versão continuava reportada como `PUBLISHED` (e o grid de jornadas continuava exibindo "vN publicada") mesmo depois da jornada ser despublicada. EP-06 avança de 37/37 para 38/38 REQs; progresso geral de 93% (220/237) para 93% (221/238). |
| 2026-08-08 18:46 | EP-10 (Observabilidade) novo e implementado por completo: 12/12 REQs. Log técnico de aplicação (distinto da auditoria de negócio do EP-08): `HttpRequestLoggingFilter` (entrada/saída de toda API, sem log de body, registrado no `SecurityConfig` antes do filtro de autenticação) e `TransactionLoggingAspect` (`@Around` sobre todo `@Service` de `application.*`, logando início/commit/rollback de cada transação de persistência). Correlação via `X-Correlation-Id` (reaproveitado do header ou gerado) propagada por `MDC` e incluída no pattern do novo `logback-spring.xml`, cobrindo tanto os logs de API quanto os de transação da mesma requisição/thread. Integração com ELK preparada mas desativada (sem ambiente ELK neste momento) — ver seção "HOW TO — habilitar integração com ELK" no EP-10 para o procedimento de ativação (dependência `logstash-logback-encoder` + appender TCP + variáveis de ambiente de destino). Build: no Spring Boot 4.1 o starter de AOP foi renomeado de `spring-boot-starter-aop` para `spring-boot-starter-aspectj` — usado o novo nome no `pom.xml`. Progresso geral de 95% (212/224) para 95% (224/236). |
| 2026-08-08 15:45 | EP-09 (Ajuda e Suporte) novo e implementado por completo: 5/5 REQs. Tela de ajuda estática (`front/src/shell/HelpPage.tsx`) com FAQ agrupado por tema, busca textual e link `mailto:sustentacao@telefonica.com`; acessível pelo item "Ajuda e suporte" da sidebar (antes um placeholder genérico). Simplificação deliberada: sem ajuda contextual por tela, sem canal de suporte com registro/consulta de solicitações e sem tela de diagnóstico — cortados do escopo por decisão de produto antes da implementação, não fazem parte do backlog. Progresso geral de 95% (207/219) para 95% (212/224). |
| 2026-08-08 05:59 | EP-06 (Versionamento de jornadas), EP-07 (Autenticação e autorização) e EP-08 (Auditoria) implementados, na ordem EP-07 → EP-06 → EP-08 (dependência: versão precisa de usuário autenticado; auditoria precisa de ambos). EP-06: tabela `journey_version` (`V7`) + backfill de jornadas existentes (`V8`), criação automática de versão `DRAFT` ao criar jornada, publicação de versão arquiva a anterior, snapshot imutável, painel de versões no designer de fluxo — 35/35 REQs. EP-07: token opaco em memória (`Authorization: Bearer`, expiração por inatividade configurável), usuário mockado `admin`/`admin`/`ADMIN`, papéis `ADMIN`/`EDITOR`/`VIEWER` aplicados via `@PreAuthorize` em todos os controllers, tela de login com aviso de autenticação mockada — 24/25 REQs (REQ-07.04.002 n/a, sem CRUD de usuário no MVP). EP-08: tabela `audit_event` (`V9`), gravação em login/logout/sessão, CRUD de produto/canal/jornada, versões, publicações e acessos negados, consulta com filtros e paginação restrita a `ADMIN` — 21/22 REQs (REQ-08.02.007 n/a, sem CRUD de papéis no MVP). De quebra, REQ-02.06.004 (que dependia do EP-06) passou de `todo` para `done`. Simplificações deliberadas: sem rollback/restauração de versão (REQ-06.05.004, fora de escopo); flow-designer continua editando o estado "vivo" da jornada, versionar tira um snapshot desse estado; ocultação de botões por papel na UI não foi replicada em todas as telas (enforcement real é no backend). Progresso geral de 57% para 95% (207/219; 2 n/a; restam apenas os 10 REQs do EP-05 Simulação). |
| 2026-08-08 02:37 | Escopo do MVP evoluído com EP-06 Versionamento de jornadas, EP-07 Autenticação e autorização e EP-08 Auditoria. A autenticação será representada por provedor externo mockado, com tela de login e usuário `admin`/`admin` no perfil `ADMIN`; os papéis `ADMIN`, `EDITOR` e `VIEWER` foram incluídos. Versões publicadas são imutáveis; restauração/rollback permanece fora do MVP; auditoria não armazena dados sensíveis. Total: 8 EPs, 42 FTs e 220 REQs; 126 concluídos e 94 todo (57%). |
| 2026-08-08 01:50 | REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop `onOpenNewForm` propagada de `App.tsx` → `JourneysPage` → `JourneyDesignerPage` → `PropertiesDock` → `PropertiesPanel`) e "Atualizar" (recarrega `listForms()` sem sair do editor de fluxo, via `refreshForms`). `FormsPage.tsx` ganhou suporte a abrir direto em modo `'new'` (props `openNew`/`onOpenNewHandled`), espelhando o padrão já existente de `openFormId`. Progresso geral de 93% para 93% (arredondamento; 127/137). |
| 2026-08-08 01:50 | REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (`HeadersEditor` em `PropertiesPanel.tsx`) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136). |
| 2026-08-08 01:50 | Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) `REST` deixou de ser oferecido para `MESSAGE_START_EVENT` — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só `KAFKA` continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (`SERVICE_TASK` → `PRODUCE`, `RECEIVE_TASK`/`MESSAGE_START_EVENT` → `CONSUME`), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em `model.ts` (`CONNECTOR_TYPES_BY_NODE`, `KAFKA_OPERATION_BY_NODE`) e `FlowValidator` (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em `PropertiesDock.tsx` (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam `findFreeSpot` para não empilhar. Progresso geral de 92% para 93%. |
| 2026-08-08 01:50 | EP-03 (Modelagem Visual) fechado a 100%: FT-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: `FlowNodeType` ganhou `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT`; novos `ConnectorType` (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e `ConnectorConfig` (tipo + config declarativa `Map<String,Object>` + `credentialRef`, sem secret) associáveis a esses 3 tipos; `FlowValidator` estendido (elemento inicial = `START` ou `MESSAGE_START_EVENT`, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga `connectorConfig` automaticamente (reaproveita `FlowNode`/`FlowNodeRecord`). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no `PropertiesPanel` (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: `Flow.initial` criava `START`+`END` já conectados na criação da jornada; agora só cria o `START`, como o requisito manda. Progresso geral de 80% para 92% (só falta EP-05 Simulação). |
| 2026-08-03 03:05 | EP-06 (Publicação) + EP-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (`domain/application/infrastructure/interfaces` para `publication`, migration `V6__create_journey_publication.sql`, endpoints `POST /journeys/{id}/publish`\|`unpublish`, filtro `?status=` em `GET /journeys`) e mock do runtime (`MockRuntimePublicationAdapter`, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (`ActivePublicationPort`/`HasEverBeenPublishedPort`, antes sempre `false`), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram `in_progress`) e REQ-02.05.002/003 (eram `blocked`, já satisfeitos desde EP-03/EP-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (`JourneysPage`), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os `in_progress`/`blocked` restantes. |
| 2026-08-03 02:06 | EP-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (`domain/application/infrastructure/interfaces/form`, migration `V5__create_form.sql`, CRUD `/api/v1/forms`) e frontend novo (`front/src/forms/FormsPage.tsx` + `FormBuilderPage.tsx`, `api/forms.ts`, item "Formulários" na sidebar). `FlowNode.formId` (já existente no backend) agora é editável de fato: `PropertiesPanel` ganhou o seletor "Formulário associado" para nós User Task e `JourneyDesignerPage` para de mandar `formId: null` fixo. EP-04 avança de 0% para 100%; progresso geral de 55% para 69%. |
| 2026-08-02 00:39 | Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos `Ctrl+C`/`Ctrl+V`/`Ctrl+D` e botão "Duplicar nó" no `NodePropertiesPanel`, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como `n/a`: decisão de produto de não implementar no MVP, salvamento permanece manual. EP-03 avança para 25/26 (96%). |
| 2026-08-02 22:12 | Atualização do EP-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam `todo`: copiar elementos, duplicar elementos e salvamento automático. |
| 2026-08-02 03:56 | Sincronização com `ej-admin-requisitos.md`: 122 REQs em 8 EPs / 28 FTs, todos como `todo`. |
