# Elastic Journey Admin Portal — Progresso de Implementação

> Gerado a partir de `ej-admin-requisitos.md`. Este arquivo é o registro vivo de acompanhamento dos requisitos da versão 1.0.0.

## Como usar

- Status possíveis: `todo`, `in_progress`, `done`, `blocked` e `n/a`.
- Ao concluir um requisito, marque `[x]`, altere o status e informe a evidência.
- A fonte da verdade dos requisitos é [ej-admin-requisitos.md](ej-admin-requisitos.md).

---

## Resumo

| Métrica | Valor |
|---|---|
| Total de Features (FT) | 14 |
| Total de User Stories (US) | 87 |
| Total de Requisitos (REQ) | 415 |
| Concluídos (`done`) | 376 |
| Em andamento (`in_progress`) | 6 |
| Não iniciados (`todo`) | 31 |
| Bloqueados (`blocked`) | 0 |
| Não aplicável (`n/a`) | 2 |
| % Concluído | 91% |

> FT-14 Catálogo de Integrações nova (5 USs, 25 REQs): catálogo de clusters de mensageria e referências de credencial (Azure Key Vault, nunca o segredo), RBAC restrito a `ADMIN` para administração, teste de conexão delegado ao `ms-espec-registry` (admin-back nunca acessa broker ou Key Vault diretamente) e Event Hubs/Service Bus habilitados no framework de conectores. REQ-14.04.001 fica `in_progress`: o teste de conexão só valida de verdade contra Kafka (broker local, sem autenticação) — Event Hubs/Service Bus retornam "não suportado neste ambiente" de propósito, já que não há dependência do SDK da Azure no projeto nem ambiente Azure real disponível ainda. Mesma ressalva de ambiente vale para a execução real de jornada via Event Hubs/Service Bus (publicar/consumir de verdade) — fora do escopo desta feature, é FT-05 — por isso REQ-14.05.001 permanece `done`: cobre só o framework/design-time (habilitar, configurar, salvar, publicar), não a execução de fato.
>
> 3 requisitos permanecem reclassificados de `done` para `todo` por serem atendidos apenas por mocks/simulações na versão 1.0.0 (sem integração real): REQ-07.01.002, REQ-07.01.005, REQ-07.04.001. Ver nota em cada requisito.
>
> REQ-02.09.003/004 deixaram de ser mock: a publicação/despublicação agora faz uma chamada HTTP real para a API de publicação do runtime (ver evidência dos próprios requisitos).
>
> Correção de contagem: o total de requisitos do FT-02 estava divergente entre este resumo (38) e a seção detalhada (37 linhas). Ajustado para 37, refletido no total geral.
>
> FT-04 refinado e implementado: REQ-04.02.006 (`STATIC_CONTENT`) foi removido/colapsado em `TEXT` (REQ-04.02.001); adicionados e implementados REQ-04.01.007 (`name` técnico do campo), REQ-04.02.007 a REQ-04.02.010 (subtipos/validação de `INPUT`, opções rótulo/valor, regras de arquivo) e a US-04.06 (imutabilidade do formulário em snapshot de publicação + serialização SDUI). Ver `ej-admin-requisitos.md` para os itens de evolução futura registrados fora da versão 1.0.0.
>
> FT-03 evoluído e implementado: o mapeamento de saída de conectores REST/Kafka deixou de ser configuração JSON livre e passou a ter formato estruturado (`nome ← JSONPath`), com suporte a referenciar essas variáveis via `{{nome}}` nos campos de entrada de passos seguintes e painel de variáveis disponíveis por nó (REQ-03.09.010 a 014, ajuste em REQ-03.09.002/004/009). Nova user story US-03.10 adiciona teste rápido de conector REST direto no editor, com proteção contra SSRF no backend (REQ-03.10.001 a 005). Ver notas de cada requisito para limitações conhecidas (ex.: resolução real de variáveis em runtime permanece fora do domínio do Admin Portal).
>
> FT-03 evoluído com nova user story US-03.11 Bifurcação condicional (Gateway): gateway de decisão exclusivo com exatamente duas saídas na versão 1.0.0 (caminho A / caminho B), uma delas marcada como padrão; a condição da saída não padrão pode referenciar tanto uma variável de saída de Service Task/Receive Task quanto um campo de resposta de User Task. Gateway com mais de duas saídas, gateway inclusivo, gateway paralelo e combinação de condições com E/OU foram registrados como fora de escopo da versão 1.0.0, dentro da seção "Modelagem Visual" em `ej-admin-requisitos.md` §5 (não em seção própria).
>
> FT-05 Execução ganhou 4 user stories novas (US-05.04 a US-05.07, 11 REQs) cobrindo capacidades além do texto original da feature: a execução roda contra o motor de runtime real, não um motor simplificado — o que também exigiu ajustar o objetivo original ("sem publicá-la" → agora exige jornada publicada, ver nota em `ej-admin-requisitos.md`). Novo: avanço manual de etapas de integração (Service/Receive Task), observabilidade de variáveis do processo (visualização e alteração manual, para forçar caminhos de decisão em teste), resultado das integrações já executadas, log cronológico, busca de jornada sem listagem completa, execução em tela única e pré-visualização adaptada ao canal (Web/App). Total do FT-05: 10 → 21 REQs.
>
> FT-05 Execução evoluiu mais uma rodada: nova user story US-05.08 Tratamento de falhas de integração (4 REQs) — o sistema agora detecta e atribui corretamente uma falha de conector (ex.: mock fora do ar) ao nó de serviço que realmente falhou, mesmo a engine não expondo isso diretamente (rollback de transação), destaca esse nó no diagrama, registra a falha no log e permite consultar a mensagem completa sob demanda (ícone + modal, sem poluir a tela de execução). REQ-05.03.003 (novo) exige que o diagrama não perca zoom/posição ao trocar de aba. REQ-05.06.005 (novo) exige que o log mostre os dados submetidos em cada User Task. REQ-05.07.001 foi revisado: a busca de jornada passou a listar todas por padrão, filtrando conforme o usuário digita (antes: nunca listar todas de uma vez) — mudança de comportamento pedida explicitamente. Total do FT-05: 21 → 27 REQs.
>
> FT-05 Execução evoluiu mais uma rodada: instalado um broker Kafka local e ligadas as pontas que antes eram só fabricadas — REQ-05.04.003 (novo) registra que integrações Kafka agora rodam contra um broker real, ao contrário das REST (que continuam mockadas, REQ-05.04.002). Nova user story US-05.09 Mensageria Kafka real (9 REQs): publicação automática de Service Task Kafka sem ação manual, indicador visual próprio para essa espera, consumo/correlação automática de mensagem real para Receive Task e início por mensagem (inclusive vinda de um produtor externo ao Admin Portal), painel de envio de mensagem de teste com business key pré-preenchida, e início de jornada por mensagem direto na tela de busca com espera automática pela instância nova. REQ-05.05.001 não precisou mudar de escopo: o mecanismo de pular etapa manualmente (REQ-05.09.009) continua existindo como alternativa secundária, agora também para nós Kafka. Total do FT-05: 27 → 37 REQs.
>
> FT-02 ganhou 2 REQs novos em US-02.03 Pesquisa: REQ-02.03.006 (agrupar a listagem de jornadas por produto, por produto+canal, por canal, ou sem agrupamento — hoje só o agrupamento por produto está implementado, fixo, sem seletor de modo) e REQ-02.03.007 (ordenar a listagem por jornada/canal/status/data de atualização, crescente ou decrescente — ainda não implementado). De quebra, corrigida uma divergência de contagem pré-existente do FT-02 (mesmo tipo de erro já documentado acima para "38 vs 37"): o resumo geral registrava 39/39, mas a seção detalhada sempre teve 40 linhas — os totais gerais abaixo já refletem a correção. Total do FT-02: 40 → 42 REQs.
>
> FT-03 ganhou REQ-03.02.008 (regra estrutural nova: rejeita, 422, um caminho que alcance `END` via `SERVICE_TASK` REST síncrona sem passar por checkpoint) e a nova user story US-03.15 Anotações (REQ-03.15.001 a 005) — notas livres tipo post-it no canvas do editor de fluxo, vinculáveis a nós por linha tracejada, fora da validação estrutural e nunca traduzidas para BPMN. REQ-04.01.005 (FT-04) expandido: User Task sem formulário agora suporta uma mensagem configurável com `{{nome}}` resolvido em tempo de execução. FT-05 ganhou REQ-05.02.005 (reflexo da mensagem dinâmica na tela de execução) e REQ-05.08.005 (checagem em tempo de execução da mesma regra síncrona de REQ-03.02.008, para fluxos persistidos antes dela existir) — achada ao vivo depois que uma edição de condição de gateway tornou um caminho já existente 100% síncrono, reproduzindo o erro `NullValueException: execution ... doesn't exist` do motor de runtime. REQ-05.06.003 revisado: a aba "Integrações" foi removida por redundância, seu dado (URL/resposta por integração) passou a viver na aba Log. Total do FT-03: 79 → 85 REQs; FT-05: 37 → 39 REQs.

## Progresso por Feature

| FT | Nome | REQs | Concluídos | % |
|---|---|---:|---:|---:|
| FT-01 | Gestão de Produtos e Canais | 24 | 24 | 100% |
| FT-02 | Gestão de Jornadas | 42 | 40 | 95% (1 in_progress) |
| FT-03 | Modelagem Visual | 95 | 93 | 98% (2 in_progress) |
| FT-04 | Formulários (SDUI) | 25 | 25 | 100% |
| FT-05 | Execução | 43 | 43 | 100% |
| FT-06 | Versionamento de jornadas | 42 | 42 | 100% |
| FT-07 | Autenticação e autorização | 25 | 21 | 84% (1 n/a) |
| FT-08 | Auditoria | 22 | 21 | 95% (1 n/a) |
| FT-09 | Ajuda e Suporte | 5 | 5 | 100% |
| FT-10 | Observabilidade | 12 | 11 | 92% (1 in_progress) |
| FT-11 | Testes | 12 | 0 | 0% |
| FT-12 | Infraestrutura | 16 | 0 | 0% (1 in_progress) |
| FT-13 | Dashboard | 24 | 24 | 100% |
| FT-14 | Catálogo de Integrações | 28 | 27 | 96% (1 in_progress) |

---

## FT-01 Gestão de Produtos e Canais

### US-01.01 Gestão de produtos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.01.001 | O sistema deve permitir cadastrar produtos. | done | back: `POST /api/v1/products`; front: `ProductsPage` (botão "Novo produto") | |
| [x] | REQ-01.01.002 | O sistema deve permitir editar produtos. | done | back: `PUT /api/v1/products/{id}`; front: `ProductsPage` (ação "Editar") | |
| [x] | REQ-01.01.003 | O sistema deve permitir consultar produtos. | done | back: `GET /api/v1/products`, `GET /api/v1/products/{id}`; front: `ProductsPage` | |
| [x] | REQ-01.01.004 | O sistema deve permitir desativar produtos. | done | back: `POST /api/v1/products/{id}/deactivate`; front: `ProductsPage` (ação "Desativar") | |
| [x] | REQ-01.01.005 | Cada produto deve possuir identificador único (`productId`), nome, descrição opcional e status. | done | back: `Product` domain + `V1__create_product.sql` (`product_id UUID PRIMARY KEY`) | |

### US-01.02 Gestão de canais

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.02.001 | O sistema deve permitir cadastrar canais dentro de um produto. | done | back: `POST /api/v1/products/{id}/channels`; front: `ProductChannelsPage` (botão "Novo canal") | |
| [x] | REQ-01.02.002 | O sistema deve permitir editar canais. | done | back: `PUT /api/v1/channels/{id}`; front: `ProductChannelsPage` (ação "Editar") | |
| [x] | REQ-01.02.003 | O sistema deve permitir consultar canais. | done | back: `GET /api/v1/channels/{id}`, `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.02.004 | O sistema deve permitir desativar canais. | done | back: `POST /api/v1/channels/{id}/deactivate`; front: `ProductChannelsPage` (ação "Desativar") | |
| [x] | REQ-01.02.005 | Todo canal deve pertencer a exatamente um produto. | done | back: `channel.product_id NOT NULL` + FK (`V2__create_channel.sql`) | |
| [x] | REQ-01.02.006 | Cada canal deve possuir identificador único (`channelId`), nome, descrição opcional, tipo e status. | done | back: `channel_id UUID PRIMARY KEY` (`V2__create_channel.sql`) + `Channel` domain | |
| [x] | REQ-01.02.007 | O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`. | done | back: `ChannelType` enum + CHECK constraint; front: `ChannelFormModal` (Select) | |

### US-01.03 Catálogo e descoberta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.03.001 | O sistema deve permitir pesquisar produtos por nome. | done | back: `GET /api/v1/products?q=`; front: campo de busca em `ProductsPage` | |
| [x] | REQ-01.03.002 | O sistema deve permitir filtrar produtos por status. | done | back: `GET /api/v1/products?status=`; front: filtro de status em `ProductsPage` | |
| [x] | REQ-01.03.003 | O sistema deve permitir listar os canais de um produto. | done | back: `GET /api/v1/products/{id}/channels`; front: `ProductChannelsPage` | |
| [x] | REQ-01.03.004 | O sistema deve permitir pesquisar canais por nome. | done | back: `GET /api/v1/products/{id}/channels?q=`; front: campo de busca em `ProductChannelsPage` | |
| [x] | REQ-01.03.005 | O sistema deve permitir filtrar canais por produto, tipo e status. | done | back: `?type=&status=` no mesmo endpoint; front: filtros em `ProductChannelsPage` | |
| [x] | REQ-01.03.006 | O sistema deve exibir a quantidade de canais associados a cada produto. | done | back: `ProductView.channelCount`; front: coluna "Canais" em `ProductsPage` | |
| [x] | REQ-01.03.007 | O sistema deve exibir a quantidade de jornadas associadas a cada canal. | done | back: `ChannelView.journeyCount` via `JourneyCountPort` → `JourneyCountAdapter` (`countByChannelId` real via JPA); front: coluna "Jornadas" | |

### US-01.04 Integridade e ciclo de vida

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-01.04.001 | A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes. | done | back: `DeactivateProduct` apenas altera `status`, sem exclusão | |
| [x] | REQ-01.04.002 | A desativação de um canal não deve remover suas jornadas ou publicações existentes. | done | back: `DeactivateChannel` apenas altera `status`, sem exclusão | |
| [x] | REQ-01.04.003 | O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo. | done | back: `CreateJourney` (criação) e `PublishJourney` (publicação) validam canal e produto ativos (`ChannelInactiveException`/`ProductInactiveException`, 422) | |
| [x] | REQ-01.04.004 | O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa. | done | back: `DeactivateProduct` + `ActivePublicationPort` real (`JourneyPublicationStatusAdapter.existsForProduct`) | testado via curl: 409 com jornada `PUBLISHED`, 200 após despublicar |
| [x] | REQ-01.04.005 | O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa. | done | back: `DeactivateChannel` + `ActivePublicationPort` real (`JourneyPublicationStatusAdapter.existsForChannel`) | testado via curl: 409 com jornada `PUBLISHED`, 200 após despublicar |

---

## FT-02 Gestão de Jornadas

### US-02.01 Cadastro de jornadas

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

### US-02.02 Identificação e metadados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.02.001 | O sistema deve permitir definir nome para a jornada. | done | back: `Journey.name`; front: campo "Nome" | |
| [x] | REQ-02.02.002 | O sistema deve permitir definir descrição para a jornada. | done | back: `Journey.description`; front: campo "Descrição" | |
| [x] | REQ-02.02.003 | Cada jornada deve possuir identificador único (`journeyId`). | done | back: `journey_id UUID PRIMARY KEY` (`V3__create_journey.sql`) | |
| [x] | REQ-02.02.004 | O identificador da jornada é gerado pelo sistema e não é editável pelo usuário. | done | back: `Journey.create` gera `UUID.randomUUID()`; não exposto como campo editável | |
| [x] | REQ-02.02.005 | Toda jornada deve estar associada a exatamente um canal. | done | back: `channel_id NOT NULL` + FK (`V3__create_journey.sql`) | |
| [x] | REQ-02.02.006 | O sistema deve identificar o produto da jornada a partir do canal associado. | done | back: `JourneyViewAssembler` resolve produto via `Channel.productId`; front: exibido em todo lugar | |

### US-02.03 Pesquisa

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.03.001 | O sistema deve permitir pesquisar jornadas por nome. | done | back: filtro `q` client-side no momento (lista completa retornada); front: busca em `JourneysPage` | |
| [x] | REQ-02.03.002 | O sistema deve permitir filtrar jornadas por produto. | done | back: `GET /api/v1/journeys?productId=`; front: `FilterDropdown` "Produto" | |
| [x] | REQ-02.03.003 | O sistema deve permitir filtrar jornadas por canal. | done | back: `GET /api/v1/journeys?channelId=`; front: `FilterDropdown` "Canal" | |
| [x] | REQ-02.03.004 | O sistema deve permitir ordenar jornadas por data de criação. | done | back: `?sort=CREATED_AT`; front: `FilterDropdown` "Ordenar" → "Criadas recentemente" | |
| [x] | REQ-02.03.005 | O sistema deve permitir ordenar jornadas por data de alteração. | done | back: `?sort=UPDATED_AT` (padrão); front: "Alteradas recentemente" | |
| [~] | REQ-02.03.006 | O sistema deve permitir agrupar a listagem de jornadas por produto, por produto e canal, por canal, ou sem agrupamento algum. | in_progress | `JourneysPage.tsx` — agrupamento por produto implementado (`groupedByProduct`, cabeçalho de grupo com contagem) | Falta o seletor de modo de agrupamento (produto+canal, somente canal, sem agrupamento) — hoje só existe o agrupamento por produto, fixo |
| [ ] | REQ-02.03.007 | O sistema deve permitir ordenar a listagem de jornadas, em ordem crescente ou decrescente, pelos campos jornada (nome), canal, status ou data de atualização. | todo | | Não há UI de ordenação por coluna hoje — `listJourneys()` aceita `sort` no client da API, mas `JourneysPage.tsx` nunca o passa |

### US-02.05 Jornadas específicas por canal

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.05.001 | O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto. | done | back: cada `Journey` pertence a um único `channel_id`, sem restrição entre canais do mesmo produto | |
| [x] | REQ-02.05.002 | Cada jornada deve possuir definição independente de fluxo e formulários. | done | back: `flow.journey_id UNIQUE` — um `Flow` por jornada; `FlowNode.formId` referencia `Form` por nó, sem acoplamento entre jornadas | satisfeito desde FT-03/FT-04 |
| [x] | REQ-02.05.003 | Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais. | done | back: cada `Flow` é uma linha isolada por `journey_id`; `UpdateFlow` só afeta o `flow` da própria jornada | satisfeito desde FT-03 |
| [x] | REQ-02.05.004 | O sistema deve exibir o produto e o canal durante toda a edição da jornada. | done | front: breadcrumb "Produto › Canal" nos cards/linhas e no modal de edição | |

---

## FT-03 Modelagem Visual

### US-03.01 Flow designer

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.01.001 | O sistema deve suportar eventos de início. | done | back: `FlowNodeType.START`; front: `NODE_META.start`, `Palette` | |
| [x] | REQ-03.01.002 | O sistema deve suportar eventos de término. | done | back: `FlowNodeType.END`; front: `NODE_META.end`, `Palette` | |
| [x] | REQ-03.01.003 | O sistema deve suportar User Tasks. | done | back: `FlowNodeType.USER_TASK`; front: `NODE_META.userTask`, `Palette` | |
| [x] | REQ-03.01.004 | Cada fluxo deve possuir exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e ao menos um nó `END`. | done | back: `FlowValidator.validate` (contagem de `starts` == 1, `ends` >= 1); front: `validation.ts` (mesma regra) | ajustado de "exatamente um END" para "ao menos um END": um `GATEWAY` (US-03.11) pode ramificar o fluxo em caminhos que terminam em `END`s distintos, sem reconvergir |
| [x] | REQ-03.01.005 | Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o nó `START`, cabendo ao usuário adicionar o nó `END` e os demais elementos antes de salvar. | done | back: `Flow.initial` (`domain/flow/Flow.java`) agora persiste só o nó `START`, sem `END`/conexão; front: `initialFlowNodes`/`initialFlowEdges` (`model.ts`) idem para o estado local antes do load | corrigido: `Flow.initial` criava `START`+`END` já conectados; validação de salvamento (`validateFlow`/`FlowValidator`) exige exatamente um `END` antes de permitir salvar |

### US-03.02 Conexões

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.02.001 | O sistema deve permitir criar conexões entre elementos. | done | front: `JourneyDesignerPage.onConnect` (drag entre handles) | |
| [x] | REQ-03.02.002 | O sistema deve permitir remover conexões. | done | front: seleção da aresta + `Delete`/`Backspace` (`deleteKeyCode`) | |
| [x] | REQ-03.02.003 | O sistema deve permitir editar conexões. | done | front: reconectar arrastando a extremidade da aresta (React Flow `onEdgesChange`) | |
| [x] | REQ-03.02.004 | O nó `START` não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída. | done | back: `FlowValidator.validate`; front: `validation.ts` (mesma regra espelhada) | corrigido bug: `outgoingLimitFor` (`model.ts`) não cobria `start`/`messageStartEvent`, retornando `Infinity` e permitindo criar múltiplas conexões de saída a partir do elemento inicial no editor — back/validação de salvamento já rejeitavam corretamente, o gap era só no editor |
| [x] | REQ-03.02.005 | Todos os nós devem pertencer a um caminho contínuo e alcançável entre o elemento inicial e algum `END`. | done | back: `FlowValidator` (BFS a partir do elemento inicial e, em reverso, a partir de todos os `END`s); front: `validation.ts` (`reachableFrom`, união dos `END`s) | ajustado para múltiplos `END` (US-03.11): um nó só precisa alcançar *algum* `END`, não um específico |
| [x] | REQ-03.02.006 | O editor deve impedir ações incompatíveis, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que viole as restrições estruturais. | done | back: `FlowValidationException` + `GlobalExceptionHandler` (422); front: `ErrorModal` exibe violações antes de salvar | |
| [x] | REQ-03.02.007 | Uma `USER_TASK` deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma `USER_TASK` que já possua saída. | done | front: `SINGLE_OUTPUT_TYPES` (`model.ts`) usado em `onConnect`/`onQuickAdd`/`displayNodes` (`JourneyDesignerPage.tsx`) e no handle/quick-add de `WorkflowNode.tsx`; back: `FlowValidator` (`in < 1 \|\| out != 1`) | regra estendida também a `SERVICE_TASK`/`RECEIVE_TASK` (mesma restrição estrutural de saída única) |
| [x] | REQ-03.02.008 | O backend deve rejeitar (422), ao salvar o fluxo, um caminho que parta do elemento inicial e alcance um `END` sem passar por nenhum checkpoint (`USER_TASK`, `RECEIVE_TASK` ou `SERVICE_TASK` não-REST). | done | back: `FlowValidator.reachesEndWithoutCheckpoint`/`isSynchronousRestTask`/`isCheckpoint` (`domain/flow/FlowValidator.java`) — BFS a partir do elemento inicial, rejeitando qualquer caminho que alcance `END` via `SERVICE_TASK` REST sem passar por um checkpoint | achado ao vivo: uma jornada com esse formato roda inteira dentro de uma única transação síncrona do motor de runtime, que falha com `NullValueException: execution ... doesn't exist` ao tentar ler o histórico depois; camada equivalente em tempo de execução, ver REQ-05.08.005 |

