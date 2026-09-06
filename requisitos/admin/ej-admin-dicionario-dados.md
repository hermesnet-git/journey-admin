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

A execução de uma jornada publicada roda inteiramente contra o motor de runtime, acompanhada em tempo real pelo frontend — não existe um agregado ExecutionRun/ExecutionStep/ExecutionResult persistido pelo Admin Portal, e por isso essas entradas não aparecem neste dicionário. O único registro que sobrevive no banco do Admin Portal é um Audit Event genérico (`EXECUTION_START`) marcando que uma execução foi iniciada.

Os modelos predefinidos de jornada também não possuem tabela nem identidade persistida. São definições de sistema versionadas no backend; ao serem usados, seus nós e conexões são copiados com novos identificadores para o `Flow` da jornada e para o snapshot inicial de `JourneyVersion`.

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
| ChannelTypes | VARCHAR(20)[] | Sim | Conjunto não vazio de tipos de canal habilitados (`product_channel_type`) |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

---

# 4. Channel Type

Valor de domínio fixo — não é uma entidade própria, não possui `Id`/`CreatedAt`/`UpdatedAt`. Usado
como coleção de valores tanto em `Product.ChannelTypes` quanto em `Journey.ChannelTypes`.

```text
WEB
MOBILE
WHATSAPP
```

> **Nota de revisão (2026-09-06):** substitui a antiga entidade `Channel` (`ChannelId`/`ProductId`/
> `Name`/`Type`/`Status`/`Description`, com CRUD próprio) — canal deixou de ter cadastro e virou um
> valor de domínio fixo, reduzido de 6 para 3 tipos (`URA`/`CONTACT_CENTER`/`OTHER` removidos).

---

# 5. Journey

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| JourneyId | UUID | Sim | Identificador único da jornada |
| ProductId | UUID | Sim | Produto ao qual a jornada pertence |
| ChannelTypes | VARCHAR(20)[] | Sim | Subconjunto não vazio dos tipos de canal habilitados pelo produto (`journey_channel_type`) |
| Name | VARCHAR(200) | Sim | Nome da jornada |
| Description | TEXT | Sim | Descrição da jornada |
| Status | VARCHAR(20) | Sim | `DRAFT`, `PUBLISHED`, `UNPUBLISHED` ou `INACTIVE` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

`ProductId` é um campo direto da jornada — não é mais obtido através de um canal associado.

> **Nota de revisão (2026-09-06):** `ChannelId` removido, substituído por `ChannelTypes` (subconjunto
> dos tipos do produto) e `ProductId` promovido a campo direto (antes só derivado via
> `Channel.ProductId`).

---

# 6. Flow

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| FlowId | VARCHAR(80) | Sim | Identificador do fluxo — gerado como `Process_<uuid>`, não é UUID puro |
| JourneyId | UUID | Sim | Jornada proprietária do fluxo |
| Name | VARCHAR(200) | Sim | Nome do fluxo |
| Nodes | JSONB | Sim | Array de `FlowNode` (§7) — persistência real dos nós, sem tabela própria |
| Connections | JSONB | Sim | Array de `FlowConnection` (§8) — persistência real das conexões, sem tabela própria |
| Annotations | JSONB | Sim | Array de `FlowAnnotation` (§8) — persistência real das anotações, sem tabela própria |
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
| MessageText | TEXT | Não | Só em `USER_TASK` sem tela desenhada (`EmbeddedScreenRoot` ausente, via `UserTaskConfig`) — mensagem exibida ao usuário nessa etapa, podendo referenciar `{{nome}}`, resolvida em tempo de execução (REQ-04.01.005) |
| EmbeddedScreenRoot | JSONB | Não | Só em `USER_TASK` — raiz de uma árvore de `SduiNode` (§11) desenhada diretamente no nó, editável no editor de fluxo (via `UserTaskConfig`); a mesma árvore editada é a publicada, sem etapa de compilação |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

`FlowNode` não é uma tabela própria: é a forma de cada item do array `Flow.Nodes` (JSONB, §6). `NodeId` é a chave dentro do array, não uma PK de banco.

> **Nota de revisão (2026-09-05):** `EmbeddedScreen` (array de `FormField`) e `EmbeddedScreenSdui` (árvore compilada) substituídos por um único `EmbeddedScreenRoot` (`SduiNode`, catálogo SDUI corporativo v1) — ver `ej-admin-requisitos.md` FT-04. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** `EmbeddedScreen`/`EmbeddedScreenSdui` adicionados e `MessageText` reescrito nesta revisão — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `FormId`; a tela passou a ser desenhada diretamente no nó.

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

