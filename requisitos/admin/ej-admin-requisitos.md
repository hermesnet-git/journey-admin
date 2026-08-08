# Elastic Journey Admin Portal
## Requisitos Funcionais do MVP

### Versão
1.0 (MVP)

---

# 1. Objetivo

Este documento descreve os requisitos funcionais do MVP do Elastic Journey
Admin Portal.

O Admin Portal permite cadastrar produtos e seus canais de atendimento, criar,
modelar e versionar jornadas específicas para cada canal, configurar
formulários, simular jornadas, controlar o acesso por autenticação mockada,
registrar auditoria e publicar versões por meio de uma API do runtime.

---

# 2. Escopo do MVP

Escopo adicional do MVP: versionamento de jornadas, autenticação por provedor
externo mockado, autorização pelos papéis `ADMIN`, `EDITOR` e `VIEWER`, e
auditoria de operações relevantes sem armazenamento de dados sensíveis.

O MVP do Elastic Journey Admin Portal permite cadastrar produtos e canais,
construir jornadas independentes para cada canal, modelar fluxos e
formulários, criar e consultar versões, simular jornadas, autenticar usuários
por provedor externo mockado, aplicar papéis, registrar auditoria e publicar
versões por meio de uma chamada mockada para a futura API de publicação do
runtime.

```text
Gerenciar produtos e canais

Gerenciar jornadas

Modelar fluxos visualmente

Criar formulários

Simular jornadas

Publicar e despublicar jornadas

Enviar jornadas para a API de publicação do runtime
```

---

# 3. Princípios do MVP

```text
Facilidade de Uso, Produtividade, Reutilização

Qualidade

Simplicidade Operacional

Baixo Acoplamento com o Runtime

Fonte Única de Verdade para Produtos, Canais e Jornadas

Isolamento das Jornadas por Canal

Contrato Padronizado de Erros da API
```

Todas as operações da API devem utilizar uma estrutura comum de erro e
documentar, quando aplicáveis, as respostas `400`, `401`, `403`, `404`, `409`,
`422` e `500`. Com a autenticação e autorização mockadas do MVP, `401` deve
representar identidade ausente ou inválida e `403` deve representar identidade
sem permissão para a operação.

Falha de rede (ex.: backend indisponível durante um restart) não deve
derrubar a sessão nem redirecionar o usuário para o login: o cliente HTTP do
frontend deve tentar novamente a chamada algumas vezes antes de reportar erro,
e a tela deve exibir uma mensagem de erro amigável em vez de forçar refresh.


</br> </br>

# 4. Modelo Funcional de Produtos, Canais e Jornadas

```text
PRODUTO  -> Representa um produto ou serviço digital que possui um ou mais
pontos de atendimento. Exemplo: `Vivo+`
```
```text
CANAL -> Representa uma aplicação ou interface de atendimento pertencente a um
produto. Exemplos: aplicativo mobile, portal web, WhatsApp, URA e contact
center.
```
```text
JORNADA - Representa um workflow específico de um canal. Cada jornada possui
fluxo e formulários próprios e pode ser publicada de forma independente.
```

## Cardinalidades do MVP

```text
Product 1 → 0..N Channel

Channel 1 → 0..N Journey

Journey 1 → 1 Channel
```

Cada canal pertence a exatamente um produto. Cada jornada pertence a
exatamente um canal, e seu produto é determinado pelo canal selecionado.

## Exemplo

```text
Produto: Vivo+

Canal: Portal do Cliente (WEB) Jornada: Questionário de Adesão Web — 10 telas

Canal: Aplicativo Vivo+ (MOBILE) Jornada: Questionário de Adesão Mobile — 6
telas
```

As jornadas Web e Mobile são independentes. Uma alteração em uma delas não
modifica automaticamente a outra.

<br/>

# EP-01 Gestão de Produtos e Canais

## Objetivo

Permitir o gerenciamento dos produtos e dos canais através dos quais suas
jornadas serão disponibilizadas.



### FT-01.01 Gestão de produtos

#### REQ-01.01.001 - O sistema deve permitir cadastrar produtos.
#### REQ-01.01.002 - O sistema deve permitir editar produtos.
#### REQ-01.01.003 - O sistema deve permitir consultar produtos.
#### REQ-01.01.004 - O sistema deve permitir desativar e reativar produtos.
#### REQ-01.01.005 - Cada produto deve possuir identificador único (`productId`), nome, descrição obrigatória e status.