### US-03.03 Navegação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.03.001 | O usuário deve visualizar o fluxo completo da jornada. | done | front: `getFlow` carrega todos os nós/conexões no `JourneyDesignerPage`; `MiniMap` do React Flow | |
| [x] | REQ-03.03.002 | O usuário deve navegar livremente pelo fluxo. | done | front: pan/zoom nativos do `ReactFlow` | |
| [x] | REQ-03.03.003 | O sistema deve destacar o elemento selecionado. | done | front: `WorkflowNode` (estado `selected`) + arestas conectadas destacadas em `displayEdges` | |

### US-03.04 Experiência de edição

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.04.001 | O sistema deve suportar drag-and-drop de elementos. | done | front: `Palette` (drag) + `JourneyDesignerPage.onDrop`/`addNodeFromPalette` | |
| [x] | REQ-03.04.002 | O usuário deve poder reposicionar elementos livremente. | done | front: `onNodesChange` (drag nativo do React Flow, `snapToGrid`) | |
| [x] | REQ-03.04.003 | O usuário deve poder remover elementos do fluxo. | done | front: `deleteNode` / `onBeforeDelete` (bloqueia último START/END) | |
| [x] | REQ-03.04.004 | O usuário deve poder copiar elementos. | done | front: `JourneyDesignerPage` atalho `Ctrl+C`/`Ctrl+V` (copia/cola User Task selecionada) | START/END não são copiáveis (regra de unicidade) |
| [x] | REQ-03.04.005 | O usuário deve poder duplicar elementos. | done | front: `JourneyDesignerPage.duplicateNode`, atalho `Ctrl+D` e botão "Duplicar nó" em `NodePropertiesPanel` | START/END não são duplicáveis (regra de unicidade) |

### US-03.05 Canvas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.05.001 | O sistema deve permitir zoom in. | done | front: `Toolbar` botão zoom+ → `zoomIn()` | |
| [x] | REQ-03.05.002 | O sistema deve permitir zoom out. | done | front: `Toolbar` botão zoom− → `zoomOut()` | |
| [x] | REQ-03.05.003 | O sistema deve permitir mover-se livremente pelo canvas. | done | front: pan nativo do `ReactFlow` | |
| [x] | REQ-03.05.004 | O sistema deve permitir centralizar o fluxo na área visível. | done | front: `Toolbar` botão "Ajustar à tela" → `fitView()` | |
| [x] | REQ-03.05.005 | Ao abrir uma jornada para edição, criar uma jornada nova, ou concluir a geração de fluxo por IA, o canvas deve abrir sempre em zoom de 100%, com o elemento inicial alinhado próximo à borda esquerda. | done | front: `JourneyDesignerPage.fitViewLeftAligned` — calcula só o pan (`x`/`y`), com `zoom` sempre fixo em `1`, sem mais o `fitZoom` adaptativo via `getViewportForBounds` | substitui o `fitView({ padding: 0.2 })` anterior, chamado também ao final de `handleGenerate` (geração por IA) |
| [x] | REQ-03.05.006 | O minimapa do canvas deve iniciar colapsado num canto da tela, abrindo apenas quando o usuário clicar nele. | done | front: `JourneyDesignerPage.tsx` — estado `minimapOpen` (não persistido), `<MiniMap position="top-right">` condicional com botão de colapso (X) ou de abertura (`MapIcon`) | |

### US-03.06 Produtividade

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.06.001 | O sistema deve permitir desfazer ações. | done | front: `JourneyDesignerPage.undo` (pilha `undoStack`), atalho `Ctrl+Z` | corrigido bug: o atalho de teclado estava anunciado no tooltip da Toolbar mas nunca implementado no listener de `keydown` — só o botão funcionava |
| [x] | REQ-03.06.002 | O sistema deve permitir refazer ações. | done | front: `JourneyDesignerPage.redo` (pilha `redoStack`), atalho `Ctrl+Shift+Z`/`Ctrl+Y` | mesmo bug/correção de REQ-03.06.001 |

---

### US-03.07 Elementos de integração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.07.001 | O sistema deve suportar nós de integração `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`. | done | back: `FlowNodeType` (`domain/flow`); front: `NodeType`/`NODE_META`/`TYPE_COLOR` (`model.ts`) | |
| [x] | REQ-03.07.002 | Uma `SERVICE_TASK` deve representar a execução de uma integração externa durante a jornada. | done | back: `FlowNode.connectorConfig` associável a `SERVICE_TASK`; front: `ConnectorFields` no `PropertiesPanel` para o tipo | |
| [x] | REQ-03.07.003 | Uma `RECEIVE_TASK` deve representar a espera por uma mensagem externa em uma instância de jornada já iniciada. | done | idem REQ-03.07.002, para `RECEIVE_TASK` | |
| [x] | REQ-03.07.004 | Uma `MESSAGE_START_EVENT` deve permitir iniciar uma nova instância de jornada a partir de uma mensagem externa. | done | back/front: `MESSAGE_START_EVENT` tratado como elemento inicial alternativo (`FlowValidator`/`validation.ts`), com `connectorConfig` associável | |
| [x] | REQ-03.07.005 | O fluxo deve possuir exatamente um elemento inicial, que pode ser `START` ou `MESSAGE_START_EVENT`. | done | back: `FlowValidator.START_TYPES` (conta `START`+`MESSAGE_START_EVENT` juntos, exige exatamente 1); front: `validation.ts` (mesma regra); `start` passou a ser removível em `WorkflowNode.tsx` para permitir a troca | |
| [x] | REQ-03.07.006 | O sistema deve permitir editar, mover, remover, copiar e duplicar elementos de integração, respeitando as regras de unicidade do elemento inicial. | done | front: `SERVICE_TASK`/`RECEIVE_TASK` incluídos em `SINGLE_OUTPUT_TYPES` (copiáveis/duplicáveis, `JourneyDesignerPage.tsx`); `MESSAGE_START_EVENT` fica fora (mantém unicidade, como `start`/`end`); mover/editar/remover já são genéricos no React Flow | |

### US-03.08 Framework de conectores

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.08.001 | O sistema deve representar a integração por meio de um framework conceitual de conectores. | done | back: `ConnectorType`/`ConnectorConfig` (`domain/flow`) | |
| [x] | REQ-03.08.002 | O framework deve permitir associar um conector a uma `SERVICE_TASK`, `RECEIVE_TASK` ou `MESSAGE_START_EVENT`. | done | back: `FlowNode.connectorConfig`; front: `ConnectorFields` renderizado só para esses 3 tipos (`PropertiesPanel.tsx`) | |
| [x] | REQ-03.08.003 | O catálogo deve possuir os conectores `REST` e `KAFKA` habilitados para uso na versão 1.0.0. | done | back: `ConnectorType.REST`/`KAFKA` (`enabled = true`); front: `CONNECTOR_TYPES` (`model.ts`) só oferece os dois | |
| [x] | REQ-03.08.004 | O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos. | done | back: `ConnectorType.SOAP` (`enabled = false`) + `FlowValidator` rejeita nó com conector desabilitado (violação estrutural, 422) | |
| [x] | REQ-03.08.005 | O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível. | done | back: `ConnectorConfig.config` como `Map<String,Object>` livre, serializado em JSONB junto do node (`FlowNodeRecord.ConnectorConfigRecord`) — sem migration nova, extensível por natureza | |

### US-03.09 Configuração REST e Kafka

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.09.001 | O sistema deve permitir configurar `REST` em `SERVICE_TASK` e `RECEIVE_TASK`. | done | front: `ConnectorFields` (`PropertiesPanel.tsx`), catálogo por tipo de nó em `CONNECTOR_TYPES_BY_NODE` (`model.ts`) | `REST` não é oferecido para `MESSAGE_START_EVENT` (REQ-03.09.007) |
| [x] | REQ-03.09.002 | A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body e mapeamento de saída. | done | front: campos dedicados de método/URL (com seletor de variável, REQ-03.13.002); headers em editor próprio (REQ-03.09.009); params/body em editor estruturado por padrão (REQ-03.13.003); mapeamento de saída estruturado (REQ-03.09.010) | mapeamento de entrada retirado da UI (inline e assistente) — nunca influenciou a execução real; descrição do requisito ajustada |
| [x] | REQ-03.09.003 | O sistema deve permitir configurar `KAFKA` em `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`. | done | front: mesmo `ConnectorFields`, formulário Kafka disponível para os 3 tipos | |
| [x] | REQ-03.09.004 | A configuração Kafka deve suportar tópico, operação, headers, payload e mapeamento de saída. | done | front: campo "Tópico" dedicado; headers em editor próprio (REQ-03.09.009); payload no bloco JSON "Configuração adicional"; mapeamento de saída estruturado (REQ-03.09.010) | campo "fila" removido — Kafka só tem tópico; mapeamento de entrada retirado da UI pelo mesmo motivo do REQ-03.09.002 |
| [x] | REQ-03.09.005 | Configurações de integração devem suportar referência de credencial sem armazenar secrets diretamente no fluxo ou no snapshot. | done | back: `ConnectorConfig.credentialRef` (string de referência, sem campo de secret); front: campo "Referência de credencial" | |
| [x] | REQ-03.09.006 | O snapshot publicado deve incluir o tipo do elemento, o conector, a configuração declarativa e os mapeamentos necessários para execução pelo runtime. | done | back: `Publication` guarda os `FlowNode` de domínio diretamente (`PublishJourney`), e `PublicationRepositoryAdapter`/`FlowNodeRecord` persistem `connectorConfig` junto — propagação automática, sem código extra no fluxo de publicação | |
| [x] | REQ-03.09.007 | `REST` não é um conector válido para `MESSAGE_START_EVENT`; deve suportar apenas `KAFKA`. | done | front: `CONNECTOR_TYPES_BY_NODE.messageStartEvent = ['KAFKA']` (`model.ts`); back: `FlowValidator` rejeita `MESSAGE_START_EVENT` + `REST` (422) | |
| [x] | REQ-03.09.008 | A operação Kafka é determinada pelo tipo de nó: `SERVICE_TASK` = `PRODUCE`; `RECEIVE_TASK`/`MESSAGE_START_EVENT` = `CONSUME`. | done | front: `KAFKA_OPERATION_BY_NODE` (`model.ts`), campo somente leitura em `ConnectorFields`; back: `FlowValidator.KAFKA_OPERATION_BY_TYPE` valida o valor persistido | |
| [x] | REQ-03.09.009 | Headers devem ser editados como lista de pares nome/valor, não como texto declarativo livre; params/body (REST) seguem o mesmo padrão por padrão, com modo avançado de JSON livre como alternativa; payload (Kafka) permanece declarativo; mapeamento de saída tem formato estruturado. | done | front: `HeadersEditor` (`PropertiesPanel.tsx`) — linhas de nome/valor; `StructuredJsonEditor` estende o mesmo padrão pra Params/Body (REQ-03.13.003), com fallback pro `JsonFieldEditor` original em "modo avançado" | descrição ajustada — params/body deixaram de ser puramente livres |
| [x] | REQ-03.09.010 | O mapeamento de saída de uma integração (REST ou Kafka) deve ser declarado como uma lista de regras `nome da variável ← expressão JSONPath`, aplicada sobre o corpo da resposta (REST) ou o payload recebido (Kafka), em vez de configuração JSON livre. | done | front: `OutputMappingEditor` (`PropertiesPanel.tsx`) — lista de linhas nome/JSONPath, gravada em `config.outputMapping`; back: `ConnectorConfig.config` (Map livre) carrega a lista sem mudança de persistência | |
| [x] | REQ-03.09.011 | O nome de cada variável de saída deve ser único no escopo da jornada e seguir a mesma regra de nome técnico dos campos de formulário (REQ-04.01.007). | done | back: `FlowValidator` — segunda passada pelo fluxo rejeitando (422) nome de variável de saída repetido | unicidade de formato de nome (regra REQ-04.01.007) não replicada no front; só duplicidade é validada |
| [x] | REQ-03.09.012 | O sistema deve permitir referenciar, nos campos de entrada de URL, headers e body/payload de uma integração, variáveis produzidas por passos anteriores do fluxo, usando a sintaxe `{{nomeDaVariavel}}`. | done | front: `{{nome}}` digitado livremente em URL/headers/body — nenhum parsing especial necessário, o valor é texto; back: `ConnectorTestAdapter.resolve`/`resolveDeep` interpretam o token no teste de conector | resolução em runtime real (execução de jornada) permanece fora do domínio do Admin Portal (REQ-03.09 nota em `ej-admin-arquitetura-logica.md`) |
| [x] | REQ-03.09.013 | O editor deve exibir, para cada `SERVICE_TASK`/`RECEIVE_TASK`, a lista de variáveis disponíveis naquele ponto do fluxo, calculada a partir dos nós alcançáveis entre o elemento inicial e o nó selecionado. | done | front: `availableVariableOriginsAt` (`model.ts`, BFS backward) alimenta o painel "Variáveis" (`VariableOriginsPanel`, `PropertiesPanel.tsx`) | mecanismo estendido por US-03.13: agora agrupado por origem, chips substituídos por painel dedicado |
| [x] | REQ-03.09.014 | O backend deve rejeitar (422), ao salvar o fluxo, a configuração de conector que referencie `{{variavel}}` inexistente no contexto do nó. | done | back: `FlowValidator.collectVariableTokens` + BFS backward por nó, comparado contra `outputMapping` de ancestrais alcançáveis; violações lançam `FlowValidationException` (422) | testado via `mvnw test` (suíte existente segue verde; sem teste dedicado novo — ver nota FT-11) |
| [x] | REQ-03.09.015 | O campo de tópico de um conector Kafka deve oferecer, como sugestão, a lista de tópicos existentes no cluster selecionado, consultada em tempo real; a digitação livre deve continuar disponível quando a listagem não estiver disponível. | done | back: `GET /messaging-clusters/{clusterId}/topics` (`MessagingClusterController`) → `ListClusterTopics` → `MessagingTopicListingPort` → `EspecRegistryTopicListingAdapter`; front: `PropertiesPanel.tsx` — `topicsByCluster`, campo de tópico vira combo editável quando a listagem é bem-sucedida | válido de verdade só para `KAFKA` hoje, mesma limitação de ambiente do teste de conexão (REQ-14.04.001) |

### US-03.10 Teste de conectores

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.10.001 | O sistema deve permitir, durante a edição de um `SERVICE_TASK`/`RECEIVE_TASK` com conector `REST`, disparar uma chamada de teste com os valores atualmente configurados e exibir a resposta bruta. | done | front: botão "Testar chamada" + modal (`TestConnectorButton`, `PropertiesPanel.tsx`); back: `POST /api/v1/journeys/{journeyId}/flow/nodes/{nodeId}/connector-test` (`FlowController`) | validado manualmente com `https://brasilapi.com.br/api/cnpj/v1/19131243000197` |
| [x] | REQ-03.10.002 | A chamada de teste deve ser executada pelo backend, nunca diretamente do navegador. | done | back: `ConnectorTestAdapter` (infra) executa via `RestClient`; front só chama o endpoint do Admin Portal (`api/flows.ts#testConnector`) | |
| [x] | REQ-03.10.003 | O backend deve recusar chamadas de teste para URLs que resolvam a endereços privados, de loopback ou reservados (proteção contra SSRF). | done | back: `ConnectorTestAdapter.assertNotPrivateNetwork` — `InetAddress` loopback/site-local/link-local/any-local/multicast → `SsrfBlockedException` (422) | ponytail: checagem só na resolução inicial, não por hop de redirect — ver comentário no código |
| [x] | REQ-03.10.004 | A chamada de teste deve ter timeout curto e limite de tamanho de resposta, e não deve ser registrada como transação de negócio. | done | back: timeout de 5s (`JdkClientHttpRequestFactory`, ver REQ-03.10.006); corpo truncado em `MAX_BODY_BYTES` (1MB); nenhuma chamada a `RecordAuditEvent` no fluxo de teste | |
| [x] | REQ-03.10.005 | Campos `{{variavel}}` presentes na configuração testada devem ser substituídos por um valor de exemplo informado manualmente pelo usuário no momento do teste. | done | front: modal (painel) ou etapa "Testar e Mapear" (assistente, REQ-03.14.005) coletam um valor por token detectado (`tokensIn`) antes de chamar o teste; back: `ConnectorTestAdapter.resolve`/`resolveDeep` substituem os tokens em URL/headers/body | |
| [x] | REQ-03.10.006 | A chamada de teste deve seguir corretamente redirecionamentos HTTP (301/302/303/307/308), preservando o método original quando o status exigir. | done | back: `ConnectorTestAdapter` trocou `SimpleClientHttpRequestFactory` (baseado em `HttpURLConnection`, que não segue 307/308 — limitação conhecida da JDK) por `JdkClientHttpRequestFactory` (`java.net.http.HttpClient`, já na JDK 21) com `Redirect.NORMAL` (segue 307/308, mas não downgrade https→http) | achado testando manualmente contra uma API real que respondia 308 |
| [x] | REQ-03.10.007 | Uma falha HTTP na chamada de teste deve ser resumida ao usuário como status e motivo, incluindo o corpo só quando curto e não parecer HTML. | done | back: `ConnectorTestAdapter.describeHttpError` — para `RestClientResponseException`, monta `"{status} {motivo}"` e só anexa o corpo se ≤300 caracteres e não começar com `<`; antes despejava `RestClientException#getMessage()` inteiro (incluía páginas HTML de erro completas) | achado testando manualmente contra uma URL que respondia 404 com página HTML |

### US-03.11 Bifurcação condicional (Gateway)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.11.001 | O sistema deve suportar um nó de gateway de decisão (exclusivo) no fluxo, com exatamente duas saídas na versão 1.0.0: caminho A e caminho B. | done | back: `FlowNodeType.GATEWAY`; front: tipo `gateway` (`model.ts`), ícone `Diamond` na paleta e no canvas (`WorkflowNode.tsx`, `Palette.tsx`), `outgoingLimitFor` limita a 2 saídas | |
| [x] | REQ-03.11.002 | Uma das duas saídas do gateway deve ser marcada como saída padrão (sem condição própria), usada quando a condição da outra saída não for satisfeita. | done | front: checkbox "Saída padrão" em `GatewayFields` (`PropertiesPanel.tsx`), desmarca automaticamente a outra saída; back: `FlowValidator` exige exatamente uma saída `isDefault` | |
| [x] | REQ-03.11.003 | A saída não padrão do gateway deve possuir uma condição composta por variável, operador de comparação (igual, diferente, maior que, menor que) e um valor de referência informado pelo usuário, editados como combos/campo tipado. | done | front: `GatewayFields` (`PropertiesPanel.tsx`) — combo de variável + combo de operador (filtrado por tipo) + campo de valor tipado; a string `{{variavel}} op valor` é composta/decomposta por `composeCondition`/`parseCondition`; back: `FlowConnection.condition` armazena a string composta | revisado: virou de fato 3 campos estruturados (não mais texto livre); `FlowValidator` ganhou guarda contra aspas escapadas (`\"`/`\'`) na condição — formato que quebrava o parser de expressão do motor de runtime quando gerado por IA (US-03.17), mas rejeitado também na edição manual |
| [x] | REQ-03.11.004 | A condição deve poder referenciar tanto uma variável de saída de um Service Task/Receive Task quanto um campo de resposta de um User Task, desde que alcançável a partir do gateway. | done | back: `FlowValidator` valida `{{nome}}` de variáveis de saída de conector contra os ancestrais alcançáveis (422 se não declarada) | referência a campo de User Task não é validada contra o formulário real (`Form` não é acessível pelo validador de domínio hoje) — aceita sem checagem; ver nota em `FlowValidator` |
| [x] | REQ-03.11.005 | O editor deve exibir, ao configurar a condição da saída do gateway, a lista de variáveis disponíveis naquele ponto do fluxo (Service Task/Receive Task e campos de User Task alcançáveis). | done | front: combo "Variável" em `GatewayFields`, populada por `availableVariableRulesAt` (mesmo mecanismo do painel Conector, agora tipado) | lista inclui apenas variáveis de saída de conector, não campos de formulário de User Task (mesma limitação do REQ-03.11.004); chips substituídos pela própria combo (REQ-03.11.008) |
| [x] | REQ-03.11.006 | O gateway deve possuir ao menos uma entrada e exatamente duas saídas na versão 1.0.0; o backend deve rejeitar (422) um gateway sem exatamente uma saída padrão, ou cuja saída não padrão esteja sem condição. | done | back: `FlowValidator` (`case GATEWAY`); front: `validation.ts` espelha a mesma regra | testado via publicação real e execução no motor de runtime (curl), ambos os caminhos A e B confirmados |
| [x] | REQ-03.11.007 | Na publicação, o gateway deve ser traduzido para um `exclusiveGateway` BPMN nativo, com cada `sequenceFlow` de saída carregando a expressão de condição correspondente (ou marcado como fluxo padrão), avaliado pelo próprio motor do runtime. | done | `ms-transform-publication`: `BpmnTransformer` reescrito para construir o grafo via API de baixo nível do `camunda-bpmn-model` (não mais um "chain" linear), gerando `exclusiveGateway`/`sequenceFlow` com `conditionExpression` (`${...}`) e `default` | testado ponta a ponta: publicação real + execução no motor de runtime confirmando os dois caminhos (condição verdadeira → Tarefa A; condição falsa → saída padrão → Tarefa B) |
| [x] | REQ-03.11.008 | Cada variável de saída deve possuir um tipo declarado (texto, número, booleano, data ou data e hora), inferido automaticamente ao gerar o mapeamento a partir de uma resposta real ou escolhido manualmente. O editor da condição do gateway deve oferecer só os operadores compatíveis com o tipo e um campo de valor no formato correspondente. | done | front: `OutputMappingRule.type` (`model.ts`); `flattenJsonToOutputMappingRules` infere o tipo (`typeof`, mais regex ISO 8601 para data/data e hora); seletor de tipo manual em `OutputMappingEditor` e no formulário de "Testar API"; `GatewayFields` filtra operadores por `OPERATORS_BY_TYPE` e troca o input de valor (`number`/`date`/`datetime-local`/combo verdadeiro-falso) conforme o tipo | variáveis salvas antes dessa mudança (sem `type`) continuam funcionando, tratadas como `string` por padrão |