`FlowConnection` não é uma tabela própria: é a forma de cada item do array `Flow.Connections` (JSONB, §6). A cardinalidade de saída por tipo de nó é garantida pelo `FlowValidator` no backend, não por constraint de banco.

## FlowAnnotation

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| AnnotationId | UUID | Sim | Identificador da anotação |
| FlowId | UUID | Sim | Fluxo ao qual a anotação pertence |
| Text | TEXT | Não | Conteúdo livre da nota |
| PositionX | INTEGER | Não | Coordenada horizontal no canvas |
| PositionY | INTEGER | Não | Coordenada vertical no canvas |
| LinkedNodeIds | UUID[] | Não | Nós do mesmo fluxo aos quais a anotação está vinculada, exibidos como linha pontilhada no editor |

Uma `FlowAnnotation` é só documentação visual do editor: nunca participa da validação estrutural do `Flow` (`FlowValidator`) nem é enviada ao `ms-transform-publication` na publicação — não existe no BPMN gerado. Não é uma tabela própria: é a forma de cada item do array `Flow.Annotations` (JSONB, §6).

---

# 9. IntegrationTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó de integração configurado |
| ConnectorType | VARCHAR(30) | Sim | `REST`, `KAFKA`, `EVENT_HUBS` ou `SERVICE_BUS` na versão 1.0.0 |
| Config | JSONB | Sim | Configuração específica do conector (mapa livre) — REST: `method`/`url`/`headers`/`params`/`body`; mensageria: `clusterId` (referência a `MessagingCluster`), tópico/fila/hub, `payload`. `InputMapping`/`OutputMapping` (REQ-03.09.010) vivem aqui dentro, não como campos próprios: campos de texto podem referenciar variáveis via `{{nome}}`, e a saída é uma lista de regras `{ name, jsonPath }` |
| CredentialRef | VARCHAR(200) | Não | Para um conector de mensageria, `ReferenceName` de uma `CredentialReference` do catálogo de integrações (FT-14); resolvida de fato pelo runtime, nunca pelo Admin Portal |

`ConnectorType` deve suportar configuração REST e Kafka sem armazenar secrets. Conectores catalogados como desabilitados no catálogo de integrações não ficam disponíveis para seleção na versão 1.0.0 — não é um campo persistido por nó, é um filtro aplicado na lista de tipos oferecida ao usuário. `IntegrationTaskConfig` não é uma tabela própria: `ConnectorType`/`Config`/`CredentialRef` são atributos do próprio item de `Flow.Nodes` (JSONB, §6-7).

---

# 10. ComponentDefinition (Component Registry)

> **Reformulação (2026-09-05):** substitui por completo as antigas entradas `Form`/`FormField`
> (catálogo de Formulários e modelo de campo plano removidos — ver `ej-admin-requisitos.md` FT-04).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| ComponentDefinitionId | UUID | Sim | Identificador técnico da linha — não é a chave de negócio |
| Type | VARCHAR(60) | Sim | Tipo do componente no catálogo SDUI corporativo v1 (ex.: `ui.textInput`); combinado com `Version`, é a chave de negócio, única na tabela |
| Version | VARCHAR(20) | Sim | Versão do componente (ex.: `1.0`) |
| Status | VARCHAR(20) | Sim | `EXPERIMENTAL`, `STABLE`, `DEPRECATED` ou `REMOVED` |
| Level | INTEGER | Sim | Camada de complexidade do componente (0 a 4) |
| Category | VARCHAR(20) | Sim | `CONTENT`, `LAYOUT`, `INPUT`, `ACTION` ou `FEEDBACK` — usada para agrupar a paleta do editor |
| AllowsChildren | BOOLEAN | Sim | Indica se o componente aceita nós filhos (contêiner) ou é uma folha |
| AllowedChildTypes | JSONB | Não | Lista de `type`s de filho permitidos, quando `AllowsChildren` restringe a um subconjunto |
| PropsSchema | JSONB | Sim | Lista de `PropDescriptor` (§11) — schema das propriedades configuráveis do componente |
| Events | JSONB | Sim | Lista dos eventos que o componente pode disparar, dentre o conjunto fechado de ações (US-04.11) |
| SupportedTargets | JSONB | Sim | Mapa alvo de renderização → `TargetSupport` (status + versão mínima de renderizador), por `react.web`/`react.mobile`/`flutter.web`/`flutter.mobile` |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

Tabela real (`component_definition`), não um documento JSONB dentro de outra entidade. Remover um componente (via tela de administração do catálogo) nunca apaga a linha — marca `Status = REMOVED`, preservando a referência para telas já publicadas que o utilizem. O catálogo é semeado, desde a primeira instalação, com os 19 componentes `ui.*` do contrato corporativo de referência (`requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md`).