### FT-01.02 Gestão de canais
#### REQ-01.02.001 - O sistema deve permitir cadastrar canais dentro de um produto.
#### REQ-01.02.002 - O sistema deve permitir editar canais.
#### REQ-01.02.003 - O sistema deve permitir consultar canais.
#### REQ-01.02.004 - O sistema deve permitir desativar e reativar canais.
#### REQ-01.02.005 - Todo canal deve pertencer a exatamente um produto.
#### REQ-01.02.006 - Cada canal deve possuir identificador único (`channelId`), nome, descrição obrigatória, tipo e status.
#### REQ-01.02.007 - O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`.


### FT-01.03 Catálogo e descoberta
#### REQ-01.03.001 - O sistema deve permitir pesquisar produtos por nome.
#### REQ-01.03.002 - O sistema deve permitir filtrar produtos por status.
#### REQ-01.03.003 - O sistema deve permitir listar os canais de um produto.
#### REQ-01.03.004 - O sistema deve permitir pesquisar canais por nome.
#### REQ-01.03.005 - O sistema deve permitir filtrar canais por produto, tipo e status.
#### REQ-01.03.006 - O sistema deve exibir a quantidade de canais associados a cada produto.
#### REQ-01.03.007 - O sistema deve exibir a quantidade de jornadas associadas a cada canal.


### FT-01.04 Integridade e ciclo de vida
#### REQ-01.04.001 - A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes.
#### REQ-01.04.002 - A desativação de um canal não deve remover suas jornadas ou publicações existentes.
#### REQ-01.04.003 - O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo.
#### REQ-01.04.004 - O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa.
#### REQ-01.04.005 - O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa.

<br/>

# EP-02 Gestão de Jornadas

## Objetivo

Permitir a criação, organização e manutenção de jornadas específicas para os
canais de um produto.

### FT-02.01 Cadastro de jornadas
#### REQ-02.01.001 - O sistema deve permitir criar jornadas.
#### REQ-02.01.002 - O sistema deve permitir editar jornadas.
#### REQ-02.01.003 - O sistema deve permitir consultar jornadas.
#### REQ-02.01.004 - O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas.
#### REQ-02.01.005 - Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; o sistema deve permitir apenas sua desativação, preservando o registro de publicação.
#### REQ-02.01.006 - O sistema deve impedir a desativação de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes da desativação.
#### REQ-02.01.007 - O sistema deve permitir reativar uma jornada inativa, retornando-a ao status `DRAFT`.


### FT-02.02 Identificação e metadados
#### REQ-02.02.001 - O sistema deve permitir definir nome para a jornada.
#### REQ-02.02.002 - O sistema deve exigir uma descrição para a jornada.
#### REQ-02.02.003 - Cada jornada deve possuir identificador único (`journeyId`).
#### REQ-02.02.004 - O identificador da jornada é gerado pelo sistema e não é editável pelo usuário.
#### REQ-02.02.005 - Toda jornada deve estar associada a exatamente um canal.
#### REQ-02.02.006 - O sistema deve identificar o produto da jornada a partir do canal associado.


### FT-02.03 Pesquisa
#### REQ-02.03.001 - O sistema deve permitir pesquisar jornadas por nome.
#### REQ-02.03.002 - O sistema deve permitir filtrar jornadas por produto.
#### REQ-02.03.003 - O sistema deve permitir filtrar jornadas por canal.
#### REQ-02.03.004 - O sistema deve permitir ordenar jornadas por data de criação.
#### REQ-02.03.005 - O sistema deve permitir ordenar jornadas por data de alteração.


Fora do escopo do MVP. Esta capacidade permanece registrada como evoluÃ§Ã£o
futura e nÃ£o faz parte dos requisitos entregÃ¡veis desta versÃ£o.

### FT-02.05 Jornadas específicas por canal
#### REQ-02.05.001 - O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.
#### REQ-02.05.002 - Cada jornada deve possuir definição independente de fluxo e formulários.
#### REQ-02.05.003 - Alterações reali zadas em uma jornada não devem modificar automaticamente jornadas de outros canais.
#### REQ-02.05.004 - O sistema deve exibir o produto e o canal durante toda a edição da jornada.
---