### US-03.12 Variáveis de entrada da jornada

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.12.001 | O sistema deve permitir declarar, no nó START, uma lista de variáveis de entrada da jornada (nome + tipo) que a aplicação cliente (canal digital/BFF) deve fornecer ao iniciar uma instância. | done | back: `FlowNode.startVariables` (`List<Map<String,Object>>`, rosqueado por `FlowNodeInput`/`FlowResponse`/`FlowNodeRecord`, sem migration — `nodes` já é coluna JSON); front: seção "Variáveis de Entrada" no nó START (`StartVariablesEditor`, `PropertiesPanel.tsx`) | não se aplica a `MESSAGE_START_EVENT`, que usa outputMapping sobre o payload da mensagem |
| [x] | REQ-03.12.002 | O nome de cada variável de entrada deve ser único no escopo da jornada, compartilhando o espaço de nomes das variáveis de saída (REQ-03.09.011). | done | back: `FlowValidator` — `seenOutputNames` agora acumula tanto `startVariables` quanto `outputMapping`, mesma violação "declared more than once" | |
| [x] | REQ-03.12.003 | As variáveis de entrada do nó START ficam disponíveis para `{{nome}}` em qualquer conector/gateway do fluxo. | done | back: `FlowValidator` — `startVariableNames` semeia o `availableVars` dos dois checks existentes (conector e gateway); front: `availableVariablesAt`/`availableVariableRulesAt` (`model.ts`) somam `startVariables` do nó START, sem precisar do BFS de ancestrais | testado ponta a ponta com o exemplo real desta sessão: `{{cpf}}` no body de um `SERVICE_TASK` chamando `POST /v1/consultarbd` do `ms-mock-api-rest` |
| [x] | REQ-03.12.004 | O endpoint de início de instância deve aceitar um mapa de valores no corpo e recusar a chamada se faltar alguma variável declarada. | done | `ms-espec-registry`: `SimulationController.start` aceita `@RequestBody Map<String,Object> variables`; `VariableConversion.fromDeclaredVariables` valida presença + coerciona pelo tipo declarado, `IllegalStateException` (409, mesmo padrão de erro já usado no controller) listando os nomes faltantes | |
| [x] | REQ-03.12.005 | Valores extras informados que não correspondam a nenhuma variável declarada são aceitos e repassados sem erro. | done | `ms-espec-registry`: `VariableConversion.fromDeclaredVariables` inclui as chaves de `raw` não-declaradas, tipadas por inferência simples do tipo Java recebido do Jackson (Boolean/Number/String) | |

### US-03.13 Assistência de variáveis na configuração de conector

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.13.001 | O painel de propriedades de um `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT` deve exibir uma seção "Variáveis" com as variáveis disponíveis naquele ponto do fluxo, agrupadas por origem. | done | front: `VariableOrigin`/`availableVariableOriginsAt` (`model.ts`) — rótulo derivado de `NODE_META` + tipo de conector (genérico, não switch por combinação); `VariableOriginsPanel` (`PropertiesPanel.tsx`), seção própria antes de "Conector", clique num chip copia `{{nome}}` | |
| [x] | REQ-03.13.002 | URL, cada valor de header, e cada campo de valor de Body/Params devem oferecer um seletor que insere `{{nome}}` na posição do cursor. | done | front: `VariablePickerButton` (ícone `Braces`, cor `accent`) + `insertTokenAtCursor` (`PropertiesPanel.tsx`, via `selectionStart`/`setSelectionRange` nativos) — reaproveitado em `ConnectorFields` (URL), `HeadersEditor` e `StructuredJsonEditor` | |
| [x] | REQ-03.13.003 | Body e Params (REST) devem ser editados por padrão como lista nome→valor, com modo avançado de JSON livre para corpos não-planos. | done | front: `StructuredJsonEditor` (`PropertiesPanel.tsx`) — detecta objeto plano (`isFlatObject`); se não for, ou por escolha do usuário, cai no `JsonFieldEditor` original ("Modo avançado") | nunca achata uma config aninhada já existente automaticamente |

### US-03.14 Assistente de configuração de conector

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.14.001 | O sistema deve oferecer um assistente (wizard) em etapas como forma adicional de configurar um conector REST ou Kafka. | done | front: `ConnectorWizard.tsx` (novo), botão "✨ Configurar com assistente" em `ConnectorFields` (`PropertiesPanel.tsx`); edita o mesmo `connectorConfig` do painel inline, que permanece inalterado | |
| [x] | REQ-03.14.002 | REST tem 4 etapas (Conexão, Headers, Parâmetros & Corpo, Testar e Mapear); Kafka tem 3 (Conexão, Payload, Mapear saída). | done | front: `REST_STEPS`/`KAFKA_STEPS` (`ConnectorWizard.tsx`) | Kafka não tem etapa de teste — não se aplica a esse conector |
| [x] | REQ-03.14.003 | A navegação entre etapas deve ser livre. | done | front: indicador de etapas clicável (`setStepIndex`), sem gate de conclusão sequencial | |
| [x] | REQ-03.14.004 | As alterações do assistente ficam em rascunho local, só aplicadas ao concluir; fechar de outra forma confirma descarte se houver alteração pendente. | done | front: `draft`/`dirty` local (`ConnectorWizard.tsx`); `finish()` aplica via `onConfigUpdate` só no "Concluir"; "X"/"Cancelar"/clique fora/Esc chamam `requestClose()`, que abre `ConfirmDialog` (mesmo componente já usado em `JourneyDesignerPage.tsx`) se `dirty` | modal próprio (não o `Modal` compartilhado) por não querer o botão "Fechar" automático dele |
| [x] | REQ-03.14.005 | A etapa "Testar e Mapear" deve testar a chamada de verdade inline, gerar mapeamento automático em caso de sucesso, e permitir mapeamento manual mesmo sem sucesso. | done | front: teste inline em `ConnectorWizard.tsx` (não reaproveita o modal "Testar API" do painel), `ResponsePreview` (extraído de `OutputMappingEditor`, `PropertiesPanel.tsx`) mostrado antes da lista de variáveis mapeadas; `OutputMappingEditor` sempre disponível (`hideSourcePreview`) | |

### US-03.15 Anotações

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.15.001 | O sistema deve permitir adicionar anotações (post-it) ao canvas do editor de fluxo, sem que façam parte do fluxo executável. | done | front: `AnnotationNode.tsx` (novo), entrada dedicada na `Palette.tsx` (`onAddAnnotation`) | |
| [x] | REQ-03.15.002 | Uma anotação deve possuir texto editável e posição livre; não deve ser validada estruturalmente nem traduzida para BPMN. | done | front: `WFAnnotation`/`makeAnnotation` (`model.ts`), edição por duplo-clique em textarea (`AnnotationNode.tsx`); back: `Flow.annotations` persistido à parte de `nodes`/`connections`, nunca lido por `FlowValidator` nem por `BpmnTransformer` (`ms-transform-publication`) | |
| [x] | REQ-03.15.003 | O sistema deve permitir vincular uma anotação a um ou mais nós do fluxo, com linha tracejada entre eles. | done | front: `onConnect` em `JourneyDesignerPage.tsx` intercepta conexões partindo do handle `source` da anotação; `annotationLinkEdges` (aresta sintética tracejada, sem persistência própria — deriva de `linkedNodeIds`) | reaproveita os handles `target` já existentes dos nós de fluxo, sem tipo de handle novo |
| [x] | REQ-03.15.004 | O sistema deve permitir desvincular uma anotação de um nó e excluí-la, sem afetar o fluxo executável. | done | front: `onUnlinkAnnotation`/`onDeleteAnnotation` (`actions-context.ts`), botão de unlink por chip (`Link2Off`) e botão de excluir em `AnnotationNode.tsx`; `deleteNode` remove o id de `linkedNodeIds` de qualquer anotação ao excluir um nó de fluxo | |
| [x] | REQ-03.15.005 | As anotações devem ser persistidas junto com o fluxo e restauradas ao reabrir o editor. | done | back: migration `V3__add_flow_annotations.sql` (`flow.annotations JSONB`), `FlowAnnotation.java`/`FlowAnnotationRecord.java`; front: `annotations` incluído no payload de `updateFlow` e no `HistorySnapshot` (undo/redo) | |

### US-03.16 Pré-visualização de formulário no editor

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [~] | REQ-03.16.001 | Ao selecionar, no canvas, uma `USER_TASK` com formulário associado, o editor deve exibir automaticamente uma pré-visualização do formulário, ancorada à base do canvas, sem exigir uma ação dedicada de clique. | in_progress | front: `FormPreviewDock.tsx` — `JourneyDesignerPage.tsx` deriva `previewNode` de `propertiesNode` (`type === 'userTask' && data.formId`), sem badge/gatilho dedicado | carece de enriquecimento — pré-visualização atual é funcional, mas ainda não tem paridade de fidelidade com a renderização real (SDUI) da tela de Execução |
| [~] | REQ-03.16.002 | Ao selecionar qualquer outro elemento do canvas, a pré-visualização deve deixar de ser exibida. | in_progress | front: `previewNode` volta a `null` quando `propertiesNode` não é uma `USER_TASK` com formulário | mesma nota de enriquecimento do REQ-03.16.001 |

### US-03.17 Geração de fluxo assistida por IA

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-03.17.001 | O sistema deve permitir gerar automaticamente um rascunho de fluxo a partir de uma descrição em linguagem natural (prompt), preenchendo nós e conexões no canvas do editor. | done | back: `GeminiFlowGenerator`/`FlowGenerationPrompt` (`infrastructure/ai`); front: `JourneyDesignerPage.handleGenerate` | |
| [x] | REQ-03.17.002 | A geração deve depender de uma credencial de API de IA configurada (US-14.06); sem credencial, o sistema deve informar o usuário e recusar a geração. | done | back: `GeminiFlowGenerator.generate` resolve a chave via `AiProviderCredentialRepository.findByProvider`; sem credencial, mensagem "Chave de API do Gemini não configurada. Configure em Integrações > Credencial de IA." | |
| [x] | REQ-03.17.003 | Um fluxo gerado que viole a validação estrutural deve ser corrigido e reenviado ao modelo (retry/reparo) dentro de um número limitado de tentativas, incluindo a rejeição de aspas escapadas em condição de gateway. | done | back: laço de retry em `GeminiFlowGenerator`, alimentado pelas violações de `FlowValidator`; guarda de aspas escapadas em `FlowValidator` (ver nota REQ-03.11.003) | |
| [x] | REQ-03.17.004 | O fluxo gerado deve ser apresentado como rascunho editável, sujeito às mesmas regras de validação e revisão manual de um fluxo criado por edição direta. | done | front: o fluxo gerado só populada o estado local do canvas (`JourneyDesignerPage`), sem salvar sozinho — segue o mesmo fluxo de salvar/validar de qualquer edição manual | |
| [x] | REQ-03.17.005 | Ao concluir a geração, o canvas deve reposicionar automaticamente a visualização do fluxo gerado. | done | front: `handleGenerate` chama `fitViewLeftAligned()` (REQ-03.05.005) ao final | |

## FT-04 Formulários (SDUI)

### US-04.01 Form builder

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.01.001 | O sistema deve permitir criar formulários. | done | back: `POST /api/v1/forms`; front: `FormsPage` (botão "Novo formulário") → `FormBuilderPage` | |
| [x] | REQ-04.01.002 | O sistema deve permitir editar formulários. | done | back: `PUT /api/v1/forms/{id}`; front: `FormsPage` (ação "Editar") | |
| [x] | REQ-04.01.003 | O sistema deve permitir remover formulários. | done | back: `DELETE /api/v1/forms/{id}`; front: `FormsPage` (ação "Excluir" + `ConfirmDialog`) | exclusão física, sem guarda de uso — ver nota |
| [x] | REQ-04.01.004 | O sistema deve permitir associar formulários a User Tasks. | done | back: `FlowNode.formId` (já existente); front: seletor "Formulário associado" em `PropertiesPanel` (só para nós `userTask`), `formId` persistido via `updateFlow` | |
| [x] | REQ-04.01.005 | O sistema deve permitir manter uma User Task sem formulário associado, com uma mensagem configurável exibida ao usuário, suportando `{{nome}}` resolvido em tempo de execução. | done | front: opção "Nenhum" no seletor de formulário (`formId: null`) + campo "Mensagem exibida ao usuário" (`PropertiesPanel.tsx`, com `VariablePickerButton`); back: `FlowNode.messageText`; `ms-espec-registry`: `StepResolver.resolveUserTask`/`resolveMessage`/`messageSdui` sintetizam a árvore SDUI da mensagem já com os tokens resolvidos via `camundaClient.getProcessVariables` | ver REQ-05.02.005 |
| [x] | REQ-04.01.006 | Ao associar formulário a uma User Task, o editor deve permitir criar um novo formulário sem sair do editor de fluxo e atualizar a lista de formulários disponíveis. | done | front: botões "Novo formulário" e "Atualizar" na seção "Formulário" do `PropertiesPanel.tsx`; `App.tsx` (`openNewFormScreen`) abre a aba Formulários já em modo de criação; `refreshForms` recarrega `listForms()` sem sair do designer | |
| [x] | REQ-04.01.007 | Cada campo de formulário deve possuir um `name` técnico, único no formulário e imutável após criado, substituindo o identificador interno atual como chave de referência do campo. | done | back: `FormField.name` (substitui `id`); `Form.create` valida nomes únicos (`DuplicateFieldNameException`, 422); front: campo "Nome técnico" em `FieldCard`, travado para campos já existentes no formulário carregado | testado via curl: criação com nomes únicos (201) e duplicados (422 `Duplicate form field name`) |

### US-04.02 Componentes

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

### US-04.03 Reutilização

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.03.001 | O sistema deve permitir reutilizar formulários em múltiplas jornadas. | done | back: `Form` é uma entidade independente, sem vínculo de jornada; `FlowNode.formId` de qualquer jornada pode apontar para o mesmo `formId` | |
| [x] | REQ-04.03.002 | O sistema deve permitir reutilizar formulários em múltiplas User Tasks. | done | back: idem — múltiplos `FlowNode` (mesma ou diferentes jornadas) podem compartilhar o mesmo `formId` | |

### US-04.04 Configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.04.001 | O usuário deve poder definir campos obrigatórios. | done | back: `FormField.required`; front: checkbox "Campo obrigatório" em `FieldCard` | |
| [x] | REQ-04.04.002 | O usuário deve poder definir valores padrão. | done | back: `FormField.defaultValue`; front: campo "Valor padrão" em `FieldCard` | não aplicável a `TEXT`/`FILE_UPLOAD`/campos de seleção |
| [x] | REQ-04.04.003 | O usuário deve poder definir textos de ajuda. | done | back: `FormField.helpText`; front: campo "Texto de ajuda" em `FieldCard`, exibido no preview | |

### US-04.05 Preview

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.05.001 | O sistema deve permitir visualizar o formulário durante a edição. | done | front: painel "Preview" fixo em `FormBuilderPage` (`FormPreview`) | |
| [x] | REQ-04.05.002 | O preview deve refletir alterações em tempo real. | done | front: `FormPreview` renderiza diretamente o state `fields` da própria página, sem etapa de sincronização | |

### US-04.06 Imutabilidade e serialização para publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-04.06.001 | Ao publicar uma jornada, o conteúdo de cada formulário referenciado pelas User Tasks deve ser copiado integralmente para o snapshot da publicação, tornando-se imutável a alterações futuras no formulário original. | done | back: `PublicationRepositoryAdapter.save` copia `Form`/`FormField` para `SnapshotFormRecord`/`FormFieldRecord` e persiste como JSON da publicação, independente da linha mutável do formulário | requisito novo (refino do FT-04), documentando comportamento já existente no código |
| [x] | REQ-04.06.002 | O snapshot de publicação deve conter, para cada formulário, uma representação em árvore `[tag, props, children]` (SDUI), derivada do conteúdo congelado do formulário. | done | back: `FormSduiSerializer.serialize` gera a árvore (`ui.form`/`ui.text`/`ui.input`/`ui.select`/`ui.multiselect`/`ui.upload`); campo `sdui` em `SnapshotFormRecord`, populado em `PublicationRepositoryAdapter` e `JourneyVersionRepositoryAdapter` | testado via curl + consulta direta ao Postgres: árvore gerada no `journey_publication.snapshot` bate com o formato esperado |

---

## FT-05 Execução

A execução roda contra o motor de runtime real: `ms-espec-registry` (`simulacoes/ms-espec-registry`) é um wrapper fino da REST API do motor de runtime, chamado pela aba "Execuções" do `admin/front` (`front/src/execution/`). Integrações REST das jornadas apontam para `ms-mock-api-rest` (`simulacoes/ms-mock-api-rest`), que emula as respostas reais. Integrações Kafka executam contra um broker Kafka real local — `KafkaBridgeScheduler` (`ms-espec-registry`) publica/consome automaticamente em background, sem mock.

### US-05.01 Execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.01.001 | O sistema deve permitir executar jornadas. | done | `JourneySearch.tsx` (botão "Executar") → `POST /api/v1/journeys/{id}/instances` (`ms-espec-registry`) → `POST /process-definition/key/{key}/start` no motor de runtime | |
| [x] | REQ-05.01.002 | O sistema deve permitir informar dados de entrada para os formulários durante a execução. | done | `SduiFormRenderer.tsx` (Mística `Form`/`TextField`/`Select`/`Checkbox`/`FileUpload`) → `POST /instances/{id}/tasks/{taskId}/complete` | |
| [x] | REQ-05.01.003 | O sistema deve permitir reiniciar a execução. | done | Botão "Nova execução" em `ExecutionWorkspace.tsx` volta à busca; executar a mesma jornada de novo cria uma instância nova no motor de runtime | |
| [x] | REQ-05.01.004 | Antes de registrar um passo da execução, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução. | done | Satisfeito por arquitetura, não por checagem dedicada: o front nunca envia um nó/id arbitrário — `completeTask` usa o `taskId` real emitido pelo motor de runtime para aquela instância, e `skipStep`/`current-step` resolvem o nó atual no servidor (`StepResolver.java`), sem aceitar entrada do cliente para decidir "onde" a execução está | Não há como injetar um nó de outra jornada nessa API |

### US-05.02 Resultado

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.02.001 | O sistema deve apresentar o caminho percorrido. | done | `FlowDiagramViewer.tsx` — nós concluídos coloridos por status, alimentado por `visitedPath` em `ExecutionWorkspace.tsx` | |
| [x] | REQ-05.02.002 | O sistema deve apresentar as User Tasks executadas. | done | Diagrama (nós concluídos) + aba Log (`InspectorPanel.tsx`) | |
| [x] | REQ-05.02.003 | O sistema deve apresentar os formulários exibidos. | done | Aba Log registra `Formulário "X" respondido` a cada `complete-task` | |
| [x] | REQ-05.02.004 | O sistema deve apresentar o resultado final da execução. | done | Card de conclusão em `DevicePreview.tsx` quando `step.type === 'ENDED'` | |
| [x] | REQ-05.02.005 | Para uma User Task sem formulário associado, o sistema deve apresentar a mensagem configurada com `{{nome}}` já substituído pelos valores atuais das variáveis do processo. | done | `ms-espec-registry`: `StepResolver.resolveMessage`/`messageSdui` (regex de token + `camundaClient.getProcessVariables`) sintetizam a árvore SDUI já resolvida antes de devolver o passo ao front | |

### US-05.03 Visualização da execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.03.001 | O sistema deve destacar o caminho percorrido durante a execução. | done | `FlowDiagramViewer.tsx` — nó atual com destaque/pulso (respeitando `prefers-reduced-motion` via regra global de `index.css`), concluídos com selo de sucesso | |
| [x] | REQ-05.03.002 | O sistema deve destacar as User Tasks e os formulários executados. | done | Mesmo mecanismo de US-05.03.001 + aba Log | |
| [x] | REQ-05.03.003 | O sistema não deve reposicionar ou reiniciar o zoom do diagrama do fluxo ao alternar entre as abas do painel de observabilidade. | done | `InspectorPanel.tsx` — `FlowDiagramViewer` fica sempre montado (visibilidade alternada via CSS), preservando o estado interno do React Flow (zoom/pan) entre trocas de aba | Antes, desmontar/remontar a cada troca de aba destruía esse estado e repunha o diagrama centralizado no passo atual |

### US-05.04 Arquitetura de execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.04.001 | O sistema deve executar a jornada publicada contra o motor de runtime real, não um motor simplificado interno ao Admin Portal. | done | `ms-espec-registry` (`CamundaClient.java`) chama a REST API real do Camunda 7 (`engine-rest`), a mesma que `ms-transform-publication` usa para implantar | Exige jornada publicada — ver ajuste no Objetivo da feature em `ej-admin-requisitos.md` |
| [x] | REQ-05.04.002 | Na versão 1.0.0, as integrações REST externas referenciadas pelas jornadas devem ser emuladas por um serviço de mock dedicado, já que não há sistemas de terceiros reais disponíveis. | done | `ms-mock-api-rest` (`simulacoes/ms-mock-api-rest`) — 10 endpoints estáticos, um por chamada REST real usada na massa de dados de teste | |
| [x] | REQ-05.04.003 | As integrações Kafka referenciadas pelas jornadas devem executar contra um broker Kafka real, com publicação e consumo de mensagens efetivos. | done | `KafkaBridgeScheduler.java` (`ms-espec-registry`) — `@Scheduled` único que produz (fetchAndLock em lote + `KafkaTemplate.send`) e consome (`KafkaConsumer` inscrito nos tópicos descobertos), contra um broker Kafka 4.3.1 local (KRaft) | Verificado ao vivo publicando/consumindo mensagem real em ambos os sentidos |

### US-05.05 Etapas de integração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.05.001 | O sistema deve permitir avançar manualmente uma etapa de integração (Service Task ou Receive Task) que dependeria de um evento assíncrono externo, pulando sua conclusão. | done | Botão "Pular etapa" (`DevicePreview.tsx`) → `POST /instances/{id}/simulate-step` (nome do endpoint no `ms-espec-registry`, fora de escopo — o front chama isso via `skipStep()`) → fetchAndLock+complete (external task Kafka) ou correlação de mensagem (`RECEIVE_TASK`) | |
| [x] | REQ-05.05.002 | O sistema deve indicar claramente quando a execução está aguardando uma etapa de integração, distinguindo-a de uma User Task aguardando preenchimento. | done | Card `Callout` dedicado (`step.type === 'WAITING'`) com nome/tipo do nó, visualmente distinto do formulário de User Task | |

