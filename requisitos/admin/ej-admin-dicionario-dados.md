# Elastic Journey Admin Portal
## Dicionário de Dados

### Versão
1.0.0

---

# 1. Objetivo

Referência semântica das entidades e campos do Elastic Journey Admin Portal.

---

# 1.1 Fora do Escopo Deste Dicionário

Os logs técnicos de observabilidade (requisições de API e transações de persistência, FT-10) não são persistidos em banco de dados e, portanto, não possuem entrada neste dicionário. Não confundir com o Audit Event (seção de auditoria), que é persistido.

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
| NodeType | VARCHAR(30) | Sim | `START`, `END`, `USER_TASK`, `SERVICE_TASK`, `RECEIVE_TASK`, `MESSAGE_START_EVENT` ou `GATEWAY` |
| Name | VARCHAR(200) | Sim | Nome do nó |
| Description | TEXT | Não | Descrição do nó |
| PositionX | INTEGER | Não | Coordenada horizontal no canvas |
| PositionY | INTEGER | Não | Coordenada vertical no canvas |
| StartVariables | JSONB | Não | Lista `{ name, type }` — só em nós `START`; variáveis que o canal digital/BFF deve fornecer ao iniciar uma instância (REQ-03.12.001) |
| MessageText | TEXT | Não | Só em `USER_TASK` sem `FormId` (via `UserTaskConfig`) — mensagem exibida ao usuário nessa etapa, podendo referenciar `{{nome}}`, resolvida em tempo de execução (REQ-04.01.005) |
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

Cada fluxo possui exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e ao menos um `END`. O elemento inicial e cada `USER_TASK`, `SERVICE_TASK` ou `RECEIVE_TASK` possuem exatamente uma conexão de saída; um `GATEWAY` possui exatamente duas (US-03.11); o `END` não possui saída. Todos os nós devem integrar um caminho contínuo entre o elemento inicial e algum `END` — um `GATEWAY` pode ramificar o fluxo em caminhos que terminam em `END`s distintos.

Um `END` alcançável apenas por `SERVICE_TASK`s com conector REST, sem nenhum checkpoint (`USER_TASK`, `RECEIVE_TASK` ou `SERVICE_TASK` Kafka) desde o elemento inicial, é rejeitado ao salvar (422) — o conector REST nativo do motor de runtime roda de forma síncrona, e várias execuções concluindo a instância na mesma transação que a iniciou rompem o motor.

## FlowAnnotation

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| AnnotationId | UUID | Sim | Identificador da anotação |
| FlowId | UUID | Sim | Fluxo ao qual a anotação pertence |
| Text | TEXT | Não | Conteúdo livre da nota |
| PositionX | INTEGER | Não | Coordenada horizontal no canvas |
| PositionY | INTEGER | Não | Coordenada vertical no canvas |
| LinkedNodeIds | UUID[] | Não | Nós do mesmo fluxo aos quais a anotação está vinculada, exibidos como linha pontilhada no editor |

Uma `FlowAnnotation` é só documentação visual do editor: nunca participa da validação estrutural do `Flow` (`FlowValidator`) nem é enviada ao `ms-transform-publication` na publicação — não existe no BPMN gerado.

---

# 9. IntegrationTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó de integração configurado |
| ConnectorType | VARCHAR(30) | Sim | `REST`, `KAFKA`, `EVENT_HUBS` ou `SERVICE_BUS` na versão 1.0.0 |
| ConnectorEnabled | BOOLEAN | Sim | Indica se o conector está habilitado no catálogo |
| ConnectorConfig | JSONB | Sim | Configuração específica do conector — para um conector de mensageria, inclui `clusterId` (referência a `MessagingCluster`) além do tópico/fila/hub |
| CredentialRef | VARCHAR(200) | Não | Para um conector de mensageria, `ReferenceName` de uma `CredentialReference` do catálogo de integrações (FT-14); resolvida de fato pelo runtime, nunca pelo Admin Portal |
| InputMapping | JSONB | Não | Mapeamento do contexto para a integração (formato livre); campos de texto de `ConnectorConfig` (URL, headers, body/payload) podem referenciar variáveis via `{{nome}}` |
| OutputMapping | JSONB | Não | Lista de regras `{ name, jsonPath }` aplicadas sobre a resposta (REST) ou payload (Kafka) recebido, populando o contexto de execução com a variável `name` — formato estruturado, não livre |

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

