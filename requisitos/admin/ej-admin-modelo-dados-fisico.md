# Elastic Journey Admin Portal
## Modelo de Dados Físico

### Versão
1.0 (MVP)

---

# 1. Objetivo

Este documento descreve o modelo físico de dados do Elastic Journey Admin Portal para produtos, canais, jornadas, fluxos, formulários, simulação e publicação.

---

# 2. Premissas Técnicas

## Banco de Dados

```text
PostgreSQL
```

## Identificadores

Todas as entidades utilizam `UUID` como chave primária.

## Datas

Datas operacionais utilizam `TIMESTAMPTZ` em UTC.

## Estruturas Dinâmicas

Configurações visuais, dados de simulação e snapshots publicados utilizam `JSONB`.

---

# 3. Estratégia de Persistência

`product` agrupa canais. Cada `channel` pertence a um produto, e cada `journey` pertence a exatamente um canal. O produto de uma jornada é obtido através do canal.

Formulários são ativos reutilizáveis associados às User Tasks por `user_task_config`. A publicação armazena o snapshot da versão imutável enviada para a API de publicação do runtime e preserva versões anteriores.

Os logs técnicos de observabilidade (EP-10) não são persistidos no PostgreSQL — trafegam por `logback` (console no MVP, com ponto de extensão preparado e desativado para ELK) e, por isso, não possuem tabela neste modelo.

---

# 4. Modelo Relacional — Tabelas

```text
product
channel
journey
flow
flow_node
flow_connection
form
form_component
user_task_config
simulation_execution
simulation_step
simulation_result
journey_publication
journey_version
audit_event
```

---

# 5. Tabela Product

```sql
CREATE TABLE product (
    product_id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 6. Tabela Channel

```sql
CREATE TABLE channel (
    channel_id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (
        type IN ('WEB', 'MOBILE', 'WHATSAPP', 'URA', 'CONTACT_CENTER', 'OTHER')
    ),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_channel_product
        FOREIGN KEY (product_id) REFERENCES product(product_id)
);
```

---

# 7. Tabela Journey

```sql
CREATE TABLE journey (
    journey_id UUID PRIMARY KEY,
    channel_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'INACTIVE')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_journey_to_channel
        FOREIGN KEY (channel_id) REFERENCES channel(channel_id)
);
```

---

# 8. Tabela Flow

```sql
CREATE TABLE flow (
    flow_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journey(journey_id)
);
```

---

# 9. Tabela FlowNode

```sql
CREATE TABLE flow_node (
    node_id UUID PRIMARY KEY,
    flow_id UUID NOT NULL,
    node_type VARCHAR(30) NOT NULL CHECK (
        node_type IN ('START', 'END', 'USER_TASK', 'SERVICE_TASK', 'RECEIVE_TASK', 'MESSAGE_START_EVENT')
    ),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    position_x INTEGER,
    position_y INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES flow(flow_id),
    UNIQUE (flow_id, node_id)
);
```

As configurações de integração dos nós `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT` permanecem no documento JSONB do fluxo. A estrutura deve separar propriedades comuns (`connector_type`, `credential_ref`, `input_mapping`, `output_mapping`) das propriedades específicas de `REST` e `KAFKA`, permitindo a inclusão futura de novos conectores sem alteração da tabela `flow_node`.

```json
{
  "nodeType": "SERVICE_TASK",
  "connectorType": "REST",
  "connectorEnabled": true,
  "connectorConfig": {
    "method": "POST",
    "url": "https://example.test/resource",
    "headers": {},
    "query": {},
    "body": {}
  },
  "credentialRef": "runtime-secret-ref",
  "inputMapping": {},
  "outputMapping": {}
}
```

---

# 10. Tabela FlowConnection

```sql
CREATE TABLE flow_connection (
    connection_id UUID PRIMARY KEY,
    flow_id UUID NOT NULL,
    source_node_id UUID NOT NULL,
    target_node_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES flow(flow_id),
    FOREIGN KEY (flow_id, source_node_id) REFERENCES flow_node(flow_id, node_id),
    FOREIGN KEY (flow_id, target_node_id) REFERENCES flow_node(flow_id, node_id),
    UNIQUE (flow_id, source_node_id)
);
```

A restrição `UNIQUE (flow_id, source_node_id)` limita cada origem a uma saída. Antes de persistir o fluxo completo, o backend deve garantir exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`), exatamente um `END`, as cardinalidades de entrada e saída de cada tipo e a existência de um caminho contínuo entre o elemento inicial e `END`.

---

# 11. Tabela Form

