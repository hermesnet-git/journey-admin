# Elastic Journey Admin Portal
## Dicionário de Dados

### Versão
1.0 (MVP)

---

# 1. Objetivo

Referência semântica das entidades e campos do Elastic Journey Admin Portal.

---

# 2. Convenções

## Tipos de Dados

```text
UUID — Identificador único
VARCHAR — Texto com tamanho máximo definido
TEXT — Texto livre
INTEGER — Número inteiro
BOOLEAN — Valor lógico
TIMESTAMPTZ — Data e hora em UTC
JSONB — Estrutura JSON persistida
```

## Obrigatoriedade

```text
Sim — Campo obrigatório
Não — Campo opcional
```

---

# 3. Product

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ProductId | UUID | Sim | Identificador único do produto |
| Name | VARCHAR(150) | Sim | Nome do produto. Exemplo: `Vivo+` |
| Description | TEXT | Sim | Descrição do produto |
| Status | VARCHAR(20) | Sim | `ACTIVE` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

---

# 4. Channel

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ChannelId | UUID | Sim | Identificador único do canal |
| ProductId | UUID | Sim | Produto ao qual o canal pertence |
| Name | VARCHAR(100) | Sim | Nome do canal |
| Type | VARCHAR(30) | Sim | Tipo do canal |
| Status | VARCHAR(20) | Sim | `ACTIVE` ou `INACTIVE` |
| Description | TEXT | Sim | Descrição do canal |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

## Valores de Type

```text
WEB
MOBILE
WHATSAPP
URA
CONTACT_CENTER
OTHER
```

---

# 5. Journey

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| JourneyId | UUID | Sim | Identificador único da jornada |
| ChannelId | UUID | Sim | Canal específico da jornada |
| Name | VARCHAR(200) | Sim | Nome da jornada |
| Description | TEXT | Sim | Descrição da jornada |
| Status | VARCHAR(20) | Sim | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

O produto da jornada é obtido por meio de `Channel.ProductId`.

---

# 6. Flow

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| FlowId | UUID | Sim | Identificador do fluxo |
| JourneyId | UUID | Sim | Jornada proprietária do fluxo |
| Name | VARCHAR(200) | Sim | Nome do fluxo |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

Cada jornada possui no máximo um fluxo.

---

# 7. FlowNode

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Identificador do nó |
| FlowId | UUID | Sim | Fluxo ao qual o nó pertence |
| NodeType | VARCHAR(30) | Sim | `START`, `END`, `USER_TASK`, `SERVICE_TASK`, `RECEIVE_TASK` ou `MESSAGE_START_EVENT` |
| Name | VARCHAR(200) | Sim | Nome do nó |
| Description | TEXT | Não | Descrição do nó |
| PositionX | INTEGER | Não | Coordenada horizontal no canvas |
| PositionY | INTEGER | Não | Coordenada vertical no canvas |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

---

# 8. FlowConnection

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ConnectionId | UUID | Sim | Identificador da conexão |
| FlowId | UUID | Sim | Fluxo ao qual a conexão pertence |
| SourceNodeId | UUID | Sim | Nó de origem do mesmo fluxo |
| TargetNodeId | UUID | Sim | Nó de destino do mesmo fluxo |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |

Cada fluxo possui exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e um `END`. O elemento inicial e cada `USER_TASK`, `SERVICE_TASK` ou `RECEIVE_TASK` possuem exatamente uma conexão de saída; o `END` não possui saída. Todos os nós devem integrar um caminho contínuo entre o elemento inicial e `END`.

---

# 9. IntegrationTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó de integração configurado |
| ConnectorType | VARCHAR(30) | Sim | `REST` ou `KAFKA` no MVP |
| ConnectorEnabled | BOOLEAN | Sim | Indica se o conector está habilitado no catálogo |
| ConnectorConfig | JSONB | Sim | Configuração específica do conector |
| CredentialRef | VARCHAR(200) | Não | Referência de credencial resolvida pelo runtime |
| InputMapping | JSONB | Não | Mapeamento do contexto para a integração |
| OutputMapping | JSONB | Não | Mapeamento da resposta para o contexto |