# 11. FormField

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Name | VARCHAR(80) | Sim | Chave técnica do campo: definida pelo usuário, única dentro do formulário, imutável após criada. Substitui o antigo identificador interno gerado pelo sistema. |
| FormId | UUID | Sim | Formulário ao qual pertence |
| FieldType | VARCHAR(50) | Sim | Tipo do campo |
| InputSubtype | VARCHAR(20) | Não | Subtipo de entrada, aplicável apenas quando `FieldType = INPUT` |
| Label | VARCHAR(200) | Não | Rótulo apresentado ao usuário |
| HelpText | TEXT | Não | Texto de ajuda |
| Required | BOOLEAN | Sim | Indica preenchimento obrigatório |
| DefaultValue | TEXT | Não | Valor padrão |
| DisplayOrder | INTEGER | Sim | Ordem de apresentação |
| Configuration | JSONB | Não | Configuração específica do campo: opções `{label, value}` (`SINGLE_SELECT`/`MULTI_SELECT`), validação de formato (min/max para `NUMBER`, regex/máscara para `TEXT`) e regras de arquivo aceito — extensões e tamanho máximo — (`FILE_UPLOAD`) |

## Valores de FieldType

```text
TEXT
INPUT
SINGLE_SELECT
MULTI_SELECT
FILE_UPLOAD
```

> `STATIC_CONTENT` foi colapsado em `TEXT` (mesmo modelo de dados, diferença apenas de apresentação visual).

## Valores de InputSubtype (quando FieldType = INPUT)

```text
TEXT
NUMBER
EMAIL
DATE
```

---

# 12. UserTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó `USER_TASK` configurado |
| FormId | UUID | Não | Formulário exibido pela User Task |
| MessageText | TEXT | Não | Mensagem exibida ao usuário quando não há `FormId` (REQ-04.01.005) |

Cada nó `USER_TASK` pode possuir zero ou uma configuração. Quando existente, a configuração associa a User Task a exatamente um formulário **ou** declara uma mensagem de etapa sem formulário — os dois nunca coexistem com sentido (se `FormId` estiver preenchido, `MessageText` é ignorado).

---

# 13. ExecutionRun

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ExecutionId | UUID | Sim | Identificador da execução |
| JourneyId | UUID | Sim | Jornada executada |
| InputData | JSONB | Não | Dados informados para os formulários durante a execução |
| ExecutedAt | TIMESTAMPTZ | Sim | Data da execução |
| Status | VARCHAR(20) | Sim | `RUNNING`, `COMPLETED`, `FAILED` ou `CANCELLED` |

---

# 14. ExecutionStep

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| StepId | UUID | Sim | Identificador da etapa |
| ExecutionId | UUID | Sim | Execução proprietária |
| NodeId | UUID | Sim | Nó executado |
| StepOrder | INTEGER | Sim | Ordem da etapa |
| StartedAt | TIMESTAMPTZ | Não | Início da etapa |
| FinishedAt | TIMESTAMPTZ | Não | Fim da etapa |
| Result | VARCHAR(20) | Não | `SUCCESS`, `FAILED` ou `SKIPPED` |
| FormData | JSONB | Não | Dados do formulário apresentado na etapa |

O backend deve registrar o passo somente quando `NodeId` pertencer ao fluxo da mesma jornada indicada pela `ExecutionRun`.

---

# 15. ExecutionResult

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ResultId | UUID | Sim | Identificador do resultado |
| ExecutionId | UUID | Sim | Execução relacionada |
| ExecutedPath | JSONB | Não | Caminho percorrido |
| ExecutionSummary | JSONB | Não | Resumo consolidado |

---

# 16. JourneyPublication

