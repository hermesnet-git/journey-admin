# Elastic Journey Admin Portal
## Requisitos Funcionais do MVP

### Versão
1.0 (MVP)

---

# 1. Objetivo

Este documento descreve os requisitos funcionais do MVP do Elastic Journey Admin Portal.

O Admin Portal permite cadastrar produtos e seus canais de atendimento, criar jornadas específicas para cada canal, modelar fluxos e formulários, simular jornadas e publicá-las por meio de uma API do runtime.

---

# 2. Escopo do MVP

```text
Gerenciar produtos e canais

Gerenciar jornadas específicas por canal

Modelar fluxos visualmente

Criar formulários

Simular jornadas

Publicar e despublicar jornadas

Enviar jornadas para a API de publicação do runtime

Exibir dashboard administrativo
```

---

# 3. Princípios do MVP

```text
Facilidade de Uso

Produtividade

Reutilização

Qualidade

Simplicidade Operacional

Baixo Acoplamento com o Runtime

Fonte Única de Verdade para Produtos, Canais e Jornadas

Isolamento das Jornadas por Canal

Contrato Padronizado de Erros da API
```

Todas as operações da API devem utilizar uma estrutura comum de erro e documentar, quando aplicáveis, as respostas `400`, `401`, `403`, `404`, `409`, `422` e `500`. Os códigos `401` e `403` ficam reservados para evoluções futuras e não são produzidos enquanto autenticação e autorização estiverem desabilitadas no MVP.

---

# 4. Fora do Escopo

```text
Workflow de Aprovação

Versionamento

Publicação Agendada

Rollback

Promotion Between Environments

Autenticação

RBAC

Auditoria

Analytics

IA Assistida

Gestão de Tenants

Governança Corporativa
```

---

# 5. Modelo Funcional de Produtos, Canais e Jornadas

## Product

Representa um produto ou serviço digital que possui um ou mais pontos de atendimento. Exemplo: `Vivo+`.

## Channel

Representa uma aplicação ou interface de atendimento pertencente a um produto. Exemplos: aplicativo mobile, portal web, WhatsApp, URA e contact center.

## Journey

Representa um workflow específico de um canal. Cada jornada possui fluxo e formulários próprios e pode ser publicada de forma independente.

## Cardinalidades do MVP

```text
Product 1 → 0..N Channel

Channel 1 → 0..N Journey

Journey 1 → 1 Channel
```

Cada canal pertence a exatamente um produto. Cada jornada pertence a exatamente um canal, e seu produto é determinado pelo canal selecionado.

## Exemplo

```text
Produto: Vivo+

Canal: Portal do Cliente (WEB)
Jornada: Questionário de Adesão Web — 10 telas

Canal: Aplicativo Vivo+ (MOBILE)
Jornada: Questionário de Adesão Mobile — 6 telas
```

As jornadas Web e Mobile são independentes. Uma alteração em uma delas não modifica automaticamente a outra.

---

# EP-01 Gestão de Produtos e Canais

## Objetivo

Permitir o gerenciamento dos produtos e dos canais através dos quais suas jornadas serão disponibilizadas.

---

## FT-01.01 Gestão de Produtos

### REQ-01.01.001
O sistema deve permitir cadastrar produtos.

### REQ-01.01.002
O sistema deve permitir editar produtos.

### REQ-01.01.003
O sistema deve permitir consultar produtos.

### REQ-01.01.004
O sistema deve permitir desativar e reativar produtos.

### REQ-01.01.005
Cada produto deve possuir identificador único (`productId`), nome, descrição obrigatória e status.

---

## FT-01.02 Gestão de Canais

### REQ-01.02.001
O sistema deve permitir cadastrar canais dentro de um produto.

### REQ-01.02.002
O sistema deve permitir editar canais.

### REQ-01.02.003
O sistema deve permitir consultar canais.

### REQ-01.02.004
O sistema deve permitir desativar e reativar canais.

### REQ-01.02.005
Todo canal deve pertencer a exatamente um produto.

### REQ-01.02.006
Cada canal deve possuir identificador único (`channelId`), nome, descrição obrigatória, tipo e status.