`ConnectorConfig` deve suportar configuração REST e Kafka sem armazenar secrets. Conectores catalogados como desabilitados não podem ser associados a nós de fluxo.

---

# 10. Form

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| FormId | UUID | Sim | Identificador do formulário |
| Code | VARCHAR(80) | Sim | Código único do formulário |
| Name | VARCHAR(200) | Sim | Nome do formulário |
| Description | TEXT | Não | Descrição do formulário |
| Status | VARCHAR(20) | Sim | `ACTIVE` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

---

# 11. FormComponent

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ComponentId | UUID | Sim | Identificador do componente |
| FormId | UUID | Sim | Formulário ao qual pertence |
| ComponentType | VARCHAR(50) | Sim | Tipo do componente |
| Label | VARCHAR(200) | Não | Rótulo apresentado ao usuário |
| HelpText | TEXT | Não | Texto de ajuda |
| Required | BOOLEAN | Sim | Indica preenchimento obrigatório |
| DefaultValue | TEXT | Não | Valor padrão |
| DisplayOrder | INTEGER | Sim | Ordem de apresentação |
| Configuration | JSONB | Não | Configuração específica do componente |

## Valores de ComponentType

```text
TEXT
INPUT
SELECT
MULTISELECT
UPLOAD
CONTENT
```

---

# 12. UserTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó `USER_TASK` configurado |
| FormId | UUID | Sim | Formulário exibido pela User Task |

Cada nó `USER_TASK` pode possuir zero ou uma configuração. Quando existente, a configuração associa a User Task a exatamente um formulário.

---

# 13. SimulationExecution

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| SimulationId | UUID | Sim | Identificador da simulação |
| JourneyId | UUID | Sim | Jornada simulada |
| InputData | JSONB | Não | Dados informados para os formulários simulados |
| ExecutedAt | TIMESTAMPTZ | Sim | Data da execução |
| Status | VARCHAR(20) | Sim | `RUNNING`, `COMPLETED`, `FAILED` ou `CANCELLED` |

---

# 14. SimulationStep

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| StepId | UUID | Sim | Identificador da etapa |
| SimulationId | UUID | Sim | Simulação proprietária |
| NodeId | UUID | Sim | Nó executado |
| StepOrder | INTEGER | Sim | Ordem da etapa |
| StartedAt | TIMESTAMPTZ | Não | Início da etapa |
| FinishedAt | TIMESTAMPTZ | Não | Fim da etapa |
| Result | VARCHAR(20) | Não | `SUCCESS`, `FAILED` ou `SKIPPED` |
| FormData | JSONB | Não | Dados do formulário apresentado na etapa |

O backend deve registrar o passo somente quando `NodeId` pertencer ao fluxo da mesma jornada indicada pela `SimulationExecution`.

---

# 15. SimulationResult

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ResultId | UUID | Sim | Identificador do resultado |
| SimulationId | UUID | Sim | Simulação relacionada |
| ExecutedPath | JSONB | Não | Caminho percorrido |
| ExecutionSummary | JSONB | Não | Resumo consolidado |

---

# 16. JourneyPublication

No MVP, a publicação ativa deve referenciar uma `JourneyVersion`. Versões publicadas são imutáveis e versões anteriores devem ser preservadas.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| PublicationId | UUID | Sim | Identificador da publicação |
| JourneyId | UUID | Sim | Jornada publicada; valor único na tabela |
| VersionId | UUID | Sim | Versão imutável associada à publicação |
| PublicationStatus | VARCHAR(30) | Sim | `PUBLISHED` ou `UNPUBLISHED` |
| PublicationDate | TIMESTAMPTZ | Não | Data da publicação |
| UnpublishedDate | TIMESTAMPTZ | Não | Data da despublicação |
| JourneySnapshot | JSONB | Sim | Cópia de Product, Channel, Journey, Flow e Forms |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação do registro |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última substituição do snapshot |