### FT-02.06 Publicação de jornadas
#### REQ-02.06.001 - O sistema deve permitir publicar jornadas.
#### REQ-02.06.002 - O sistema deve permitir despublicar jornadas por meio da API do runtime.
#### REQ-02.06.003 - O sistema deve permitir consultar jornadas publicadas.
#### REQ-02.06.004 - Cada jornada deve possuir no maximo uma publicacao ativa, associada a uma versao imutavel. Alteracoes realizadas apos a publicacao nao devem modificar o snapshot publicado; para disponibiliza-las, o usuario deve publicar uma nova versao.
---

### FT-02.07 Estado da publicação
#### REQ-02.07.001 - O sistema deve indicar se uma jornada esta publicada.
#### REQ-02.07.002 - O sistema deve indicar a data da publicacao.
#### REQ-02.07.003 - O sistema deve indicar o produto associado a publicacao.
#### REQ-02.07.004 - O sistema deve indicar o canal associado a publicacao.
---

### FT-02.08 Catálogo de publicações
#### REQ-02.08.001 - O sistema deve permitir listar jornadas publicadas.
#### REQ-02.08.002 - O sistema deve permitir pesquisar jornadas publicadas.
#### REQ-02.08.003 - O sistema deve permitir filtrar jornadas publicadas por produto.
#### REQ-02.08.004 - O sistema deve permitir filtrar jornadas publicadas por canal.
---

### FT-02.09 Publicação no runtime
#### REQ-02.09.001 - O Admin Portal deve iniciar a publicacao por meio de uma chamada de saida para a API de publicacao do runtime.
#### REQ-02.09.002 - A chamada deve enviar a definicao completa da jornada, incluindo produto, canal, fluxo e formularios.
#### REQ-02.09.003 - No MVP, a API de publicacao do runtime deve ser representada por um mock. Apos o retorno de sucesso do mock, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`.
#### REQ-02.09.004 - Ao despublicar no MVP, o Admin Portal deve chamar a API mockada do runtime. Apos o retorno de sucesso, a jornada e sua publicacao devem assumir o estado `UNPUBLISHED`; em caso de falha, os estados atuais devem ser preservados.
---

<br/>

# EP-03 Modelagem Visual

## Objetivo

Permitir a construção visual do fluxo específico de cada jornada.

---

### FT-03.01 Flow designer
#### REQ-03.01.001 - O sistema deve suportar eventos de início, incluindo `START` e `MESSAGE_START_EVENT`.
#### REQ-03.01.002 - O sistema deve suportar eventos de término.
#### REQ-03.01.003 - O sistema deve suportar User Tasks, Service Tasks e Receive Tasks.
#### REQ-03.01.004 - Cada fluxo deve possuir exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e exatamente um nó `END`.
#### REQ-03.01.005 - Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o elemento inicial `START`, cabendo ao usuário adicionar o nó `END` e os demais elementos antes de salvar.
---

### FT-03.02 Conexões
#### REQ-03.02.001 - O sistema deve permitir criar conexões entre elementos.
#### REQ-03.02.002 - O sistema deve permitir remover conexões.
#### REQ-03.02.003 - O sistema deve permitir editar conexões.
#### REQ-03.02.004 - O elemento inicial não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK`, `SERVICE_TASK` e `RECEIVE_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída.
#### REQ-03.02.005 - Todos os nós devem pertencer a um caminho contínuo e alcançável entre o elemento inicial e `END`.
#### REQ-03.02.006 - O editor deve impedir ações que produ zam uma estrutura incompatível, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que não cumpra as restrições estruturais.
#### REQ-03.02.007 - Uma `USER_TASK` deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma `USER_TASK` que já possua saída.
---

### FT-03.03 Navegação
#### REQ-03.03.001 - O usuário deve visuali zar o fluxo completo da jornada.
#### REQ-03.03.002 - O usuário deve navegar livremente pelo fluxo.
#### REQ-03.03.003 - O sistema deve destacar o elemento selecionado.
---

### FT-03.04 Experiência de Edição
#### REQ-03.04.001 - O sistema deve suportar drag-and-drop de elementos.
#### REQ-03.04.002 - O usuário deve poder reposicionar elementos livremente.
#### REQ-03.04.003 - O usuário deve poder remover elementos do fluxo.
#### REQ-03.04.004 - O usuário deve poder copiar elementos.
#### REQ-03.04.005 - O usuário deve poder duplicar elementos.
---

