# Elastic Journey Admin Portal
## Índice da Documentação

### Versão
1.0 (MVP)

---

# 1. Introdução

O Elastic Journey Admin Portal é uma aplicação composta por frontend e backend para cadastro de produtos e canais, criação visual de jornadas específicas por canal, configuração de formulários, simulação e publicação por meio de uma API do runtime.

---

# 2. Objetivo do Produto

```text
Gestão de Produtos

Gestão de Canais

Gestão de Jornadas por Canal

Modelagem Visual de Fluxos

Formulários

Simulação

Publicação de Jornadas

Publicação no Runtime
```

---

# 3. Papel do Admin Portal na Plataforma

```text
Elastic Journey Admin Portal
        ↓ chamada outbound
API de Publicação do Runtime (mock no MVP)
```

## Elastic Journey Admin Portal

Responsável por cadastrar produtos e canais e por criar, modelar, simular e publicar jornadas específicas para cada canal. Produz uma **Journey Publication** e inicia sua publicação por uma chamada outbound.

## API de Publicação do Runtime

Fronteira externa responsável por receber o snapshot enviado pelo Admin Portal. Seu contrato definitivo ainda será definido; no MVP, a chamada é atendida por um mock. O ms-journey não consulta nem conhece o domínio do Admin Portal.

---

# 4. Escopo do MVP

```text
Gestão de Produtos e Canais

Gestão de Jornadas Específicas por Canal

Modelagem Visual de Fluxos

Gestão de Formulários

Simulação

Publicação de Jornadas

Publicação no Runtime por API mockada

Dashboard Administrativo
```

---

# 5. Fora do Escopo

```text
Governança

Versionamento

Rollback

Promotion Between Environments

RBAC

Autenticação

Auditoria

Analytics

IA Assistida

Workflow de Aprovação

Gestão de Tenants
```

---

# 6. Principais Conceitos

## Product

Produto ou serviço digital que agrupa seus canais de atendimento. Exemplo: Vivo+.

## Channel

Aplicação ou interface de atendimento pertencente a um produto. Tipos do MVP: Web, Mobile, WhatsApp, URA, Contact Center e Other.

## Journey

Workflow específico de um canal. Cada jornada pertence a exatamente um canal e possui código, fluxo e formulários próprios.

## Flow

Estrutura visual da jornada: início, User Tasks, término e conexões.

## Form

Formulário utilizado por uma User Task.

## Simulation

Execução simulada do caminho e das telas da jornada.

## Journey Publication

Snapshot atual de uma jornada enviado para a API de publicação do runtime. Cada jornada possui no máximo uma publicação, substituída integralmente quando publicada novamente.

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

**Arquivo:** `ej-admin-requisitos.md` — Escopo funcional completo do MVP, organizado em oito épicos.

## Arquitetura Lógica

**Arquivo:** `ej-admin-arquitetura-logica.md` — Domínios funcionais, responsabilidades e fluxos.

## Modelo de Dados Conceitual

**Arquivo:** `ej-admin-modelo-dados-conceitual.md` — Entidades de negócio e relacionamentos.

## Modelo de Dados Físico

**Arquivo:** `ej-admin-modelo-dados-fisico.md` — Tabelas, chaves, índices e estratégia de persistência.

## Dicionário de Dados

**Arquivo:** `ej-admin-dicionario-dados.md` — Referência semântica das entidades e campos.

## Especificação OpenAPI

**Arquivo:** `ej-admin-openapi.yaml` — Operações e schemas da API do Admin Portal. A API externa de publicação do runtime ainda não possui contrato definitivo e é mockada no MVP.

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
| User Task Configuration | Associação entre uma User Task e seu formulário |
| Form | Formulário utilizado por User Tasks |
| Form Component | Componente visual pertencente a um formulário |
| Simulation Execution | Execução simulada da jornada |
| Simulation Step | Etapa executada durante a simulação |
| Simulation Result | Resultado consolidado da simulação |
| Journey Publication | Snapshot atual enviado para a API de publicação do runtime |

---

# 11. Roadmap Futuro

```text
Produtividade: criação rápida, seleção múltipla e duplicação em massa

Reutilização: clonagem e templates de jornadas entre canais

Governança: versionamento, aprovação, publicação agendada e rollback

Segurança: autenticação, RBAC, auditoria e controle de acesso

Inteligência: analytics, recomendações e IA assistida
```

---

# 12. Glossário

| Termo | Descrição |
|-------|-----------|
| Product | Produto ou serviço digital |
| Channel | Aplicação ou interface de atendimento de um produto |
| Journey | Jornada digital específica de um canal |
| Flow | Fluxo visual |
| User Task | Interação humana realizada durante a jornada |
| Form | Formulário exibido em uma User Task |
| Simulation | Execução simulada |
| Publication | Envio do snapshot atual da jornada para a API de publicação do runtime |
| Runtime | Camada responsável pela execução das jornadas |
| ms-journey | Motor de execução que não conhece nem consulta o Admin Portal |
| BPMN | Modelo executável utilizado pelo motor de workflow |

---

# 13. Resumo Executivo

O Elastic Journey Admin Portal MVP cobre o ciclo de vida de jornadas específicas por canal: cadastro do produto e de seus canais, modelagem do fluxo e dos formulários, simulação e publicação por uma chamada mockada para a futura API de publicação do runtime.