Na versão 1.0.0, a publicação ativa deve referenciar uma `JourneyVersion`. Versões publicadas são imutáveis e versões anteriores devem ser preservadas.

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
| Status | VARCHAR(20) | Sim | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` ou `INACTIVE` |
| Snapshot | JSONB | Sim | Definição completa e independente da versão |
| Description | TEXT | Não | Observação da versão |
| CreatedBy | UUID | Sim | Usuário que criou a versão |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| PublishedAt | TIMESTAMPTZ | Não | Data de publicação |

Versões `PUBLISHED` são imutáveis. Restauração e rollback não fazem parte da versão 1.0.0.

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
| AuthProvider | VARCHAR(50) | Sim | Provedor externo mockado na versão 1.0.0 |

A versão 1.0.0 deve disponibilizar o usuário `admin`, senha `admin` e papel `ADMIN` por meio do provedor externo mockado.

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

# 20. MessagingCluster

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ClusterId | UUID | Sim | Identificador único do cluster |
| Name | VARCHAR(150) | Sim | Nome do cluster, único na plataforma |
| Type | VARCHAR(30) | Sim | `KAFKA`, `EVENT_HUBS` ou `SERVICE_BUS` |
| ConnectionAddress | VARCHAR(300) | Sim | `bootstrap.servers` (Kafka) ou namespace (Event Hubs/Service Bus), sem prefixo de protocolo |
| Status | VARCHAR(20) | Sim | `ACTIVE` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

A empresa opera múltiplos clusters corporativos por tipo. A desativação é bloqueada enquanto existir `CredentialReference` ativa ou conector de jornada publicada referenciando o cluster.

---

# 21. CredentialReference

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| CredentialId | UUID | Sim | Identificador único da credencial |
| ReferenceName | VARCHAR(150) | Sim | Nome de referência, único na plataforma — é o valor usado como `CredentialRef` na configuração do conector |
| ClusterId | UUID | Sim | Cluster ao qual a credencial se aplica |
| KeyVaultUri | VARCHAR(300) | Sim | URI do Azure Key Vault — só metadado, nunca o segredo |
| SecretName | VARCHAR(150) | Sim | Nome do secret dentro do cofre acima — nunca o valor |
| Status | VARCHAR(20) | Sim | `ACTIVE` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

Nunca armazena o valor de um segredo, em nenhuma circunstância. A resolução de verdade (buscar o segredo no Key Vault) acontece fora do Admin Portal, no componente de runtime que abre a conexão com o cluster. A desativação é bloqueada enquanto existir conector de jornada publicada referenciando a credencial pelo `ReferenceName`.

---

# 22. AiProviderCredential

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| CredentialId | UUID | Sim | Identificador único da credencial |
| Provider | VARCHAR(30) | Sim | Provedor de IA — só `GEMINI` na versão 1.0.0; único (um registro por provedor) |
| ApiKey | TEXT | Sim | Chave de API do provedor — em texto plano, nunca retornada pela API |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

Entidade isolada, sem chave estrangeira. Diferente de `CredentialReference`, armazena o valor do segredo em texto plano — exceção deliberada e temporária ao princípio de nunca persistir segredo, com pendência de criptografia registrada como TODO no código antes de produção. Usada pela geração de fluxo assistida por IA do Journey Modeler (FT-03 US-03.17).

---

# 23. Glossário Geral

| Conceito | Descrição |
|----------|-----------|
| Product | Produto ou serviço digital |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada específica de um canal |
| Flow / FlowNode / FlowConnection | Estrutura visual da jornada |
| IntegrationTaskConfig | Configuração de integração e conector de uma Service Task, Receive Task ou Message Start Event |
| ConnectorType | Tipo de conector habilitado ou catalogado como desabilitado |
| UserTaskConfig | Associação entre User Task e Form |
| Form / FormField | Formulário e campos que o compõem |
| ExecutionRun / Step / Result | Execução, etapas e resultado |
| JourneyPublication | Snapshot de uma versão imutável enviado para a API de publicação do runtime |
| MessagingCluster | Cluster/broker de mensageria corporativo cadastrado no catálogo de integrações |
| CredentialReference | Referência a um secret do Azure Key Vault usada por um conector de mensageria |
| AiProviderCredential | Credencial de API de um provedor de IA (Gemini), usada pela geração de fluxo assistida |

---

# 24. Resumo

O dicionário descreve a hierarquia Product → Channel → Journey, o versionamento imutável, a identidade mockada e os eventos de auditoria, além dos campos necessários para modelagem visual, formulários, execução e publicação de jornadas específicas por canal, e do catálogo de integrações (clusters de mensageria e referências de credencial) usado pelos conectores do fluxo.
