# Elastic Journey Admin Portal
## Índice da Documentação

### Versão
1.0.0

---

# 1. Introdução

O Elastic Journey Admin Portal é uma aplicação composta por frontend e backend para cadastro de produtos e canais, criação visual de jornadas específicas por canal, configuração de formulários, execução e publicação por meio de uma API do runtime.

---

# 2. Objetivo do Produto

```text
Gestão de Produtos

Gestão de Canais

Gestão de Jornadas por Canal

Modelagem Visual de Fluxos

Service Tasks, Receive Tasks e Message Start Events com conectores REST, Kafka, Azure Event Hubs e Azure Service Bus

Catálogo de integrações: clusters de mensageria corporativos, referências de credencial (Azure Key Vault) e credencial de IA

Geração de fluxo assistida por IA

Formulários

Execução

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

Responsável por cadastrar produtos e canais e por criar, modelar, versionar, executar e publicar jornadas específicas para cada canal. Controla o acesso por autenticação mockada de provedor externo e registra eventos de auditoria. Produz uma **Journey Publication** associada a uma versão e inicia sua publicação por uma chamada outbound.

## API de Publicação do Runtime

Fronteira externa responsável por receber o snapshot enviado pelo Admin Portal. Seu contrato definitivo ainda será definido; na versão 1.0.0, a chamada é atendida por um mock. O ms-journey não consulta nem conhece o domínio do Admin Portal.

---

# 4. Escopo da Versão 1.0.0

```text
Gestão de Produtos e Canais

Gestão de Jornadas Específicas por Canal

Modelagem Visual de Fluxos

Geração de Fluxo Assistida por IA

Gestão de Formulários

Versionamento de Jornadas

Catálogo de Integrações (clusters e credenciais de mensageria, credencial de IA)

Dashboard Operacional

Autenticação e Autorização mockadas

Auditoria

Execução

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

Clonagem de jornadas entre canais

Templates de jornadas

Biblioteca de componentes de formulário

Debug completo por etapa

Visualização dos dados de formulário por etapa

Exibição condicional em formulários (campo `visibleIf` já existe no modelo, mas não é avaliado em runtime)
```

> **Nota de revisão (2026-08-24):** "Seções" e "Organização dinâmica de campos" saíram desta lista — implementadas nesta revisão.

---

# 6. Principais Conceitos

## Product

Produto ou serviço digital que agrupa seus canais de atendimento. Exemplo: Vivo+.

## Channel

Aplicação ou interface de atendimento pertencente a um produto. Tipos da versão 1.0.0: Web, Mobile, WhatsApp, URA, Contact Center e Other.

## Journey

Workflow específico de um canal. Cada jornada pertence a exatamente um canal e possui código, fluxo e formulários próprios.

## Flow

Estrutura visual da jornada: Start, Message Start Event, User Tasks, Service Tasks, Receive Tasks, término e conexões.

## Connectors

Framework de integrações com REST, Kafka, Azure Event Hubs e Azure Service Bus habilitados na versão 1.0.0 e conectores adicionais catalogados como desabilitados. Um conector de mensageria referencia um cluster e, opcionalmente, uma credencial do Integration Catalog em vez de texto livre.

## Integration Catalog

Catálogo de clusters de mensageria corporativos e referências de credencial (Azure Key Vault) usados pelos conectores de mensageria, além da credencial de API de IA usada pela geração de fluxo assistida. Administração restrita ao papel `ADMIN`; demais papéis apenas selecionam entradas já cadastradas. Nunca armazena o valor de um segredo de mensageria; a credencial de IA é a única exceção deliberada e temporária a esse princípio (ver FT-14 US-14.06).

## AI-Assisted Flow Generation

Geração automática de um rascunho de fluxo a partir de uma descrição em linguagem natural, usando a credencial de IA do Integration Catalog. O fluxo gerado é sempre um rascunho editável, sujeito às mesmas regras de validação estrutural e à mesma revisão manual de um fluxo criado por edição direta. A geração considera o fluxo já desenhado no canvas como contexto: um pedido aditivo preserva nós/conexões sem relação com o pedido; redesenhar tudo do zero só ocorre quando pedido explicitamente.

## Form

Formulário reutilizável do catálogo, usado como modelo de partida (cópia) para a tela de uma User Task — não mais referenciado por id, ver User Task Configuration.

## Execution

Execução real do caminho e das telas de uma jornada publicada, contra o motor de runtime.

## Journey Version

Versão imutável de uma jornada, contendo o fluxo, conexões e a tela embutida (compilada) de cada User Task numa determinada publicação.

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
Product 1 → 0..N Channel

Channel 1 → 0..N Journey

Journey 1 → 1 Channel
```