```sql
CREATE TABLE form (
    form_id UUID PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 12. Tabela FormComponent

```sql
CREATE TABLE form_component (
    component_id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    component_type VARCHAR(50) NOT NULL CHECK (
        component_type IN ('TEXT', 'INPUT', 'SELECT', 'MULTISELECT', 'UPLOAD', 'CONTENT')
    ),
    label VARCHAR(200),
    help_text TEXT,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    default_value TEXT,
    display_order INTEGER NOT NULL,
    configuration JSONB,
    FOREIGN KEY (form_id) REFERENCES form(form_id),
    UNIQUE (form_id, display_order)
);
```

---

# 13. Tabela UserTaskConfig

```sql
CREATE TABLE user_task_config (
    node_id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    FOREIGN KEY (node_id) REFERENCES flow_node(node_id),
    FOREIGN KEY (form_id) REFERENCES form(form_id)
);
```

`user_task_config` só pode referenciar nós cujo `node_type` seja `USER_TASK`. Essa restrição deve ser garantida por regra de domínio ou trigger.

---

# 14. Tabela SimulationExecution

```sql
CREATE TABLE simulation_execution (
    simulation_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL,
    input_data JSONB,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')
    ),
    FOREIGN KEY (journey_id) REFERENCES journey(journey_id)
);
```

---

# 15. Tabela SimulationStep

```sql
CREATE TABLE simulation_step (
    step_id UUID PRIMARY KEY,
    simulation_id UUID NOT NULL,
    node_id UUID NOT NULL,
    step_order INTEGER NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    result VARCHAR(20) CHECK (result IN ('SUCCESS', 'FAILED', 'SKIPPED')),
    form_data JSONB,
    FOREIGN KEY (simulation_id) REFERENCES simulation_execution(simulation_id),
    FOREIGN KEY (node_id) REFERENCES flow_node(node_id),
    UNIQUE (simulation_id, step_order)
);
```

As chaves estrangeiras garantem a existência da execução e do nó, mas não comparam suas jornadas. Antes da persistência, o serviço de simulação deve confirmar que `flow_node.flow_id → flow.journey_id` corresponde a `simulation_execution.journey_id`.

---

# 16. Tabela SimulationResult

```sql
CREATE TABLE simulation_result (
    result_id UUID PRIMARY KEY,
    simulation_id UUID NOT NULL UNIQUE,
    executed_path JSONB,
    execution_summary JSONB,
    FOREIGN KEY (simulation_id) REFERENCES simulation_execution(simulation_id)
);
```

---

# 17. Tabela JourneyPublication

Atualização do escopo: `journey_publication` representa a publicação ativa e deve possuir `version_id` apontando para a `journey_version` publicada. Versões anteriores não são sobrescritas.

A publicação armazena o snapshot da versão contendo produto, canal, jornada, fluxo e formulários. Existe no máximo uma publicação ativa por jornada; versões anteriores são preservadas.

```sql
CREATE TABLE journey_publication (
    publication_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL UNIQUE,
    version_id UUID NOT NULL,
    publication_status VARCHAR(30) NOT NULL CHECK (
        publication_status IN ('PUBLISHED', 'UNPUBLISHED')
    ),
    publication_date TIMESTAMPTZ,
    unpublished_date TIMESTAMPTZ,
    journey_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journey(journey_id),
    FOREIGN KEY (version_id) REFERENCES journey_version(version_id)
);
```

A chave estrangeira sem `ON DELETE CASCADE` impede a exclusão física de uma jornada que possua ou tenha possuído publicação. Essas jornadas devem ser desativadas por meio de `journey.status = 'INACTIVE'`. A exclusão física é permitida somente quando não existe registro em `journey_publication`.

---

# 18. Tabela JourneyVersion

```sql
CREATE TABLE journey_version (
    version_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    version_status VARCHAR(20) NOT NULL CHECK (
        version_status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')
    ),
    version_snapshot JSONB NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    UNIQUE (journey_id, version_number),
    FOREIGN KEY (journey_id) REFERENCES journey(journey_id)
);
```

Versões publicadas são imutáveis. O MVP não contempla restauração ou rollback. A publicação deve referenciar a versão publicada, preservando versões anteriores.

---

# 19. Tabelas de Identidade e Auditoria

O MVP utiliza provedor externo mockado. O usuário `admin`, com senha `admin` e papel `ADMIN`, pode ser representado por configuração mockada; a senha não deve ser persistida nem auditada.

```sql
CREATE TABLE audit_event (
    audit_event_id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED')),
    correlation_id VARCHAR(100),
    previous_value JSONB,
    new_value JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Registros de auditoria são protegidos contra edição e remoção por operações normais e não podem conter senhas, tokens, secrets ou credenciais.

---

# 20. Chaves Primárias

| Tabela | PK |
|--------|----|
| product | product_id |
| channel | channel_id |
| journey | journey_id |
| flow | flow_id |
| flow_node | node_id |
| flow_connection | connection_id |
| form | form_id |
| form_component | component_id |
| user_task_config | node_id |
| simulation_execution | simulation_id |
| simulation_step | step_id |
| simulation_result | result_id |
| journey_publication | publication_id |
| journey_version | version_id |
| audit_event | audit_event_id |

---

# 21. Chaves Estrangeiras Principais

| Origem | Destino |
|--------|---------|
| channel.product_id | product.product_id |
| journey.channel_id | channel.channel_id |
| flow.journey_id | journey.journey_id |
| flow_node.flow_id | flow.flow_id |
| flow_connection.(flow_id, source_node_id) | flow_node.(flow_id, node_id) |
| flow_connection.(flow_id, target_node_id) | flow_node.(flow_id, node_id) |
| form_component.form_id | form.form_id |
| user_task_config.node_id | flow_node.node_id |
| user_task_config.form_id | form.form_id |
| simulation_execution.journey_id | journey.journey_id |
| simulation_step.simulation_id | simulation_execution.simulation_id |
| simulation_step.node_id | flow_node.node_id |
| simulation_result.simulation_id | simulation_execution.simulation_id |
| journey_publication.journey_id | journey.journey_id |
| journey_version.journey_id | journey.journey_id |
| journey_publication.version_id | journey_version.version_id |

---

# 22. Estratégia de Índices

```sql
CREATE INDEX idx_product_status ON product(status);

CREATE INDEX idx_channel_product ON channel(product_id);
CREATE INDEX idx_channel_type ON channel(type);
CREATE INDEX idx_channel_status ON channel(status);

CREATE INDEX idx_journey_by_channel ON journey(channel_id);
CREATE INDEX idx_journey_name ON journey(name);
CREATE INDEX idx_journey_status ON journey(status);
CREATE INDEX idx_journey_updated_at ON journey(updated_at);

CREATE INDEX idx_flow_node_flow ON flow_node(flow_id);
CREATE INDEX idx_flow_node_type ON flow_node(node_type);

CREATE INDEX idx_flow_connection_flow ON flow_connection(flow_id);

CREATE INDEX idx_form_status ON form(status);
CREATE INDEX idx_form_component_form ON form_component(form_id);
CREATE INDEX idx_user_task_form ON user_task_config(form_id);

CREATE INDEX idx_simulation_journey ON simulation_execution(journey_id);
CREATE INDEX idx_simulation_step_execution ON simulation_step(simulation_id);

CREATE INDEX idx_publication_status ON journey_publication(publication_status);
CREATE INDEX idx_publication_snapshot ON journey_publication USING GIN (journey_snapshot);
CREATE INDEX idx_journey_version_journey ON journey_version(journey_id, version_number);
CREATE INDEX idx_journey_version_status ON journey_version(version_status);
CREATE INDEX idx_audit_event_user ON audit_event(user_id);
CREATE INDEX idx_audit_event_resource ON audit_event(resource_type, resource_id);
CREATE INDEX idx_audit_event_occurred_at ON audit_event(occurred_at);
```

---

# 23. Estratégia de Consulta

```text
Pesquisar produtos e listar seus canais

Pesquisar jornadas por produto e canal

Carregar fluxo e formulários completos

Executar simulações

Consultar publicações por produto e canal no Admin Portal

Consultar versões por jornada

Consultar eventos de auditoria por usuário, recurso, resultado e período
```

---

# 24. Estratégia de Publicação

`journey_publication` mantém o snapshot da versão publicada separado da jornada em edição. A restrição `UNIQUE (journey_id)` garante no máximo uma publicação ativa por jornada. Uma nova publicação deve apontar para uma nova `journey_version` e preservar os snapshots anteriores.

## Conteúdo do Snapshot

```text
Product

Channel

Journey

Flow

Forms
```

## Status de Publicação

```text
PUBLISHED, UNPUBLISHED
```

No MVP, a publicação chama uma API mockada do runtime. Após o retorno de sucesso, o snapshot é persistido e `journey.status` passa a `PUBLISHED`. O contrato definitivo da API externa será definido posteriormente.

A despublicação também chama a API mockada. Após o sucesso, `journey.status` e `journey_publication.publication_status` passam para `UNPUBLISHED`, e `unpublished_date` recebe a data da operação. Em caso de falha, o backend preserva os estados e o snapshot atuais.

Antes de desativar uma jornada, um canal ou um produto, o backend deve consultar `journey_publication` e bloquear a operação quando encontrar uma publicação `PUBLISHED` no escopo afetado. Registros `UNPUBLISHED` são preservados e não impedem a desativação.

---

# 25. Diagrama ER Físico

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
    JOURNEY ||--o{ JOURNEY_VERSION : versions
    JOURNEY_VERSION ||--o| JOURNEY_PUBLICATION : published_as
    USER ||--o{ AUDIT_EVENT : performs
```

---

# 26. Considerações de Evolução

```text
Templates e clonagem entre canais

Workflow de Aprovação

Rollback

Promotion Between Environments
```

---

# 27. Resumo Técnico

O modelo físico estabelece Product → Channel → Journey como hierarquia principal. Cada jornada possui um fluxo, utiliza formulários por meio de User Tasks, registra simulações, possui múltiplas versões e no máximo uma publicação ativa associada à versão imutável publicada. O modelo também contempla o usuário mockado e eventos de auditoria sem dados sensíveis.