---

# 11. SduiNode

> **Reformulação (2026-09-05):** substitui por completo a antiga entrada `FormField` (lista plana
> de campos) — ver `ej-admin-requisitos.md` FT-04.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Id | VARCHAR | Sim | Identificador único dentro da tela; quando o nó coleta valor, é o mesmo nome usado no vínculo de dados de leitura-e-escrita do namespace `form` (REQ-04.10.005), com unicidade verificada na jornada inteira |
| Type | VARCHAR | Sim | Tipo do componente referenciado, combinado com `Version` — deve existir no `ComponentDefinition` (§10) correspondente |
| Version | VARCHAR | Sim | Versão do componente referenciado |
| Props | JSONB | Não | Configuração do nó, conforme o `PropsSchema` declarado pelo componente no Registry |
| Bindings | JSONB | Não | Vínculo de dados por namespace (`form`/`data`/`session`/`route`/`computed`) e caminho, com modo leitura-e-escrita ou somente leitura |
| Events | JSONB | Não | Mapa evento → ação, restrito ao conjunto fechado de ações do sistema (US-04.11) |
| Visibility | JSONB | Não | Condição de exibição do nó, comparando um valor do contexto de dados a um valor informado; ausente significa sempre visível |
| Children | JSONB | Não | Lista de `SduiNode` filhos, presente apenas quando o componente referenciado aceita filhos |

Estrutura recursiva sem tabela própria: é o shape de cada nó dentro da árvore persistida em `FlowNode.EmbeddedScreenRoot` (JSONB, §7). A raiz da árvore de uma tela é sempre um único `SduiNode` do tipo `ui.screen`; a profundidade de aninhamento não é limitada. Não existe `DisplayOrder`: a ordem de exibição é a própria posição do nó no array `Children` do pai, não uma coluna armazenada. Não existe mais valor padrão estático — o valor inicial de um nó vem da resolução do seu `Bindings` em tempo de execução (US-04.10).

---

# 12. UserTaskConfig

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| NodeId | UUID | Sim | Nó `USER_TASK` configurado |
| EmbeddedScreenRoot | JSONB | Não | Tela desenhada diretamente no nó — raiz de uma árvore de `SduiNode` (§11), editável no editor de fluxo; a mesma árvore editada é a publicada, sem etapa de compilação |
| MessageText | TEXT | Não | Mensagem exibida ao usuário quando `EmbeddedScreenRoot` está ausente (REQ-04.01.005) |

Cada nó `USER_TASK` pode possuir zero ou uma configuração. Quando existente, a configuração desenha uma tela diretamente no nó (`EmbeddedScreenRoot`) **ou** declara uma mensagem de etapa sem tela — os dois nunca coexistem com sentido (se `EmbeddedScreenRoot` estiver presente, `MessageText` é ignorado). Não existe mais formulário do catálogo como modelo de partida — cada `SduiNode` da árvore referencia um componente do `ComponentDefinition` (§10) por `Type`+`Version`.

`UserTaskConfig` não é uma tabela própria nem um sub-documento separado: `EmbeddedScreenRoot`/`MessageText` são atributos do próprio item de `Flow.Nodes` (JSONB, §6-7) — presentes mesmo em nós que não são `USER_TASK`, mas só têm sentido nesse tipo.

