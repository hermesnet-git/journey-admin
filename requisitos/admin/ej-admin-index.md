# Elastic Journey Admin Portal
## Índice da Documentação

### Versão
1.0.0

---

# 1. Introdução

O Elastic Journey Admin Portal é uma aplicação composta por frontend e backend para cadastro de produtos e seus tipos de canal habilitados, criação visual de workflows para jornadas multicanal, composição de telas a partir de um catálogo corporativo de componentes SDUI, execução e publicação por meio de uma API do runtime.

---

# 2. Objetivo do Produto

```text
Gestão de Produtos e Canais

Gestão de Jornadas Multicanal

Modelagem Visual de Workflows

Service Tasks, Receive Tasks e Message Start Events com conectores REST, Kafka, Azure Event Hubs e Azure Service Bus

Catálogo de integrações: clusters de mensageria corporativos, referências de credencial (Azure Key Vault) e credencial de IA

Geração de fluxo assistida por IA

Catálogo Server Driven UI (SDUI)

Execução

Diagnóstico

Dashboard operacional

Publicação de Jornadas

Publicação no Runtime

Ajuda e Suporte

Observabilidade (log técnico de aplicação)
```

---

# 3. Papel do Admin Portal na Plataforma

```text
Elastic Journey Admin Portal
        ↓ chamada outbound
API de Publicação do Runtime (mock na versão 1.0.0)
```

## Elastic Journey Admin Portal

Responsável por cadastrar produtos (com os tipos de canal que cada um habilita) e por criar, modelar, versionar, executar e publicar jornadas multicanal. Controla o acesso por autenticação mockada de provedor externo e registra eventos de auditoria. Produz uma **Journey Publication** associada a uma versão e inicia sua publicação por uma chamada outbound.

## API de Publicação do Runtime

Fronteira externa responsável por receber o snapshot enviado pelo Admin Portal. Seu contrato definitivo ainda será definido; na versão 1.0.0, a chamada é atendida por um mock. O ms-journey não consulta nem conhece o domínio do Admin Portal.

---

# 4. Escopo da Versão 1.0.0

```text
Gestão de Produtos e Canais

Gestão de Jornadas Multicanal

Modelos predefinidos para criação de jornadas

Modelagem Visual de Workflows

Geração de Fluxo Assistida por IA

Catálogo Server Driven UI (SDUI)

Versionamento de Jornadas

Catálogo de Integrações (clusters e credenciais de mensageria, credencial de IA)

Dashboard Operacional

Autenticação e Autorização mockadas

Auditoria

Execução

Diagnóstico

Publicação de Jornadas

Publicação no Runtime por API mockada

Ajuda e Suporte (FAQ e contato com sustentação)

Observabilidade: log de entrada/saída de API e de transações de persistência, correlacionados por requisição, preparados para integração futura com ELK

```

---

# 5. Fora do Escopo

```text
Governança

Rollback

Promotion Between Environments

Analytics

Workflow de Aprovação

Gestão de Tenants

Publicação Agendada

Governança Corporativa

Criação rápida de elementos

Seleção múltipla

Duplicação em massa

Criação automática de próximos passos

Clonagem de jornadas entre tipos de canal

Biblioteca de componentes de formulário

Debug completo por etapa

Visualização dos dados de formulário por etapa

Formulários multi-etapas (wizard)

Fontes de dados dinâmicas - $dataSource e estratégia de prefetch no servidor ou no cliente

Paginação de opções carregadas dinamicamente
```

> **Nota de revisão (2026-09-05):** "Exibição condicional em formulários" saiu desta lista — implementada nesta revisão como visibilidade condicional de componente (US-04.12), avaliada em runtime. Itens do catálogo SDUI (`ej-admin-requisitos.md` FT-04) adicionados.

> **Nota de revisão (2026-08-24):** "Seções" e "Organização dinâmica de campos" saíram desta lista — implementadas nesta revisão.

---

# 6. Principais Conceitos

## Product

Produto ou serviço digital que declara diretamente um conjunto não vazio de tipos de canal habilitados para suas jornadas. Exemplo: Vivo+.

## Channel Type

Valor de domínio fixo — não uma entidade cadastrável. Tipos da versão 1.0.0: `WEB`, `MOBILE`, `WHATSAPP`.

## Journey

Workflow associado a um produto e a um subconjunto não vazio dos tipos de canal habilitados por esse produto. Possui código, fluxo e telas próprios; pode atender mais de um tipo de canal ao mesmo tempo, com o mesmo fluxo e as mesmas telas.

> **Nota de revisão (2026-09-06):** `Channel` (entidade com CRUD por produto) substituído por `Channel Type` (valor de domínio fixo, só 3 tipos); `Journey` deixou de pertencer a exatamente um canal.

## Journey Template

Esqueleto de fluxo predefinido e versionado no backend, copiado com novos identificadores quando o usuário o escolhe na criação de uma jornada. Não altera os metadados informados pelo usuário e não é persistido como entidade própria.