### US-05.06 Observabilidade da execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.06.001 | O sistema deve apresentar as variáveis do processo em execução, com seus valores atuais. | done | Aba Variáveis (`InspectorPanel.tsx`) → `GET /instances/{id}/variables` → `GET /process-instance/{id}/variables` no motor de runtime | Variáveis de escopo do processo e de etapa aparecem na mesma tabela — ver nota abaixo |
| [x] | REQ-05.06.002 | O sistema deve permitir alterar manualmente o valor de uma variável do processo em execução, para forçar caminhos alternativos de decisão durante o teste. | done | Edição inline na aba Variáveis → `PUT /instances/{id}/variables/{name}` → `PUT /process-instance/{id}/variables/{name}` no motor de runtime | |
| [x] | REQ-05.06.003 | O sistema deve apresentar o resultado das integrações já executadas (dados retornados/mapeados por Service/Receive Tasks). | done | Aba Log (`InspectorPanel.tsx`) — cada entrada do trail (`TrailEntry.url`/`response`, computado em `SimulationController`/`trailSince`, `ms-espec-registry`) é anexada como bloco JSON abaixo da mensagem daquele nó (`trailLogData`) | evidência revisada: a aba "Integrações" dedicada que existia até então foi removida por redundância (mesmo dado, consolidado na aba Log) |
| [x] | REQ-05.06.004 | O sistema deve apresentar um log cronológico dos passos executados durante a execução. | done | Aba Log — acumulado 100% no front a cada `start`/`complete-task`/`skip-step`, sem endpoint dedicado, somado ao `trail` computado no backend (`SimulationController.start()`/`completeTask()`/`simulateStep()`) para os nós resolvidos numa única chamada síncrona sem wait state — o front usa `initialStep.trail` para preencher o log inicial nesse caso | corrigido bug em que `start()` não populava `trail` e o front ignorava `initialStep.trail`, deixando o log vazio quando a jornada rodava inteira de uma vez |
| [x] | REQ-05.06.005 | O log cronológico deve apresentar os dados efetivamente submetidos em cada User Task respondida, não apenas a indicação de que foi respondida. | done | `ExecutionWorkspace.tsx` passa `answers` para `appendLog`; `InspectorPanel.tsx` renderiza um bloco `<pre>` com o JSON da resposta abaixo da mensagem do log | |
| [x] | REQ-05.06.006 | O log cronológico deve registrar toda chamada de API entre o frontend e o backend relacionada à execução (método, caminho, status, headers e corpo), com exceção da consulta de variáveis do processo. | done | front: `execution/api.ts` — `setApiCallLogger`/`shouldLogApiCall` (exclui `GET .../variables`)/`formatApiCallLog`, `request()` captura `requestHeaders`/`requestBody`; `ExecutionsPage.tsx` é o dono único do registro do logger (`liveLoggerRef`/`onApiCallHandlerChange`), evitando uma corrida entre `ExecutionsPage` e `ExecutionWorkspace` registrando o mesmo callback | |
| [x] | REQ-05.06.007 | O log deve permitir busca textual, com navegação entre ocorrências, e permitir expandir ou recolher cada entrada individualmente ou em bloco. | done | front: `InspectorPanel.tsx` — `LogPanel`/`LogToolbar` (busca com Enter/Shift+Enter, contador de ocorrências, botões anterior/próximo, destaque via `highlightText`) e `LogRow` clicável, com "Expandir tudo"/"Recolher tudo" | |

### US-05.07 Seleção e apresentação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.07.001 | O sistema deve permitir localizar uma jornada publicada por busca, listando as jornadas disponíveis e filtrando a lista conforme o texto digitado. | done | `JourneySearch.tsx` — dropdown lista todas as jornadas ao focar o campo, com rolagem (até 360px de altura), filtrando conforme o texto digitado; sem limite de resultados | Comportamento revisado: a versão anterior deste requisito (`sem exigir listar todas de uma vez`) foi trocada a pedido do usuário — ver changelog |
| [x] | REQ-05.07.002 | A execução deve ocorrer na mesma tela de seleção da jornada, sem navegação entre telas. | done | `ExecutionsPage.tsx` troca `JourneySearch` ↔ `ExecutionWorkspace` por estado local, sem rota/navegação | |
| [x] | REQ-05.07.003 | A pré-visualização da execução deve se adaptar ao canal da jornada (Web ou App), incluindo uma representação visual compatível com o canal (ex.: layout de dispositivo móvel para jornadas de canal App). | done | `DevicePreview.tsx` — canal `MOBILE` renderiza dentro de `PhoneFrame.tsx` (moldura de celular); `WEB` renderiza num card largo | Mística não tem componente de moldura de dispositivo pronto; construído à mão |

### US-05.08 Tratamento de falhas de integração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.08.001 | O sistema deve detectar quando uma etapa de integração (Service Task ou Receive Task) falha durante a execução (ex.: conector REST inacessível) e identificar qual nó do fluxo causou a falha, mesmo quando o motor não expõe isso diretamente (a transação dá rollback antes de qualquer histórico ser gravado). | done | `PublicationSnapshot.nextConnectorNodeAfter()` + `SimulationController.errorResponse()` (`ms-espec-registry`) — captura `RestClientException` de `completeTask`/`simulateStep` e segue as conexões do fluxo a partir do passo atual até o próximo nó com conector (único tipo capaz de falhar assim), devolvendo `errorNodeId`/`errorNodeName`/`errorMessage` numa resposta 200 estruturada em vez do 500 cru do motor | Validado ao vivo derrubando `ms-mock-api-rest` e completando uma task real: a resposta veio com o nó de serviço correto, não a User Task anterior |
| [x] | REQ-05.08.002 | O sistema deve destacar visualmente, no diagrama do fluxo, o nó que causou a falha, de forma distinta dos demais estados (concluído, atual, pendente). | done | `FlowDiagramViewer.tsx` — status `error` no `SimNode` (fundo/borda na cor de erro da Mística, `errorLow`/`error`) | |
| [x] | REQ-05.08.003 | O sistema deve registrar a falha no log cronológico da execução. | done | `ExecutionWorkspace.tsx` — `applyNewStep` registra `Falha ao executar "X": mensagem` no log quando `newStep.errorNodeId` vem preenchido | |
| [x] | REQ-05.08.004 | O sistema deve permitir consultar a mensagem de erro completa da falha sob demanda, sem exibi-la de forma intrusiva na tela principal de execução. | done | `ErrorDetailsModal.tsx` — ícone no nó com erro abre modal (via `createPortal`) com a mensagem completa, botão copiar, fechar e tecla Esc; a tela de execução não exibe mais nenhum aviso de erro inline | |
| [x] | REQ-05.08.005 | Antes de iniciar uma instância, completar uma tarefa ou pular uma etapa, o sistema deve detectar quando o trecho seguinte do fluxo executaria integralmente de forma síncrona até um `END` sem passar por checkpoint, e recusar a operação com mensagem explicativa. | done | `ms-espec-registry`: `SynchronousChainCheck.verify()` (porta da mesma regra de `FlowValidator`, com o modelo `FlowNode`/`FlowConnection` próprio do serviço) chamada em `start()`, `completeTask()` e `simulateStep()` antes de qualquer chamada ao motor; `SynchronousChainUnsupportedException` → `GlobalExceptionHandler` devolve mensagem clara em vez do `NullValueException` cru do motor | achado ao vivo: o erro reapareceu depois que o usuário editou uma condição de gateway tornando um caminho já existente 100% síncrono; REQ-03.02.008 já bloqueia isso ao salvar fluxos novos, esta camada cobre fluxos persistidos antes da regra existir |

### US-05.09 Mensageria Kafka real

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-05.09.001 | Cada execução deve possuir um identificador de correlação (business key) próprio, gerado automaticamente ao iniciar a instância. | done | `SimulationController.start()` gera `UUID.randomUUID()` e passa como `businessKey` em `camundaClient.startProcessInstance(...)` | |
| [x] | REQ-05.09.002 | Uma Service Task com conector Kafka deve publicar a mensagem de verdade num broker Kafka real, automaticamente, sem exigir ação manual. | done | `KafkaBridgeScheduler.produceTick()` — trava em lote os external tasks Kafka pendentes (`CamundaClient.fetchAndLockAll`), resolve `{{variável}}` e publica via `KafkaTemplate` | Verificado ao vivo: jornada IoT, mensagem real chegou no tópico em ~3s sem clique |
| [x] | REQ-05.09.003 | O sistema deve indicar visualmente que uma Service Task Kafka está aguardando a publicação automática, sem oferecer um botão de ação como principal. | done | `DevicePreview.tsx` — `Callout` com ícone `Radio` quando `isKafka && step.nodeType === 'SERVICE_TASK'`, sem botão | |
| [x] | REQ-05.09.004 | O sistema deve detectar e processar automaticamente uma mensagem Kafka publicada no tópico de uma Receive Task ou de um início por mensagem em execução, avançando a instância sem exigir ação do usuário — inclusive quando publicada por um produtor externo ao Admin Portal. | done | `KafkaBridgeScheduler.consumeTick()` — `KafkaConsumer` inscrito nos tópicos descobertos (`KafkaTopicDiscovery.discoverConsumerNodes()`), correlaciona por businessKey (Receive Task) ou inicia direto pela definição de processo (Message Start Event) | Verificado ao vivo com `kafka-console-producer` (produtor externo, sem passar pelo painel do Admin Portal) |
| [x] | REQ-05.09.005 | O sistema deve permitir publicar uma mensagem de teste real, com tópico (somente leitura) e payload editável em JSON, na tela de execução, para uma Receive Task que dependa de mensagem Kafka. | done | `SendTestMessagePanel.tsx` → `POST /journeys/{id}/nodes/{nodeId}/test-message` (`SimulationController.sendTestMessage`) → `KafkaTemplate.send` direto no tópico do nó | |
| [x] | REQ-05.09.006 | O payload da mensagem de teste de uma Receive Task deve vir pré-preenchido com o business key da instância em execução. | done | `DevicePreview.tsx` — `initialPayload={{ businessKey }}` passado ao `SendTestMessagePanel` | |
| [x] | REQ-05.09.007 | Uma jornada cujo início é por mensagem deve oferecer, na tela de busca, o painel de envio de mensagem de teste para iniciar uma instância nova, sem pré-preencher a business key. | done | `JourneySearch.tsx` — busca o nó de início via `GET /journeys/{id}/flow`; se `MESSAGE_START_EVENT`, troca o botão "Executar" pelo `SendTestMessagePanel` com `initialPayload={{}}` | |
| [x] | REQ-05.09.008 | Depois de enviar a mensagem de teste que inicia uma jornada por mensagem, o sistema deve aguardar automaticamente até a instância nova aparecer e prosseguir para a tela de execução. | done | `JourneySearch.tsx` (`pollForNewInstance`) → `GET /journeys/{id}/latest-instance?since=...` (`CamundaClient.findMostRecentInstanceStartedAfter`, via histórico do motor de runtime) | |
| [x] | REQ-05.09.009 | O sistema deve permitir, como alternativa manual secundária à publicação/consumo Kafka real, pular qualquer etapa Kafka em espera (Service Task, Receive Task ou início por mensagem), fabricando o resultado a partir do mapeamento de saída configurado. | done | Link "Pular etapa" em `DevicePreview.tsx` (nós `SERVICE_TASK`/`RECEIVE_TASK` Kafka) e "Iniciar sem mensagem" em `JourneySearch.tsx` (início por mensagem) — ambos reaproveitam `onSkipStep`/`handleExecute`, que já existiam antes da Fase 4 e nunca foram removidos do backend | Mesmo mecanismo do "Pular etapa" da US-05.05 (`POST /instances/{id}/simulate-step`), só reexposto como opção secundária pros nós Kafka |
| [x] | REQ-05.09.010 | Ao iniciar uma execução, o sistema deve permitir optar por controle manual das mensagens Kafka daquela instância, retirando suas Service Tasks Kafka do disparo automático do worker em background. | done | front: `StartPanel.tsx` — checkbox `manualKafkaControl`, passado a `startInstance(journeyId, variables, manualKafkaControl)`; back: `SimulationController.start()` seta a variável de processo `KafkaMessagePublisher.MANUAL_KAFKA_CONTROL_VAR`, que `KafkaBridgeScheduler.produceTick()` respeita para não publicar automaticamente | |
| [x] | REQ-05.09.011 | Com controle manual ativo, a tela de execução deve permitir publicar a mensagem de uma Service Task Kafka digitando o payload manualmente ou gerando-o automaticamente a partir do mapeamento configurado. | done | front: `KafkaManualSendPanel.tsx` (modo "escolher" → digitar manualmente ou gerar); back: `KafkaMessagePublisher.resolvePayload`/`publish`, endpoint dedicado de envio manual em `SimulationController` | |

> Nota US-05.06: nosso BPMN nunca tem mais de uma execução viva ao mesmo tempo (sem gateway paralelo, subprocesso ou multi-instância — ver `FlowValidator.java`), então "variável de escopo do processo" e "de etapa" são, na prática, o mesmo escopo — uma tabela única é mais honesta que fingir uma separação que os dados não têm. Se o modelo de fluxo ganhar concorrência real no futuro, o motor já suporta consultar variáveis por execução (`GET /execution/{id}/variables`) para diferenciar.

---

## FT-02 Gestão de Jornadas — continuação: publicação

### US-02.06 Publicação de jornadas

#### Publicação de Jornadas — requisitos consolidados no FT-02

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.06.001 | O sistema deve permitir publicar jornadas. | done | back: `POST /api/v1/journeys/{id}/publish` + `PublishJourney`; front: `JourneysPage` (ação "Publicar"/"Republicar") | |
| [x] | REQ-02.06.002 | O sistema deve permitir despublicar jornadas por meio da API do runtime. | done | back: `POST /api/v1/journeys/{id}/unpublish` + `UnpublishJourney` (chama `RuntimePublicationPort.unpublish`); front: ação "Despublicar" | |
| [x] | REQ-02.06.003 | O sistema deve permitir consultar jornadas publicadas. | done | back: `GET /api/v1/journeys?status=PUBLISHED`; front: filtro "Publicadas" em `JourneysPage` | |
| [x] | REQ-02.06.004 | Cada jornada deve possuir no máximo uma publicação ativa, associada a uma versão imutável. Alterações realizadas após a publicação não devem modificar o snapshot publicado; para disponibilizá-las, o usuário deve publicar uma nova versão. | done | back: `journey_publication.version_id` (FK única por jornada) + `JourneyVersion` imutável após `publish()`; ver FT-06 | satisfeito pela implementação do FT-06 |

### US-02.07 Estado da publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.07.001 | O sistema deve indicar se uma jornada está publicada. | done | back: `JourneyResponse.status`; front: `JourneyStatusTag` | |
| [x] | REQ-02.07.002 | O sistema deve indicar a data da publicação. | done | back: `JourneyResponse.publishedAt` (via `JourneyViewAssembler` + `PublicationRepository`); front: "Publicada em ..." em `JourneyCard`/`JourneyRow` | |
| [x] | REQ-02.07.003 | O sistema deve indicar o produto associado à publicação. | done | front: `journey.productName` já exibido em todo lugar da listagem (produto é imutável por jornada) | |
| [x] | REQ-02.07.004 | O sistema deve indicar o canal associado à publicação. | done | front: `journey.channelName` já exibido em todo lugar da listagem | |

### US-02.08 Catálogo de publicações

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.08.001 | O sistema deve permitir listar jornadas publicadas. | done | back/front: mesma listagem de Jornadas, filtro de status "Publicadas" — sem menu novo, por decisão de produto | |
| [x] | REQ-02.08.002 | O sistema deve permitir pesquisar jornadas publicadas. | done | front: campo de busca de `JourneysPage`, combinável com o filtro "Publicadas" | |
| [x] | REQ-02.08.003 | O sistema deve permitir filtrar jornadas publicadas por produto. | done | back: `GET /api/v1/journeys?productId=&status=PUBLISHED`; front: `FilterDropdown` "Produto" | |
| [x] | REQ-02.08.004 | O sistema deve permitir filtrar jornadas publicadas por canal. | done | back: `GET /api/v1/journeys?channelId=&status=PUBLISHED`; front: `FilterDropdown` "Canal" | |

---

### US-02.09 Publicação no runtime

#### Chamadas de Publicação e Despublicação — requisitos consolidados no FT-02

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.09.001 | O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime. | done | back: `PublishJourney`/`UnpublishJourney` chamam `RuntimePublicationPort` (`PublicationAdapter`, chamada HTTP real via `RestClient`) | |
| [x] | REQ-02.09.002 | A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários. | done | back: `Publication` (passada para `RuntimePublicationPort.publish`) carrega jornada, produto, canal, `FlowNode`/`FlowConnection` e `Form`s referenciados | |
| [x] | REQ-02.09.003 | O Admin Portal deve realizar uma chamada de saída real (HTTP) para a API de publicação do runtime. Após sucesso, substitui o snapshot anterior e altera o estado da jornada para `PUBLISHED`; em caso de falha, o erro propaga e nenhum estado é alterado. | done | back: `PublicationAdapter.publish` faz `POST` real via `RestClient`; falhas de rede/HTTP lançam `RuntimePublicationException` (mapeada para 502 `RUNTIME_UNAVAILABLE`), e `PublishJourney` só persiste `Publication`/`journey.publish()` depois da chamada não lançar | Deixou de ser mock: testado via curl ponta a ponta publicando de fato no runtime configurado |
| [x] | REQ-02.09.004 | Ao despublicar, o Admin Portal deve chamar a API de publicação do runtime para remover/desfazer a publicação. Após sucesso, jornada e publicação assumem `UNPUBLISHED`; em caso de falha, os estados atuais são preservados. | done | back: `PublicationAdapter.unpublish` faz `DELETE` real via `RestClient`; falha lança `RuntimePublicationException` (502); `UnpublishJourney` só chama `journey.unpublish()`/`save` após a chamada não lançar | Deixou de ser mock: testado via curl ponta a ponta despublicando de fato no runtime configurado; jornada assume `UNPUBLISHED` (registro preservado, ver REQ-02.06.004) |

### US-02.10 Inspeção da publicação

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-02.10.001 | Para uma jornada com publicação ativa (`PUBLISHED`), o sistema deve permitir visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários, incluindo a árvore SDUI de cada formulário), por meio de uma ação na listagem de jornadas ao lado de "Editar" e "Excluir". | done | back: `GET /api/v1/journeys/{id}/publication` (`GetPublicationSnapshot` + `PublicationSnapshotRecord.from`, 409 se a jornada não estiver `PUBLISHED`); front: ícone "Ver publicação" (`FileJson`) em `JourneyActions`, abre `PublicationSnapshotModal` com o JSON completo e botão "Copiar JSON" | testado via curl: 200 com JSON completo em jornada `PUBLISHED`, 409 em jornada não publicada; escopo mais restrito que o `REQ-06.03.006` removido (só a publicação ativa da jornada, não qualquer versão histórica) |

---

## FT-06 Versionamento de jornadas

### US-06.01 Modelo de versões

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

### US-06.02 Criação e edição de versões

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
| [x] | REQ-06.02.010 | Antes de salvar a edição de uma jornada `PUBLISHED`, o sistema deve avisar o usuário de que a alteração será registrada em uma versão em rascunho separada da publicada. | done | front: `ConfirmDialog` em `JourneyDesignerPage.handleSave` quando `activeJourney.status === 'PUBLISHED'` | texto revisado com ênfase em "PUBLICADA" e explicação de que a jornada roda tarefa por tarefa contra a engine de runtime |
| [x] | REQ-06.02.011 | Ao salvar um fluxo sem alteração real em relação ao conteúdo já persistido, o sistema deve informar o usuário de que nada foi alterado e não deve gerar ou atualizar a versão `DRAFT`. | done | back/front: `UpdateFlow`/`JourneyDesignerPage.handleSave` comparam o conteúdo antes de acionar `CreateJourneyVersion`; toast informativo "Nada foi alterado" quando não há diferença | |

### US-06.03 Histórico e consulta

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.03.001 | O sistema deve permitir listar todas as versões de uma jornada. | done | back: `GET /journeys/{id}/versions`; front: linhas aninhadas ao expandir a jornada em `JourneysPage` | |
| [x] | REQ-06.03.002 | O sistema deve permitir consultar o conteúdo completo de uma versão. | done | back: `GET /journeys/{id}/versions/{versionId}` retorna o `snapshot` completo | |
| [x] | REQ-06.03.003 | O histórico deve exibir número, status, datas e autor da versão. | done | front: colunas número/status/data/autor nas linhas de versão de `JourneysPage` | |
| [x] | REQ-06.03.004 | O sistema deve permitir ordenar versões por número ou data. | done | back: listagem ordenada por `version_number`; `created_at`/`published_at` disponíveis para ordenação no front | ordenação padrão por número; sem seletor de ordenação alternativa na UI |
| [x] | REQ-06.03.005 | O sistema deve diferenciar versões em edição, publicadas, arquivadas e despublicadas. | done | front: badges de status coloridos (`DRAFT`/`PUBLISHED`/`ARCHIVED`/`UNPUBLISHED`) nas linhas de versão de `JourneysPage` | |

### US-06.04 Publicação de versões

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
| [x] | REQ-06.04.013 | O sistema deve distinguir uma falha de publicação genuinamente indisponível de uma rejeição de conteúdo, apresentando uma mensagem de erro única e legível, nunca a resposta crua ou aninhada do serviço subjacente. | done | back: `PublicationAdapter` — `RuntimePublicationException` (502 `RUNTIME_UNAVAILABLE`) vs `RuntimePublicationRejectedException` (422 `RUNTIME_DEPLOYMENT_REJECTED`), `extractMessage` sempre tenta extrair o campo `"message"` limpo primeiro; `ms-transform-publication`: `CamundaRestClient` — `CamundaDeploymentException` (422) vs `CamundaUnavailableException` (502), `extractCamundaMessage`; front: `JourneysPage.tsx` distingue pelo `code` do erro | achado real: condição de gateway gerada por IA com aspas escapadas quebrava o parser JUEL do motor — motivou também a guarda em `FlowValidator` (REQ-03.11.003) |

### US-06.05 Compatibilidade e limites da Versão 1.0.0

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-06.05.001 | O sistema deve preservar versões de jornadas desativadas. | done | back: `DeleteJourney` (soft-delete de jornada com publicação) marca `journey_version` como `INACTIVE`, sem apagar as linhas/snapshots | evidência atualizada após remoção de `DeactivateJourney` — não existe mais desativação manual isolada, só via exclusão (REQ-02.01.005/008/009) |
| [x] | REQ-06.05.002 | Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual. | done | back: `V8__backfill_journey_version.sql` cria versão 1 (PUBLISHED ou DRAFT conforme publicação existente) para toda jornada pré-existente | |
| [x] | REQ-06.05.003 | O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação. | done | back: `PublishJourney`/`GET /journeys` legados continuam funcionando; `journey.status` (ciclo de vida da jornada) mantido separado do status de versão | |
| [x] | REQ-06.05.004 | O sistema não deve permitir restauração ou rollback de versão na versão 1.0.0. | done | back: nenhum endpoint de restore/rollback implementado (decisão deliberada, fora de escopo) | |
| [x] | REQ-06.05.005 | O sistema deve registrar a versão associada a cada publicação. | done | back: `journey_publication.version_id` | mesma evidência de REQ-06.04.006 |

## FT-07 Autenticação e autorização

### US-07.01 Autenticação mockada por provedor externo

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.01.001 | O sistema deve representar a autenticação por meio de um provedor externo. | done | back: `POST /auth/login` modela a fronteira de um provedor externo | |
| [ ] | REQ-07.01.002 | Na versão 1.0.0, a integração com o provedor externo deve ser mockada. | todo | back: `MockUserStore` (usuário hardcoded, sem integração real) | Implementado, porém mockado — não é uma integração real |
| [x] | REQ-07.01.003 | O sistema deve disponibilizar uma tela de login padrão. | done | front: `LoginPage.tsx` | |
| [x] | REQ-07.01.004 | A tela de login deve permitir informar usuário e senha. | done | front: campos usuário/senha em `LoginPage` (`Field`/`TextInput`) | |
| [ ] | REQ-07.01.005 | A versão 1.0.0 deve disponibilizar o usuário mockado `admin`, com senha `admin` e perfil `ADMIN`. | todo | back: `MockUserStore` (`admin`/`admin`/`ADMIN`, UUID fixo `00000000-0000-0000-0000-000000000001`) | Implementado, porém mockado — não é uma integração real |
| [x] | REQ-07.01.006 | O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas. | done | back: `LoginUseCase` retorna 401 (`InvalidCredentialsException`) para credenciais inválidas | |
| [x] | REQ-07.01.007 | O sistema deve indicar que a autenticação utilizada na versão 1.0.0 é mockada e não representa integração real com um provedor. | done | front: nota/tag "Autenticação mockada" visível em `LoginPage` | |

