# Elastic Journey Admin Portal
## Modelo de Dados Conceitual

### Versão
1.0 (MVP)

---

# 1. Objetivo

Este documento descreve o modelo de dados conceitual do Elastic Journey Admin Portal, abrangendo produtos, canais, jornadas, fluxos, formulários, simulação e publicação.

---

# 2. Princípios de Modelagem

## 2.1 Product como Agrupador de Canais

Um Product representa um produto ou serviço digital e agrupa seus canais de atendimento.

Um Product não pode ser desativado enquanto alguma jornada de seus canais possuir publicação ativa.

## 2.2 Jornada Específica por Canal

Cada Journey pertence a exatamente um Channel. Jornadas de canais diferentes possuem definições independentes.

Um Channel não pode ser desativado enquanto alguma de suas jornadas possuir publicação ativa. Uma Journey também deve ser despublicada antes de ser desativada.

## 2.3 Identidade Administrativa

Product, Channel e Journey possuem códigos para identificação e pesquisa no Admin Portal. Esses códigos integram o snapshot publicado, mas não são utilizados pelo runtime para consultar o domínio administrativo.

## 2.4 Publicação como Snapshot

A publicação preserva a definição da jornada no momento da publicação, incluindo produto, canal, fluxo e formulários. Cada jornada possui no máximo uma publicação, cujo snapshot é substituído integralmente em uma nova publicação.

## 2.5 Desacoplamento do Motor BPM

Nenhuma entidade possui dependência de BPMN, Camunda ou outro motor de execução.

## 2.6 Simplicidade

O MVP não contempla versionamento, governança, rollback, auditoria ou ownership.

---

# 3. Visão Conceitual

```mermaid
flowchart TD
    PRODUCT[Product]
    CHANNEL[Channel]
    JOURNEY[Journey]
    FLOW[Flow]
    FORMS[Forms]
    SIMULATION[Simulation Execution]
    PUBLICATION[Journey Publication]

    PRODUCT --> CHANNEL
    CHANNEL --> JOURNEY
    JOURNEY --> FLOW
    JOURNEY --> SIMULATION
    JOURNEY --> PUBLICATION
    FLOW --> FORMS
```

---

# 4. Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| Product | Produto ou serviço digital que agrupa canais |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada específica de um canal |
| Flow | Estrutura visual da jornada |
| Flow Node | Elemento posicionado no canvas: Start, End ou User Task |
| Flow Connection | Conexão entre nós do fluxo |
| User Task Configuration | Associação entre uma User Task e um formulário |
| Form | Formulário reutilizável utilizado por User Tasks |
| Form Component | Elemento visual pertencente a um formulário |
| Simulation Execution | Execução simulada da jornada |
| Simulation Step | Etapa registrada durante a simulação |
| Simulation Result | Resultado consolidado da simulação |
| Journey Publication | Snapshot atual enviado para a API de publicação do runtime |

---

# 5. Product

## Descrição

Representa um produto ou serviço digital. Exemplo: Vivo+.

## Informações Principais

```text
Código, Nome, Descrição, Status
```

## Cardinalidade

```text
Product 1 → 0..N Channel
```

---

# 6. Channel

## Descrição

Representa uma aplicação ou interface de atendimento pertencente a um produto.

## Tipos Suportados

```text
WEB, MOBILE, WHATSAPP, URA, CONTACT_CENTER, OTHER
```

## Informações Principais

```text
Produto, Código, Nome, Tipo, Status, Descrição
```

## Cardinalidade

```text
Channel 1 → 0..N Journey

Channel N → 1 Product
```

---

# 7. Journey

## Descrição

Representa um workflow específico de um canal.

## Informações Principais

```text
Canal, Código, Nome, Descrição, Status
```

## Responsabilidades

Agrupar o fluxo e registrar simulações e a publicação atual.

## Cardinalidade

```text
Journey N → 1 Channel

Journey 1 → 1 Flow
```

O produto da jornada é determinado pelo produto do canal associado.

Uma Journey somente pode ser removida fisicamente quando nunca tiver possuído uma Journey Publication. Quando houver registro de publicação, a Journey pode apenas ser desativada e sua publicação deve ser preservada.

---

# 8. Flow, Flow Node e Flow Connection

## Flow

Estrutura principal da jornada; define a sequência das telas e etapas.

## Flow Node — Tipos

```text
START, END, USER_TASK, SERVICE_TASK, RECEIVE_TASK, MESSAGE_START_EVENT
```

## Flow Connection

Liga dois nós do mesmo fluxo. Cada fluxo possui exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e um `END`. O elemento inicial não possui entrada e possui exatamente uma saída; cada `USER_TASK`, `SERVICE_TASK` e `RECEIVE_TASK` possui ao menos uma entrada e exatamente uma saída; o `END` possui ao menos uma entrada e nenhuma saída. Todos os nós integram um caminho contínuo e alcançável entre o elemento inicial e `END`.

## Persistência e identificadores

O `Flow` (nós e conexões) é persistido como um único documento `jsonb` associado à jornada — não há necessidade de consultar nós/conexões individualmente hoje, então não são normalizados em tabelas próprias.

Na publicação, a runtime traduz este `Flow` para uma definição de processo BPMN (Camunda). Elementos BPMN em XML exigem identificadores no formato `NCName` (não podem iniciar com dígito), o que um UUID puro não garante. Por isso, os identificadores que a runtime embute diretamente como `id` de elemento BPMN nascem com um prefixo fixo, nunca como UUID puro:

| Identificador | Formato | Vira, na runtime |
|---|---|---|
| `Flow.flowId` | `Process_<uuid>` | `id` do `<bpmn:process>` |
| `FlowNode.nodeId` | `Node_<uuid>` | `id` de elementos BPMN de início, tarefa, espera ou término |
| `FlowConnection.connectionId` | `Flow_<uuid>` | `id` de `<bpmn:sequenceFlow>` |

Os demais identificadores do domínio (`productId`, `channelId`, `journeyId`, `formId`, etc.) nunca aparecem no XML BPMN gerado e permanecem UUID puro — o prefixo é aplicado apenas onde a restrição do XML exige.

---

# 9. Integration Tasks and Connectors

`SERVICE_TASK` executes an external integration. `RECEIVE_TASK` waits for a message in an already running journey instance. `MESSAGE_START_EVENT` creates a new journey instance from an external message.

The connector framework is extensible. `REST` and `KAFKA` are enabled in the MVP; additional connectors may be cataloged as disabled without being available for use in flows.

```text
SERVICE_TASK        → bpmn:serviceTask
RECEIVE_TASK        → bpmn:receiveTask
MESSAGE_START_EVENT → bpmn:startEvent + messageEventDefinition
```

Connector configuration is declarative and stored with the flow snapshot. Credential values are not stored; only a runtime-resolved credential reference is persisted.

# 10. User Task Configuration

Associa um nó `USER_TASK` a um formulário. No MVP, a associação é opcional: cada User Task pode possuir zero ou uma configuração e, quando configurada, referencia exatamente um formulário.

```mermaid
flowchart LR
    USER_TASK[User Task]
    CONFIG[User Task Configuration]
    FORM[Form]

    USER_TASK --> CONFIG
    CONFIG --> FORM
```

---

# 11. Form e Form Component

## Form

Formulário reutilizável associado a uma ou mais User Tasks.

## Form Component — Tipos MVP

```text
TEXT, INPUT, SELECT, MULTISELECT, UPLOAD, CONTENT
```

Um formulário pode ser utilizado por User Tasks de jornadas diferentes. A publicação inclui uma cópia do formulário utilizado pela jornada.

---

# 12. Simulation Execution, Simulation Step e Simulation Result

## Simulation Execution

Execução simulada da jornada, permitindo verificar seu caminho e suas telas sem publicação.

## Simulation Step

Etapa percorrida durante a simulação, associada a um nó do fluxo.

## Simulation Result

Resultado consolidado contendo o caminho executado e o resumo da execução.

```mermaid
flowchart TD
    JOURNEY[Journey]
    SIMULATION[Simulation]
    RESULT[Simulation Result]

    JOURNEY --> SIMULATION
    SIMULATION --> RESULT
```

---

# 13. Journey Publication

## Descrição

Representa o snapshot atual de uma jornada enviado para a API de publicação do runtime. A chamada é mockada no MVP.

## Conteúdo

```text
Product

Channel

Journey

Flow

Forms
```

## Estados Possíveis

```text
PUBLISHED, UNPUBLISHED
```

Cada jornada possui no máximo uma publicação. Publicar novamente substitui o snapshot existente, sem criar histórico ou nova versão.

Ao despublicar, o Admin Portal chama a API mockada do runtime. Somente após o retorno de sucesso, Journey e Journey Publication passam para `UNPUBLISHED`. Jornadas nunca publicadas permanecem `DRAFT`.

---

# 14. Relacionamentos das Entidades

| Origem | Destino | Cardinalidade |
|--------|---------|---------------|
| Product | Channel | 1:N |
| Channel | Journey | 1:N |
| Journey | Flow | 1:1 |
| Flow | Flow Node | 1:N |
| Flow | Flow Connection | 1:N |
| Flow Node | User Task Configuration | 1:0..1 |
| Form | User Task Configuration | 1:N |
| Form | Form Component | 1:N |
| Journey | Simulation Execution | 1:N |
| Simulation Execution | Simulation Step | 1:N |
| Simulation Execution | Simulation Result | 1:0..1 |
| Journey | Journey Publication | 1:0..1 |

---

# 15. Diagrama ER Conceitual

```mermaid
erDiagram
    PRODUCT ||--o{ CHANNEL : contains
    CHANNEL ||--o{ JOURNEY : owns

    JOURNEY ||--|| FLOW : owns
    FLOW ||--o{ FLOW_NODE : contains
    FLOW ||--o{ FLOW_CONNECTION : contains

    FLOW_NODE ||--o| USER_TASK_CONFIG : configures
    FORM ||--o{ USER_TASK_CONFIG : serves
    FORM ||--o{ FORM_COMPONENT : contains

    JOURNEY ||--o{ SIMULATION_EXECUTION : executes
    SIMULATION_EXECUTION ||--o{ SIMULATION_STEP : contains
    SIMULATION_EXECUTION ||--o| SIMULATION_RESULT : generates

    JOURNEY ||--o| JOURNEY_PUBLICATION : publishes
```

---

# 16. Glossário

| Conceito | Descrição |
|----------|-----------|
| Product | Produto ou serviço digital |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada específica de um canal |
| Flow / Flow Node / Flow Connection | Estrutura visual da jornada e seus elementos |
| User Task Configuration | Associação entre User Task e Form |
| Form / Form Component | Formulário e seus componentes visuais |
| Simulation Execution / Step / Result | Execução simulada, etapas e resultado |
| Journey Publication | Snapshot atual enviado para a API de publicação do runtime |

---

# 17. Resumo Conceitual

O modelo conceitual parte de Product, que agrupa Channels. Cada Channel possui Journeys independentes, e cada Journey agrega fluxo, simulações e no máximo uma publicação. O snapshot publicado preserva a definição visual atual e é substituído integralmente quando a jornada é publicada novamente.