## Flow

Estrutura visual da jornada: Start, Message Start Event, User Tasks, Service Tasks, Receive Tasks, término e conexões.

## Connectors

Framework de integrações com REST, Kafka, Azure Event Hubs e Azure Service Bus habilitados na versão 1.0.0 e conectores adicionais catalogados como desabilitados. Um conector de mensageria referencia um cluster e, opcionalmente, uma credencial do Integration Catalog em vez de texto livre.

## Integration Catalog

Catálogo de clusters de mensageria corporativos e referências de credencial (Azure Key Vault) usados pelos conectores de mensageria, além da credencial de API de IA usada pela geração de fluxo assistida. Administração restrita ao papel `ADMIN`; demais papéis apenas selecionam entradas já cadastradas. Nunca armazena o valor de um segredo de mensageria; a credencial de IA é a única exceção deliberada e temporária a esse princípio (ver FT-14 US-14.06).

## AI-Assisted Flow Generation

Geração automática de um rascunho de fluxo a partir de uma descrição em linguagem natural, usando a credencial de IA do Integration Catalog. O fluxo gerado é sempre um rascunho editável, sujeito às mesmas regras de validação estrutural e à mesma revisão manual de um fluxo criado por edição direta. A geração considera o fluxo já desenhado no canvas como contexto: um pedido aditivo preserva nós/conexões sem relação com o pedido; redesenhar tudo do zero só ocorre quando pedido explicitamente.

## Component Registry

Catálogo corporativo de componentes SDUI (`ui.*`, versão 1) disponíveis para compor a tela de uma User Task, persistido em tabela própria. Remover um componente marca-o como indisponível, sem apagar o registro. Ver `ej-admin-requisitos.md` FT-04.

## Sdui Node

Nó de uma árvore que representa a tela de uma User Task, referenciando um componente do Component Registry por `type`+`version`, com vínculo de dados, eventos e visibilidade condicional próprios — ver User Task Configuration.

## Execution

Execução real do caminho e das telas de uma jornada publicada, contra o motor de runtime.

## Diagnostic

Investigação do comportamento de qualquer execução de jornada no motor de runtime, iniciada pelo Admin Portal ou por um canal digital, independente da tela de Execução ao vivo.

## Journey Version

Versão imutável de uma jornada, contendo o fluxo, conexões e a árvore de tela SDUI (`embeddedScreenRoot`) de cada User Task numa determinada publicação.

> **Nota de revisão (2026-09-05):** "tela embutida (compilada)" substituída por "árvore de tela SDUI (`embeddedScreenRoot`)" — não existe mais etapa de compilação separada, a mesma árvore editada é a publicada. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

## Journey Publication

Snapshot de uma versão de jornada enviado para a API de publicação do runtime. Cada jornada possui no máximo uma publicação ativa, associada a uma versão imutável.

## External Identity Provider (mock)

Provedor externo representado por mock na versão 1.0.0. O acesso inicial utiliza o usuário `admin`, senha `admin` e papel `ADMIN`.

## Audit Event

Registro imutável de uma ação relevante, com usuário, recurso, resultado e data, sem armazenamento de credenciais ou outros dados sensíveis.

## Help FAQ

Conteúdo estático de perguntas frequentes sobre o uso do Admin Portal, acessível pelo menu, com busca textual e contato do time de sustentação.

## Correlation Id

Identificador técnico (`X-Correlation-Id`) que amarra os logs de entrada/saída de uma requisição de API aos logs das transações de persistência disparadas por ela. Reaproveitado do header quando presente, gerado quando ausente, e devolvido ao cliente na resposta. Não deve ser confundido com o `correlationId` do Audit Event (FT-08), embora ambos usem o mesmo header como origem.

---

# 7. Cardinalidades Principais

```text
Product 1 → N Channel Type (coleção de valores, não uma entidade relacional)

Product 1 → 0..N Journey

Journey 1 → N Channel Type (subconjunto dos tipos do Product)
```

Jornadas com tipos de canal diferentes são independentes. Um produto pode possuir, por exemplo, um questionário com dez telas rodando em Web e outro com seis telas rodando em Mobile.

---

# 8. Arquitetura da Documentação

```text
Requisitos
    ↓
Arquitetura Lógica
    ↓
Modelo de Dados Conceitual
    ↓
Modelo de Dados Físico
    ↓
Dicionário de Dados
    ↓
Especificação OpenAPI
```

---

# 9. Mapa da Documentação

## Requisitos Funcionais

**Arquivo:** `ej-admin-requisitos.md` — Escopo funcional completo da versão 1.0.0, organizado em quinze features.

## Arquitetura Lógica

**Arquivo:** `ej-admin-arquitetura-logica.md` — Domínios funcionais, responsabilidades e fluxos.

## Modelo de Dados Conceitual

**Arquivo:** `ej-admin-modelo-dados-conceitual.md` — Entidades de negócio e relacionamentos.

## Modelo de Dados Físico