### REQ-01.02.007
O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`.

---

## FT-01.03 Catálogo e Descoberta

### REQ-01.03.001
O sistema deve permitir pesquisar produtos por nome.

### REQ-01.03.002
O sistema deve permitir filtrar produtos por status.

### REQ-01.03.003
O sistema deve permitir listar os canais de um produto.

### REQ-01.03.004
O sistema deve permitir pesquisar canais por nome.

### REQ-01.03.005
O sistema deve permitir filtrar canais por produto, tipo e status.

### REQ-01.03.006
O sistema deve exibir a quantidade de canais associados a cada produto.

### REQ-01.03.007
O sistema deve exibir a quantidade de jornadas associadas a cada canal.

---

## FT-01.04 Integridade e Ciclo de Vida

### REQ-01.04.001
A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes.

### REQ-01.04.002
A desativação de um canal não deve remover suas jornadas ou publicações existentes.

### REQ-01.04.003
O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo.

### REQ-01.04.004
O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa.

### REQ-01.04.005
O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa.

---

# EP-02 Gestão de Jornadas

## Objetivo

Permitir a criação, organização e manutenção de jornadas específicas para os canais de um produto.

---

## FT-02.01 Cadastro de Jornadas

### REQ-02.01.001
O sistema deve permitir criar jornadas.

### REQ-02.01.002
O sistema deve permitir editar jornadas.

### REQ-02.01.003
O sistema deve permitir consultar jornadas.

### REQ-02.01.004
O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas.

### REQ-02.01.005
Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; o sistema deve permitir apenas sua desativação, preservando o registro de publicação.

### REQ-02.01.006
O sistema deve impedir a desativação de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes da desativação.

### REQ-02.01.007
O sistema deve permitir reativar uma jornada inativa, retornando-a ao status `DRAFT`.

---

## FT-02.02 Identificação e Metadados

### REQ-02.02.001
O sistema deve permitir definir nome para a jornada.

### REQ-02.02.002
O sistema deve exigir uma descrição para a jornada.

### REQ-02.02.003
Cada jornada deve possuir identificador único (`journeyId`).

### REQ-02.02.004
O identificador da jornada é gerado pelo sistema e não é editável pelo usuário.

### REQ-02.02.005
Toda jornada deve estar associada a exatamente um canal.

### REQ-02.02.006
O sistema deve identificar o produto da jornada a partir do canal associado.

---

## FT-02.03 Pesquisa

### REQ-02.03.001
O sistema deve permitir pesquisar jornadas por nome.

### REQ-02.03.002
O sistema deve permitir filtrar jornadas por produto.

### REQ-02.03.003
O sistema deve permitir filtrar jornadas por canal.

### REQ-02.03.004
O sistema deve permitir ordenar jornadas por data de criação.

### REQ-02.03.005
O sistema deve permitir ordenar jornadas por data de alteração.

---

## FT-02.04 Dashboard de Jornadas

### REQ-02.04.001
O sistema deve exibir jornadas recentemente alteradas, ordenadas da alteração mais recente para a mais antiga.

### REQ-02.04.002
O sistema deve exibir a quantidade total de jornadas cadastradas.

---

## FT-02.05 Jornadas Específicas por Canal

### REQ-02.05.001
O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.

### REQ-02.05.002
Cada jornada deve possuir definição independente de fluxo e formulários.

### REQ-02.05.003
Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais.

### REQ-02.05.004
O sistema deve exibir o produto e o canal durante toda a edição da jornada.

---

# EP-03 Modelagem Visual

## Objetivo

Permitir a construção visual do fluxo específico de cada jornada.

---

## FT-03.01 Flow Designer

### REQ-03.01.001
O sistema deve suportar eventos de início.

### REQ-03.01.002
O sistema deve suportar eventos de término.

### REQ-03.01.003
O sistema deve suportar User Tasks.

### REQ-03.01.004
Cada fluxo deve possuir exatamente um nó `START` e exatamente um nó `END`.

### REQ-03.01.005
Ao criar uma jornada, o sistema deve iniciar seu fluxo com os nós `START` e `END` conectados.

---

## FT-03.02 Conexões

### REQ-03.02.001
O sistema deve permitir criar conexões entre elementos.

### REQ-03.02.002
O sistema deve permitir remover conexões.

### REQ-03.02.003
O sistema deve permitir editar conexões.

### REQ-03.02.004
O nó `START` não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída.

### REQ-03.02.005
Todos os nós devem pertencer a um caminho contínuo e alcançável entre `START` e `END`.

### REQ-03.02.006
O editor deve impedir ações que produzam uma estrutura incompatível, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que não cumpra as restrições estruturais.

---

## FT-03.03 Navegação

### REQ-03.03.001
O usuário deve visualizar o fluxo completo da jornada.

### REQ-03.03.002
O usuário deve navegar livremente pelo fluxo.

### REQ-03.03.003
O sistema deve destacar o elemento selecionado.

---

## FT-03.04 Experiência de Edição

### REQ-03.04.001
O sistema deve suportar drag-and-drop de elementos.

### REQ-03.04.002
O usuário deve poder reposicionar elementos livremente.

### REQ-03.04.003
O usuário deve poder remover elementos do fluxo.

### REQ-03.04.004
O usuário deve poder copiar elementos.

### REQ-03.04.005
O usuário deve poder duplicar elementos.

---

## FT-03.05 Canvas

### REQ-03.05.001
O sistema deve permitir zoom in.

### REQ-03.05.002
O sistema deve permitir zoom out.

### REQ-03.05.003
O sistema deve permitir mover-se livremente pelo canvas.

### REQ-03.05.004
O sistema deve permitir centralizar o fluxo na área visível.

---

## FT-03.06 Produtividade

### REQ-03.06.001
O sistema deve permitir desfazer ações.

### REQ-03.06.002
O sistema deve permitir refazer ações.

---

# EP-04 Formulários (SDUI)

## Objetivo

Permitir a criação de formulários utilizados pelas User Tasks.

---

## FT-04.01 Form Builder

### REQ-04.01.001
O sistema deve permitir criar formulários.

### REQ-04.01.002
O sistema deve permitir editar formulários.

### REQ-04.01.003
O sistema deve permitir remover formulários.

### REQ-04.01.004
O sistema deve permitir associar formulários a User Tasks.

### REQ-04.01.005
O sistema deve permitir manter uma User Task sem formulário associado.

---

## FT-04.02 Componentes

### REQ-04.02.001
O sistema deve suportar componente de texto.

### REQ-04.02.002
O sistema deve suportar campo de entrada.

### REQ-04.02.003
O sistema deve suportar seleção simples.

### REQ-04.02.004
O sistema deve suportar seleção múltipla.

### REQ-04.02.005
O sistema deve suportar upload de arquivo.

### REQ-04.02.006
O sistema deve suportar conteúdo estático.

---

## FT-04.03 Reutilização

### REQ-04.03.001
O sistema deve permitir reutilizar formulários em múltiplas jornadas.

### REQ-04.03.002
O sistema deve permitir reutilizar formulários em múltiplas User Tasks.

---

## FT-04.04 Configuração

### REQ-04.04.001
O usuário deve poder definir campos obrigatórios.

### REQ-04.04.002
O usuário deve poder definir valores padrão.

### REQ-04.04.003
O usuário deve poder definir textos de ajuda.

## FT-04.05 Preview

### REQ-04.05.001
O sistema deve permitir visualizar o formulário durante a edição.

### REQ-04.05.002
O preview deve refletir alterações em tempo real.

---

# EP-05 Simulação

## Objetivo

Permitir a verificação do caminho e das telas de uma jornada sem publicá-la.

---

## FT-05.01 Execução

### REQ-05.01.001
O sistema deve permitir executar simulações.

### REQ-05.01.002
O sistema deve permitir informar dados de entrada para os formulários simulados.

### REQ-05.01.003
O sistema deve permitir reiniciar simulações.

### REQ-05.01.004
Antes de registrar um passo da simulação, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução.

---

## FT-05.02 Resultado

### REQ-05.02.001
O sistema deve apresentar o caminho percorrido.

### REQ-05.02.002
O sistema deve apresentar as User Tasks executadas.

### REQ-05.02.003
O sistema deve apresentar os formulários exibidos.

### REQ-05.02.004
O sistema deve apresentar o resultado final da simulação.

---

## FT-05.03 Visualização da Execução

### REQ-05.03.001
O sistema deve destacar o caminho percorrido durante a simulação.

### REQ-05.03.002
O sistema deve destacar as User Tasks e os formulários executados.

---

# EP-06 Publicação

## Objetivo

Publicar a definição atual de uma jornada por meio da API de publicação do runtime.

---

## FT-06.01 Publicação de Jornadas

### REQ-06.01.001
O sistema deve permitir publicar jornadas.

### REQ-06.01.002
O sistema deve permitir despublicar jornadas por meio da API do runtime.

### REQ-06.01.003
O sistema deve permitir consultar jornadas publicadas.

### REQ-06.01.004
Cada jornada deve possuir no máximo uma publicação. Alterações realizadas após a publicação não devem modificar automaticamente o snapshot publicado; para disponibilizá-las, o usuário deve publicar novamente, substituindo integralmente o snapshot anterior.

---

## FT-06.02 Estado da Publicação

### REQ-06.02.001
O sistema deve indicar se uma jornada está publicada.

### REQ-06.02.002
O sistema deve indicar a data da publicação.

### REQ-06.02.003
O sistema deve indicar o produto associado à publicação.

### REQ-06.02.004
O sistema deve indicar o canal associado à publicação.

---

## FT-06.03 Catálogo de Publicações

### REQ-06.03.001
O sistema deve permitir listar jornadas publicadas.

### REQ-06.03.002
O sistema deve permitir pesquisar jornadas publicadas.

### REQ-06.03.003
O sistema deve permitir filtrar jornadas publicadas por produto.

### REQ-06.03.004
O sistema deve permitir filtrar jornadas publicadas por canal.

---

# EP-07 Publicação no Runtime

## Objetivo

Enviar o snapshot da jornada para uma API de publicação do runtime, sem expor operações do Admin Portal para consulta pelo ms-journey.

---

## FT-07.01 Chamadas de Publicação e Despublicação

### REQ-07.01.001
O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime.

### REQ-07.01.002
A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários.

### REQ-07.01.003
No MVP, a API de publicação do runtime deve ser representada por um mock. Após o retorno de sucesso do mock, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`.