### FT-03.05 Canvas
#### REQ-03.05.001 - O sistema deve permitir zoom in.
#### REQ-03.05.002 - O sistema deve permitir zoom out.
#### REQ-03.05.003 - O sistema deve permitir mover-se livremente pelo canvas.
#### REQ-03.05.004 - O sistema deve permitir centralizar o fluxo na área visível.
---

### FT-03.06 Produtividade
#### REQ-03.06.001 - O sistema deve permitir desfa zer ações.
#### REQ-03.06.002 - O sistema deve permitir refazer ações.
---

### FT-03.07 Elementos de integração
#### REQ-03.07.001 - O sistema deve suportar nós de integração `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`.
#### REQ-03.07.002 - Uma `SERVICE_TASK` deve representar a execução de uma integração externa durante a jornada.
#### REQ-03.07.003 - Uma `RECEIVE_TASK` deve representar a espera por uma mensagem externa em uma instância de jornada já iniciada.
#### REQ-03.07.004 - Uma `MESSAGE_START_EVENT` deve permitir iniciar uma nova instância de jornada a partir de uma mensagem externa.
#### REQ-03.07.005 - O fluxo deve possuir exatamente um elemento inicial, que pode ser `START` ou `MESSAGE_START_EVENT`.
#### REQ-03.07.006 - O sistema deve permitir editar, mover, remover, copiar e duplicar elementos de integração, respeitando as regras de unicidade do elemento inicial.
---

### FT-03.08 Framework de conectores
#### REQ-03.08.001 - O sistema deve representar a integração por meio de um framework conceitual de conectores.
#### REQ-03.08.002 - O framework deve permitir associar um conector a uma `SERVICE_TASK`, `RECEIVE_TASK` ou `MESSAGE_START_EVENT`, respeitando quais conectores são válidos para cada tipo (REQ-03.09.007).
#### REQ-03.08.003 - O catálogo deve possuir os conectores `REST` e `KAFKA` habilitados para uso no MVP.
#### REQ-03.08.004 - O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos.
#### REQ-03.08.005 - O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível.
---

### FT-03.09 Configuração REST e Kafka
#### REQ-03.09.001 - O sistema deve permitir configurar `REST` em `SERVICE_TASK` e `RECEIVE_TASK`.
#### REQ-03.09.002 - A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body, mapeamento de entrada e mapeamento de saída.
#### REQ-03.09.003 - O sistema deve permitir configurar `KAFKA` em `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`.
#### REQ-03.09.004 - A configuração Kafka deve suportar tópico, operação, headers, payload, mapeamento de entrada e mapeamento de saída. Kafka não possui o conceito de fila; a unidade de endereçamento é sempre o tópico.
#### REQ-03.09.005 - Configurações de integração devem suportar referência de credencial sem armazenar secrets diretamente no fluxo ou no snapshot.
#### REQ-03.09.006 - O snapshot publicado deve incluir o tipo do elemento, o conector, a configuração declarativa e os mapeamentos necessários para execução pelo runtime.
#### REQ-03.09.007 - `REST` não é um conector válido para `MESSAGE_START_EVENT`: a configuração REST representa uma chamada de saída (método e URL a serem chamados), e o elemento inicia o fluxo a partir de uma mensagem recebida, nunca chamando algo externamente. `MESSAGE_START_EVENT` deve suportar apenas `KAFKA`.
#### REQ-03.09.008 - A operação Kafka é determinada pelo tipo de nó, não é uma escolha livre do usuário: `SERVICE_TASK` deve usar `PRODUCE` (publica um evento como efeito da tarefa); `RECEIVE_TASK` e `MESSAGE_START_EVENT` devem usar `CONSUME` (aguardam uma mensagem chegar).
#### REQ-03.09.009 - Headers (REST e Kafka) devem ser editados como uma lista de pares nome/valor (com opção de adicionar e remover pares), e não como texto declarativo livre — diferente de parâmetros, body, payload e mapeamentos de entrada/saída, cujo formato ainda não é padronizado e por isso permanecem como configuração declarativa livre.


<br/><br/>

# EP-04 Formulários (SDUI)

## Objetivo

Permitir a criação de formulários utilizados pelas User Tasks.

---