### US-07.02 Sessão e proteção de acesso

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-07.02.001 | O sistema deve criar uma sessão autenticada após login bem-sucedido. | done | back: `SessionStore` (token opaco em memória) emitido no login | |
| [x] | REQ-07.02.002 | O sistema deve permitir encerrar a sessão. | done | back: `POST /auth/logout` + `LogoutUseCase`; front: botão de logout na `Sidebar` | |
| [x] | REQ-07.02.003 | O sistema deve expirar sessões após período configurável de inatividade. | done | back: `app.security.session-inactivity-minutes` (`application.yml`, padrão 30 min) | |
| [x] | REQ-07.02.004 | O sistema deve rejeitar requisições com sessão expirada ou inválida. | done | back: `BearerTokenAuthFilter` retorna 401 para token ausente/expirado/inválido | |
| [x] | REQ-07.02.005 | As rotas administrativas devem ser protegidas contra acesso anônimo. | done | back: `SecurityConfig` exige autenticação em todas as rotas exceto `/auth/login` | |
| [x] | REQ-07.02.006 | O sistema deve preservar a identificação do usuário autenticado nas operações realizadas. | done | back: `@AuthenticationPrincipal AuthenticatedUser` disponível nos controllers/use cases (usado em auditoria e `created_by` de versão) | |

### US-07.03 Papéis e permissões

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

### US-07.04 Administração de usuários mockados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-07.04.001 | O sistema deve representar na versão 1.0.0 o usuário `admin` como usuário administrativo mockado. | todo | back: `MockUserStore` | Implementado, porém mockado — não é uma integração real |
| [ ] | REQ-07.04.002 | O sistema deve impedir a remoção do último usuário com papel `ADMIN`. | n/a | | não há CRUD de usuário na versão 1.0.0 (usuário único hardcoded, não removível por design) |
| [x] | REQ-07.04.003 | O sistema deve permitir consultar o usuário autenticado e seu papel. | done | back: `GET /auth/me`; front: `AuthContext` expõe `user` (username/role) | endpoint adicional não previsto no OpenAPI original, alinhado ao requisito |
| [x] | REQ-07.04.004 | O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora da versão 1.0.0. | done | back: comentário no `MockUserStore`; front: nota "mockado" em `LoginPage` | |

Observação: a ocultação de botões de criar/editar por papel não foi replicada em todas as telas (backend é o controle vinculante, per REQ-07.03.008); pode ser adicionada incrementalmente por página se desejado.

## FT-08 Auditoria

### US-08.01 Registro de eventos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.01.001 | O sistema deve registrar eventos relevantes de autenticação, autorização e negócio. | done | back: `RecordAuditEvent` chamado em login/logout, CRUD de produto/canal/jornada, versões, publicações e acessos negados | |
| [x] | REQ-08.01.002 | Cada evento deve possuir identificador único (`auditEventId`). | done | back: `audit_event.audit_event_id UUID PRIMARY KEY` (`V9__create_audit_event.sql`) | |
| [x] | REQ-08.01.003 | Cada evento deve registrar data e hora, ação, resultado e recurso afetado. | done | back: colunas `occurred_at`/`action`/`result`/`resource_type`/`resource_id` | |
| [x] | REQ-08.01.004 | Cada evento deve registrar o usuário responsável ou indicar que foi anônimo. | done | back: `audit_event.user_id` nullable (nulo = anônimo, ex.: login falho) | |
| [x] | REQ-08.01.005 | Cada evento deve registrar identificador de correlação da requisição, quando disponível. | done | back: `audit_event.correlation_id` (header `X-Correlation-Id` ou UUID gerado) | |
| [x] | REQ-08.01.006 | O sistema deve registrar eventos de sucesso, falha e acesso negado. | done | back: `AuditResult` enum `SUCCESS`/`FAILURE`/`DENIED` | |

### US-08.02 Eventos auditáveis

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.02.001 | O sistema deve auditar login bem-sucedido e malsucedido. | done | back: `LoginUseCase` grava `SUCCESS`/`FAILURE` | |
| [x] | REQ-08.02.002 | O sistema deve auditar logout, expiração e bloqueio de sessão. | done | back: `LogoutUseCase` (`SUCCESS`); `BearerTokenAuthFilter` (`SESSION_EXPIRED`, `DENIED`) | |
| [x] | REQ-08.02.003 | O sistema deve auditar criação, alteração e desativação de produtos, canais e jornadas. | done | back: `Create/Update/Deactivate` de `Product`/`Channel`/`Journey` gravam evento | |
| [x] | REQ-08.02.004 | O sistema deve auditar criação e alteração de versões. | done | back: `CreateJourneyVersion` grava `JOURNEY_VERSION_CREATE` | não há endpoint de "alteração" de versão (versões são imutáveis por design, ver FT-06) |
| [x] | REQ-08.02.005 | O sistema deve auditar publicação, republicação e despublicação de jornadas. | done | back: `PublishJourney`/`UnpublishJourney`/`PublishJourneyVersion` gravam evento com transição de status | |
| [x] | REQ-08.02.006 | O sistema deve auditar tentativas de acesso negadas por falta de permissão. | done | back: `SecurityConfig.accessDeniedHandler` grava `ACCESS_DENIED`/`DENIED` | |
| [ ] | REQ-08.02.007 | O sistema deve auditar alterações de papéis e configurações de acesso mockadas. | n/a | | não há CRUD de papéis/configuração de acesso na versão 1.0.0 (usuário e papel são fixos) |

### US-08.03 Proteção dos registros

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.03.001 | Os registros de auditoria não devem ser editáveis por usuários comuns. | done | back: nenhum endpoint de update para `audit_event` | |
| [x] | REQ-08.03.002 | Os registros de auditoria não devem ser removidos por operações normais do sistema. | done | back: nenhum endpoint de delete para `audit_event` | |
| [x] | REQ-08.03.003 | O sistema não deve armazenar senhas, tokens, segredos ou credenciais sensíveis nos registros. | done | back: `RecordAuditEvent` nunca recebe senha/token como payload; revisão dos call sites confirma | |
| [x] | REQ-08.03.004 | O sistema deve evitar o armazenamento de dados sensíveis nos valores anterior e posterior. | done | back: `previous_value`/`new_value` só preenchidos com transições simples (ex.: `{"status": "..."}`), null nos demais casos | |
| [x] | REQ-08.03.005 | Falhas de auditoria não podem ser ignoradas silenciosamente. | done | back: `RecordAuditEvent` loga em nível ERROR em caso de falha de persistência (não propaga para não quebrar a operação de negócio) | |

### US-08.04 Consulta de auditoria

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-08.04.001 | Usuários autorizados devem poder consultar eventos de auditoria. | done | back: `GET /audit-events` (`@PreAuthorize("hasRole('ADMIN')")`); front: `AuditPage` (visível só para `ADMIN`) | |
| [x] | REQ-08.04.002 | O sistema deve permitir filtrar eventos por usuário, ação, recurso, resultado e período. | done | back: filtros `userId/action/resourceType/result/from/to`; front: formulário de filtros em `AuditPage` | |
| [x] | REQ-08.04.003 | O sistema deve permitir pesquisar eventos por recurso ou correlação. | done | back: filtros `resourceId`/`correlationId` | |
| [x] | REQ-08.04.004 | O sistema deve apresentar os eventos em ordem cronológica e com paginação. | done | back: `Pageable`, ordenado por `occurred_at DESC`; front: paginação de 20 registros por página | |

Observação: os registros não armazenam senhas, tokens, segredos ou outros dados sensíveis (REQ-08.03.003/004).

## FT-09 Ajuda e Suporte

### US-09.01 Central de ajuda

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-09.01.001 | O sistema deve disponibilizar uma tela de ajuda acessível a partir do menu do Admin Portal. | done | front: item "Ajuda e suporte" em `Sidebar.tsx` abre `HELP_TAB` (`App.tsx`, `kind: 'help'`) | |
| [x] | REQ-09.01.002 | A tela de ajuda deve apresentar um conjunto de perguntas frequentes (FAQ) organizadas por tema. | done | front: `HelpPage.tsx` (`FAQ_ITEMS` agrupado por `topic`, `TOPIC_LABELS`) | |
| [x] | REQ-09.01.003 | O sistema deve permitir pesquisar textualmente o conteúdo do FAQ. | done | front: campo de busca em `HelpPage.tsx`, filtra por pergunta/resposta | |
| [x] | REQ-09.01.004 | O conteúdo do FAQ deve ser mantido como conteúdo estático versionado com o sistema. | done | front: `FAQ_ITEMS` é um array estático no próprio `HelpPage.tsx`, sem backend/CMS | |
| [x] | REQ-09.01.005 | A tela de ajuda deve exibir o contato do time de sustentação (`sustentacao@telefonica.com`) como link `mailto:`, abrindo o cliente de e-mail padrão do usuário. | done | front: link `mailto:sustentacao@telefonica.com` no rodapé de `HelpPage.tsx` | |

## FT-10 Observabilidade

### US-10.01 Log de requisições de API

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.01.001 | O sistema deve registrar em log a entrada de toda requisição HTTP recebida pela API, incluindo método e caminho. | done | back: `HttpRequestLoggingFilter.doFilterInternal` loga `--> {method} {uri}` antes de `filterChain.doFilter` | |
| [x] | REQ-10.01.002 | O sistema deve registrar em log a saída de toda requisição HTTP, incluindo status de resposta e duração do processamento. | done | back: `HttpRequestLoggingFilter` loga `<-- {method} {uri} status={} durationMs={}` no `finally` | |
| [x] | REQ-10.01.003 | O log de requisição e resposta não deve registrar o corpo (body) da requisição por padrão, para evitar exposição de dados sensíveis. | done | back: `HttpRequestLoggingFilter` não lê/loga `HttpServletRequest`/`HttpServletResponse` body, só metadados (método, path, status, duração) | simplificação deliberada — sem `ContentCachingRequestWrapper`; adicionar log de body em `DEBUG` se necessário no futuro |

### US-10.02 Log de transações de persistência

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.02.001 | O sistema deve registrar em log o início de toda transação da camada de aplicação que represente uma operação de persistência em banco de dados. | done | back: `TransactionLoggingAspect.logTransaction` (`@Around`) loga `BEGIN {signature}`; pointcut cobre todo `@Service` em `com.jouney.admin.application..*` | |
| [x] | REQ-10.02.002 | O sistema deve registrar em log a conclusão de uma transação bem-sucedida, incluindo sua duração. | done | back: `TransactionLoggingAspect` loga `COMMIT {signature} durationMs={}` após `joinPoint.proceed()` | |
| [x] | REQ-10.02.003 | O sistema deve registrar em log a falha de uma transação, incluindo a causa do erro, sem interromper a propagação da exceção original. | done | back: `TransactionLoggingAspect` loga `ROLLBACK {signature} durationMs={} error={}` em `catch (Throwable ex)` e relança (`throw ex`) | |

### US-10.03 Correlação de logs

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-10.03.001 | Toda requisição de API deve ser associada a um identificador de correlação. | done | back: `HttpRequestLoggingFilter.resolveCorrelationId` | mesmo conceito de correlação já usado pela auditoria (`RecordAuditEvent.correlationId`, FT-08) |
| [x] | REQ-10.03.002 | O identificador de correlação deve ser reaproveitado do cabeçalho `X-Correlation-Id` da requisição quando presente, ou gerado pelo sistema quando ausente. | done | back: `HttpRequestLoggingFilter.resolveCorrelationId` lê o header `X-Correlation-Id`; se ausente/vazio, gera `UUID.randomUUID()` | |
| [x] | REQ-10.03.003 | O identificador de correlação deve estar presente em todas as linhas de log emitidas durante o processamento da requisição, incluindo as de transação de persistência. | done | back: `HttpRequestLoggingFilter` grava o id no `MDC` (`correlationId`) antes de `filterChain.doFilter`; `logback-spring.xml` inclui `%X{correlationId}` no pattern, aplicado a toda linha da thread da requisição — inclusive as do `TransactionLoggingAspect`, que roda na mesma thread | `MDC.remove` no `finally` evita vazamento entre requisições (pool de threads) |
| [x] | REQ-10.03.004 | O identificador de correlação deve ser retornado ao cliente no cabeçalho de resposta. | done | back: `HttpRequestLoggingFilter` faz `response.setHeader("X-Correlation-Id", correlationId)` | |

### US-10.04 Preparação para integração com ELK

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-10.04.001 | O sistema deve estar tecnicamente preparado para o envio dos logs de aplicação a uma stack ELK (Elasticsearch/Logstash/Kibana), permanecendo essa integração desativada na versão 1.0.0 por não haver ambiente ELK disponível. | in_progress | back: `logback-spring.xml` centraliza toda a configuração de log (appender único `CONSOLE`); bloco de comentário reserva o ponto de extensão para um appender Logstash, ainda não adicionado/habilitado | pendente apenas a configuração do appender/conexão quando houver um ambiente ELK disponível — resto já está pronto |
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

## FT-11 Testes

### US-11.01 Testes unitários de domínio (back)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.01.001 | O sistema deve possuir testes unitários para as regras estruturais do fluxo (`FlowValidator`): cardinalidade de START/END, caminho contínuo entre início e fim, elemento inicial único. | todo | | |
| [ ] | REQ-11.01.002 | O sistema deve possuir testes unitários para as regras de versionamento de jornada: criação de DRAFT, publicação, despublicação, republicação, imutabilidade de versão `PUBLISHED`. | todo | | |
| [ ] | REQ-11.01.003 | O sistema deve possuir testes unitários para as regras de formulário: nome de campo único, tipos/subtipos de campo, geração da árvore SDUI. | todo | | |
| [ ] | REQ-11.01.004 | O sistema deve possuir testes unitários para as regras de integridade entre produto/canal/jornada (bloqueio de desativação com publicação ativa). | todo | | |

### US-11.02 Testes de integração de API (back)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.02.001 | O sistema deve possuir testes de integração cobrindo o CRUD completo de produtos, canais e jornadas via API. | todo | | |
| [ ] | REQ-11.02.002 | O sistema deve possuir testes de integração cobrindo o ciclo de publicação/despublicação/republicação de versões, incluindo o registro de auditoria de sucesso e falha. | todo | | |
| [ ] | REQ-11.02.003 | O sistema deve possuir testes de integração cobrindo autenticação e autorização por papel (`ADMIN`/`EDITOR`/`VIEWER`) nos principais endpoints. | todo | | |
| [ ] | REQ-11.02.004 | O sistema deve possuir testes de integração cobrindo o CRUD de formulários e a associação a User Tasks. | todo | | |

### US-11.03 Testes de frontend

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.03.001 | O sistema deve possuir testes automatizados para o form builder (adicionar/remover campo, validação de nome técnico único, subtipos de `INPUT`). | todo | | |
| [ ] | REQ-11.03.002 | O sistema deve possuir testes automatizados para a validação estrutural do editor de fluxo (bloqueio de ações inválidas). | todo | | |

### US-11.04 Cenários end-to-end

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-11.04.001 | O sistema deve possuir um cenário end-to-end cobrindo o fluxo completo: criar produto → canal → jornada → formulário → fluxo → publicar → despublicar. | todo | | |
| [ ] | REQ-11.04.002 | O sistema deve possuir um cenário end-to-end cobrindo criação, publicação e republicação de múltiplas versões de uma mesma jornada. | todo | | |

---

## FT-12 Infraestrutura

### US-12.01 Identidade da solução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.01.001 | Definição da sigla sistêmica e disponibilização de ambiente na Azure. | in_progress | | sigla `ELJY` já criada; falta a disponibilização do ambiente na Azure |

### US-12.02 Containerização (Docker)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.02.001 | Criar Dockerfile para o admin-back. | todo | | |
| [ ] | REQ-12.02.002 | Criar Dockerfile para o admin-front (build estático servido por um servidor web). | todo | | |
| [ ] | REQ-12.02.003 | Criar docker-compose para ambiente de desenvolvimento local (back + front + banco de dados). | todo | | |

### US-12.03 Orquestração (Kubernetes)

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.03.001 | Criar manifests/Helm chart para deploy do admin-back no cluster. | todo | | |
| [ ] | REQ-12.03.002 | Criar manifests/Helm chart para deploy do admin-front no cluster. | todo | | |
| [ ] | REQ-12.03.003 | Configurar ConfigMap/Secret para variáveis de ambiente e credenciais por ambiente. | todo | | |
| [ ] | REQ-12.03.004 | Definir requests/limits de recursos e health checks (liveness/readiness) para os workloads. | todo | | |
| [ ] | REQ-12.03.005 | Configurar ingress/roteamento externo para os serviços expostos. | todo | | |

### US-12.04 Esteira CI/CD

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.04.001 | Pipeline de build e testes automatizados a cada push/PR (integrado ao FT-11 Testes). | todo | | |
| [ ] | REQ-12.04.002 | Pipeline de build e publicação de imagem Docker em um registry. | todo | | |
| [ ] | REQ-12.04.003 | Pipeline de deploy automatizado por ambiente (dev/qa/prod), com aprovação manual obrigatória para produção. | todo | | |
| [ ] | REQ-12.04.004 | Versionamento semântico e tagueamento de releases. | todo | | |

### US-12.05 Ambientes e configuração

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.05.001 | Formalizar a configuração dos perfis dev/qa/prod, com variáveis de ambiente próprias por ambiente. | todo | | |
| [ ] | REQ-12.05.002 | Documentar o procedimento de subida de cada ambiente (how-to). | todo | | |

### US-12.06 Banco de dados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [ ] | REQ-12.06.001 | Indicar a necessidade de criação da base de dados por ambiente. | todo | | |

---

## FT-13 Dashboard

### US-13.01 Indicadores em tempo real

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.01.001 | O sistema deve apresentar a quantidade de instâncias ativas no motor de runtime. | done | back: `DashboardKpis.runningInstances` via `RuntimeMonitoringPort.countRunningInstances()` (`GET /process-instance/count`); front: `KpiCard` "Instâncias ativas" | |
| [x] | REQ-13.01.002 | O sistema deve apresentar a quantidade de tarefas pendentes no motor de runtime. | done | back: `DashboardKpis.pendingTasks` via `countPendingTasks()` (`GET /task/count`); front: `KpiCard` "Tarefas pendentes" | |
| [x] | REQ-13.01.003 | O sistema deve apresentar a quantidade de incidentes abertos no motor de runtime. | done | back: `DashboardKpis.openIncidents` via `countOpenIncidents()` (`GET /incident/count`); front: `KpiCard` "Incidentes abertos" | |
| [x] | REQ-13.01.004 | O sistema deve apresentar a quantidade de jornadas distintas implantadas no motor de runtime. | done | back: `DashboardKpis.deployedJourneys` (contagem de `processDefinitions` agrupados por chave); front: `KpiCard` "Jornadas implantadas" | |
| [x] | REQ-13.01.005 | O sistema deve apresentar a quantidade de instâncias concluídas no dia corrente. | done | back: `DashboardKpis.completedToday` via `countInstancesFinishedSince(startOfToday)`; front: `KpiCard` "Concluídas hoje" | |

### US-13.02 Tendência de execução

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.02.001 | O sistema deve apresentar um gráfico de instâncias iniciadas versus concluídas ao longo do tempo. | done | back: `GetDashboardOverview.execute()` monta `DashboardTrend`; front: `TrendChart` (SVG com área/linha, gradientes, tooltip) | |
| [x] | REQ-13.02.002 | O gráfico deve permitir alternar a granularidade entre últimas 24 horas (por hora), últimos 7 dias (por dia) e últimos 30 dias (por dia), com últimas 24 horas como visão padrão. | done | back: `DashboardTrend(day, week, month)` — `day` por hora (`HourlyInstanceCount`, últimas 24h), `week`/`month` por dia (`DailyInstanceCount`), todos derivados de um único fetch de 30 dias (`historicInstancesStartedSince`); front: `GranularityToggle` em `DashboardPage.tsx`, padrão `'day'` | verificado ao vivo via curl (`trend.day`/`week`/`month` com 24/7/30 pontos) e `tsc -b` limpo; sem verificação visual em navegador nesta sessão (sem ferramenta de browser disponível) |

### US-13.03 Processos por volume

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.03.001 | O sistema deve apresentar um gráfico com a quantidade de instâncias por jornada, somando todas as versões implantadas. | done | back: `processDefinitions` agrupado por chave; front: `HorizontalBarChart` | |
| [x] | REQ-13.03.002 | O gráfico deve indicar quando uma jornada possui incidentes associados. | done | front: `HorizontalBarChart` — badge de contagem de incidentes por barra (`BarDatum.accent`) | |

### US-13.04 Incidentes ativos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.04.001 | O sistema deve listar os incidentes ativos, com jornada, tipo e mensagem. | done | back: `IncidentSummary` via `recentIncidents()` (`GET /incident`), nome resolvido a partir da lista não agrupada de versões implantadas; front: card "Incidentes" | |
| [x] | REQ-13.04.002 | O sistema deve indicar visualmente quando não há incidentes ativos. | done | front: `EmptyHint` "Nenhum incidente ativo — tudo saudável." | |

### US-13.05 Instâncias pendentes e encerramento manual

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.05.001 | O sistema deve listar as instâncias ativas há mais tempo, como candidatas a abandonadas. | done | back: `oldestActiveInstances()` (`GET /history/process-instance?unfinished=true&sortBy=startTime&sortOrder=asc`); front: card "Instâncias pendentes" | |
| [x] | REQ-13.05.002 | O sistema deve permitir encerrar manualmente uma instância. | done | back: `DELETE /api/v1/dashboard/instances/{id}` → `TerminateProcessInstance` → `RuntimeInstanceControlPort.terminate()` (`DELETE /process-instance/{id}`) | testado ao vivo contra o motor de runtime (instância confirmada removida, 404 após) |
| [x] | REQ-13.05.003 | O sistema deve permitir selecionar e encerrar múltiplas instâncias de uma vez. | done | front: `Checkbox` por linha + seleção total, botão "Encerrar N selecionada(s)" dispara `Promise.all` de terminações | |
| [x] | REQ-13.05.004 | O sistema deve exigir confirmação do usuário antes de encerrar uma ou mais instâncias. | done | front: `ConfirmDialog` antes de qualquer encerramento (individual ou em lote) | |
| [x] | REQ-13.05.005 | O encerramento manual de instâncias deve ser restrito aos papéis `EDITOR` e `ADMIN`. | done | back: `@PreAuthorize("hasAnyRole('EDITOR','ADMIN')")` em `DashboardController.terminate()` | |

### US-13.06 Execução recente

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.06.001 | O sistema deve listar as instâncias iniciadas mais recentemente, com jornada, identificador e tempo em execução. | done | back: `newestActiveInstances()` (mesma consulta de `oldestActiveInstances`, `sortOrder=desc`); front: card "Executando recentemente" | |