**Arquivo:** `ej-admin-modelo-dados-fisico.md` — Tabelas, chaves, índices e estratégia de persistência.

## Dicionário de Dados

**Arquivo:** `ej-admin-dicionario-dados.md` — Referência semântica das entidades e campos.

## Especificação OpenAPI

**Arquivo:** `ej-admin-openapi.yaml` — Operações e schemas da API do Admin Portal. A API externa de publicação do runtime ainda não possui contrato definitivo e é mockada na versão 1.0.0.

---

# 10. Artefatos Principais

| Artefato | Descrição |
|-----------|-----------|
| Product | Produto que declara os tipos de canal habilitados para suas jornadas |
| Channel Type | Valor de domínio fixo (`WEB`/`MOBILE`/`WHATSAPP`) — não é uma entidade cadastrável |
| Journey | Workflow associado a um produto e a um subconjunto dos tipos de canal desse produto |
| Flow | Estrutura visual da jornada |
| Flow Node | Elemento individual do fluxo |
| Flow Connection | Conexão entre elementos do fluxo |
| Flow Annotation | Nota livre no canvas, sem efeito no fluxo executável |
| Service Task | Tarefa que executa uma integração externa |
| Receive Task | Tarefa que aguarda uma mensagem externa |
| Message Start Event | Elemento que inicia uma jornada por mensagem externa |
| Connector | Tipo e configuração da integração utilizada por uma tarefa |
| User Task Configuration | Árvore de tela SDUI (`embeddedScreenRoot`) desenhada diretamente no nó de uma User Task |
| Component Registry | Catálogo corporativo de componentes SDUI disponíveis para compor telas |
| Sdui Node | Nó da árvore de tela, referenciando um componente do Component Registry |
| Journey Version | Versão imutável de uma jornada |
| Journey Publication | Snapshot de uma versão enviado para a API de publicação do runtime |
| External Identity Provider | Provedor externo de autenticação, mockado na versão 1.0.0 |
| Audit Event | Evento de auditoria de uma operação do sistema |
| Messaging Cluster | Cluster/broker de mensageria corporativo cadastrado no catálogo de integrações |
| Credential Reference | Referência a um secret do Azure Key Vault usada por um conector de mensageria |
| AI Provider Credential | Credencial de API de um provedor de IA (Gemini), usada pela geração de fluxo assistida |

> **Nota de revisão (2026-09-05):** linhas `Form`/`Form Component` substituídas por `Component Registry`/`Sdui Node` e `User Task Configuration` atualizada — ver `ej-admin-requisitos.md` FT-04. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** linhas `User Task Configuration` e `Form` reescritas — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 11. Glossário

| Termo | Descrição |
|-------|-----------|
| Product | Produto ou serviço digital que declara os tipos de canal habilitados para suas jornadas |
| Channel Type | Valor de domínio fixo (`WEB`/`MOBILE`/`WHATSAPP`) — não é uma entidade cadastrável |
| Journey | Workflow associado a um produto e a um subconjunto dos tipos de canal desse produto |
| Flow | Fluxo visual |
| User Task | Interação humana realizada durante a jornada |
| Component Registry / Sdui Node | Catálogo corporativo de componentes SDUI e os nós da árvore de tela que instanciam esses componentes numa User Task |
| Execution | Execução real da jornada publicada, contra o motor de runtime |
| Diagnostic | Investigação do comportamento de qualquer execução no motor de runtime, independente da tela de Execução ao vivo |
| Publication | Envio do snapshot de uma versão imutável para a API de publicação do runtime |
| Runtime | Camada responsável pela execução das jornadas |
| ms-journey | Motor de execução que não conhece nem consulta o Admin Portal |
| BPMN | Modelo executável utilizado pelo motor de workflow |
| Integration Catalog | Catálogo de clusters de mensageria e referências de credencial usados pelos conectores, e da credencial de IA |
| AI-Assisted Flow Generation | Geração de um rascunho de fluxo a partir de um prompt em linguagem natural, considerando o fluxo já desenhado como contexto |

> **Nota de revisão (2026-09-05):** linha `Form` substituída por `Component Registry / Sdui Node` — ver `ej-admin-requisitos.md` FT-04. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** linha `Form` reescrita — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 12. Resumo Executivo

O Elastic Journey Admin Portal versão 1.0.0 cobre o ciclo de vida de jornadas multicanal: cadastro do produto e dos tipos de canal que habilita, modelagem do fluxo e composição das telas a partir de um catálogo corporativo de componentes SDUI (incluindo conectores REST, Kafka, Azure Event Hubs e Azure Service Bus apoiados por um catálogo de integrações de clusters e credenciais), versionamento, execução, diagnóstico de execuções, autenticação mockada, autorização por papéis, auditoria, publicação por uma chamada mockada para a futura API de publicação do runtime, uma central de ajuda com FAQ e contato do time de sustentação, e observabilidade técnica (log de API e de transações de persistência, correlacionados por requisição, preparados para integração futura com ELK).