### FT-04.01 Form builder
#### REQ-04.01.001 - O sistema deve permitir criar formulários.
#### REQ-04.01.002 - O sistema deve permitir editar formulários.
#### REQ-04.01.003 - O sistema deve permitir remover formulários.
#### REQ-04.01.004 - O sistema deve permitir associar formulários a User Tasks.
#### REQ-04.01.005 - O sistema deve permitir manter uma User Task sem formulário associado.
#### REQ-04.01.006 - Ao associar um formulário a uma User Task no editor de fluxo, o sistema deve permitir criar um novo formulário sem sair do editor, sendo levado à tela de criação, e deve permitir atualizar a lista de formulários disponíveis para refletir formulários criados nesse meio-tempo.
---

### FT-04.02 Componentes
#### REQ-04.02.001 - O sistema deve suportar componente de texto.
#### REQ-04.02.002 - O sistema deve suportar campo de entrada.
#### REQ-04.02.003 - O sistema deve suportar seleção simples.
#### REQ-04.02.004 - O sistema deve suportar seleção múltipla.
#### REQ-04.02.005 - O sistema deve suportar upload de arquivo.
#### REQ-04.02.006 - O sistema deve suportar conteúdo estático.
---

### FT-04.03 Reutilização
#### REQ-04.03.001 - O sistema deve permitir reutili zar formulários em múltiplas jornadas.
#### REQ-04.03.002 - O sistema deve permitir reutilizar formulários em múltiplas User Tasks.
---

### FT-04.04 Configuração
#### REQ-04.04.001 - O usuário deve poder definir campos obrigatórios.
#### REQ-04.04.002 - O usuário deve poder definir valores padrão.
#### REQ-04.04.003 - O usuário deve poder definir textos de ajuda.
### FT-04.05 Preview
#### REQ-04.05.001 - O sistema deve permitir visuali zar o formulário durante a edição.
#### REQ-04.05.002 - O preview deve refletir alterações em tempo real.
---

<br/>

# EP-05 Simulação

## Objetivo

Permitir a verificação do caminho e das telas de uma jornada sem publicá-la.

### FT-05.01 Execução
#### REQ-05.01.001 - O sistema deve permitir executar simulações.
#### REQ-05.01.002 - O sistema deve permitir informar dados de entrada para os formulários simulados.
#### REQ-05.01.003 - O sistema deve permitir reiniciar simulações.
#### REQ-05.01.004 - Antes de registrar um passo da simulação, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução.
---

### FT-05.02 Resultado
#### REQ-05.02.001 - O sistema deve apresentar o caminho percorrido.
#### REQ-05.02.002 - O sistema deve apresentar as User Tasks executadas.
#### REQ-05.02.003 - O sistema deve apresentar os formulários exibidos.
#### REQ-05.02.004 - O sistema deve apresentar o resultado final da simulação.
---

### FT-05.03 Visualização da execução
#### REQ-05.03.001 - O sistema deve destacar o caminho percorrido durante a simulação.
#### REQ-05.03.002 - O sistema deve destacar as User Tasks e os formulários executados.
---

<br/><br/>

# 4.1 EP-06 Versionamento de jornadas

### FT-06.01 Modelo de versões
#### REQ-06.01.001 - O sistema deve permitir que uma jornada possua múltiplas versões.
#### REQ-06.01.002 - Cada versão deve possuir identificador único (`versionId`).
#### REQ-06.01.003 - Cada versão deve possuir número sequencial iniciado em `1` dentro da jornada.
#### REQ-06.01.004 - Cada versão deve estar associada a exatamente uma jornada.
#### REQ-06.01.005 - Cada versão deve possuir status `DRAFT`, `PUBLISHED` ou `ARCHIVED`.
#### REQ-06.01.006 - Uma jornada deve possuir no máximo uma versão `PUBLISHED`.
#### REQ-06.01.007 - Cada versão deve registrar criação e publicação, quando aplicável.
#### REQ-06.01.008 - Cada versão deve permitir observação opcional.

### FT-06.02 Criação e edição de versões
#### REQ-06.02.001 - Ao criar uma jornada, o sistema deve criar sua primeira versão em `DRAFT`.
#### REQ-06.02.002 - O sistema deve permitir criar uma nova versão a partir da versão atual.
#### REQ-06.02.003 - O sistema deve criar a nova versão a partir da versão atualmente selecionada para edição.
#### REQ-06.02.004 - A nova versão deve possuir cópia independente do fluxo, conexões e referências aos formulários.
#### REQ-06.02.005 - Alterações em uma versão `DRAFT` não devem modificar outras versões.
#### REQ-06.02.006 - Uma versão `PUBLISHED` deve ser imutável.
#### REQ-06.02.007 - O sistema deve indicar claramente qual versão está sendo editada.
#### REQ-06.02.008 - O sistema deve impedir números de versão duplicados dentro da mesma jornada.