### REQ-07.01.004
Ao despublicar no MVP, o Admin Portal deve chamar a API mockada do runtime. Após o retorno de sucesso, a jornada e sua publicação devem assumir o estado `UNPUBLISHED`; em caso de falha, os estados atuais devem ser preservados.

---

# EP-08 Dashboard Administrativo

## Objetivo

Fornecer visão consolidada dos ativos administrados pela plataforma.

---

## FT-08.01 Indicadores Gerais

### REQ-08.01.001
O sistema deve exibir a quantidade de produtos cadastrados.

### REQ-08.01.002
O sistema deve exibir a quantidade de canais cadastrados.

### REQ-08.01.003
O sistema deve exibir a quantidade de jornadas cadastradas.

### REQ-08.01.004
O sistema deve exibir a quantidade de formulários cadastrados.

### REQ-08.01.005
O sistema deve exibir a quantidade de jornadas publicadas.

---

# Futuras Evoluções

## Produtividade Avançada

```text
Criação rápida de elementos

Seleção múltipla

Duplicação em massa

Criação automática de próximos passos
```

## Reutilização

```text
Clonagem de jornadas entre canais

Templates de jornadas

Biblioteca de componentes de formulário
```

## Simulação Avançada

```text
Debug completo por etapa

Visualização dos dados de formulário por etapa
```

## Formulários Avançados

```text
Seções

Exibição condicional

Organização dinâmica de campos
```

## Evolução de Plataforma

```text
Versionamento

Governança

Workflow de Aprovação

Rollback

Promotion Between Environments

Autenticação

RBAC

Auditoria

Analytics

IA Assistida
```

---

# Resumo do MVP

O MVP do Elastic Journey Admin Portal permite cadastrar produtos e canais, construir jornadas independentes para cada canal, modelar fluxos e formulários, simular jornadas e publicar suas definições por meio de uma chamada mockada para a futura API de publicação do runtime.