> **Nota de revisão (2026-09-05):** `EmbeddedScreen`/`EmbeddedScreenSdui` substituídos por um único `EmbeddedScreenRoot` (`SduiNode`, catálogo SDUI corporativo v1) — ver `ej-admin-requisitos.md` FT-04. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** seção reescrita — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `FormId`; a tela passou a ser desenhada diretamente no nó (`EmbeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 13. JourneyPublication

Na versão 1.0.0, a publicação ativa deve referenciar uma `JourneyVersion`. Versões publicadas são imutáveis e versões anteriores devem ser preservadas.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| PublicationId | UUID | Sim | Identificador da publicação |
| JourneyId | UUID | Sim | Jornada publicada; valor único na tabela |
| VersionId | UUID | Sim | Versão imutável associada à publicação |
| PublicationStatus | VARCHAR(30) | Sim | `PUBLISHED` ou `UNPUBLISHED` |
| PublicationDate | TIMESTAMPTZ | Não | Data da publicação |
| UnpublishedDate | TIMESTAMPTZ | Não | Data da despublicação |
| JourneySnapshot | JSONB | Sim | Cópia de Product, ChannelTypes, Journey e Flow (com a árvore de tela — `EmbeddedScreenRoot` — de cada User Task) e do `VersionNumber` da versão publicada |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação do registro |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última substituição do snapshot |

Cada jornada possui no máximo uma publicação ativa, associada a uma `JourneyVersion`. Uma nova publicação aponta para uma nova versão e preserva os snapshots anteriores após o retorno de sucesso da chamada real (HTTP) à API de publicação do runtime.

Na despublicação, Journey e JourneyPublication passam para `UNPUBLISHED` somente após o retorno de sucesso dessa mesma chamada. Uma jornada nunca publicada utiliza o estado `DRAFT`.

> **Nota de revisão (2026-09-05):** `EmbeddedScreenSdui` (árvore compilada) substituído por `EmbeddedScreenRoot` — a mesma árvore de `SduiNode` editada no Form Builder, sem etapa de compilação separada.

> **Nota de revisão (2026-08-24):** `JourneySnapshot` reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `FormId`; a tela passou a ser desenhada diretamente no nó, e o snapshot não carrega mais uma lista de formulários — só a tela já compilada de cada nó.

---

# 14. JourneyVersion

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

Ao publicar, `VersionNumber` também é gravado como a tag de versão do processo implantado no runtime (`v<N>`) — distinta do contador de implantação que o próprio runtime mantém internamente para aquela definição, que não é garantido coincidir com `VersionNumber`.

---

# 15. User e Role

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

# 16. AuditEvent

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

# 17. MessagingCluster

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

# 18. CredentialReference

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

# 19. AiProviderCredential

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| CredentialId | UUID | Sim | Identificador único da credencial |
| Provider | VARCHAR(30) | Sim | Provedor de IA — só `GEMINI` na versão 1.0.0; único (um registro por provedor) |
| ApiKey | TEXT | Sim | Chave de API do provedor — em texto plano, nunca retornada pela API |
| CreatedAt | TIMESTAMPTZ | Sim | Data de criação |
| UpdatedAt | TIMESTAMPTZ | Sim | Data da última alteração |

Entidade isolada, sem chave estrangeira. Diferente de `CredentialReference`, armazena o valor do segredo em texto plano — exceção deliberada e temporária ao princípio de nunca persistir segredo, com pendência de criptografia registrada como TODO no código antes de produção. Usada pela geração de fluxo assistida por IA do Journey Modeler (FT-03 US-03.17).

---

# 20. Glossário Geral

| Conceito | Descrição |
|----------|-----------|
| Product | Produto ou serviço digital |
| Channel Type | Valor de domínio fixo (`WEB`/`MOBILE`/`WHATSAPP`) — não é uma entidade cadastrável |
| Journey | Workflow associado a um produto e a um subconjunto dos tipos de canal desse produto |
| Flow / FlowNode / FlowConnection / FlowAnnotation | Estrutura visual da jornada e suas notas de documentação |
| IntegrationTaskConfig | Configuração de integração e conector de uma Service Task, Receive Task ou Message Start Event |
| ConnectorType | Tipo de conector habilitado ou catalogado como desabilitado |
| UserTaskConfig | Tela embutida (`EmbeddedScreenRoot`) desenhada diretamente no nó de uma User Task |
| ComponentDefinition / SduiNode | Catálogo de componentes SDUI disponíveis (Component Registry) e os nós da árvore de tela que instanciam esses componentes |
| JourneyPublication | Snapshot de uma versão imutável enviado para a API de publicação do runtime |
| MessagingCluster | Cluster/broker de mensageria corporativo cadastrado no catálogo de integrações |
| CredentialReference | Referência a um secret do Azure Key Vault usada por um conector de mensageria |
| AiProviderCredential | Credencial de API de um provedor de IA (Gemini), usada pela geração de fluxo assistida |

> **Nota de revisão (2026-09-05):** linha `Form / FormField` substituída por `ComponentDefinition / SduiNode` e `UserTaskConfig` atualizada — a tela de uma User Task passou a ser uma árvore de `SduiNode` (`EmbeddedScreenRoot`) que referenciam componentes de um catálogo mantido em tabela própria; não existe mais formulário do catálogo como modelo de cópia. Nota de 2026-08-24 mantida abaixo por histórico.

> **Nota de revisão (2026-08-24):** linhas `UserTaskConfig` e `Form / FormField` reescritas — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `FormId`; a tela passou a ser desenhada diretamente no nó (`EmbeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

---

# 21. Resumo

O dicionário descreve a hierarquia Product → Journey (com tipos de canal declarados como atributo em ambos), o versionamento imutável, a identidade mockada e os eventos de auditoria, além dos campos necessários para modelagem visual de workflows, o catálogo SDUI (Component Registry e árvore de nós) e publicação de jornadas multicanal, e do catálogo de integrações (clusters de mensageria e referências de credencial) usado pelos conectores do fluxo.