### FT-06.03 Histórico e consulta
#### REQ-06.03.001 - O sistema deve permitir listar todas as versões de uma jornada.
#### REQ-06.03.002 - O sistema deve permitir consultar o conteúdo completo de uma versão.
#### REQ-06.03.003 - O histórico deve exibir número, status, datas e autor da versão.
#### REQ-06.03.004 - O sistema deve permitir ordenar versões por número ou data.
#### REQ-06.03.005 - O sistema deve diferenciar versões em edição, publicadas e arquivadas.
#### REQ-06.03.006 - O sistema deve permitir visualizar uma versão anterior sem editá-la diretamente.

### FT-06.04 Publicação de versões
#### REQ-06.04.001 - O sistema deve permitir publicar uma versão `DRAFT`.
#### REQ-06.04.002 - Antes da publicação, o sistema deve validar a versão completa da jornada.
#### REQ-06.04.003 - A publicação deve enviar ao runtime o snapshot completo da versão selecionada.
#### REQ-06.04.004 - Ao publicar uma nova versão, a versão anteriormente publicada deve ser marcada como `ARCHIVED`.
#### REQ-06.04.005 - O sistema deve preservar o snapshot da versão anteriormente publicada.
#### REQ-06.04.006 - A publicação deve registrar qual versão foi enviada ao runtime.
#### REQ-06.04.007 - A jornada deve indicar sua versão atualmente publicada.
#### REQ-06.04.008 - Alterações em `DRAFT` não devem modificar o snapshot publicado.

### FT-06.05 Compatibilidade e limites do MVP
#### REQ-06.05.001 - O sistema deve preservar versões de jornadas desativadas.
#### REQ-06.05.002 - Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual.
#### REQ-06.05.003 - O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação.
#### REQ-06.05.004 - O sistema não deve permitir restauração ou rollback de versão no MVP.
#### REQ-06.05.005 - O sistema deve registrar a versão associada a cada publicação.

# 4.2 EP-07 Autenticação e autorização

### FT-07.01 Autenticação mockada por provedor externo
#### REQ-07.01.001 - O sistema deve representar a autenticação por meio de um provedor externo.
#### REQ-07.01.002 - No MVP, a integração com o provedor externo deve ser mockada.
#### REQ-07.01.003 - O sistema deve disponibilizar uma tela de login padrão.
#### REQ-07.01.004 - A tela de login deve permitir informar usuário e senha.
#### REQ-07.01.005 - O MVP deve disponibilizar o usuário mockado `admin`, com senha `admin` e perfil `ADMIN`.
#### REQ-07.01.006 - O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas.
#### REQ-07.01.007 - O sistema deve indicar que a autenticação utilizada no MVP é mockada e não representa integração real com um provedor.

### FT-07.02 Sessão e proteção de acesso
#### REQ-07.02.001 - O sistema deve criar uma sessão autenticada após login bem-sucedido.
#### REQ-07.02.002 - O sistema deve permitir encerrar a sessão.
#### REQ-07.02.003 - O sistema deve expirar sessões após período configurável de inatividade.
#### REQ-07.02.004 - O sistema deve rejeitar requisições com sessão expirada ou inválida.
#### REQ-07.02.005 - As rotas administrativas devem ser protegidas contra acesso anônimo.
#### REQ-07.02.006 - O sistema deve preservar a identificação do usuário autenticado nas operações realizadas.

### FT-07.03 Papéis e permissões
#### REQ-07.03.001 - O sistema deve suportar os papéis `ADMIN`, `EDITOR` e `VIEWER`.
#### REQ-07.03.002 - O sistema deve permitir associar um papel a cada usuário.
#### REQ-07.03.003 - O sistema deve impedir operações não autorizadas pelo papel do usuário.
#### REQ-07.03.004 - `VIEWER` deve permitir consulta sem permitir alterações.
#### REQ-07.03.005 - `EDITOR` deve permitir criar e editar jornadas e versões.
#### REQ-07.03.006 - `EDITOR` deve permitir publicar versões.
#### REQ-07.03.007 - `ADMIN` deve possuir acesso administrativo aos recursos do portal.
#### REQ-07.03.008 - A autorização deve ser validada no backend, independentemente da interface.