### US-13.07 Atualização dos dados

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.07.001 | O sistema deve permitir atualizar manualmente os dados do dashboard. | done | front: botão "Atualizar" (`load()`) | |
| [x] | REQ-13.07.002 | O sistema deve permitir ligar e desligar a atualização automática periódica. | done | front: `AutoRefreshToggle`, intervalo de 30s (`AUTO_REFRESH_MS`) | |
| [x] | REQ-13.07.003 | O sistema deve indicar o horário da última atualização. | done | front: `lastUpdated` exibido no cabeçalho | |

### US-13.08 Acesso

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.08.001 | O dashboard deve ser a primeira tela apresentada ao acessar o portal. | done | front: `App.tsx` — estado inicial de abas é `[DASHBOARD_TAB]`, aba ativa inicial `'dashboard'` | |
| [x] | REQ-13.08.002 | O sistema deve disponibilizar um item de menu dedicado ao dashboard. | done | front: `Sidebar.tsx` — `NAV_ITEMS` inicia com o item "Dashboard" | |

### US-13.09 Auditoria de ações administrativas

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-13.09.001 | O encerramento manual de uma instância deve ser registrado na auditoria do portal. | done | back: `TerminateProcessInstance` chama `RecordAuditEvent` (`PROCESS_INSTANCE_TERMINATE`, sucesso e falha) | testado ao vivo |
| [x] | REQ-13.09.002 | O início de uma execução deve ser registrado na auditoria do portal. | done | back: `POST /api/v1/execution-audit/started` → `RecordExecutionStart` (`EXECUTION_START`); front: `auditApi.ts`, chamado após `startInstance()` em `JourneySearch.tsx` | testado ao vivo (curl + consulta em `/api/v1/audit-events`) |

## FT-14 Catálogo de Integrações

### US-14.01 Catálogo de clusters e brokers corporativos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-14.01.001 | O sistema deve permitir cadastrar um cluster/broker de mensageria corporativo, com nome amigável, tipo e endereço de conexão. | done | back: `MessagingClusterController.create` (`POST /api/v1/messaging-clusters`); front: `ClusterFormModal` | |
| [x] | REQ-14.01.002 | Cada cluster deve possuir identificador único (`clusterId`), nome único na plataforma e status. | done | back: `messaging_cluster.name UNIQUE`, `cluster_id UUID PRIMARY KEY`, `status CHECK` (`V4__messaging_catalog.sql`) | |
| [x] | REQ-14.01.003 | O sistema deve permitir editar, consultar e desativar um cluster cadastrado. | done | back: `PUT/GET/deactivate/activate` em `MessagingClusterController`; front: `CatalogPage` (ações "Editar"/"Desativar"/"Ativar") | |
| [x] | REQ-14.01.004 | O sistema deve impedir a desativação de um cluster referenciado por credencial ativa ou conector de jornada publicada. | done | back: `DeactivateCluster` — checa `CredentialReferenceRepository.search(..., ACTIVE)` e `MessagingReferenceInUsePort.existsPublishedConnectorForCluster` antes de desativar (409 `ClusterInUseException`) | |
| [x] | REQ-14.01.005 | O sistema deve permitir pesquisar e filtrar clusters por tipo e por status. | done | back: `GET /api/v1/messaging-clusters?q=&type=&status=`; front: busca/filtro de status em `CatalogPage` | |
| [x] | REQ-14.01.006 | O catálogo não deve assumir um único cluster fixo por tipo de conector. | done | modelo não singleariza por `type` — `MessagingCluster.name` é a chave única, vários clusters do mesmo tipo convivem | |

### US-14.02 Catálogo de credenciais

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-14.02.001 | O sistema deve permitir cadastrar uma credencial associada a um cluster, com nome de referência, URI do Key Vault e nome do secret. | done | back: `CredentialReferenceController.create` (`POST /api/v1/credential-references`); front: `CredentialFormModal` | |
| [x] | REQ-14.02.002 | Cada credencial deve possuir identificador único (`credentialId`), nome de referência único na plataforma, cluster associado e status. | done | back: `credential_reference.reference_name UNIQUE`, `credential_id UUID PK`, `status CHECK`, `cluster_id` FK (`V4__messaging_catalog.sql`) | |
| [x] | REQ-14.02.003 | O sistema não deve, em nenhuma tela, campo, log ou auditoria, armazenar ou exibir o valor do secret. | done | back: `CredentialReference`/`CredentialInput`/`CredentialResponse` — nenhuma camada tem campo de valor de segredo | |
| [x] | REQ-14.02.004 | O sistema deve permitir editar, consultar e desativar uma credencial cadastrada. | done | back: `PUT/GET/deactivate/activate` em `CredentialReferenceController`; front: `CatalogPage` | |
| [x] | REQ-14.02.005 | O sistema deve impedir a desativação de uma credencial referenciada por conector de jornada publicada. | done | back: `DeactivateCredential` + `MessagingReferenceInUsePort.existsPublishedConnectorForCredential` (409 `CredentialInUseException`) | |
| [x] | REQ-14.02.006 | O sistema deve permitir pesquisar e filtrar credenciais por cluster associado e por status. | done | back: `GET /api/v1/credential-references?q=&clusterId=&status=`; front: lista de credenciais filtrada pelo cluster selecionado em `CatalogPage` | |

### US-14.03 Acesso restrito à administração dos catálogos

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-14.03.001 | A criação, edição e desativação de clusters e credenciais deve ser restrita ao papel `ADMIN`. | done | back: `@PreAuthorize("hasRole('ADMIN')")` em create/update/deactivate/activate de `MessagingClusterController`/`CredentialReferenceController` | primeiro uso de `hasRole('ADMIN')` em endpoint de escrita no back — antes só existia em leitura de auditoria |
| [x] | REQ-14.03.002 | `EDITOR`, ao configurar um conector de mensageria, deve poder selecionar cluster/credencial já cadastrados, sem poder administrar o catálogo. | done | back: leitura `hasAnyRole('VIEWER','EDITOR','ADMIN')`; front: `SearchSelect` de cluster/credencial em `ConnectorFields`/`ConnectorWizard`, sem ação de criar/editar/desativar ali | |
| [x] | REQ-14.03.003 | Toda criação, edição e desativação de cluster ou credencial deve ser registrada na auditoria do portal. | done | back: `RecordAuditEvent` chamado em `CreateCluster`/`UpdateCluster`/`DeactivateCluster`/`CreateCredential`/`UpdateCredential`/`DeactivateCredential` (`CLUSTER_CREATE`, `CREDENTIAL_DEACTIVATE` etc.) | |

### US-14.04 Teste de conexão

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [~] | REQ-14.04.001 | O sistema deve permitir disparar um teste de conexão para um par cluster + credencial, validando alcançabilidade e credencial. | in_progress | back: `POST /api/v1/credential-references/{id}/connection-test` → `TestCredentialConnection` → `ms-espec-registry` `POST /api/v1/connection-tests` (`AdminClient.describeCluster()`); front: botão "Testar conexão" em `CatalogPage`/`ConnectorWizard` | mecanismo completo, mas só valida de verdade contra `KAFKA` (testado contra o broker local, sem autenticação); `EVENT_HUBS`/`SERVICE_BUS` retornam "não suportado neste ambiente" de forma explícita — falta dependência do SDK da Azure (nenhuma no projeto hoje) e um ambiente Azure real pra fechar essa ponta |
| [x] | REQ-14.04.002 | O teste de conexão deve se limitar a metadado, nunca publicar ou consumir uma mensagem real. | done | back: `KafkaConnectionTestController` usa só `AdminClient.describeCluster()` — nunca instancia `KafkaProducer`/`KafkaConsumer` | |
| [x] | REQ-14.04.003 | A execução do teste deve ser delegada ao componente de runtime que resolve credenciais, nunca ao admin-back ou ao navegador diretamente. | done | back: `EspecRegistryConnectionTestAdapter` (admin-back) chama o `ms-espec-registry`; admin-back não importa client Kafka nem toca Key Vault em nenhuma classe | |
| [x] | REQ-14.04.004 | O resultado deve indicar sucesso ou falha traduzida para uma causa reconhecível, nunca o erro cru. | done | back: `KafkaConnectionTestController`/`ConnectionTestResponse` traduzem `TimeoutException`/`ExecutionException` em mensagem amigável; nunca propagam stacktrace | |
| [x] | REQ-14.04.005 | O teste de conexão também deve estar disponível a partir do assistente de configuração do conector. | done | front: botão "Testar conexão" dentro da etapa "Conexão" do `ConnectorWizard`, reaproveitando o par cluster/credencial já selecionado | |

### US-14.05 Conectores de mensageria adicionais no framework

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-14.05.001 | O catálogo de conectores deve habilitar `EVENT_HUBS` e `SERVICE_BUS` para `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`, com operação determinada pelo tipo de nó. | done | back: `ConnectorType.EVENT_HUBS`/`SERVICE_BUS` (`enabled=true`, `messageBroker=true`), `FlowValidator` generalizado (`isMessageBroker()`, `BROKER_OPERATION_BY_TYPE`); front: `MESSAGE_BROKER_TYPES`/`CONNECTOR_TYPES_BY_NODE` (`model.ts`) | cobre o framework/design-time (habilitar, configurar, salvar, publicar); execução real (publicar/consumir de verdade via Event Hubs/Service Bus numa jornada) é FT-05, fora do escopo desta feature, e também depende do SDK da Azure — sem ambiente pra validar hoje |
| [x] | REQ-14.05.002 | A configuração de Event Hubs/Service Bus deve reaproveitar o mapeamento de saída e a referência a variáveis `{{nome}}`. | done | front: `ConnectorFields`/`ConnectorWizard` reaproveitam `OutputMappingEditor`/`VariablePickerButton` sem branch por tipo de broker | |
| [x] | REQ-14.05.003 | O campo equivalente a "tópico" deve ser selecionado a partir do catálogo de clusters, nunca texto livre. | done | front: `SearchSelect` de cluster em `ConnectorFields`/`ConnectorWizard` (`config.clusterId`) | o cluster é escolhido do catálogo; o nome do tópico/fila/hub em si continua texto livre — o catálogo cadastra clusters, não enumera os tópicos/filas dentro deles |
| [x] | REQ-14.05.004 | O campo de credencial de um conector Kafka/Event Hubs/Service Bus deve ser selecionado a partir do catálogo, substituindo o texto livre. | done | front: `SearchSelect` de credencial (filtrado pelo cluster selecionado) substitui o `<input>` de texto livre, inclusive para `KAFKA` | |
| [x] | REQ-14.05.005 | O assistente de configuração de conector deve ganhar as mesmas 3 etapas do Kafka para Event Hubs e Service Bus. | done | front: `STEPS_BY_TYPE`/`renderBrokerStep` (`ConnectorWizard.tsx`) — mesmas 3 etapas (Conexão/Payload/Mapear saída) para os 3 tipos de broker | |

### US-14.06 Credencial de IA

| # | REQ | Descrição | Status | Evidência | Notas |
|---|---|---|---|---|---|
| [x] | REQ-14.06.001 | O sistema deve permitir cadastrar, atualizar e remover uma credencial de API de um provedor de IA (Gemini), restrito ao papel `ADMIN`. | done | back: `AiCredentialController` (`PUT`/`DELETE /api/v1/ai-credentials/{provider}`, `@PreAuthorize("hasRole('ADMIN')")`) + `SaveAiProviderCredential`/`DeleteAiProviderCredential`; front: `AiCredentialModal.tsx`, seção na `CatalogPage.tsx` logo após o painel de clusters/credenciais | |
| [x] | REQ-14.06.002 | A API não deve, em nenhuma resposta, retornar o valor da chave salva — apenas seu status (configurada/não configurada) e a data da última atualização. | done | back: `AiCredentialStatusResponse` — só `configured`/`updatedAt`; `GetAiProviderCredentialStatus` nunca lê `apiKey` na resposta | |
| [x] | REQ-14.06.003 | Diferente do catálogo de credenciais de mensageria (REQ-14.02.003), esta credencial é armazenada em texto plano, como desvio deliberado e temporário do princípio de nunca persistir segredo. | done | back: `AiProviderCredential.java` (Javadoc com TODO citando REQ-14.02.003), migration `V6__ai_provider_credential.sql` (`api_key TEXT NOT NULL`, comentário TODO de criptografia) | pendente: criptografar/descriptografar a chave ao usar, antes de produção |

---

## Changelog deste arquivo