Jornadas de canais diferentes são independentes. Um produto pode possuir, por exemplo, um questionário Web com dez telas e um questionário Mobile com seis telas.

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

**Arquivo:** `ej-admin-requisitos.md` — Escopo funcional completo da versão 1.0.0, organizado em catorze features.

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
| Product | Produto que agrupa canais de atendimento |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada específica de um canal |
| Flow | Estrutura visual da jornada |
| Flow Node | Elemento individual do fluxo |
| Flow Connection | Conexão entre elementos do fluxo |
| Flow Annotation | Nota livre no canvas, sem efeito no fluxo executável |
| Service Task | Tarefa que executa uma integração externa |
| Receive Task | Tarefa que aguarda uma mensagem externa |
| Message Start Event | Elemento que inicia uma jornada por mensagem externa |
| Connector | Tipo e configuração da integração utilizada por uma tarefa |
| User Task Configuration | Tela embutida (`embeddedScreen`) desenhada diretamente no nó de uma User Task |
| Form | Formulário reutilizável do catálogo, usado só como modelo de partida (cópia) para telas de User Task |
| Form Component | Componente visual pertencente a um formulário |
| Journey Version | Versão imutável de uma jornada |
| Journey Publication | Snapshot de uma versão enviado para a API de publicação do runtime |
| External Identity Provider | Provedor externo de autenticação, mockado na versão 1.0.0 |
| Audit Event | Evento de auditoria de uma operação do sistema |
| Messaging Cluster | Cluster/broker de mensageria corporativo cadastrado no catálogo de integrações |
| Credential Reference | Referência a um secret do Azure Key Vault usada por um conector de mensageria |
| AI Provider Credential | Credencial de API de um provedor de IA (Gemini), usada pela geração de fluxo assistida |

> **Nota de revisão (2026-08-24):** linhas `User Task Configuration` e `Form` reescritas — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 11. Glossário

| Termo | Descrição |
|-------|-----------|
| Product | Produto ou serviço digital |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada digital específica de um canal |
| Flow | Fluxo visual |
| User Task | Interação humana realizada durante a jornada |
| Form | Formulário reutilizável do catálogo, usado como modelo de partida (cópia) para a tela de uma User Task |
| Execution | Execução real da jornada publicada, contra o motor de runtime |
| Publication | Envio do snapshot de uma versão imutável para a API de publicação do runtime |
| Runtime | Camada responsável pela execução das jornadas |
| ms-journey | Motor de execução que não conhece nem consulta o Admin Portal |
| BPMN | Modelo executável utilizado pelo motor de workflow |
| Integration Catalog | Catálogo de clusters de mensageria e referências de credencial usados pelos conectores, e da credencial de IA |
| AI-Assisted Flow Generation | Geração de um rascunho de fluxo a partir de um prompt em linguagem natural, considerando o fluxo já desenhado como contexto |

> **Nota de revisão (2026-08-24):** linha `Form` reescrita — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 12. Resumo Executivo

O Elastic Journey Admin Portal versão 1.0.0 cobre o ciclo de vida de jornadas específicas por canal: cadastro do produto e de seus canais, modelagem do fluxo e dos formulários (incluindo conectores REST, Kafka, Azure Event Hubs e Azure Service Bus apoiados por um catálogo de integrações de clusters e credenciais), versionamento, execução, autenticação mockada, autorização por papéis, auditoria, publicação por uma chamada mockada para a futura API de publicação do runtime, uma central de ajuda com FAQ e contato do time de sustentação, e observabilidade técnica (log de API e de transações de persistência, correlacionados por requisição, preparados para integração futura com ELK).