### FT-07.04 Administração de usuários mockados
#### REQ-07.04.001 - O sistema deve representar no MVP o usuário `admin` como usuário administrativo mockado.
#### REQ-07.04.002 - O sistema deve impedir a remoção do último usuário com papel `ADMIN`.
#### REQ-07.04.003 - O sistema deve permitir consultar o usuário autenticado e seu papel.
#### REQ-07.04.004 - O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora do MVP.

# 4.3 EP-08 Auditoria

### FT-08.01 Registro de eventos
#### REQ-08.01.001 - O sistema deve registrar eventos relevantes de autenticação, autorização e negócio.
#### REQ-08.01.002 - Cada evento deve possuir identificador único (`auditEventId`).
#### REQ-08.01.003 - Cada evento deve registrar data e hora, ação, resultado e recurso afetado.
#### REQ-08.01.004 - Cada evento deve registrar o usuário responsável ou indicar que foi anônimo.
#### REQ-08.01.005 - Cada evento deve registrar identificador de correlação da requisição, quando disponível.
#### REQ-08.01.006 - O sistema deve registrar eventos de sucesso, falha e acesso negado.

### FT-08.02 Eventos auditáveis
#### REQ-08.02.001 - O sistema deve auditar login bem-sucedido e malsucedido.
#### REQ-08.02.002 - O sistema deve auditar logout, expiração e bloqueio de sessão.
#### REQ-08.02.003 - O sistema deve auditar criação, alteração e desativação de produtos, canais e jornadas.
#### REQ-08.02.004 - O sistema deve auditar criação e alteração de versões.
#### REQ-08.02.005 - O sistema deve auditar publicação, republicação e despublicação de jornadas.
#### REQ-08.02.006 - O sistema deve auditar tentativas de acesso negadas por falta de permissão.
#### REQ-08.02.007 - O sistema deve auditar alterações de papéis e configurações de acesso mockadas.

### FT-08.03 Proteção dos registros
#### REQ-08.03.001 - Os registros de auditoria não devem ser editáveis por usuários comuns.
#### REQ-08.03.002 - Os registros de auditoria não devem ser removidos por operações normais do sistema.
#### REQ-08.03.003 - O sistema não deve armazenar senhas, tokens, segredos ou credenciais sensíveis nos registros.
#### REQ-08.03.004 - O sistema deve evitar o armazenamento de dados sensíveis nos valores anterior e posterior.
#### REQ-08.03.005 - Falhas de auditoria não podem ser ignoradas silenciosamente.

### FT-08.04 Consulta de auditoria
#### REQ-08.04.001 - Usuários autorizados devem poder consultar eventos de auditoria.
#### REQ-08.04.002 - O sistema deve permitir filtrar eventos por usuário, ação, recurso, resultado e período.
#### REQ-08.04.003 - O sistema deve permitir pesquisar eventos por recurso ou correlação.
#### REQ-08.04.004 - O sistema deve apresentar os eventos em ordem cronológica e com paginação.

# 4.4 EP-09 Ajuda e Suporte

## Objetivo

Fornecer aos usuários do Admin Portal orientação sobre o uso do sistema por
meio de perguntas frequentes e um canal direto de contato com o time de
sustentação.

### FT-09.01 Central de ajuda
#### REQ-09.01.001 - O sistema deve disponibilizar uma tela de ajuda acessível a partir do menu do Admin Portal.
#### REQ-09.01.002 - A tela de ajuda deve apresentar um conjunto de perguntas frequentes (FAQ) organizadas por tema.
#### REQ-09.01.003 - O sistema deve permitir pesquisar textualmente o conteúdo do FAQ.
#### REQ-09.01.004 - O conteúdo do FAQ deve ser mantido como conteúdo estático versionado com o sistema.
#### REQ-09.01.005 - A tela de ajuda deve exibir o contato do time de sustentação (`sustentacao@telefonica.com`) como link `mailto:`, abrindo o cliente de e-mail padrão do usuário.

<br/><br/>

# 5. Fora do Escopo do MVP 

## Evolução de Plataforma
```text
Workflow de Aprovação

Publicação Agendada

Rollback

Promotion Between Environments

Analytics

IA Assistida

Gestão de Tenants

Governança Corporativa
```
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