| Data/Hora | Alteração |
|---|---|
| 2026-08-23 (não commitado) | Documentação sincronizada com o que foi construído/corrigido numa longa sessão sobre Execução, publicação, editor de fluxo e catálogo de integrações — 19 REQs novos, 3 USs novas, 4 correções de evidência. FT-05 Execução (US-05.06/US-05.09, 39→43 REQs): log cronológico passou a registrar toda chamada de API front↔back da execução, exceto a consulta de variáveis (REQ-05.06.006), com busca textual e expandir/recolher por entrada (REQ-05.06.007); novo controle manual de mensagens Kafka por instância, tirando as Service Tasks Kafka do piloto automático do `KafkaBridgeScheduler` e permitindo publicação manual (digitada ou gerada a partir do mapeamento) pela tela de execução (REQ-05.09.010/011). FT-06 Versionamento (US-06.02/US-06.04, 40→42 REQs): salvar um fluxo sem alteração real passou a avisar o usuário em vez de gerar uma versão DRAFT vazia (REQ-06.02.011); publicação passou a distinguir runtime genuinamente indisponível (502 `RUNTIME_UNAVAILABLE`) de conteúdo rejeitado pelo motor (422 `RUNTIME_DEPLOYMENT_REJECTED`), com mensagem única e legível em vez de JSON aninhado (REQ-06.04.013, achado a partir de uma condição de gateway gerada por IA com aspas escapadas quebrando o parser JUEL do motor). FT-03 Modelagem Visual (85→95 REQs, 2 `in_progress`): canvas passou a abrir sempre em zoom 100% com o início alinhado à esquerda ao editar/criar jornada ou concluir geração por IA, e o minimapa passou a iniciar colapsado, abrindo só sob clique (REQ-03.05.005/006); campo de tópico de conector Kafka passou a sugerir os tópicos reais do cluster selecionado, com fallback a texto livre (REQ-03.09.015); nova US-03.16 Pré-visualização de formulário no editor (REQ-03.16.001/002, `in_progress` — pré-visualização por seleção implementada e funcional, mas carece de enriquecimento de fidelidade visual com a renderização SDUI real), substituindo o antigo badge de preview na User Task, removido por bug de sobreposição de `pointer-events`; **nova US-03.17 Geração de fluxo assistida por IA** (REQ-03.17.001 a 005), trazida para dentro do escopo da versão 1.0.0 — geração de rascunho de fluxo a partir de prompt via Gemini, dependente da credencial de IA (US-14.06), com retry/reparo automático contra violações estruturais antes de apresentar o resultado ao usuário; REQ-03.11.003 ganhou nota sobre a guarda contra aspas escapadas em condição de gateway; corrigidos bugs em REQs já `done`: nó START aceitando múltiplas saídas no editor (REQ-03.02.004) e atalhos Ctrl+Z/Ctrl+Y anunciados na toolbar mas nunca implementados no listener de teclado (REQ-03.06.001/002). FT-14 Catálogo de Integrações (25→28 REQs): nova US-14.06 Credencial de IA — cadastro/atualização/remoção da chave de API do Gemini restrito a `ADMIN`, nunca retornada pela API, armazenada em texto plano como desvio deliberado e temporário do princípio de nunca persistir segredo (REQ-14.02.003), com TODO de criptografia registrado no código (REQ-14.06.001 a 003); entidade isolada, sem relação com o modelo de credencial de mensageria existente. "IA Assistida" removida de `ej-admin-requisitos.md`/`ej-admin-index.md` §5 Fora do Escopo — a geração de fluxo por IA passa a ser tratada como capacidade da versão 1.0.0, não mais um item futuro. Painel de capacidades entregues (`ej-admin-requisitos.md` §2, `ej-admin-index.md` §2/§4) atualizado para citar geração de fluxo por IA, catálogo de integrações e dashboard operacional, que já estavam implementados mas nunca haviam sido listados ali. Documentação técnica sincronizada: `ej-admin-arquitetura-logica.md` (Domínio 03 ganhou a capacidade de geração assistida, Domínio 11 passou a incluir `AI Provider Credential`), `ej-admin-modelo-dados-fisico.md`/`ej-admin-modelo-dados-conceitual.md`/`ej-admin-dicionario-dados.md` (nova tabela/entidade `ai_provider_credential`, isolada e sem FK, com as seções seguintes renumeradas). Progresso geral de 359/396 (91%, 14 features/84 USs) para 376/415 (91%, 14 features/87 USs, 6 in_progress). |
| 2026-08-21 01:44 (não commitado) | Nova feature FT-14 Catálogo de Integrações (5 USs, 25 REQs): catálogo de clusters de mensageria corporativos (`MessagingCluster`) e referências de credencial (`CredentialReference`, Azure Key Vault, nunca o segredo), com CRUD restrito ao papel `ADMIN` (US-14.01/02/03), teste de conexão delegado ao `ms-espec-registry` — admin-back nunca acessa broker ou Key Vault diretamente (US-14.04) — e Event Hubs/Service Bus habilitados como conectores de mensageria no framework do FT-03, ao lado do Kafka já existente (US-14.05). Backend: `domain/application/infrastructure/interfaces/messaging` novo, migration `V4__messaging_catalog.sql`, `ConnectorType` ganhou `EVENT_HUBS`/`SERVICE_BUS`, `FlowValidator` generalizado de checagens hardcoded pra Kafka (`isMessageBroker()`). Frontend: `front/src/catalog/` novo (`CatalogPage`/`ClusterFormModal`/`CredentialFormModal`), item "Integrações" como submenu de "Configurações" na sidebar, seletor de cluster/credencial (`SearchSelect`, extraído de `FormSearchSelect`) reaproveitado no painel inline e no assistente de conector. `ms-espec-registry` ganhou `POST /api/v1/connection-tests` (`AdminClient.describeCluster()`, sem publicar/consumir). REQ-14.04.001 fica `in_progress`: só valida de verdade contra Kafka (broker local); Event Hubs/Service Bus retornam "não suportado neste ambiente" — sem dependência do SDK da Azure no projeto nem ambiente Azure real disponível. Documentação sincronizada em `ej-admin-arquitetura-logica.md` (novo Domínio 11), `ej-admin-modelo-dados-conceitual.md`, `ej-admin-modelo-dados-fisico.md`, `ej-admin-dicionario-dados.md` e `ej-admin-index.md`. Progresso geral de 335/371 (90%) para 359/396 (91%, 14 features). |
| 2026-08-18 05:35 | Requisitos atualizados para refletir o que foi construído nesta sessão além de US-03.13/03.14 (já registradas). Novo REQ-03.02.008: o backend passa a rejeitar (422), ao salvar o fluxo, qualquer caminho que alcance um `END` via `SERVICE_TASK` REST síncrona sem antes passar por um checkpoint (`USER_TASK`, `RECEIVE_TASK` ou `SERVICE_TASK` não-REST) — motivado por um bug real: uma jornada nesse formato roda inteira dentro de uma única transação síncrona do motor de runtime, que falha com `NullValueException: execution ... doesn't exist` ao tentar ler o histórico depois (a transação sofre rollback antes de qualquer consulta conseguir lê-lo). Nova US-03.15 Anotações (REQ-03.15.001 a 005): notas livres em formato de post-it no canvas do editor de fluxo (`AnnotationNode.tsx`), com texto editável, posição livre, vínculo opcional a um ou mais nós (linha tracejada, reaproveitando os handles `target` já existentes), fora da validação estrutural e nunca traduzidas para BPMN — persistidas em `flow.annotations` (`V3__add_flow_annotations.sql`). REQ-04.01.005 expandido: uma User Task sem formulário associado agora suporta uma mensagem configurável com `{{nome}}` resolvido pelos valores reais das variáveis do processo no momento da execução (`FlowNode.messageText`, sintetizado como SDUI por `StepResolver` em `ms-espec-registry`); FT-05 ganhou REQ-05.02.005 documentando esse reflexo na tela de execução. Nova REQ-05.08.005: a mesma regra de checkpoint de REQ-03.02.008 passou a ser checada também em tempo de execução (`SynchronousChainCheck`, `ms-espec-registry`), antes de `start()`/`completeTask()`/`simulateStep()` — proteção para fluxos que já estavam persistidos antes da validação estrutural existir; achada ao vivo quando o mesmo erro do motor reapareceu depois de uma edição de condição de gateway tornar um caminho existente 100% síncrono. REQ-05.06.003 revisado: a aba "Integrações" da tela de execução foi removida por redundância (decisão do usuário) — o mesmo dado (URL/resposta de cada integração) passou a ser exibido na aba Log, anexado a cada entrada do trail. REQ-05.06.004 com evidência ampliada: corrigido bug em que `SimulationController.start()` não populava `trail` e o front ignorava `initialStep.trail`, deixando o log vazio quando a jornada rodava inteira numa única chamada síncrona. FT-03 vai de 79/79 para 85/85 (100%, 6 REQs novos); FT-05 de 37/37 para 39/39 (100%, 2 REQs novos). Progresso geral de 327/363 (90%) para 335/371 (90%). |
| 2026-08-18 01:04 | Duas user stories novas em FT-03: **US-03.13 Assistência de variáveis na configuração de conector** (REQ-03.13.001 a 003) e **US-03.14 Assistente de configuração de conector** (REQ-03.14.001 a 005), mais 2 REQs novos em US-03.10 (REQ-03.10.006/007) e ajuste em REQ-03.09.002/004/009/013 — formalizando o que foi construído nesta sessão. US-03.13: painel "Variáveis" agrupado por origem (`VariableOriginsPanel`/`availableVariableOriginsAt`, rótulo genérico via `NODE_META`+tipo de conector, sem switch por combinação); botão de inserir variável (`VariablePickerButton`, ícone `Braces`, cor `accent`) reaproveitado em URL/Headers/Body/Params, insere `{{nome}}` no cursor (`insertTokenAtCursor`); Body/Params (REST) passam a editor estruturado nome→valor por padrão (`StructuredJsonEditor`), com "Modo avançado" (JSON livre) pra corpos aninhados. US-03.14: `ConnectorWizard.tsx` novo — assistente adicional (não substitui o painel inline), 4 etapas pra REST (Conexão, Headers, Parâmetros & Corpo, Testar e Mapear) e 3 pra Kafka (Conexão, Payload, Mapear saída), navegação livre entre etapas, edição em rascunho local só aplicada ao "Concluir" (fechar de outra forma — X/Cancelar/fora/Esc — confirma descarte via `ConfirmDialog` se houver alteração pendente), e teste inline na última etapa (sem reaproveitar o modal "Testar API" do painel) com mapeamento automático em sucesso e manual sempre disponível. De quebra, 2 bugs achados testando: `SimpleClientHttpRequestFactory` não seguia redirecionamentos 307/308 (limitação da JDK) — trocado por `JdkClientHttpRequestFactory`/`java.net.http.HttpClient` (REQ-03.10.006); e uma falha HTTP no teste despejava a exceção inteira do Spring, incluindo o corpo completo de uma página de erro HTML — resumido pra "status + motivo" (REQ-03.10.007). Também corrigido: seleção de texto (drag) iniciada dentro de um modal e solta fora fechava o modal indevidamente (`useBackdropClose`, `PropertyGrid.tsx`, aplicado ao `Modal` compartilhado e ao backdrop próprio do wizard) — bug de UX, sem REQ dedicado. Mapeamento de entrada (`inputMapping`) retirado da UI (painel e assistente) — nunca influenciou a execução real, só documentava que `{{nome}}` podia ser usado nos campos de texto; REQ-03.09.002/004/009 ajustados pra refletir. FT-03 vai de 69/69 para 79/79 (100%, 10 REQs novos). Progresso geral de 317/353 (90%) para 327/363 (90%). |
| 2026-08-17 22:15 | Nova user story US-03.12 Variáveis de entrada da jornada (REQ-03.12.001 a 005, todos `done`): o nó START passa a poder declarar uma lista `{name, type}` de variáveis que a aplicação cliente (canal digital/BFF) precisa fornecer ao iniciar uma instância — motivado por um caso real desta sessão (conector REST referenciando `{{cpf}}`, sem nenhuma fonte de variável de entrada declarável até então). Back (`admin/back`): campo novo `FlowNode.startVariables`, rosqueado por `FlowNodeInput`/`FlowResponse`/`FlowNodeRecord`/`PublicationSnapshotRecord` e os adapters de persistência/publicação/versionamento — sem migration, `flow.nodes` já é coluna JSON; `FlowValidator` valida que só o START declara isso, nomes únicos (mesmo espaço de REQ-03.09.011) e passam a alimentar o `availableVars` dos checks de conector e gateway. Runtime (`ms-espec-registry`): `POST /journeys/{id}/instances` agora aceita `Map<String,Object>` no corpo; `VariableConversion.fromDeclaredVariables` valida presença de cada variável declarada (409 com os nomes faltantes se não vier) e coerciona pelo tipo, aceitando e repassando chaves extras não-declaradas sem erro. Front: seção "Variáveis de Entrada" no nó START (`StartVariablesEditor`, mesmo padrão do `OutputMappingEditor` sem a coluna de jsonPath); `availableVariablesAt`/`availableVariableRulesAt` somam as variáveis do START; tela Execuções (`JourneySearch.tsx`) ganha um formulário simples (um input por variável, tipado) antes do botão "Executar" quando a jornada selecionada declara alguma. `ms-transform-publication` não precisou mudar — o BPMN do Camunda já aceita qualquer variável no start independente de declaração; o contrato é só design-time (`FlowValidator`) + runtime (`ms-espec-registry`). FT-03 vai de 64/64 para 69/69 (100%, 5 REQs novos). Progresso geral de 312/348 (90%) para 317/353 (90%). |
| 2026-08-17 01:22 | FT-05 renomeada de "Simulação" para "Execução" (feature, user stories, requisitos, evidências) — a feature deixou de ser uma simulação simplificada desde que passou a rodar contra o motor de runtime real e, mais recentemente, mensageria Kafka real também de verdade; "Simulação" não descrevia mais o que a tela faz. Junto, todo texto de requisito/arquitetura que citava "Camunda" explicitamente foi generalizado para "motor de runtime"/"Runtime Engine" — o Admin Portal deve se apresentar como agnóstico à engine, mesmo princípio já usado nos nomes dos ports (`RuntimeMonitoringPort`, `RuntimePublicationPort`). Código: `front/src/simulation/` → `front/src/execution/` (`SimulationWorkspace`→`ExecutionWorkspace`, `SimulationsPage`→`ExecutionsPage`, `simulateStep()`→`skipStep()`, aba "Simulações"→"Execuções", botão "Simular conclusão"→"Pular etapa"); `admin/back`: pacote `simulationaudit`→`executionaudit` (`SIMULATION_START`→`EXECUTION_START`, rota `/simulation-audit`→`/execution-audit`), `CamundaMonitoringAdapter`→`RuntimeEngineMonitoringAdapter`, config `app.camunda.base-url`/`CAMUNDA_BASE_URL`→`app.runtime-engine.base-url`/`RUNTIME_ENGINE_BASE_URL`. Fora de escopo por pedido explícito: nada dentro de `admin/simulacoes/` foi tocado (`ms-espec-registry` continua com `SimulationController`, `CamundaClient` e o endpoint `/simulate-step` exatamente como estavam — são detalhes internos de um serviço que já existe, não a apresentação do portal). Nenhum REQ novo ou removido nesta rodada, só renomeação — FT-05 continua 37/37 (100%). |
| 2026-08-17 00:34 | FT-05 Simulação ganhou mais uma rodada: REQ-05.04.003 (novo) registra que integrações Kafka agora rodam contra um broker real, ao contrário das REST (que continuam mockadas). Nova user story US-05.09 Mensageria Kafka real (REQ-05.09.001 a 009): identificador de correlação (business key) próprio por instância, publicação automática de Service Task Kafka sem ação manual (`KafkaBridgeScheduler`), indicador visual distinto para essa espera, consumo/correlação automática de mensagem real para Receive Task e início por mensagem — inclusive vinda de um produtor externo ao Admin Portal (`kafka-console-producer`, testado ao vivo) —, painel de envio de mensagem de teste com tópico somente-leitura e business key pré-preenchida, início de jornada por mensagem direto na tela de busca com espera automática pela instância nova, e um "bypass" manual (REQ-05.09.009) que reexpõe o mecanismo de fabricar resultado (idêntico ao antigo "Simular conclusão", nunca removido do backend) como alternativa secundária discreta, tanto para etapas Kafka em espera (`DevicePreview.tsx`, link "Pular etapa") quanto para o início por mensagem (`JourneySearch.tsx`, link "Iniciar sem mensagem"). REQ-05.05.001 não precisou de ajuste de texto: com o bypass valendo também para Kafka, o texto original continua verdadeiro. FT-05 vai de 27/27 para 37/37 (100%, 10 REQs novos). Progresso geral de 302/338 (89%) para 312/348 (90%). |
| 2026-08-16 05:33 | Nova feature FT-13 Dashboard (9 user stories, 24 REQs, todos `done`), cobrindo o dashboard operacional implementado nesta sessão: indicadores em tempo real (US-13.01), tendência de execução com gráfico iniciadas/concluídas e granularidade ajustável — últimas 24h por hora (padrão), últimos 7 ou 30 dias por dia (US-13.02), processos por volume com indicação de incidentes (US-13.03), lista de incidentes ativos (US-13.04), instâncias pendentes com encerramento manual individual/em lote restrito a `EDITOR`/`ADMIN` e sempre com confirmação (US-13.05), execução recente (US-13.06), atualização manual/automática dos dados (US-13.07), acesso como primeira tela do portal com item de menu dedicado (US-13.08) e auditoria de encerramento de instância e início de simulação (US-13.09). Progresso geral de 278/314 (89%) para 302/338 (89%, 13 features). |
| 2026-08-16 05:33 | Renomeação de terminologia em todo o diretório `requisitos/`: "MVP" → "versão 1.0.0" (com concordância de gênero/contração revisada caso a caso — "do/no/o MVP" → "da/na/a versão 1.0.0"), "Épico" (nível `EP-`) → "Feature" (nível `FT-`), "Feature" (nível `FT-xx.xx`) → "User Story"/US (nível `US-xx.xx`). Aplicado a todos os arquivos de `requisitos/admin/` (incluindo `ej-admin-openapi.yaml` e o comentário SQL de `bd/massa_de_dados_journeys.sql`) via script mecânico com verificação manual de concordância verbal/nominal; `ej-admin-index.md` §5 (Fora do Escopo) teve a entrada "Dashboard Administrativo de Jornadas" removida (item implementado nesta sessão, ver FT-13 abaixo). Corrigida também uma mojibake pré-existente (dupla codificação UTF-8) em um parágrafo de `ej-admin-requisitos.md`, sem relação com a renomeação. Nenhum REQ mudou de conteúdo ou status nesta rodada — apenas prefixos/rótulos. |
| 2026-08-16 05:33 | FT-02 Gestão de Jornadas ganhou 2 REQs novos em US-02.03 Pesquisa: REQ-02.03.006 (agrupar a listagem de jornadas por produto, por produto+canal, por canal, ou sem agrupamento) e REQ-02.03.007 (ordenar a listagem, crescente ou decrescente, pelos campos jornada/canal/status/data de atualização). Estado atual: REQ-02.03.006 `in_progress` — `JourneysPage.tsx` já agrupa por produto (pedido do usuário numa rodada anterior), mas ainda falta o seletor pra escolher o modo de agrupamento (produto+canal, só canal, sem agrupar); REQ-02.03.007 `todo` — não existe UI de ordenação por coluna hoje. FT-02 vai de 39/39 (100%) para 39/41 (95%, 1 in_progress). Progresso geral de 277/311 (89%) para 277/313 (88%). |
| 2026-08-16 02:47 | FT-05 Simulação ganhou uma nova user story, US-05.08 Tratamento de falhas de integração (REQ-05.08.001 a 004): quando um conector REST falha durante a simulação (ex.: `ms-mock-api-rest` fora do ar), o `ms-espec-registry` agora identifica corretamente qual nó de serviço causou a falha — antes, como a transação da engine dá rollback e não deixa rastro no histórico, o simulador acabava culpando a User Task anterior em vez do Service Task real (`PublicationSnapshot.nextConnectorNodeAfter()` segue as conexões do fluxo até o próximo nó com conector). O nó com erro é destacado no diagrama, a falha entra no log cronológico, e a mensagem completa fica disponível sob demanda por um ícone que abre um modal (copiar erro, fechar, tecla Esc) — sem mais o aviso de erro inline que existia na tela de execução. Dois REQs novos adicionais: REQ-05.03.003 (o diagrama não deve perder zoom/posição ao trocar de aba — corrigido mantendo o `FlowDiagramViewer` sempre montado) e REQ-05.06.005 (o log deve mostrar os dados submetidos em cada User Task respondida). REQ-05.07.001 revisado: a busca de jornada passou a listar todas por padrão e filtrar conforme o texto digitado (comportamento anterior era nunca listar todas de uma vez). FT-05 vai de 21/21 para 27/27 (100%, 6 REQs novos). Progresso geral de 271/305 (89%) para 277/311 (89%). |
| 2026-08-16 02:47 | FT-05 Simulação implementado por completo (0% → 100%, 21/21 REQs). Objetivo da feature ajustado: a simulação exige jornada publicada e roda contra o motor de runtime real (Camunda), não um simulador simplificado interno. Arquitetura: `ms-espec-registry` (wrapper fino da REST API do Camunda — iniciar/consultar/completar tarefas, fetchAndLock+complete de external task Kafka, correlação de mensagem para RECEIVE_TASK, leitura/escrita de variáveis do processo) e `ms-mock-api-rest` (10 endpoints estáticos emulando as integrações REST reais da massa de dados), ambos em `simulacoes/`. Front: aba "Simulações" do admin/front redesenhada em tela única — `JourneySearch` (combobox de busca instantânea, sem listar todas as jornadas) → `SimulationWorkspace`, que mostra em cima o passo atual (`DevicePreview`, com moldura de celular pra canal App via `PhoneFrame` ou card largo pra canal Web) e embaixo um painel de observabilidade com 4 abas: Workflow (`FlowDiagramViewer`, visualizador somente-leitura em `@xyflow/react` reaproveitando cores/ícones/metadados do designer de fluxo real, com o caminho percorrido destacado ao vivo), Variáveis (ver e alterar manualmente o valor de qualquer variável do processo em execução, pra forçar caminhos de decisão em teste), Integrações (resultado de cada Service/Receive Task já executada, derivado cruzando `outputMapping` com as variáveis atuais) e Log (histórico cronológico 100% client-side). Formulários agora renderizados com a stack Mística completa (`Form`/`TextField`/`EmailField`/`DecimalField`/`DateField`/`Select`/`Checkbox`/`FileUpload`), sem a restrição de "só botões/tags" que vale pro resto do portal — essa tela simula o que um cliente real veria via SDUI. De quebra, a aba "Execuções" do menu virou "Simulações", e o portal ganhou um seletor de skin da Mística (Blau/Movistar/Vivo/Vivo Evolution/O2/Telefónica/Esimflag) ao lado do toggle claro/escuro. O `simulador-front` standalone (protótipo anterior a este redesign) foi apagado — nunca chegou a ser commitado. Progresso geral de 250/294 (85%) para 271/305 (89%, 11 REQs novos no FT-05 além dos 10 originais). |
| 2026-08-15 02:53 | REQ-03.11.003 corrigido (removidos os operadores "maior ou igual"/"menor ou igual" que nunca foram implementados; ficou igual/diferente/maior que/menor que) e passou de texto livre para 3 campos estruturados (combo de variável + combo de operador + valor). Novo REQ-03.11.008: cada variável de saída ganhou um tipo declarado (texto, número, booleano, data, data e hora) — inferido automaticamente ao gerar o mapeamento via "Testar API" (incluindo detecção de datas ISO 8601 por regex) ou escolhido manualmente; o editor da condição do gateway agora filtra os operadores pelo tipo da variável escolhida (texto/booleano: igual/diferente; número/data/data e hora: também maior/menor) e troca o campo de valor (numérico, seletor verdadeiro/falso, seletor de data ou data e hora). Chips de "variáveis disponíveis" removidos do painel Decisão — a própria combo de variável cumpre esse papel. Variáveis salvas antes dessa mudança (sem tipo) continuam funcionando como `string`. FT-03 vai de 63/63 para 64/64 (100%, 1 REQ novo). Progresso geral de 249/293 (85%) para 250/294 (85%). |
| 2026-08-15 02:53 | REQ-03.01.004/03.02.005 ajustados: a cardinalidade de `END` passou de "exatamente um" para "ao menos um", já que um `GATEWAY` (US-03.11) pode ramificar o fluxo em dois caminhos que terminam em `END`s distintos, sem precisar reconvergir antes do fim. Back: `FlowValidator` — checagem de `ends.isEmpty()` no lugar de `ends.size() != 1`, e a alcançabilidade reversa (BFS) agora une o alcance de todos os `END`s em vez de partir de um único. Front: `validation.ts` espelha a mesma mudança. `ms-transform-publication` não precisou de ajuste — o `BpmnTransformer` já constrói o grafo de forma genérica, sem assumir quantidade de `END`. Documentação sincronizada em `ej-admin-modelo-dados-fisico.md`, `ej-admin-modelo-dados-conceitual.md`, `ej-admin-dicionario-dados.md` e `ej-admin-arquitetura-logica.md`. Sem mudança de contagem de REQs (ambos continuam `done`), só de redação/comportamento. |
| 2026-08-15 02:53 | US-03.11 Bifurcação condicional (Gateway) implementada por completo, REQ-03.11.001 a 007. Back: `FlowNodeType.GATEWAY`, `FlowConnection.condition`/`isDefault`, `FlowValidator` (gateway com 2 saídas, exatamente uma padrão, não padrão com condição, validação de `{{variavel}}` contra ancestrais). Front: tipo `gateway` no editor (ícone, paleta, canvas), `GatewayFields` (checkbox de saída padrão + condição de texto por saída, com painel de variáveis disponíveis), `outgoingLimitFor` generalizando o limite de saídas por tipo de nó, `validation.ts` espelhando a regra do back. `ms-transform-publication`: `BpmnTransformer` reescrito de uma caminhada linear para construção de grafo via API de baixo nível do `camunda-bpmn-model` (necessário para suportar ramificação), gerando `exclusiveGateway`/`sequenceFlow` com `conditionExpression` JUEL e fluxo padrão nativos do Camunda — sem worker. Testado ponta a ponta: publicação real + execução no Camunda confirmando os dois caminhos (condição verdadeira → Tarefa A; condição falsa → saída padrão → Tarefa B). Fora de escopo da versão 1.0.0 (já registrado em `ej-admin-requisitos.md` §5): gateway com mais de duas saídas, gateway inclusivo, gateway paralelo, combinação de condições com E/OU. FT-03 volta a 100% (63/63). Progresso geral de 242/293 (83%) para 249/293 (85%). |
| 2026-08-15 02:53 | Nova user story US-03.11 Bifurcação condicional (Gateway), REQ-03.11.001 a 007, todos `todo`: gateway de decisão exclusivo com exatamente duas saídas na versão 1.0.0 (caminho A/caminho B), uma marcada como padrão (sem condição); a condição da saída não padrão é `variável + operador de comparação + valor de referência`, podendo referenciar tanto uma variável de saída de Service Task/Receive Task (REQ-03.09.010) quanto um campo de resposta de User Task (REQ-04.01.007); painel de variáveis disponíveis reaproveita REQ-03.09.013, estendido a campos de formulário. Na publicação, vira `exclusiveGateway` BPMN nativo com `sequenceFlow` condicional, avaliado pelo motor do runtime, sem worker — mesmo princípio do conector REST nativo (US-03.09). Gateway com mais de duas saídas, gateway inclusivo, gateway paralelo e combinação de condições com E/OU registrados fora de escopo da versão 1.0.0 em nova seção "Evolução do Gateway de Decisão" (`ej-admin-requisitos.md` §5). FT-03 vai de 56/56 (100%) para 56/63 (89%, 7 novos `todo`). Progresso geral de 242/286 (85%) para 242/293 (83%). |
| 2026-08-15 02:53 | US-03.09 evoluído e nova US-03.10 (Teste de conectores) implementadas: mapeamento de saída de conectores REST/Kafka deixou de ser JSON livre e passou a lista estruturada `nome ← JSONPath` (REQ-03.09.010/011), com suporte a referenciar essas variáveis via `{{nome}}` nos campos de entrada de passos seguintes (REQ-03.09.012), painel de variáveis disponíveis por nó no editor (REQ-03.09.013) e validação 422 no backend para `{{variavel}}` não declarada ou nome de saída duplicado (REQ-03.09.014). REQ-03.09.002/004/009 tiveram a descrição/nota ajustada para refletir que mapeamento de saída não é mais livre. Nova US-03.10 (REQ-03.10.001 a 005): botão "Testar chamada" no editor dispara, via backend (`POST /journeys/{id}/flow/nodes/{id}/connector-test`), uma chamada REST de teste com proteção contra SSRF (bloqueio de IP privado/loopback/reservado), timeout de 5s e limite de corpo de 1MB; valores de exemplo para variáveis coletados no momento do teste. FT-03 mantém 100% (56/56 REQs, 10 novos). Progresso geral de 232/276 (84%) para 242/286 (85%). |
| 2026-08-10 03:06 | FT-11 Testes e FT-12 Infraestrutura novos, aprovados pelo usuário. FT-11: 4 USs / 12 REQs (`todo`) cobrindo testes unitários de domínio, testes de integração de API, testes de frontend e cenários end-to-end — hoje o projeto não tem nenhum teste automatizado. FT-12: 6 USs / 16 REQs cobrindo identidade da solução, containerização (Docker), orquestração (Kubernetes), esteira CI/CD, configuração de ambientes e banco de dados; `REQ-12.01.001` (sigla + ambiente Azure) já nasce `in_progress` — a sigla `ELJY` já foi criada, falta a disponibilização do ambiente. Nenhuma sugestão fora de escopo foi registrada para essas duas features, por pedido do usuário. Totais: de 10 FTs/49 USs/248 REQs (94%) para 12 FTs/59 USs/276 REQs (84% — a queda no percentual reflete só a base maior de requisitos, nada foi desfeito). |
| 2026-08-10 02:34 | REQ-10.04.001 reclassificado de `done` para `in_progress`: a preparação técnica (log centralizado, ponto de extensão reservado para appender Logstash) está pronta, mas falta a configuração/conexão de fato com um ambiente ELK real, ainda não disponível. FT-10 vai de 12/12 (100%) para 11/12 (92%, 1 in_progress); progresso geral de 94% (233/248) para 94% (232/248, 1 in_progress). |
| 2026-08-10 02:34 | Corrigida lacuna de auditoria (REQ-08.01.006/REQ-08.02.005): `UnpublishJourney.execute` e `PublishJourneyVersion.goLive` só registravam `AuditResult.SUCCESS`, nunca `FAILURE` — quando a chamada ao runtime (`RuntimePublicationPort`) falhava, a exceção interrompia o método antes da linha de auditoria, e a falha não deixava nenhum rastro. Agora a chamada ao runtime é envolvida em `try/catch`: em caso de exceção, grava `AuditResult.FAILURE` com a mensagem de erro antes de relançá-la (o response HTTP `502 RUNTIME_UNAVAILABLE` continua igual). Testado via curl: derrubei o `ms-transform-publication` de propósito, tentei despublicar uma jornada (502 como esperado) e confirmei o evento `FAILURE` em `GET /audit-events`. |
| 2026-08-10 01:38 | REQ-02.10.001 novo e implementado (US-02.10 Inspeção da publicação): para uma jornada `PUBLISHED`, visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários com a árvore SDUI), via ação na listagem de jornadas ao lado de "Editar"/"Excluir". Back: `GET /api/v1/journeys/{id}/publication` (`GetPublicationSnapshot`, 409 se não publicada) + `PublicationSnapshotRecord.from(Publication)` extraído como factory compartilhada entre esse endpoint e `PublicationAdapter` (mesma serialização, uma só fonte). Front: ícone "Ver publicação" em `JourneyActions`, `PublicationSnapshotModal` novo (JSON formatado + copiar). Escopo mais restrito que o `REQ-06.03.006` removido anteriormente: só a publicação ativa da jornada, não qualquer versão histórica. Testado via curl (200 com JSON completo / 409 sem publicação). FT-02 fecha em 39/39 (100%). |
| 2026-08-10 01:07 | REQ-02.09.003/004 deixaram de ser mock: `MockRuntimePublicationAdapter` removido, substituído por `PublicationAdapter` (`infrastructure/publication`), que faz uma chamada HTTP real (`POST`/`DELETE` via `RestClient`) para a API de publicação do runtime — o Admin Portal não conhece nem depende de qual engine implementa essa API do outro lado. Endereço do serviço configurável por ambiente em `app.transform-publication.base-url` (perfil `dev`, com override via variável de ambiente `TRANSFORM_PUBLICATION_BASE_URL`; `qa`/`prod` ainda pendentes de valor próprio). Falhas de rede/HTTP agora propagam como `RuntimePublicationException`, mapeada para `502 RUNTIME_UNAVAILABLE` no `GlobalExceptionHandler`, em vez de sempre "suceder" como o mock fazia — `PublishJourney`/`UnpublishJourney` só persistem o novo estado se a chamada não lançar. Testado via curl ponta a ponta publicando e despublicando de fato contra o serviço configurado localmente. FT-02 fecha em 38/38 (100%). |
| 2026-08-09 23:00 | FT-04 (Formulários/SDUI) implementado: `FormField.id`→`name` (chave técnica única, imutável após criada, validada em `Form.create` via `DuplicateFieldNameException`, 422); `options` migrado de `List<String>` para `FormFieldOption(label,value)`; `InputSubtype` (TEXT/NUMBER/EMAIL/DATE) com `minValue`/`maxValue`/`validationPattern`; `FILE_UPLOAD` com `acceptedExtensions`/`maxFileSizeBytes`; novo `FormSduiSerializer` gera a árvore `[tag,props,children]` (`ui.form`/`ui.text`/`ui.input`/`ui.select`/`ui.multiselect`/`ui.upload`), persistida no campo `sdui` de `SnapshotFormRecord` em `PublicationRepositoryAdapter`/`JourneyVersionRepositoryAdapter`. Sem migration — os campos do formulário já eram um blob JSON, não colunas relacionais. Compatibilidade retroativa: `FormFieldOption.LegacyDeserializer` aceita o formato antigo (string simples) e `FormFieldType.fromJson` mapeia o extinto `STATIC_CONTENT` para `TEXT`, para publicações/versões já existentes no banco continuarem legíveis (a validação de nome único também não roda na reidratação a partir de snapshot, só na criação/edição pelo usuário). Front (`FormBuilderPage.tsx`): campo "Nome técnico" (travado para campos pré-existentes), seletor de subtipo com min/max ou regex condicionais, editor de opções rótulo+valor, configuração de extensões/tamanho em upload. Testado via curl ponta a ponta (criação com os novos campos, rejeição de nome duplicado, publicação de jornada com inspeção direta do snapshot no Postgres confirmando a árvore SDUI) e build de produção do front (`tsc -b && vite build`). |
| 2026-08-09 22:11 | FT-04 (Formulários/SDUI) refinado com foco em compatibilidade com o formato de renderização SDUI (`[tag, props, children]`) usado pelas ferramentas de renderização React/Flutter. `REQ-04.02.006` (`STATIC_CONTENT`) removido/colapsado em `TEXT` — mesmo modelo de dados, diferença só visual. Adicionados `REQ-04.01.007` (`name` técnico do campo, único e imutável, substituindo o `id` interno), `REQ-04.02.007`-`REQ-04.02.010` (subtipo/validação de `INPUT`, opções como pares rótulo/valor, regras de extensão/tamanho em `FILE_UPLOAD`) e a nova `US-04.06` (`REQ-04.06.001`, já implementado pelo `PublicationRepositoryAdapter` — imutabilidade do formulário no snapshot de publicação; `REQ-04.06.002`, novo — serialização do formulário para árvore SDUI no momento da publicação). Nenhum código alterado nesta rodada, só documentação (`ej-admin-requisitos.md`, `progresso.md`, modelo conceitual/físico, dicionário de dados, arquitetura lógica, OpenAPI e nota de aviso na massa de dados de seed). Itens fora da versão 1.0.0 (fontes de dados dinâmicas para opções, `$dataSource`, prefetch, paginação de opções, formulários multi-etapas) registrados em `§5 Fora do Escopo da versão 1.0.0 → Formulários Avançados`. Nomenclatura dos documentos de modelo de dados alinhada de `FormComponent`/`component_id` para `FormField`/`name`, batendo com o domínio já implementado no back. |
| 2026-08-09 03:13 | "Desativar jornada" removido: com "Excluir" já cobrindo o caso (soft-delete para `INACTIVE` quando a jornada já foi publicada, exclusão física quando não), manter um botão de desativação manual separado — que virava a jornada `INACTIVE` sem tocar nas versões, resultado diferente e inconsistente com o significado que `INACTIVE` passou a ter (jornada excluída) — não fazia mais sentido. Removidos `DeactivateJourney` (back), `POST /journeys/{id}/deactivate`, `deactivateJourney` (front), estado `deactivatingJourney`, seu `ConfirmDialog` e o botão (ícone `PowerOff`) do grid de jornadas. REQ-02.01.006 reformulado para falar só de bloqueio de exclusão (não mais "desativação ou exclusão"); REQ-06.05.001 com evidência atualizada para `DeleteJourney`. `Journey.deactivate()` (método de domínio) continua existindo — é o que `DeleteJourney` chama internamente no caminho de soft-delete. |
| 2026-08-09 03:04 | REQ-02.01.009 estendido: além de editar, uma jornada `INACTIVE` também não pode ser excluída de novo (era possível reexecutar `DELETE` sem efeito colateral perigoso, mas sem sentido de produto). `DeleteJourney` passou a checar `journey.status == INACTIVE` logo no início e lançar `JourneyInactiveException` (409), mesma exceção do bloqueio de edição — mensagem generalizada de "Cannot edit" para "Cannot modify an inactive journey" para cobrir os dois casos. Front: botão "Excluir" também desabilitado (cinza, sem clique) para jornadas `INACTIVE` em `JourneysPage`, ao lado do "Editar" já desabilitado. Testado via curl: 409 em `DELETE /journeys/{id}` para jornada `INACTIVE`. |
| 2026-08-09 03:04 | REQ-02.01.007 removido: reativar uma jornada `INACTIVE` deixou de fazer sentido, já que `INACTIVE` agora significa "jornada excluída" (REQ-02.01.005/008), não mais um estado reversível de "pausada". Removidos `ActivateJourney` (back), `POST /journeys/{id}/activate`, `Journey.activate()`, `activateJourney` (front) e o botão "Ativar" do grid de jornadas. REQ-02.01.009 novo em seu lugar: jornada `INACTIVE` não pode mais ser editada — `UpdateJourney` e `UpdateFlow` passam a checar `journey.status == INACTIVE` e lançam a nova `JourneyInactiveException` (409); front desabilita visualmente o botão "Editar" (`IconAction` ganhou suporte a `disabled`) para essas jornadas. Testado via curl: 409 em ambos os endpoints para jornada `INACTIVE`, endpoint de ativar removido (rota inexistente). |
| 2026-08-09 03:04 | REQ-02.01.005/006/008 revisados e `VersionStatus.ARCHIVED` aposentado, virando `INACTIVE` com significado novo. Antes, `DeleteJourney` bloqueava (409, `JourneyDeletionBlockedException`, removida) a exclusão de qualquer jornada que já tivesse sido publicada, mesmo há muito despublicada — bug relatado (jornada "Troca de titularidade 15", só com versões despublicadas/arquivadas, não podia ser excluída). Agora: se a jornada está `PUBLISHED` no momento, bloqueia (409, mesma guarda `ActivePublicationPort.existsForJourney` de `DeactivateJourney`); senão, se já foi publicada alguma vez, faz soft-delete — `journey.deactivate()` + `JourneyVersion.deactivate()` (novo status `INACTIVE`) em cada versão, tudo dentro de um `@Transactional` novo no método; senão (nunca publicada), exclusão física como antes. Migration `V2__replace_archived_version_status_with_inactive.sql`: converte as `ARCHIVED` existentes (só dado sintético de seed, nenhum fluxo real produzia esse status desde a troca para `UNPUBLISHED`) para `UNPUBLISHED`, e a CHECK constraint passa a aceitar `('DRAFT','PUBLISHED','UNPUBLISHED','INACTIVE')`. De quebra, corrigido bug latente: excluir fisicamente uma jornada nunca publicada falhava por violação de FK (suas `journey_version`/`flow` não eram apagadas antes) — `DeleteJourney` agora apaga essas dependências primeiro. Front: `VersionStatus` em `versions.ts` e o badge de status de versão trocam `ARCHIVED`/"Arquivada" por `INACTIVE`/"Inativa"; diálogo e toast de exclusão de jornada diferenciam exclusão física de soft-delete. Testado via curl contra o banco local nos três caminhos (bloqueado, soft-delete, exclusão física). |
| 2026-08-09 03:04 | REQ-06.04.011 revisado: qualquer versão `UNPUBLISHED` de uma jornada pode ser republicada agora, não só a mais recente. `RepublishJourneyVersion` simplificado — removida a checagem `isLatestUnpublished` e a exceção `VersionNotLatestUnpublishedException` (409, também removida do `GlobalExceptionHandler`); passou a só validar que a versão é `UNPUBLISHED` antes de delegar em `PublishJourneyVersion.goLive`. Front: botão "Republicar" agora aparece em toda versão `UNPUBLISHED` da lista (`JourneysPage`), não só na mais recente. |
| 2026-08-09 03:04 | REQ-06.04.004/011 corrigidos: ao publicar uma nova versão (inclusive via republicação), a versão anteriormente `PUBLISHED` agora é marcada como `UNPUBLISHED`, não mais `ARCHIVED` — `ARCHIVED` fica reservado a versões legadas, sem uso em nenhum fluxo atual. `PublishJourneyVersion.goLive` passou a chamar `previous.unpublish()` em vez de `previous.archive()`; textos de requisito, comentários e o diálogo de confirmação de republicação (`JourneysPage`) atualizados de "arquivada" para "despublicada". Sem mudança de contagem de REQs (ambos continuam `done`), só de comportamento/redação. |
| 2026-08-09 01:12 | REQ-06.03.006 removido: a opção "Ver" (abria o snapshot JSON de uma versão em modal somente-leitura) foi tirada do grid de jornadas (`JourneysPage`) — decisão de produto, sem substituto na versão 1.0.0. Registrada como fora de escopo, em nova seção "Evolução da Gestão de Jornadas" em `ej-admin-requisitos.md` §5, a comparação (diff) visual entre versões de uma jornada — não havia nada equivalente registrado até então. FT-06 vai de 41/41 para 40/40 REQs (ainda 100%); progresso geral de 93% (224/241) para 93% (223/240). |
| 2026-08-09 01:12 | REQ-06.04.011/012 implementados: republicar a versão `UNPUBLISHED` mais recente de uma jornada. Backend: `PublishJourneyVersion` refatorado — extraído `goLive(journeyId, version, previousStatus, auditAction)` (validação de canal/produto ativos, checagem de flow, publicação no runtime, arquivamento da `PUBLISHED` atual) do antigo `execute()`, agora reaproveitado por `execute()` (DRAFT) e pelo novo `RepublishJourneyVersion` (UNPUBLISHED). `RepublishJourneyVersion` valida que a versão é `UNPUBLISHED` (`VersionNotUnpublishedException`, 409) e que é a mais recente entre as `UNPUBLISHED` da jornada (`VersionNotLatestUnpublishedException`, 409) antes de delegar. Endpoint `POST /journeys/{id}/versions/{versionId}/republish`. Front: botão "Republicar" só na versão `UNPUBLISHED` mais recente (`JourneysPage`), com `ConfirmDialog` cuja mensagem muda se já existe uma `PUBLISHED` que será substituída/arquivada. De quebra, corrigido texto desatualizado no diálogo de despublicar que ainda dizia "passa a arquivada" (era `UNPUBLISHED` desde a correção anterior). FT-06 fecha em 41/41 (100%); progresso geral de 92% (222/241) para 93% (224/241). |
| 2026-08-09 01:12 | REQ-06.04.011/012 novos (ainda não implementados): republicar a versão `UNPUBLISHED` mais recente de uma jornada, voltando-a a `PUBLISHED` sem alterar seu snapshot. Se já houver uma versão `PUBLISHED` na jornada (possível: publicar um `DRAFT` novo depois de despublicar deixa a versão antiga `UNPUBLISHED` coexistindo com a nova `PUBLISHED`), essa versão deve ser arquivada e o usuário avisado/consultado antes de confirmar a substituição — mesmo padrão de REQ-06.02.009/010. Republicar não é rollback: só a `UNPUBLISHED` mais recente pode ser republicada, `ARCHIVED` continua fora de alcance (REQ-06.05.004). FT-06 vai de 40/40 para 41/39 REQs (2 novos `todo`); progresso geral de 93% (222/239) para 92% (222/241). |
| 2026-08-09 00:35 | Migrations Flyway resetadas: as antigas `V1`...`V9`/`V11` foram substituídas por uma única `V1__baseline.sql` com o schema final resultante de todas elas (motivo: um arquivo de migration antigo — `V10__adjust_journey_versioning.sql`, nunca commitado — havia rodado contra o banco local e ficado órfão no `target/` após ser apagado, quebrando a inicialização do Flyway). Banco local `journey_admin` recriado do zero (`DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`); histórico de `flyway_schema_history` reiniciado. Nenhuma mudança de comportamento da aplicação — é só reorganização das migrations. Evidências de requisitos que citam nomes de arquivo antigos (`V7__create_journey_version.sql` etc.) continuam corretas como registro histórico do que foi implementado quando, mesmo que o arquivo em si não exista mais isoladamente. |
| 2026-08-09 00:35 | REQ-06.01.005/06.04.009 corrigidos: versão despublicada agora vira `UNPUBLISHED`, não `ARCHIVED`. Novo status `UNPUBLISHED` em `VersionStatus` (`ARCHIVED` continua reservado ao caso de a versão ser substituída por uma nova publicação); migration `V11__add_unpublished_version_status.sql` estende a CHECK constraint de `journey_version.version_status`; `JourneyVersion` ganhou `unpublish()` ao lado de `archive()`; `UnpublishJourney` passou a chamar `unpublish()` na versão `PUBLISHED` da jornada. Front: badge "Despublicada" para o novo status em `JourneysPage`. REQ-06.03.005 atualizado para citar o novo status. |
| 2026-08-09 00:35 | REQ-06.02.009 redefinido: sincronização automática do DRAFT com o fluxo salvo, em vez de só criar uma versão nova quando a jornada estava `PUBLISHED`. `JourneyVersion` ganhou `replaceContent(...)` (permitido só em `DRAFT`, torna a maior parte dos campos da versão não mais `final`); `CreateJourneyVersion.execute` agora decide entre atualizar a `DRAFT` existente in place (mesmo id/versionNumber) ou criar uma nova quando não há nenhuma; `UpdateFlow` chama isso incondicionalmente a cada salvamento de fluxo (removida a checagem `journey.status == PUBLISHED` e a lógica de apagar/recriar a `DRAFT`); `PublishJourney` (atalho legado) simplificado pelo mesmo motivo. Corrige o caso relatado: jornada nunca publicada, com fluxo desenhado no designer, cuja v1 (criada vazia junto com a jornada) nunca refletia o fluxo editado — o botão "Publicar" da versão ficava desabilitado (snapshot vazio) mesmo com o fluxo pronto. REQ-06.02.010 reformulado para não prometer "nova versão" a cada salvamento (às vezes é só atualização da DRAFT existente). |
| 2026-08-08 00:35 | REQ-06.04.010 novo: despublicação por versão. Endpoint `POST /journeys/{id}/versions/{versionId}/unpublish` + `UnpublishJourneyVersion` (valida que `versionId` é a versão `PUBLISHED` da jornada, senão 409 via nova `VersionNotPublishedException`; delega em `UnpublishJourney` para reaproveitar runtime-unpublish + arquivamento de versão + `journey.unpublish()`, em vez de duplicar a regra). Front: botão "Publicar" removido do nível de jornada no grid (`JourneysPage`) — publicação passa a existir só por versão; nova ação "Despublicar" na linha da versão `PUBLISHED`, que ao concluir recarrega tanto a lista de versões quanto a jornada (status e "vN publicada" ficam consistentes de imediato). FT-06 avança de 38/38 para 39/39 REQs; progresso geral de 93% (221/238) para 93% (222/239). |
| 2026-08-08 00:35 | REQ-06.04.009 novo: ao despublicar uma jornada (`UnpublishJourney`), a `journey_version` `PUBLISHED` correspondente agora é arquivada (`ARCHIVED`) antes de gravar `journey.unpublish()`, preservando o snapshot. Corrige inconsistência em que a versão continuava reportada como `PUBLISHED` (e o grid de jornadas continuava exibindo "vN publicada") mesmo depois da jornada ser despublicada. FT-06 avança de 37/37 para 38/38 REQs; progresso geral de 93% (220/237) para 93% (221/238). |
| 2026-08-08 18:46 | FT-10 (Observabilidade) novo e implementado por completo: 12/12 REQs. Log técnico de aplicação (distinto da auditoria de negócio do FT-08): `HttpRequestLoggingFilter` (entrada/saída de toda API, sem log de body, registrado no `SecurityConfig` antes do filtro de autenticação) e `TransactionLoggingAspect` (`@Around` sobre todo `@Service` de `application.*`, logando início/commit/rollback de cada transação de persistência). Correlação via `X-Correlation-Id` (reaproveitado do header ou gerado) propagada por `MDC` e incluída no pattern do novo `logback-spring.xml`, cobrindo tanto os logs de API quanto os de transação da mesma requisição/thread. Integração com ELK preparada mas desativada (sem ambiente ELK neste momento) — ver seção "HOW TO — habilitar integração com ELK" no FT-10 para o procedimento de ativação (dependência `logstash-logback-encoder` + appender TCP + variáveis de ambiente de destino). Build: no Spring Boot 4.1 o starter de AOP foi renomeado de `spring-boot-starter-aop` para `spring-boot-starter-aspectj` — usado o novo nome no `pom.xml`. Progresso geral de 95% (212/224) para 95% (224/236). |
| 2026-08-08 15:45 | FT-09 (Ajuda e Suporte) novo e implementado por completo: 5/5 REQs. Tela de ajuda estática (`front/src/shell/HelpPage.tsx`) com FAQ agrupado por tema, busca textual e link `mailto:sustentacao@telefonica.com`; acessível pelo item "Ajuda e suporte" da sidebar (antes um placeholder genérico). Simplificação deliberada: sem ajuda contextual por tela, sem canal de suporte com registro/consulta de solicitações e sem tela de diagnóstico — cortados do escopo por decisão de produto antes da implementação, não fazem parte do backlog. Progresso geral de 95% (207/219) para 95% (212/224). |
| 2026-08-08 05:59 | FT-06 (Versionamento de jornadas), FT-07 (Autenticação e autorização) e FT-08 (Auditoria) implementados, na ordem FT-07 → FT-06 → FT-08 (dependência: versão precisa de usuário autenticado; auditoria precisa de ambos). FT-06: tabela `journey_version` (`V7`) + backfill de jornadas existentes (`V8`), criação automática de versão `DRAFT` ao criar jornada, publicação de versão arquiva a anterior, snapshot imutável, painel de versões no designer de fluxo — 35/35 REQs. FT-07: token opaco em memória (`Authorization: Bearer`, expiração por inatividade configurável), usuário mockado `admin`/`admin`/`ADMIN`, papéis `ADMIN`/`EDITOR`/`VIEWER` aplicados via `@PreAuthorize` em todos os controllers, tela de login com aviso de autenticação mockada — 24/25 REQs (REQ-07.04.002 n/a, sem CRUD de usuário na versão 1.0.0). FT-08: tabela `audit_event` (`V9`), gravação em login/logout/sessão, CRUD de produto/canal/jornada, versões, publicações e acessos negados, consulta com filtros e paginação restrita a `ADMIN` — 21/22 REQs (REQ-08.02.007 n/a, sem CRUD de papéis na versão 1.0.0). De quebra, REQ-02.06.004 (que dependia do FT-06) passou de `todo` para `done`. Simplificações deliberadas: sem rollback/restauração de versão (REQ-06.05.004, fora de escopo); flow-designer continua editando o estado "vivo" da jornada, versionar tira um snapshot desse estado; ocultação de botões por papel na UI não foi replicada em todas as telas (enforcement real é no backend). Progresso geral de 57% para 95% (207/219; 2 n/a; restam apenas os 10 REQs do FT-05 Simulação). |
| 2026-08-08 02:37 | Escopo da versão 1.0.0 evoluído com FT-06 Versionamento de jornadas, FT-07 Autenticação e autorização e FT-08 Auditoria. A autenticação será representada por provedor externo mockado, com tela de login e usuário `admin`/`admin` no perfil `ADMIN`; os papéis `ADMIN`, `EDITOR` e `VIEWER` foram incluídos. Versões publicadas são imutáveis; restauração/rollback permanece fora da versão 1.0.0; auditoria não armazena dados sensíveis. Total: 8 FTs, 42 USs e 220 REQs; 126 concluídos e 94 todo (57%). |
| 2026-08-08 01:50 | REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop `onOpenNewForm` propagada de `App.tsx` → `JourneysPage` → `JourneyDesignerPage` → `PropertiesDock` → `PropertiesPanel`) e "Atualizar" (recarrega `listForms()` sem sair do editor de fluxo, via `refreshForms`). `FormsPage.tsx` ganhou suporte a abrir direto em modo `'new'` (props `openNew`/`onOpenNewHandled`), espelhando o padrão já existente de `openFormId`. Progresso geral de 93% para 93% (arredondamento; 127/137). |
| 2026-08-08 01:50 | REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (`HeadersEditor` em `PropertiesPanel.tsx`) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136). |
| 2026-08-08 01:50 | Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) `REST` deixou de ser oferecido para `MESSAGE_START_EVENT` — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só `KAFKA` continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (`SERVICE_TASK` → `PRODUCE`, `RECEIVE_TASK`/`MESSAGE_START_EVENT` → `CONSUME`), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em `model.ts` (`CONNECTOR_TYPES_BY_NODE`, `KAFKA_OPERATION_BY_NODE`) e `FlowValidator` (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em `PropertiesDock.tsx` (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam `findFreeSpot` para não empilhar. Progresso geral de 92% para 93%. |
| 2026-08-08 01:50 | FT-03 (Modelagem Visual) fechado a 100%: US-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: `FlowNodeType` ganhou `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT`; novos `ConnectorType` (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e `ConnectorConfig` (tipo + config declarativa `Map<String,Object>` + `credentialRef`, sem secret) associáveis a esses 3 tipos; `FlowValidator` estendido (elemento inicial = `START` ou `MESSAGE_START_EVENT`, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga `connectorConfig` automaticamente (reaproveita `FlowNode`/`FlowNodeRecord`). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no `PropertiesPanel` (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: `Flow.initial` criava `START`+`END` já conectados na criação da jornada; agora só cria o `START`, como o requisito manda. Progresso geral de 80% para 92% (só falta FT-05 Simulação). |
| 2026-08-03 03:05 | FT-06 (Publicação) + FT-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (`domain/application/infrastructure/interfaces` para `publication`, migration `V6__create_journey_publication.sql`, endpoints `POST /journeys/{id}/publish`\|`unpublish`, filtro `?status=` em `GET /journeys`) e mock do runtime (`MockRuntimePublicationAdapter`, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (`ActivePublicationPort`/`HasEverBeenPublishedPort`, antes sempre `false`), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram `in_progress`) e REQ-02.05.002/003 (eram `blocked`, já satisfeitos desde FT-03/FT-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (`JourneysPage`), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os `in_progress`/`blocked` restantes. |
| 2026-08-03 02:06 | FT-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (`domain/application/infrastructure/interfaces/form`, migration `V5__create_form.sql`, CRUD `/api/v1/forms`) e frontend novo (`front/src/forms/FormsPage.tsx` + `FormBuilderPage.tsx`, `api/forms.ts`, item "Formulários" na sidebar). `FlowNode.formId` (já existente no backend) agora é editável de fato: `PropertiesPanel` ganhou o seletor "Formulário associado" para nós User Task e `JourneyDesignerPage` para de mandar `formId: null` fixo. FT-04 avança de 0% para 100%; progresso geral de 55% para 69%. |
| 2026-08-02 00:39 | Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos `Ctrl+C`/`Ctrl+V`/`Ctrl+D` e botão "Duplicar nó" no `NodePropertiesPanel`, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como `n/a`: decisão de produto de não implementar na versão 1.0.0, salvamento permanece manual. FT-03 avança para 25/26 (96%). |
| 2026-08-02 22:12 | Atualização do FT-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam `todo`: copiar elementos, duplicar elementos e salvamento automático. |
| 2026-08-02 03:56 | Sincronização com `ej-admin-requisitos.md`: 122 REQs em 8 FTs / 28 USs, todos como `todo`. |