Cada jornada possui no máximo uma publicação ativa, associada a uma `JourneyVersion`. Uma nova publicação aponta para uma nova versão e preserva os snapshots anteriores após o retorno de sucesso da API mockada do runtime.

Na despublicação, Journey e JourneyPublication passam para `UNPUBLISHED` somente após o retorno de sucesso do mock. Uma jornada nunca publicada utiliza o estado `DRAFT`.

---

# 17. JourneyVersion

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| VersionId | UUID | Sim | Identificador único da versão |
| JourneyId | UUID | Sim | Jornada à qual a versão pertence |
| VersionNumber | INTEGER | Sim | Número sequencial dentro da jornada |
| Status | VARCHAR(20) | Sim | `DRAFT`, `PUBLISHED` ou `ARCHIVED` |
| Snapshot | JSONB | Sim | Definição completa e independente da versão |
| Description | TEXT | Não | Observação da versão |
| CreatedBy | UUID | Sim | Usuário que criou a versão |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| PublishedAt | TIMESTAMPTZ | Não | Data de publicação |

Versões `PUBLISHED` são imutáveis. Restauração e rollback não fazem parte do MVP.

`JourneyPublication` deve manter referência à `VersionId` publicada. Uma nova publicação deve associar-se a uma nova versão e preservar os snapshots anteriores.

---

# 18. User e Role

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| UserId | UUID | Sim | Identificador único do usuário |
| Username | VARCHAR(100) | Sim | Nome utilizado no login |
| Password | Não persistido | Sim | Credencial mockada; não deve ser armazenada na auditoria |
| Role | VARCHAR(20) | Sim | `ADMIN`, `EDITOR` ou `VIEWER` |
| Status | VARCHAR(20) | Sim | `ACTIVE`, `INACTIVE` ou `BLOCKED` |
| AuthProvider | VARCHAR(50) | Sim | Provedor externo mockado no MVP |

O MVP deve disponibilizar o usuário `admin`, senha `admin` e papel `ADMIN` por meio do provedor externo mockado.

---

# 19. AuditEvent

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| AuditEventId | UUID | Sim | Identificador único do evento |
| UserId | UUID | Não | Usuário responsável, quando autenticado |
| Action | VARCHAR(100) | Sim | Ação realizada |
| ResourceType | VARCHAR(80) | Sim | Tipo do recurso afetado |
| ResourceId | UUID | Não | Identificador do recurso afetado |
| Result | VARCHAR(20) | Sim | `SUCCESS`, `FAILURE` ou `DENIED` |
| CorrelationId | VARCHAR(100) | Não | Identificador de rastreamento da requisição |
| PreviousValue | JSONB | Não | Estado anterior sem dados sensíveis |
| NewValue | JSONB | Não | Estado posterior sem dados sensíveis |
| OccurredAt | TIMESTAMPTZ | Sim | Data e hora do evento |

Auditoria não deve armazenar senhas, tokens, secrets ou credenciais.

---

# 20. Glossário Geral

| Conceito | Descrição |
|----------|-----------|
| Product | Produto ou serviço digital |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada específica de um canal |
| Flow / FlowNode / FlowConnection | Estrutura visual da jornada |
| IntegrationTaskConfig | Configuração de integração e conector de uma Service Task, Receive Task ou Message Start Event |
| ConnectorType | Tipo de conector habilitado ou catalogado como desabilitado |
| UserTaskConfig | Associação entre User Task e Form |
| Form / FormComponent | Formulário e componentes visuais |
| SimulationExecution / Step / Result | Execução simulada, etapas e resultado |
| JourneyPublication | Snapshot de uma versão imutável enviado para a API de publicação do runtime |

---

# 21. Resumo

O dicionário descreve a hierarquia Product → Channel → Journey, o versionamento imutável, a identidade mockada e os eventos de auditoria, além dos campos necessários para modelagem visual, formulários, simulação e publicação de jornadas específicas por canal.
