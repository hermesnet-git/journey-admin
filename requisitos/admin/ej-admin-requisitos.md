# Elastic Journey Admin Portal
## Requisitos Funcionais da Versão 1.0.0

### Versão
1.0.0

---

# 1. Objetivo

Este documento descreve os requisitos funcionais da versão 1.0.0 do Elastic Journey
Admin Portal.

O Admin Portal permite cadastrar produtos e seus canais de atendimento, criar,
modelar e versionar jornadas específicas para cada canal, configurar
formulários, executar jornadas, controlar o acesso por autenticação e
autorização mockadas, registrar auditoria, publicar versões por meio de uma
API do runtime, disponibilizar uma central de ajuda e registrar log técnico
de observabilidade (API e transações de persistência).

---

# 2. Escopo da Versão 1.0.0

A versão 1.0.0 do Elastic Journey Admin Portal permite cadastrar produtos e canais,
construir jornadas independentes para cada canal, modelar fluxos e
formulários (inclusive gerando um rascunho de fluxo assistido por IA a partir
de um prompt), criar e consultar versões, executar jornadas, gerenciar um
catálogo de integrações de mensageria e de credencial de IA, acompanhar a
operação por um dashboard, autenticar usuários por provedor externo mockado,
aplicar papéis, registrar auditoria, publicar versões por meio de uma chamada
mockada para a futura API de publicação do runtime, consultar uma central de
ajuda e observar a aplicação por meio de logs técnicos correlacionados.

```text
Gerenciar produtos e canais

Gerenciar jornadas

Modelar fluxos visualmente

Gerar rascunho de fluxo assistido por IA

Criar formulários

Executar jornadas

Versionar jornadas

Gerenciar catálogo de integrações (clusters e credenciais de mensageria, credencial de IA)

Acompanhar a operação por um dashboard

Autenticar e autorizar usuários

Registrar auditoria

Publicar e despublicar jornadas

Enviar jornadas para a API de publicação do runtime

Disponibilizar central de ajuda e suporte

Registrar log técnico de observabilidade
```

---

# 3. Princípios da Versão 1.0.0

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
`422` e `500`. Com a autenticação e autorização mockadas da versão 1.0.0, `401` deve
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

## Cardinalidades da Versão 1.0.0

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

# FT-01 Gestão de Produtos e Canais

## Objetivo

Permitir o gerenciamento dos produtos, que organizam jornadas por linha de
negócio e declaram os canais digitais (Web, Mobile, WhatsApp) pelos quais
essas jornadas podem ficar disponíveis para o cliente. Canal é um valor de
domínio fixo, não uma entidade com cadastro próprio.



### US-01.01 Gestão de produtos

#### REQ-01.01.001 - O sistema deve permitir cadastrar produtos.
#### REQ-01.01.002 - O sistema deve permitir editar produtos.
#### REQ-01.01.003 - O sistema deve permitir consultar produtos.
#### REQ-01.01.004 - O sistema deve permitir desativar e reativar produtos.
#### REQ-01.01.005 - Cada produto deve possuir identificador único (`productId`), nome, descrição obrigatória e status.
#### REQ-01.01.006 - Cada produto deve declarar um conjunto não vazio de tipos de canal (`WEB`, `MOBILE`, `WHATSAPP`) pelos quais suas jornadas podem ficar disponíveis.


### US-01.03 Catálogo e descoberta
#### REQ-01.03.001 - O sistema deve permitir pesquisar produtos por nome.
#### REQ-01.03.002 - O sistema deve permitir filtrar produtos por status.
#### REQ-01.03.006 - O sistema deve exibir os tipos de canal habilitados de cada produto na listagem.


### US-01.04 Integridade e ciclo de vida
#### REQ-01.04.001 - A desativação de um produto não deve remover suas jornadas ou publicações existentes.
#### REQ-01.04.003 - O sistema deve impedir a criação e a publicação de jornadas quando o produto estiver inativo.
#### REQ-01.04.004 - O sistema deve impedir a desativação de um produto enquanto qualquer uma de suas jornadas possuir publicação ativa.

<br/>

# FT-02 Gestão de Jornadas

## Objetivo

Permitir a criação, organização e manutenção de jornadas específicas para os
canais de um produto.

### US-02.01 Cadastro de jornadas
#### REQ-02.01.001 - O sistema deve permitir criar jornadas.
#### REQ-02.01.002 - O sistema deve permitir editar jornadas.
#### REQ-02.01.003 - O sistema deve permitir consultar jornadas.
#### REQ-02.01.004 - O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas.
#### REQ-02.01.005 - Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; ao ser excluída, o sistema deve desativá-la automaticamente (em vez de bloquear a operação), preservando o registro de publicação.
#### REQ-02.01.006 - O sistema deve impedir a exclusão de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes.
#### REQ-02.01.008 - Ao excluir uma jornada que já foi publicada (REQ-02.01.005), o sistema deve marcar todas as suas versões (`journey_version`) como `INACTIVE`, junto com a desativação da jornada.
#### REQ-02.01.009 - Uma jornada `INACTIVE` não deve poder ser editada (nem seus dados nem seu fluxo) nem excluída novamente; as ações "Editar" e "Excluir" devem ficar desabilitadas para essas jornadas.


### US-02.02 Identificação e metadados
#### REQ-02.02.001 - O sistema deve permitir definir nome para a jornada.
#### REQ-02.02.002 - O sistema deve exigir uma descrição para a jornada.
#### REQ-02.02.003 - Cada jornada deve possuir identificador único (`journeyId`).
#### REQ-02.02.004 - O identificador da jornada é gerado pelo sistema e não é editável pelo usuário.
#### REQ-02.02.005 - Toda jornada deve estar associada a um subconjunto não vazio dos tipos de canal (`WEB`, `MOBILE`, `WHATSAPP`) habilitados pelo seu produto.
#### REQ-02.02.006 - Toda jornada deve declarar diretamente o produto ao qual pertence; seus tipos de canal nunca incluem um valor fora do que o produto habilita (validado na criação e a cada edição dos tipos de canal da jornada).


### US-02.03 Pesquisa
#### REQ-02.03.001 - O sistema deve permitir pesquisar jornadas por nome.
#### REQ-02.03.002 - O sistema deve permitir filtrar jornadas por produto.
#### REQ-02.03.003 - O sistema deve permitir filtrar jornadas por tipo de canal.
#### REQ-02.03.004 - O sistema deve permitir ordenar jornadas por data de criação.
#### REQ-02.03.005 - O sistema deve permitir ordenar jornadas por data de alteração.
#### REQ-02.03.006 - O sistema deve permitir agrupar a listagem de jornadas por produto, por produto e canal, por canal, ou sem agrupamento algum.
#### REQ-02.03.007 - O sistema deve permitir ordenar a listagem de jornadas, em ordem crescente ou decrescente, pelos campos jornada (nome), canal, status ou data de atualização.

### US-02.04 Modelos de jornada
#### REQ-02.04.001 - Ao criar uma jornada, o sistema deve permitir que o usuário escolha entre iniciar com o fluxo em branco ou usar um modelo de jornada predefinido.
#### REQ-02.04.002 - O sistema deve listar os modelos disponíveis com identificador estável, nome e descrição; no piloto da versão 1.0.0, deve oferecer o modelo `aprovacao-pedido` (“Aprovação de Pedido”).
#### REQ-02.04.003 - O modelo escolhido deve preencher somente o fluxo. Nome, descrição, produto e canais da nova jornada devem ser sempre os valores informados pelo usuário.
#### REQ-02.04.004 - Cada uso de um modelo deve gerar novos identificadores de fluxo, nós e conexões, sem compartilhar identidade ou estado mutável entre jornadas.
#### REQ-02.04.005 - A criação da jornada, do fluxo escolhido e da versão inicial `DRAFT` deve ocorrer numa única transação; o snapshot da versão 1 deve conter exatamente os mesmos nós e conexões do fluxo criado.
#### REQ-02.04.006 - Um modelo é um esqueleto editável e pode deixar configurações dependentes do contexto — tela, condição, endpoint ou credencial — para o autor completar. O fluxo resultante permanece sujeito às mesmas regras de validação e publicação de qualquer rascunho.

### US-02.05 Jornadas específicas por canal
#### REQ-02.05.001 - O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.
#### REQ-02.05.002 - Cada jornada deve possuir definição independente de fluxo e formulários.
#### REQ-02.05.003 - Alterações reali zadas em uma jornada não devem modificar automaticamente jornadas de outros canais.
#### REQ-02.05.004 - O sistema deve exibir o produto e o canal durante toda a edição da jornada.
#### REQ-02.05.005 - O painel de propriedades do editor de fluxo deve exibir o identificador (UUID) da jornada, somente leitura, quando nenhum nó estiver selecionado.
---

### US-02.06 Publicação de jornadas
#### REQ-02.06.001 - O sistema deve permitir publicar jornadas.
#### REQ-02.06.002 - O sistema deve permitir despublicar jornadas por meio da API do runtime.
#### REQ-02.06.003 - O sistema deve permitir consultar jornadas publicadas.
#### REQ-02.06.004 - Uma jornada pode possuir mais de uma versão publicada simultaneamente, cada uma associada a uma versão imutável e a um deployment próprio no runtime — publicar uma versão nova não invalida nem despublica a anterior, para não interromper instâncias já em execução nela. Alterações realizadas após a publicação não devem modificar o snapshot publicado; para disponibilizá-las, o usuário deve publicar uma nova versão.
---

### US-02.07 Estado da publicação
#### REQ-02.07.001 - O sistema deve indicar se uma jornada esta publicada.
#### REQ-02.07.002 - O sistema deve indicar a data da publicacao.
#### REQ-02.07.003 - O sistema deve indicar o produto associado a publicacao.
#### REQ-02.07.004 - O sistema deve indicar os tipos de canal associados a publicacao.
---

### US-02.08 Catálogo de publicações
#### REQ-02.08.001 - O sistema deve permitir listar jornadas publicadas.
#### REQ-02.08.002 - O sistema deve permitir pesquisar jornadas publicadas.
#### REQ-02.08.003 - O sistema deve permitir filtrar jornadas publicadas por produto.
#### REQ-02.08.004 - O sistema deve permitir filtrar jornadas publicadas por canal.
---

### US-02.09 Publicação no runtime
#### REQ-02.09.001 - O Admin Portal deve iniciar a publicacao por meio de uma chamada de saida para a API de publicacao do runtime.
#### REQ-02.09.002 - A chamada deve enviar a definição completa da jornada, incluindo produto, tipos de canal e o fluxo com a tela embutida (já compilada) de cada User Task.

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional. O snapshot enviado ao runtime não carrega mais uma lista de formulários — só a tela já compilada de cada nó.

#### REQ-02.09.003 - O Admin Portal deve realizar uma chamada de saída real (HTTP) para a API de publicação do runtime. Após o retorno de sucesso, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`; em caso de falha na chamada, o erro deve propagar e nenhum estado deve ser alterado.
#### REQ-02.09.004 - Ao despublicar, o Admin Portal deve chamar a API de publicação do runtime para remover/desfazer a publicação. Apos o retorno de sucesso, a jornada e sua publicacao devem assumir o estado `UNPUBLISHED`; em caso de falha, os estados atuais devem ser preservados.
#### REQ-02.09.005 - Ao publicar, o número da versão publicada (`JourneyVersion.versionNumber`) deve ser gravado como a tag de versão do processo implantado no runtime (`v<N>`), distinta do contador de implantação que o próprio runtime mantém internamente para aquela definição — os dois números não são garantidos coincidir (o contador interno avança a cada implantação, mesmo sem mudança de conteúdo, enquanto o número da versão só avança a cada publicação de nova versão no Admin Portal).
---

### US-02.10 Inspeção da publicação
#### REQ-02.10.001 - Para uma jornada com publicação ativa (`PUBLISHED`), o sistema deve permitir visualizar o JSON completo enviado à API de publicação do runtime (produto, tipos de canal, fluxo — incluindo a árvore SDUI já compilada da tela de cada User Task), por meio de uma ação na listagem de jornadas ao lado de "Editar" e "Excluir".

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional. O snapshot inspecionado aqui não carrega mais uma lista de formulários — só a árvore SDUI já compilada de cada nó.
---

<br/>

# FT-03 Modelagem Visual de Workflows

## Objetivo

Permitir a construção visual do fluxo específico de cada jornada.

---

### US-03.01 Flow designer
#### REQ-03.01.001 - O sistema deve suportar eventos de início, incluindo `START` e `MESSAGE_START_EVENT`.
#### REQ-03.01.002 - O sistema deve suportar eventos de término.
#### REQ-03.01.003 - O sistema deve suportar User Tasks, Service Tasks e Receive Tasks.
#### REQ-03.01.004 - Cada fluxo deve possuir exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e ao menos um nó `END`; um `GATEWAY` (US-03.11) pode ramificar o fluxo em caminhos que terminam em nós `END` distintos, em vez de reconvergir num único fim.
#### REQ-03.01.005 - Ao criar uma jornada em branco, o sistema deve iniciar seu canvas sem elementos. Quando o usuário escolher um modelo predefinido (US-02.04), o fluxo deve iniciar com uma cópia independente do esqueleto desse modelo.
---

### US-03.02 Conexões
#### REQ-03.02.001 - O sistema deve permitir criar conexões entre elementos.
#### REQ-03.02.002 - O sistema deve permitir remover conexões.
#### REQ-03.02.003 - O sistema deve permitir editar conexões.
#### REQ-03.02.004 - O elemento inicial não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK`, `SERVICE_TASK` e `RECEIVE_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída.
#### REQ-03.02.005 - Todos os nós devem pertencer a um caminho contínuo e alcançável entre o elemento inicial e `END`.
#### REQ-03.02.006 - O editor deve impedir ações que produ zam uma estrutura incompatível, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que não cumpra as restrições estruturais.
#### REQ-03.02.007 - Uma `USER_TASK` deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma `USER_TASK` que já possua saída.
#### REQ-03.02.008 - O backend deve rejeitar (422), ao salvar o fluxo, um caminho que parta do elemento inicial e alcance um nó `END` sem passar por nenhum "checkpoint" (`USER_TASK`, `RECEIVE_TASK` ou `SERVICE_TASK` com conector diferente de `REST`) — evita uma jornada que resolveria inteiramente dentro de uma única transação síncrona do motor de runtime, cenário em que o motor não expõe histórico algum da execução (sofre rollback antes de qualquer consulta conseguir lê-lo).
---

### US-03.03 Navegação
#### REQ-03.03.001 - O usuário deve visuali zar o fluxo completo da jornada.
#### REQ-03.03.002 - O usuário deve navegar livremente pelo fluxo.
#### REQ-03.03.003 - O sistema deve destacar o elemento selecionado.
---

### US-03.04 Experiência de Edição
#### REQ-03.04.001 - O sistema deve suportar drag-and-drop de elementos.
#### REQ-03.04.002 - O usuário deve poder reposicionar elementos livremente.
#### REQ-03.04.003 - O usuário deve poder remover elementos do fluxo.
#### REQ-03.04.004 - O usuário deve poder copiar elementos.
#### REQ-03.04.005 - O usuário deve poder duplicar elementos.
---

### US-03.05 Canvas
#### REQ-03.05.001 - O sistema deve permitir zoom in.
#### REQ-03.05.002 - O sistema deve permitir zoom out.
#### REQ-03.05.003 - O sistema deve permitir mover-se livremente pelo canvas.
#### REQ-03.05.004 - O sistema deve permitir centralizar o fluxo na área visível.
#### REQ-03.05.005 - Ao abrir uma jornada para edição, ao criar uma jornada nova, ou ao concluir a geração de fluxo assistida por IA (US-03.17), o canvas deve abrir sempre em zoom de 100%, com o elemento inicial alinhado próximo à borda esquerda — não um ajuste adaptativo à área visível.
#### REQ-03.05.006 - O minimapa do canvas deve iniciar colapsado num canto da tela, abrindo apenas quando o usuário clicar nele.
---

### US-03.06 Produtividade
#### REQ-03.06.001 - O sistema deve permitir desfa zer ações.
#### REQ-03.06.002 - O sistema deve permitir refazer ações.
---

### US-03.07 Elementos de integração
#### REQ-03.07.001 - O sistema deve suportar nós de integração `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`.
#### REQ-03.07.002 - Uma `SERVICE_TASK` deve representar a execução de uma integração externa durante a jornada.
#### REQ-03.07.003 - Uma `RECEIVE_TASK` deve representar a espera por uma mensagem externa em uma instância de jornada já iniciada.
#### REQ-03.07.004 - Uma `MESSAGE_START_EVENT` deve permitir iniciar uma nova instância de jornada a partir de uma mensagem externa.
#### REQ-03.07.005 - O fluxo deve possuir exatamente um elemento inicial, que pode ser `START` ou `MESSAGE_START_EVENT`.
#### REQ-03.07.006 - O sistema deve permitir editar, mover, remover, copiar e duplicar elementos de integração, respeitando as regras de unicidade do elemento inicial.
---

### US-03.08 Framework de conectores
#### REQ-03.08.001 - O sistema deve representar a integração por meio de um framework conceitual de conectores.
#### REQ-03.08.002 - O framework deve permitir associar um conector a uma `SERVICE_TASK`, `RECEIVE_TASK` ou `MESSAGE_START_EVENT`, respeitando quais conectores são válidos para cada tipo (REQ-03.09.007).
#### REQ-03.08.003 - O catálogo deve possuir os conectores `REST` e `KAFKA` habilitados para uso na versão 1.0.0.
#### REQ-03.08.004 - O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos.
#### REQ-03.08.005 - O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível.
---

### US-03.09 Configuração REST e Kafka
#### REQ-03.09.001 - O sistema deve permitir configurar `REST` em `SERVICE_TASK` e `RECEIVE_TASK`.
#### REQ-03.09.002 - A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body e mapeamento de saída. O mapeamento de saída segue formato estruturado (REQ-03.09.010), não mais configuração livre. (Mapeamento de entrada foi retirado da UI — inline e assistente, US-03.14 — por nunca ter influenciado a execução real; era só anotação de que `{{nome}}` pode ser usado nos campos de texto, ver REQ-03.09.012.)
#### REQ-03.09.003 - O sistema deve permitir configurar `KAFKA` em `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`.
#### REQ-03.09.004 - A configuração Kafka deve suportar tópico, operação, headers, payload e mapeamento de saída. Kafka não possui o conceito de fila; a unidade de endereçamento é sempre o tópico. O mapeamento de saída segue formato estruturado (REQ-03.09.010), não mais configuração livre. (Mapeamento de entrada retirado da UI pelo mesmo motivo do REQ-03.09.002.)
#### REQ-03.09.005 - Configurações de integração devem suportar referência de credencial sem armazenar secrets diretamente no fluxo ou no snapshot.
#### REQ-03.09.006 - O snapshot publicado deve incluir o tipo do elemento, o conector, a configuração declarativa e os mapeamentos necessários para execução pelo runtime.
#### REQ-03.09.007 - `REST` não é um conector válido para `MESSAGE_START_EVENT`: a configuração REST representa uma chamada de saída (método e URL a serem chamados), e o elemento inicia o fluxo a partir de uma mensagem recebida, nunca chamando algo externamente. `MESSAGE_START_EVENT` deve suportar apenas `KAFKA`.
#### REQ-03.09.008 - A operação Kafka é determinada pelo tipo de nó, não é uma escolha livre do usuário: `SERVICE_TASK` deve usar `PRODUCE` (publica um evento como efeito da tarefa); `RECEIVE_TASK` e `MESSAGE_START_EVENT` devem usar `CONSUME` (aguardam uma mensagem chegar).
#### REQ-03.09.009 - Headers (REST e Kafka) devem ser editados como uma lista de pares nome/valor (com opção de adicionar e remover pares), e não como texto declarativo livre. Params e Body (REST) seguem o mesmo padrão por padrão (REQ-03.13.003), com um modo avançado de JSON livre como alternativa; Payload (Kafka) permanece como configuração declarativa livre, por ainda não ter recebido o mesmo tratamento. O mapeamento de saída também não se enquadra nessa exceção (ver REQ-03.09.010).
#### REQ-03.09.010 - O mapeamento de saída de uma integração (REST ou Kafka) deve ser declarado como uma lista de regras `nome da variável ← expressão JSONPath`, aplicada sobre o corpo da resposta (REST) ou o payload recebido (Kafka), em vez de configuração JSON livre.
#### REQ-03.09.011 - O nome de cada variável de saída — seja de uma integração (outputMapping, REQ-03.09.010) ou de um campo que coleta valor na tela embutida de uma User Task (`embeddedScreen`, US-03.16) — deve ser único no escopo da jornada inteira e seguir a mesma regra de nome técnico dos campos de formulário (REQ-04.01.007).

> **Nota de revisão (2026-08-24):** requisito reescrito para deixar explícito que campos de tela embutida entram no mesmo espaço de nomes — mesma mudança que substituiu a associação por `formId` pelo desenho direto da tela no nó, motivada pela limitação da Runtime Engine a poucos tipos de campo nativos.
#### REQ-03.09.012 - O sistema deve permitir referenciar, nos campos de entrada de URL, headers e body/payload de uma integração, variáveis produzidas por passos anteriores do fluxo (respostas de formulário e saídas de integrações), usando a sintaxe `{{nomeDaVariavel}}`.
#### REQ-03.09.013 - O editor deve exibir, para cada `SERVICE_TASK`/`RECEIVE_TASK`, a lista de variáveis disponíveis naquele ponto do fluxo, calculada a partir dos nós alcançáveis entre o elemento inicial e o nó selecionado.
#### REQ-03.09.014 - O backend deve rejeitar (422), ao salvar o fluxo, a configuração de conector que referencie `{{variavel}}` inexistente no contexto do nó (nome não declarado por nenhum passo anterior alcançável).
#### REQ-03.09.015 - O campo de tópico de um conector Kafka deve oferecer, como sugestão, a lista de tópicos existentes no cluster selecionado (US-14.01), consultada em tempo real a partir do catálogo de integrações; a digitação livre deve continuar disponível quando a listagem não estiver disponível.
---

### US-03.10 Teste de conectores
#### REQ-03.10.001 - O sistema deve permitir, durante a edição de um `SERVICE_TASK`/`RECEIVE_TASK` com conector `REST`, disparar uma chamada de teste com os valores atualmente configurados (URL, método, headers, body) e exibir a resposta bruta (status, headers, corpo).
#### REQ-03.10.002 - A chamada de teste deve ser executada pelo backend, nunca diretamente do navegador, para evitar exposição de credenciais e problemas de CORS.
#### REQ-03.10.003 - O backend deve recusar chamadas de teste para URLs que resolvam a endereços privados, de loopback ou reservados (proteção contra SSRF).
#### REQ-03.10.004 - A chamada de teste deve ter timeout curto e limite de tamanho de resposta, e não deve ser registrada como transação de negócio (fora do escopo de auditoria de domínio, FT-08).
#### REQ-03.10.005 - Campos `{{variavel}}` presentes na configuração testada devem ser substituídos por um valor de exemplo informado manualmente pelo usuário no momento do teste, sem depender de uma execução real de jornada.
#### REQ-03.10.006 - A chamada de teste deve seguir corretamente redirecionamentos HTTP (301, 302, 303, 307 e 308), preservando o método original quando o status exigir (307/308) — evita apresentar ao usuário a resposta intermediária de redirecionamento em vez da resposta final.
#### REQ-03.10.007 - Uma falha HTTP na chamada de teste deve ser resumida ao usuário como status e motivo (ex.: "404 Not Found"), incluindo o corpo da resposta de erro apenas quando ele for curto e não parecer HTML — evita despejar uma página de erro inteira na tela.
---

### US-03.11 Bifurcação condicional (Gateway)
#### REQ-03.11.001 - O sistema deve suportar um nó de gateway de decisão (exclusivo) no fluxo, com exatamente duas saídas na versão 1.0.0: caminho A e caminho B.
#### REQ-03.11.002 - Uma das duas saídas do gateway deve ser marcada como saída padrão (sem condição própria), usada quando a condição da outra saída não for satisfeita — garantindo que o fluxo sempre tenha um caminho definido em tempo de execução.
#### REQ-03.11.003 - A saída não padrão do gateway deve possuir uma condição composta por variável, operador de comparação (igual, diferente, maior que, menor que) e um valor de referência informado pelo usuário, editados como combos/campo tipado (não texto livre).
#### REQ-03.11.004 - A condição deve poder referenciar tanto uma variável de saída de um Service Task/Receive Task (mapeamento de saída, REQ-03.09.010) quanto um campo de resposta de um User Task (nome técnico do campo, REQ-04.01.007), desde que alcançável a partir do gateway.
#### REQ-03.11.005 - O editor deve exibir, ao configurar a condição da saída do gateway, a lista de variáveis disponíveis naquele ponto do fluxo — mesmo mecanismo do painel de variáveis do conector (REQ-03.09.013), estendido para incluir campos de formulário de User Tasks alcançáveis.
#### REQ-03.11.006 - O gateway deve possuir ao menos uma entrada e exatamente duas saídas na versão 1.0.0; o backend deve rejeitar (422) um gateway sem exatamente uma saída padrão, ou cuja saída não padrão esteja sem condição.
#### REQ-03.11.007 - Na publicação, o gateway deve ser traduzido para um `exclusiveGateway` BPMN nativo, com cada `sequenceFlow` de saída carregando a expressão de condição correspondente (ou marcado como fluxo padrão), avaliado pelo próprio motor do runtime — sem necessidade de implementação especializada (worker), no mesmo princípio do conector REST nativo (US-03.09).
#### REQ-03.11.008 - Cada variável de saída (REQ-03.09.010) deve possuir um tipo declarado — texto, número, booleano, data ou data e hora — inferido automaticamente ao gerar o mapeamento a partir de uma resposta real (REQ-03.10.001) ou escolhido manualmente pelo usuário. O editor da condição do gateway deve oferecer apenas os operadores compatíveis com o tipo da variável escolhida (texto/booleano: igual/diferente; número/data/data e hora: igual/diferente/maior que/menor que) e um campo de valor no formato correspondente (numérico, seletor verdadeiro/falso, ou seletor de data/data e hora).
#### REQ-03.11.009 - A condição do gateway pode referenciar a variável reservada `channel` — injetada automaticamente pelo tipo de canal que inicia a instância (REQ-05.04.004), nunca declarável pelo usuário no nó START — permitindo que o fluxo siga caminhos diferentes conforme o tipo de canal (`WEB`, `MOBILE`, `WHATSAPP`).
---

### US-03.12 Variáveis de entrada da jornada
#### REQ-03.12.001 - O sistema deve permitir declarar, no nó START de um fluxo, uma lista de variáveis de entrada da jornada, cada uma com nome e tipo (mesmo vocabulário de REQ-03.11.008: texto, número, booleano, data, data e hora) — são as variáveis que a aplicação cliente (canal digital/BFF) deve fornecer ao iniciar uma instância. Não se aplica a `MESSAGE_START_EVENT`, que já declara suas variáveis via mapeamento de saída sobre o payload da mensagem recebida (REQ-03.09.004).
#### REQ-03.12.002 - O nome de cada variável de entrada deve ser único no escopo da jornada, compartilhando o mesmo espaço de nomes das variáveis de saída (REQ-03.09.011) — uma variável de entrada não pode colidir com o nome de saída de nenhum nó do fluxo, nem com outra variável de entrada.
#### REQ-03.12.003 - As variáveis de entrada declaradas no nó START tornam-se disponíveis para referência `{{nome}}` em qualquer conector ou condição de gateway do fluxo, do mesmo jeito que uma variável de saída de integração já é (REQ-03.09.012/013) — o nó START é sempre alcançável a partir de qualquer outro nó do fluxo.
#### REQ-03.12.004 - O endpoint de início de instância deve aceitar um mapa de valores no corpo da requisição e recusar a chamada, com mensagem indicando os nomes faltantes, se alguma variável declarada no nó START não vier preenchida.
#### REQ-03.12.005 - Valores extras informados pelo chamador que não correspondam a nenhuma variável declarada são aceitos e repassados como variável de processo sem erro.
---

### US-03.13 Assistência de variáveis na configuração de conector
#### REQ-03.13.001 - O painel de propriedades de um `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT` deve exibir uma seção "Variáveis" com as variáveis disponíveis naquele ponto do fluxo (entrada da jornada, REQ-03.12.001, e saída de integrações anteriores alcançáveis, REQ-03.09.010), agrupadas por origem — rótulo derivado do nome/tipo do nó e do tipo de conector, calculado de forma genérica para que um tipo de nó/conector novo no futuro já ganhe um rótulo razoável sem exigir código específico.
#### REQ-03.13.002 - Os campos de URL, cada valor de header, e cada campo de valor de Body/Params devem oferecer um seletor que insere a referência `{{nome}}` na posição do cursor do campo, dispensando o usuário de digitar a sintaxe manualmente.
#### REQ-03.13.003 - Body e Params (REST) devem ser editados, por padrão, como uma lista de campos nome→valor (mesmo padrão de Headers, REQ-03.09.009), com um "modo avançado" de JSON livre disponível para corpos que não sejam um objeto plano — uma configuração aninhada já existente nunca deve ser achatada automaticamente.
---

### US-03.14 Assistente de configuração de conector
#### REQ-03.14.001 - O sistema deve oferecer um assistente (wizard) em etapas como forma adicional — não substituta — de configurar um conector REST ou Kafka, editando a mesma configuração que o painel de propriedades inline.
#### REQ-03.14.002 - Para REST, o assistente deve ter 4 etapas: Conexão (método, URL, credencial), Headers, Parâmetros & Corpo, e Testar e Mapear. Para Kafka, 3 etapas: Conexão (tópico, operação, credencial), Payload, e Mapear saída — sem etapa de teste, que não se aplica a esse conector.
#### REQ-03.14.003 - A navegação entre as etapas do assistente deve ser livre: selecionar qualquer etapa no indicador deve levar direto a ela, sem exigir conclusão sequencial das etapas anteriores.
#### REQ-03.14.004 - As alterações feitas no assistente devem ficar num rascunho local, aplicado à configuração real do conector somente ao concluir. Fechar o assistente de qualquer outra forma (botão "X", "Cancelar", clique fora do modal ou tecla Esc) deve verificar se há alteração pendente e pedir confirmação do usuário antes de descartá-la.
#### REQ-03.14.005 - A etapa "Testar e Mapear" deve executar a chamada de teste de verdade diretamente na tela do assistente (sem depender do modal "Testar API" do painel inline, que continua existindo separadamente), exibindo status e corpo da resposta. Em caso de sucesso, o mapeamento de saída deve ser gerado automaticamente a partir da resposta; a edição manual do mapeamento deve permanecer disponível independentemente do resultado do teste.
---

### US-03.15 Anotações
#### REQ-03.15.001 - O sistema deve permitir adicionar anotações — notas livres em formato de post-it — ao canvas do editor de fluxo, para fins de documentação, sem que façam parte do fluxo executável.
#### REQ-03.15.002 - Uma anotação deve possuir texto editável e posição livre no canvas; anotações não devem ser incluídas nas regras de validação estrutural do fluxo (US-03.02) nem traduzidas para BPMN na publicação.
#### REQ-03.15.003 - O sistema deve permitir vincular uma anotação a um ou mais nós do fluxo, exibindo uma linha tracejada entre a anotação e cada nó vinculado.
#### REQ-03.15.004 - O sistema deve permitir desvincular uma anotação de um nó e excluir uma anotação, sem afetar o fluxo executável.
#### REQ-03.15.005 - As anotações devem ser persistidas junto com o fluxo da jornada e restauradas ao reabrir o editor.
---

### US-03.16 Editor de tela embutido no editor de fluxo
#### REQ-03.16.001 - Ao selecionar, no canvas, uma `USER_TASK`, o editor deve exibir automaticamente um dock ancorado à base do canvas com o editor da tela embutida do nó (`embeddedScreen`), desenhada diretamente ali, sem exigir uma ação dedicada de clique.

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

#### REQ-03.16.002 - Ao selecionar qualquer outro elemento do canvas, o dock deve deixar de ser exibido.
---

### US-03.17 Geração de fluxo assistida por IA
#### REQ-03.17.001 - O sistema deve permitir gerar automaticamente um rascunho de fluxo a partir de uma descrição em linguagem natural (prompt) informada pelo usuário, preenchendo nós e conexões no canvas do editor.
#### REQ-03.17.006 - A geração deve considerar o fluxo já desenhado no canvas (nós, conexões e a tela embutida de cada User Task) como contexto do pedido: um pedido aditivo ou pontual (ex.: "adicione uma tarefa para X", "mude a mensagem da tarefa Y") não deve remover ou recriar nós/conexões sem relação com o pedido — o id, a posição no canvas e a tela desenhada de um nó não afetado devem ser preservados. Redesenhar o fluxo inteiro só deve ocorrer quando o pedido pedir isso explicitamente.
#### REQ-03.17.002 - A geração deve depender de uma credencial de API de IA configurada (US-14.06); sem credencial configurada, o sistema deve informar o usuário e recusar a geração, sem expor detalhe técnico do provedor.
#### REQ-03.17.003 - Um fluxo gerado que viole as regras estruturais de validação (US-03.02) deve ser automaticamente corrigido e reenviado ao modelo de IA (retry/reparo) antes de ser apresentado ao usuário, dentro de um número limitado de tentativas — inclui a rejeição de aspas escapadas (`\"`) em condição de gateway, formato que quebra o parser de expressão do motor de runtime.
#### REQ-03.17.004 - O fluxo gerado deve ser apresentado como um rascunho editável no canvas, sujeito às mesmas regras de validação e à mesma revisão manual de qualquer fluxo criado por edição direta — a geração por IA não substitui a revisão do usuário antes de salvar ou publicar.
#### REQ-03.17.005 - Ao concluir a geração, o canvas deve reposicionar automaticamente a visualização do fluxo gerado (REQ-03.05.005).
---


<br/><br/>

# FT-04 Catálogo Server Driven UI (SDUI)

## Objetivo

Permitir que a tela de uma User Task seja composta a partir de um catálogo corporativo de componentes server-driven UI (SDUI), com vínculos de dados, ações e visibilidade condicional configuráveis visualmente, e publicada de forma auditável e portável entre canais.

---

### US-04.01 Form builder

> **Removida (2026-09-05):** o catálogo de formulários reutilizáveis (CRUD `/api/v1/forms`, tela "Formulários" do portal admin) foi removido. Ele havia se tornado, desde a nota de revisão de 2026-08-24 abaixo, só um atalho de cópia opcional sobre o editor de tela embutido de uma User Task (`embeddedScreen`, US-03.16) — que é quem permanece como fonte de verdade da tela de uma User Task. REQ-04.01.001 a 004 e 006 foram removidos com o catálogo; REQ-04.01.005 e 007 permanecem (não dependiam do catálogo).

#### ~~REQ-04.01.001~~ - ~~O sistema deve permitir criar formulários.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.01.002~~ - ~~O sistema deve permitir editar formulários.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.01.003~~ - ~~O sistema deve permitir remover formulários.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.01.004~~ - ~~O sistema deve permitir usar um formulário do catálogo como modelo de partida ao desenhar a tela de uma User Task: os campos do formulário são copiados para a tela do nó (`embeddedScreen`) no momento da escolha, sem manter nenhum vínculo persistido entre o nó e o formulário de origem — alterar o formulário depois não afeta telas já copiadas dele, e vice-versa.~~ *(removido em 2026-09-05)*

#### REQ-04.01.005 - Toda User Task deve possuir uma tela. Ao criar a tarefa no Flow Designer, o sistema deve criar automaticamente a raiz da tela a partir da definição vigente do componente `ui.screen` no catálogo, deixando o Form Builder imediatamente disponível para autoria. Uma tarefa exclusivamente informativa também deve representar sua mensagem por componentes explícitos dentro dessa tela.

> **Nota de revisão (2026-09-09):** a tela deixou de ser opcional porque toda Tarefa de Usuário representa uma interação com o usuário, ainda que apenas informativa. Foi eliminado o comportamento anterior que aceitava uma mensagem avulsa e sintetizava uma tela somente durante a execução; o que é desenhado no Form Builder passa a ser sempre a fonte de verdade publicada. Fluxos residuais sem tela não precisam de compatibilidade retroativa e devem ser corrigidos ou descartados.

#### ~~REQ-04.01.006~~ - ~~No editor de tela embutido de uma User Task (US-03.16), o sistema deve permitir importar os campos de um formulário existente do catálogo como ponto de partida (cópia, sem vínculo persistido) e, separadamente, salvar a tela atualmente desenhada no nó como um novo formulário reutilizável no catálogo.~~ *(removido em 2026-09-05)*

#### REQ-04.01.007 - Na tela embutida de uma User Task (US-03.16), cada campo que coleta valor deve possuir um identificador técnico, editável a qualquer momento, com unicidade verificada na jornada inteira (não só na tela do nó) — ver REQ-03.09.011.

> **Nota de revisão (2026-09-05):** o campo já não guarda um atributo `name` próprio — o identificador técnico passou a ser o nome usado no vínculo de dados de leitura-e-escrita (US-04.10, REQ-04.10.005). A unicidade na jornada inteira permanece obrigatória.

---

### US-04.02 Componentes

> **Removida (2026-09-05):** a lista fixa de 17 tipos de campo foi substituída por um catálogo de componentes consultável e mantível (US-04.07), com descrição detalhada de propriedades, eventos e compatibilidade por alvo — não mais um enum fechado em código.

#### ~~REQ-04.02.001~~ - ~~O sistema deve suportar componente de texto (`TEXT`), que também cobre o uso anteriormente coberto por um tipo de conteúdo estático separado.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.002~~ - ~~O sistema deve suportar campo de entrada (`INPUT`).~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.003~~ - ~~O sistema deve suportar seleção simples.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.004~~ - ~~O sistema deve suportar seleção múltipla.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.005~~ - ~~O sistema deve suportar upload de arquivo.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.006~~ - ~~O sistema deve suportar conteúdo estático.~~ **Removido**: o tipo `STATIC_CONTENT` foi colapsado em `TEXT` (REQ-04.02.001); os dois tipos tinham o mesmo modelo de dados e divergiam apenas no estilo visual de apresentação. *(removido em 2026-09-05, junto com o restante da US)*
#### ~~REQ-04.02.007~~ - ~~O campo `INPUT` deve suportar subtipos de entrada: texto livre, número, e-mail e data.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.008~~ - ~~O sistema deve permitir configurar validação de formato por subtipo de `INPUT`: faixa mínima/máxima para o subtipo número; expressão regular/máscara para o subtipo texto.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.009~~ - ~~As opções de campos de seleção simples e múltipla devem ser definidas como pares rótulo/valor (não apenas um rótulo), permitindo que o valor técnico persistido seja diferente do texto exibido ao usuário.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.010~~ - ~~O campo de upload de arquivo deve permitir configurar as extensões de arquivo aceitas e o tamanho máximo do arquivo.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.011~~ - ~~O sistema deve suportar um componente estrutural de seção (`SECTION`), que agrupa os campos seguintes até a próxima seção (ou o fim da lista) em uma grade com número de colunas configurável.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.012~~ - ~~O sistema deve suportar botões de opção (`RADIO`), com o mesmo modelo de opções rótulo/valor de seleção simples (REQ-04.02.009).~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.013~~ - ~~O sistema deve suportar interruptor sim/não (`SWITCH`).~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.014~~ - ~~O sistema deve suportar escala numérica (`SLIDER`), com mínimo, máximo e incremento configuráveis.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.015~~ - ~~O sistema deve suportar avaliação por estrelas (`RATING`), com o número máximo de estrelas configurável.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.016~~ - ~~O sistema deve suportar contador numérico com incremento/decremento (`STEPPER`), com mínimo, máximo e incremento configuráveis.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.017~~ - ~~O sistema deve suportar busca com sugestão (`AUTOCOMPLETE`), com o mesmo modelo de opções rótulo/valor de seleção simples (REQ-04.02.009) — fonte de dados dinâmica remota permanece fora do escopo (seção 5).~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.018~~ - ~~O sistema deve suportar título (`TITLE`), um componente de conteúdo somente-apresentação.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.019~~ - ~~O sistema deve suportar imagem (`IMAGE`), configurável por URL e texto alternativo.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.020~~ - ~~O sistema deve suportar divisor visual (`DIVIDER`), sem configuração própria.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.021~~ - ~~O sistema deve suportar card de conteúdo (`CARD`), com título, descrição e imagem opcionais.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.02.022~~ - ~~O sistema deve suportar aviso (`CALLOUT`), com título, descrição e variante visual configuráveis.~~ *(removido em 2026-09-05)*

> **Nota de revisão (2026-08-24):** tipos REQ-04.02.011 a REQ-04.02.022 adicionados nesta revisão — mesma mudança que substituiu a associação por `formId` pelo desenho direto da tela no nó (`embeddedScreen`): como a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), o catálogo próprio do Admin Portal foi ampliado para cobrir a necessidade real de telas ricas, resolvida inteiramente pelo Admin Portal (SDUI) em vez de depender do motor.

---

### US-04.03 Reutilização

> **Removida (2026-09-05):** user story inteira removida junto com o catálogo de formulários reutilizáveis — ver nota em US-04.01.

#### ~~REQ-04.03.001~~ - ~~O sistema deve permitir usar um formulário do catálogo como ponto de partida (cópia dos campos) para telas de User Tasks em múltiplas jornadas — sem manter vínculo persistido entre a tela copiada e o formulário de origem.~~ *(removido em 2026-09-05)*
#### ~~REQ-04.03.002~~ - ~~O sistema deve permitir usar um formulário do catálogo como ponto de partida (cópia dos campos) para telas de múltiplas User Tasks, inclusive dentro da mesma jornada — sem manter vínculo persistido entre as telas copiadas e o formulário de origem, nem entre si.~~ *(removido em 2026-09-05)*

---

### US-04.04 Configuração
#### REQ-04.04.001 - O usuário deve poder definir campos obrigatórios.

> **Nota de revisão (2026-09-05):** obrigatoriedade deixou de ser uma coluna fixa do modelo de campo — passou a ser uma propriedade como outra qualquer, declarada no schema do componente no catálogo (REQ-04.07.006) e configurada por instância no editor (REQ-04.09.008).

#### REQ-04.04.002 - O usuário deve poder definir valores padrão.

> **Nota de revisão (2026-09-05):** não existe mais "valor padrão" estático definido pelo autor da tela — o valor inicial de um componente vem da resolução do seu vínculo de dados em tempo de execução (US-04.10).

#### ~~REQ-04.04.003~~ - ~~O usuário deve poder definir textos de ajuda.~~ *(removido em 2026-09-05)* — nenhum componente do catálogo corporativo de referência declara uma propriedade de texto de ajuda; fora do escopo do catálogo v1.

---

### US-04.05 Preview
#### REQ-04.05.001 - O sistema deve permitir visualizar o formulário durante a edição.
#### REQ-04.05.002 - O preview deve refletir alterações em tempo real.
#### REQ-04.05.003 - O preview deve refletir o canal de renderização selecionado (Web, Mobile ou WhatsApp), compartilhando a mesma seleção de canal do editor e a mesma indicação de compatibilidade por componente exibida na paleta.

---

### US-04.06 Imutabilidade e serialização para publicação
#### REQ-04.06.001 - Ao publicar uma jornada, a tela embutida de cada User Task da versão publicada deve ser copiada integralmente para o snapshot da publicação, tornando-se imutável a alterações futuras feitas na tela do nó (mesmo princípio de congelamento aplicado à versão da jornada no FT-06).

> **Nota de revisão (2026-09-05):** o campo passou a se chamar `embeddedScreenRoot`, e não existe mais uma etapa de "compilação" — a árvore congelada no snapshot é exatamente a mesma árvore editada no Form Builder (REQ-04.08.007).

#### ~~REQ-04.06.002~~ - ~~O snapshot de publicação deve conter, para cada User Task com tela desenhada, uma representação em árvore de nós no formato `[tag, props, children]` (estilo hyperscript/SDUI) — `embeddedScreenSdui` — derivada da tela congelada (`embeddedScreen`) do nó no momento da publicação. Essa árvore é uma projeção de leitura gerada a partir do modelo de campos; o modelo de campos (não a árvore) continua sendo a fonte de dados editável no editor de fluxo.~~ *(removido em 2026-09-05)* — substituído pelo pacote de publicação com envelope canônico (US-04.14).

> **Nota de revisão (2026-08-24):** requisitos reescritos — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional. A compilação/congelamento em SDUI descrita aqui agora se aplica à tela do próprio nó, não a um formulário externo referenciado.

---

### US-04.07 Catálogo de Componentes (Component Registry)

> **Nova (2026-09-05):** substitui a lista fixa de tipos de campo (antiga US-04.02) por um catálogo consultável e mantível, alinhado ao contrato SDUI corporativo.

#### REQ-04.07.001 - O sistema deve manter um catálogo de componentes disponíveis para compor telas, persistido em tabela própria, não mais uma lista fixa em código.
#### REQ-04.07.002 - Cada componente do catálogo deve ser identificado pela combinação de tipo e versão, únicas entre si.
#### REQ-04.07.003 - Cada componente deve declarar um status: experimental, estável, depreciado ou indisponível.
#### REQ-04.07.004 - Cada componente deve declarar um nível de complexidade e uma categoria (conteúdo, layout, entrada, ação ou feedback), usados para organizar a paleta do editor.
#### REQ-04.07.005 - Cada componente deve declarar se aceita filhos (componente de layout) ou é uma folha que não aceita.
#### REQ-04.07.006 - Cada componente deve declarar o schema de suas propriedades configuráveis: nome, tipo de valor (texto, número, booleano, enumeração, token semântico, lista de opções ou lista de regras de validação), obrigatoriedade e valor padrão.
#### REQ-04.07.007 - Cada componente deve declarar quais eventos pode disparar, dentre o conjunto de ações permitidas (US-04.11).
#### REQ-04.07.008 - Cada componente deve declarar sua compatibilidade por alvo de renderização, incluindo a versão mínima de renderizador exigida em cada alvo.
#### REQ-04.07.009 - O sistema deve disponibilizar uma tela de administração do catálogo, com listagem, criação, edição e remoção.
#### REQ-04.07.010 - A leitura do catálogo deve ser permitida a qualquer papel autenticado; criar, editar e remover devem ser restritos ao papel de administrador.
#### REQ-04.07.011 - Remover um componente do catálogo não deve apagar seu registro — deve marcá-lo como indisponível, preservando a referência para telas já publicadas que o utilizem.
#### REQ-04.07.012 - O sistema deve prover, desde a primeira instalação, um catálogo inicial com os componentes do contrato corporativo de referência.
#### REQ-04.07.013 - Um componente de origem sistêmica (pertencente ao catálogo inicial do contrato corporativo, REQ-04.07.012) não deve poder ser removido, apenas ter seus demais atributos editados; somente componentes de origem customizada, criados pelo próprio usuário, podem ser removidos (REQ-04.07.011). A tela de administração do catálogo deve indicar a origem de cada componente.

---

### US-04.08 Estrutura da árvore de tela
#### REQ-04.08.001 - A tela de uma User Task deve ser representada por uma árvore de nós, não mais por uma lista plana de campos.
#### REQ-04.08.002 - Cada nó da árvore deve possuir um identificador único dentro da tela, um tipo e uma versão correspondentes a um componente do catálogo (US-04.07).
#### REQ-04.08.003 - Cada nó deve poder conter propriedades de configuração, conforme o schema declarado pelo componente correspondente no catálogo.
#### REQ-04.08.004 - Cada nó deve poder conter um vínculo de dados (US-04.10), eventos associados a ações (US-04.11) e uma regra de visibilidade condicional (US-04.12).
#### REQ-04.08.005 - Um nó só deve poder conter filhos se o componente correspondente aceitar filhos (REQ-04.07.005); a profundidade de aninhamento não deve ser limitada.
#### REQ-04.08.006 - A raiz da árvore de uma tela deve ser sempre um único nó do tipo contêiner de tela.
#### REQ-04.08.007 - A árvore editada no Form Builder deve ser a mesma árvore publicada — não deve existir etapa de compilação ou projeção intermediária entre o que o usuário desenha e o que é publicado.

---

### US-04.09 Editor de componentes
#### REQ-04.09.001 - O sistema deve exibir uma paleta de componentes disponíveis para inserção, agrupada por categoria, alimentada pelo catálogo — nunca uma lista fixa em código.
#### REQ-04.09.002 - O usuário deve poder inserir um componente da paleta na árvore da tela por arrastar-e-soltar.
#### REQ-04.09.003 - O sistema deve permitir soltar um componente somente dentro de outro que aceite filhos (REQ-04.07.005); uma tentativa de soltar num alvo incompatível não deve ser aceita.
#### REQ-04.09.004 - O usuário deve poder mover um componente já inserido para dentro de outro contêiner compatível, preservando seus filhos.
#### REQ-04.09.005 - O sistema não deve permitir mover um componente para dentro de si mesmo ou de um de seus próprios descendentes.
#### REQ-04.09.006 - O usuário deve poder remover um componente da árvore; remover um contêiner deve remover também seus filhos.
#### REQ-04.09.007 - O sistema deve exibir um painel de camadas com a estrutura hierárquica da árvore, permitindo selecionar, reordenar entre irmãos e remover a partir dele.
#### REQ-04.09.008 - O usuário deve poder editar as propriedades do componente selecionado num painel dedicado, com o campo de entrada apropriado ao tipo de cada propriedade declarada pelo catálogo.
#### REQ-04.09.009 - No modo de construção da tela, os componentes não devem aceitar digitação de valores reais — não é o formulário sendo preenchido, é uma prancheta de montagem.
#### REQ-04.09.010 - O sistema deve oferecer um modo de pré-visualização que renderiza a árvore como seria apresentada ao usuário final, alternável a qualquer momento com o modo de construção.
#### REQ-04.09.011 - O sistema deve sinalizar pendências de preenchimento da tela — propriedade obrigatória vazia, valor de propriedade incompatível com o schema do catálogo, componente de entrada sem vínculo de dados, botão ou link sem ação associada, ou componente incompatível com o canal selecionado — classificadas por severidade, permitindo ao usuário navegar de uma pendência até o campo correspondente no painel de propriedades.

---

### US-04.10 Vínculo de dados
#### REQ-04.10.001 - O usuário deve poder associar o valor de um componente a um caminho identificado por um namespace (variável do fluxo preenchível, dado somente-leitura, contexto de sessão, parâmetro de navegação ou valor derivado) e um nome dentro desse namespace.
#### REQ-04.10.002 - O vínculo deve poder ser configurado como leitura-e-escrita ou somente leitura.
#### REQ-04.10.003 - Um componente sem vínculo configurado não deve gerar variável de processo nem ser considerado no envio do formulário.
#### REQ-04.10.004 - Ao configurar um vínculo de leitura-e-escrita no namespace de variável do fluxo, o sistema deve sugerir os nomes de variável já conhecidos até aquele ponto do fluxo.
#### REQ-04.10.005 - O nome técnico de um campo que coleta valor passa a ser o nome usado no vínculo de leitura-e-escrita do namespace de variável do fluxo; sua unicidade deve continuar sendo verificada na jornada inteira, não só na tela do nó.

---

### US-04.11 Ações e eventos
#### REQ-04.11.001 - O usuário deve poder associar um evento disparado por um componente a uma ação, escolhida dentre um conjunto fechado definido pelo sistema: enviar formulário, navegar, abrir URL, definir valor, registrar telemetria ou dispensar.
#### REQ-04.11.002 - Os eventos oferecidos para configuração num componente devem se limitar aos eventos que aquele componente, conforme declarado no catálogo (REQ-04.07.007), realmente dispara.
#### REQ-04.11.003 - Cada ação deve permitir configurar parâmetros próprios (ex.: rota de destino, URL, caminho e valor a definir, nome do evento de telemetria).
#### REQ-04.11.004 - Um componente não deve poder disparar uma ação fora do conjunto fechado do sistema — isso deve ser impedido na validação estrutural (US-04.13).

---

### US-04.12 Visibilidade condicional
#### REQ-04.12.001 - O usuário deve poder condicionar a exibição de um componente a uma comparação entre um valor do contexto de dados (mesmos namespaces de US-04.10) e um valor informado.
#### REQ-04.12.002 - As comparações suportadas devem incluir, no mínimo, igualdade e diferença.
#### REQ-04.12.003 - Um componente sem condição de visibilidade configurada deve ser sempre exibido.
#### REQ-04.12.004 - As comparações também devem suportar "está em"/"não está em" uma lista de valores — usado para condicionar um componente a um subconjunto dos tipos de canal da jornada (`session.channel`), sem exigir uma regra por tipo de canal.

---

### US-04.13 Validação estrutural
#### REQ-04.13.001 - O sistema não deve permitir publicar uma jornada cuja árvore de alguma tela tenha identificador de componente duplicado.
#### REQ-04.13.002 - O sistema não deve permitir publicar uma jornada que use, em alguma tela, um tipo de componente não encontrado no catálogo.
#### REQ-04.13.003 - O sistema não deve permitir publicar uma jornada que use, em alguma tela, um componente marcado como indisponível no catálogo (REQ-04.07.011).
#### REQ-04.13.004 - O sistema não deve permitir publicar uma jornada em que um componente tenha filhos sem que seu tipo aceite filhos (REQ-04.07.005).
#### REQ-04.13.005 - O sistema não deve permitir publicar uma jornada com um vínculo de dados cujo namespace não seja um dos namespaces reconhecidos (US-04.10).
#### REQ-04.13.006 - O sistema não deve permitir publicar uma jornada com um evento associado a uma ação fora do conjunto fechado (US-04.11).
#### REQ-04.13.007 - Ao rejeitar a publicação, o sistema deve informar todas as violações encontradas, não só a primeira.
#### REQ-04.13.008 - O sistema não deve permitir publicar uma jornada em que, para algum dos tipos de canal da jornada, a árvore de alguma tela fique sem nenhum componente visível para aquele tipo — considerando as regras de visibilidade condicionadas a `session.channel` (REQ-04.12.004).
#### REQ-04.13.009 - O sistema não deve permitir publicar uma jornada em que o valor de uma propriedade, em alguma tela, viole o schema declarado pelo componente no catálogo (tipo de valor, faixa numérica ou enumeração — REQ-04.07.006).

---

### US-04.14 Publicação e repositório de especificação corporativo
#### REQ-04.14.001 - Ao publicar uma jornada, o sistema deve gerar, para cada tela desenhada, um pacote de publicação identificando a jornada, a tela e o número de revisão.
#### REQ-04.14.002 - O pacote deve indicar os alvos de renderização compatíveis com a tela, calculados pela interseção dos alvos suportados por todos os componentes usados na árvore (REQ-04.07.008) — nunca uma lista fixa.
#### REQ-04.14.003 - O pacote deve indicar, para cada alvo compatível, a versão mínima de renderizador exigida, calculada como a maior entre as exigidas pelos componentes usados.
#### REQ-04.14.004 - O sistema deve enviar o pacote de publicação a um serviço de repositório de especificação corporativo, responsável por armazenar e distribuir versões publicadas.
#### REQ-04.14.005 - Uma nova publicação da mesma tela nunca deve sobrescrever uma revisão já publicada — deve gerar uma revisão nova, marcando a anterior como substituída.
#### REQ-04.14.006 - Em execução, a tela apresentada ao usuário final deve ser sempre lida da última revisão publicada no repositório de especificação corporativo, nunca do estado em edição no Form Builder.
#### REQ-04.14.007 - O restante da resolução de uma jornada em execução (mensagens, integrações, decisões de fluxo) não depende do repositório de especificação corporativo e deve continuar funcionando independentemente dele.

---

---

<br/>

# FT-05 Execução

## Objetivo

Permitir a verificação do caminho e das telas de uma jornada publicada, executando-a de fato no motor de runtime (não um motor simplificado à parte) — dando visibilidade total do que acontece a cada passo.

> Ajuste em relação à versão original deste objetivo ("sem publicá-la"): a execução roda contra o motor de runtime real, o que exige que a jornada esteja publicada — não existe um motor simplificado interno ao Admin Portal. Ver US-05.04.

### US-05.01 Execução
#### REQ-05.01.001 - O sistema deve permitir executar jornadas.
#### REQ-05.01.002 - O sistema deve permitir informar dados de entrada para os formulários durante a execução.
#### REQ-05.01.003 - O sistema deve permitir reiniciar a execução.
#### REQ-05.01.004 - Antes de registrar um passo da execução, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução.
---

### US-05.02 Resultado
#### REQ-05.02.001 - O sistema deve apresentar o caminho percorrido.
#### REQ-05.02.002 - O sistema deve apresentar as User Tasks executadas.
#### REQ-05.02.003 - O sistema deve apresentar os formulários exibidos.
#### REQ-05.02.004 - O sistema deve apresentar o resultado final da execução.
#### REQ-05.02.005 - O sistema deve apresentar a tela de uma User Task com toda referência de dados já resolvida com os valores atuais das variáveis do processo, incluindo propriedades textuais e o valor vinculado de componentes editáveis. Quando a resolução fornecer o valor inicial de um componente editável, o campo deve nascer preenchido e permanecer editável pelo usuário.
---

### US-05.03 Visualização da execução
#### REQ-05.03.001 - O sistema deve destacar o caminho percorrido durante a execução.
#### REQ-05.03.002 - O sistema deve destacar as User Tasks e os formulários executados.
#### REQ-05.03.003 - O sistema não deve reposicionar ou reiniciar o zoom do diagrama do fluxo ao alternar entre as abas do painel de observabilidade.
---

### US-05.04 Arquitetura de execução
#### REQ-05.04.001 - O sistema deve executar a jornada publicada contra o motor de runtime real, não um motor simplificado interno ao Admin Portal.
#### REQ-05.04.002 - Na versão 1.0.0, as integrações REST externas referenciadas pelas jornadas devem ser emuladas por um serviço de mock dedicado, já que não há sistemas de terceiros reais disponíveis.
#### REQ-05.04.003 - As integrações Kafka referenciadas pelas jornadas devem executar contra um broker Kafka real, com publicação e consumo de mensagens efetivos.
#### REQ-05.04.004 - Toda instância deve ser iniciada informando um tipo de canal, validado contra os tipos de canal habilitados na jornada publicada (422 se não for um deles). O motor de runtime deve injetar esse valor como variável de processo reservada (`channel`), disponível para condição de gateway (REQ-03.11.009) e visibilidade condicional (REQ-04.12.004) sem exigir configuração adicional no motor.
---

### US-05.05 Etapas de integração
#### REQ-05.05.001 - O sistema deve permitir avançar manualmente uma etapa de integração (Service Task ou Receive Task) que dependeria de um evento assíncrono externo, pulando sua conclusão.
#### REQ-05.05.002 - O sistema deve indicar claramente quando a execução está aguardando uma etapa de integração, distinguindo-a de uma User Task aguardando preenchimento.
---

### US-05.06 Observabilidade da execução
#### REQ-05.06.001 - O sistema deve apresentar as variáveis do processo em execução, com seus valores atuais.
#### REQ-05.06.002 - O sistema deve permitir alterar manualmente o valor de uma variável do processo em execução, para forçar caminhos alternativos de decisão durante o teste.
#### REQ-05.06.003 - O sistema deve apresentar o resultado das integrações já executadas (dados retornados/mapeados por Service/Receive Tasks).
#### REQ-05.06.004 - O sistema deve apresentar um log cronológico dos passos executados durante a execução.
#### REQ-05.06.005 - O log cronológico deve apresentar os dados efetivamente submetidos em cada User Task respondida, não apenas a indicação de que foi respondida.
#### REQ-05.06.006 - O log cronológico deve registrar toda chamada de API entre o frontend e o backend relacionada à execução (método, caminho, status, headers e corpo da requisição), com exceção da consulta de variáveis do processo, que não representa uma ação da jornada.
#### REQ-05.06.007 - O log deve permitir busca textual, com navegação entre ocorrências, e permitir expandir ou recolher cada entrada individualmente ou em bloco.
---

### US-05.07 Seleção e apresentação
#### REQ-05.07.001 - O sistema deve permitir localizar uma jornada publicada por busca, listando as jornadas disponíveis e filtrando a lista conforme o texto digitado.
#### REQ-05.07.002 - A execução deve ocorrer na mesma tela de seleção da jornada, sem navegação entre telas.
#### REQ-05.07.003 - A pré-visualização da execução deve se adaptar ao tipo de canal escolhido para a instância (REQ-05.04.004), incluindo uma representação visual compatível (ex.: layout de dispositivo móvel para `MOBILE`).
#### REQ-05.07.004 - O sistema deve exibir o número da versão publicada da jornada (`v<N>`) tanto na lista de busca quanto no cabeçalho de uma execução em andamento.
#### REQ-05.07.005 - O sistema deve permitir iniciar a execução de uma jornada publicada diretamente do grid de Jornadas (FT-02), abrindo uma aba de Execução dedicada já com essa jornada selecionada.
#### REQ-05.07.006 - Quando a jornada tiver mais de um tipo de canal habilitado, o sistema deve permitir escolher qual tipo simular antes de iniciar a execução; com um único tipo habilitado, o sistema deve usá-lo automaticamente, sem exigir escolha do usuário.
---

### US-05.08 Tratamento de falhas de integração
#### REQ-05.08.001 - O sistema deve detectar quando uma etapa de integração (Service Task ou Receive Task) falha durante a execução (ex.: conector REST inacessível) e identificar qual nó do fluxo causou a falha, mesmo quando o motor não expõe isso diretamente (a transação dá rollback antes de qualquer histórico ser gravado).
#### REQ-05.08.002 - O sistema deve destacar visualmente, no diagrama do fluxo, o nó que causou a falha, de forma distinta dos demais estados (concluído, atual, pendente).
#### REQ-05.08.003 - O sistema deve registrar a falha no log cronológico da execução.
#### REQ-05.08.004 - O sistema deve permitir consultar a mensagem de erro completa da falha sob demanda, sem exibi-la de forma intrusiva na tela principal de execução.
#### REQ-05.08.005 - Antes de iniciar uma instância, completar uma tarefa ou pular uma etapa, o sistema deve detectar quando o trecho seguinte do fluxo executaria integralmente dentro de uma única transação síncrona do motor de runtime até um nó `END`, sem passar por nenhum checkpoint (mesma regra estrutural de REQ-03.02.008), e recusar a operação com uma mensagem explicativa — proteção em tempo de execução para fluxos persistidos antes da validação estrutural existir, complementando a prevenção em tempo de edição.
---

### US-05.09 Mensageria Kafka real
#### REQ-05.09.001 - Cada execução deve possuir um identificador de correlação (business key) próprio, gerado automaticamente ao iniciar a instância.
#### REQ-05.09.002 - Uma Service Task com conector Kafka deve publicar a mensagem de verdade num broker Kafka real, automaticamente, sem exigir ação manual.
#### REQ-05.09.003 - O sistema deve indicar visualmente que uma Service Task Kafka está aguardando a publicação automática, sem oferecer um botão de ação como principal.
#### REQ-05.09.004 - O sistema deve detectar e processar automaticamente uma mensagem Kafka publicada no tópico de uma Receive Task ou de um início por mensagem (Message Start Event) em execução, avançando a instância correspondente sem exigir ação do usuário — inclusive quando a mensagem é publicada por um produtor externo ao Admin Portal, não só pelo painel de teste.
#### REQ-05.09.005 - O sistema deve permitir publicar uma mensagem de teste real, com tópico (somente leitura) e payload editável em JSON, diretamente na tela de execução, para uma Receive Task que dependa de mensagem Kafka.
#### REQ-05.09.006 - O payload da mensagem de teste de uma Receive Task deve vir pré-preenchido com o identificador de correlação (business key, REQ-05.09.001) da instância em execução.
#### REQ-05.09.007 - Uma jornada cujo início é por mensagem (Message Start Event) deve oferecer, na tela de busca de jornada, o painel de envio de mensagem de teste (REQ-05.09.005) para iniciar uma instância nova, sem pré-preencher a business key (a instância ainda não existe).
#### REQ-05.09.008 - Depois de enviar a mensagem de teste que inicia uma jornada por mensagem, o sistema deve aguardar automaticamente até a instância nova aparecer e prosseguir para a tela de execução, sem ação adicional do usuário.
#### REQ-05.09.009 - O sistema deve permitir, como alternativa manual secundária à publicação ou ao consumo Kafka real, pular qualquer etapa Kafka em espera (Service Task, Receive Task ou início por mensagem), fabricando o resultado a partir do mapeamento de saída configurado — útil quando o broker está indisponível ou para avançar rapidamente durante um teste.
#### REQ-05.09.010 - Ao iniciar uma execução, o sistema deve permitir optar por controle manual das mensagens Kafka daquela instância, retirando suas Service Tasks Kafka do disparo automático do worker em background e exigindo publicação manual pela tela de execução.
#### REQ-05.09.011 - Quando o controle manual estiver ativo, a tela de execução deve permitir publicar a mensagem de uma Service Task Kafka digitando o payload manualmente ou gerando-o automaticamente a partir do mesmo mapeamento que o worker automático usaria.
---

### US-05.10 Inspeção detalhada de nó

> O painel de detalhe do nó descrito nesta user story é o mesmo painel de observabilidade compartilhado com a FT-15 Diagnóstico — implementado uma única vez, reaproveitado nas duas telas.

#### REQ-05.10.001 - Ao selecionar uma Tarefa de Serviço ou uma Tarefa de Recebimento no Fluxo da Jornada, o painel deve apresentar a configuração do conector: tipo (API REST, Kafka, Event Hubs ou Service Bus) e, para REST, método e URL configurados, quantidade/lista de headers e indicação de body configurado; para conectores de tópico, o nome do tópico/Event Hub, o cluster associado e se a tarefa é produtora (Producer) ou consumidora (Consumer) da mensagem.
#### REQ-05.10.002 - Ao selecionar um nó de Decisão (Gateway) no Fluxo da Jornada, o painel deve apresentar as condições de cada saída configurada (ou "Caminho padrão"), destacando visualmente qual saída foi de fato percorrida quando houver uma instância associada.
#### REQ-05.10.003 - Ao selecionar o nó de Início, o painel deve apresentar as variáveis de entrada declaradas para a jornada com o valor que de fato foi informado na execução selecionada, não apenas o tipo declarado.
#### REQ-05.10.004 - Ao selecionar o nó de Início por Mensagem (Message Start Event), o painel deve apresentar a configuração do conector de tópico que inicia a jornada, com o mesmo tratamento de REQ-05.10.001 (a jornada é consumidora da mensagem que a inicia).
#### REQ-05.10.005 - As seções de entrada e saída do painel devem ser colapsáveis individualmente.
#### REQ-05.10.006 - Para um conector de tópico (Kafka, Event Hubs ou Service Bus), a seção de entrada deve se chamar "Payload da Mensagem" em vez de "Entrada" — o que chega não é uma requisição/resposta, é a mensagem publicada ou consumida.
#### REQ-05.10.007 - O painel de detalhe do nó deve ser redimensionável horizontalmente (largura), sem alterar sua altura.
#### REQ-05.10.008 - O log cronológico deve indicar o tipo de conector também para uma Tarefa de Recebimento (API REST, Kafka, Event Hubs ou Service Bus), da mesma forma que já indica para uma Tarefa de Serviço.
#### REQ-05.10.009 - Uma mensagem Kafka recebida por uma Tarefa de Recebimento ou por um Início por Mensagem deve ficar disponível para consulta (painel de detalhe do nó e log) da mesma forma que uma mensagem publicada por uma Tarefa de Serviço — cobrindo tanto o lado produtor quanto o consumidor.
#### REQ-05.10.010 - O diagrama do fluxo deve permitir aumentar e diminuir o zoom com o scroll do mouse.
---

<br/><br/>

# FT-06 Versionamento de jornadas

### US-06.01 Modelo de versões
#### REQ-06.01.001 - O sistema deve permitir que uma jornada possua múltiplas versões.
#### REQ-06.01.002 - Cada versão deve possuir identificador único (`versionId`).
#### REQ-06.01.003 - Cada versão deve possuir número sequencial iniciado em `1` dentro da jornada.
#### REQ-06.01.004 - Cada versão deve estar associada a exatamente uma jornada.
#### REQ-06.01.005 - Cada versão deve possuir status `DRAFT`, `PUBLISHED`, `UNPUBLISHED` ou `INACTIVE`.
#### REQ-06.01.006 - Uma jornada deve possuir no máximo uma versão `PUBLISHED`.
#### REQ-06.01.007 - Cada versão deve registrar criação e publicação, quando aplicável.
#### REQ-06.01.008 - Cada versão deve permitir observação opcional.

### US-06.02 Criação e edição de versões
#### REQ-06.02.001 - Ao criar uma jornada, o sistema deve criar sua primeira versão em `DRAFT`.
#### REQ-06.02.002 - O sistema deve permitir criar uma nova versão a partir da versão atual.
#### REQ-06.02.003 - O sistema deve criar a nova versão a partir da versão atualmente selecionada para edição.
#### REQ-06.02.004 - A nova versão deve possuir cópia independente do fluxo, conexões e das telas embutidas (`embeddedScreen`/`embeddedScreenSdui`) de cada User Task.

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.
#### REQ-06.02.005 - Alterações em uma versão `DRAFT` não devem modificar outras versões.
#### REQ-06.02.006 - Uma versão `PUBLISHED` deve ser imutável.
#### REQ-06.02.007 - O sistema deve indicar claramente qual versão está sendo editada.
#### REQ-06.02.008 - O sistema deve impedir números de versão duplicados dentro da mesma jornada.
#### REQ-06.02.009 - Ao salvar o fluxo de uma jornada, o sistema deve manter a versão `DRAFT` atual sincronizada com o conteúdo salvo: se já existir uma versão `DRAFT`, seu conteúdo deve ser substituído (mesmo identificador e número de versão); caso não exista nenhuma `DRAFT` (por exemplo, logo após a publicação da versão anterior), uma nova versão `DRAFT` deve ser criada automaticamente. Em nenhum caso outras versões são alteradas.
#### REQ-06.02.010 - Antes de salvar a edição de uma jornada `PUBLISHED`, o sistema deve avisar o usuário de que a alteração será registrada em uma versão em rascunho separada da publicada.
#### REQ-06.02.011 - Ao salvar um fluxo sem alteração real em relação ao conteúdo já persistido, o sistema deve informar o usuário de que nada foi alterado e não deve gerar ou atualizar a versão `DRAFT`.

### US-06.03 Histórico e consulta
#### REQ-06.03.001 - O sistema deve permitir listar todas as versões de uma jornada.
#### REQ-06.03.002 - O sistema deve permitir consultar o conteúdo completo de uma versão.
#### REQ-06.03.003 - O histórico deve exibir número, status, datas e autor da versão.
#### REQ-06.03.004 - O sistema deve permitir ordenar versões por número ou data.
#### REQ-06.03.005 - O sistema deve diferenciar versões em edição, publicadas, arquivadas e despublicadas.

### US-06.04 Publicação de versões
#### REQ-06.04.001 - O sistema deve permitir publicar uma versão `DRAFT`.
#### REQ-06.04.002 - Antes da publicação, o sistema deve validar a versão completa da jornada.
#### REQ-06.04.003 - A publicação deve enviar ao runtime o snapshot completo da versão selecionada.
#### REQ-06.04.004 - Ao publicar uma nova versão, qualquer versão anteriormente publicada da mesma jornada permanece `PUBLISHED` e com seu deployment intacto no runtime — publicar não é um efeito colateral de despublicar. Uma jornada pode ter mais de uma versão `PUBLISHED` ao mesmo tempo.
#### REQ-06.04.005 - O sistema deve preservar o snapshot de toda versão publicada, atual ou anterior.
#### REQ-06.04.006 - A publicação deve registrar qual versão foi enviada ao runtime, incluindo o identificador do deployment gerado (necessário para despublicar essa versão especificamente, sem afetar outras — ver REQ-06.04.010).
#### REQ-06.04.007 - A jornada deve indicar, como referência rápida, a mais recente entre suas versões atualmente publicadas; a listagem de versões deve exibir o status real de cada uma individualmente.
#### REQ-06.04.008 - Alterações em `DRAFT` não devem modificar o snapshot publicado.
#### REQ-06.04.009 - Ao despublicar uma jornada, toda versão `PUBLISHED` dela deve ser marcada como `UNPUBLISHED`, uma a uma, cada uma despublicando apenas o próprio deployment no runtime (nunca o de outra versão), preservando os snapshots; a jornada deixa de indicar uma versão atualmente publicada. Se qualquer uma dessas versões tiver instância de processo ativa (REQ-06.04.014), a operação para nessa versão e as demais já processadas antes dela permanecem despublicadas.
#### REQ-06.04.010 - O sistema deve permitir despublicar a versão atualmente `PUBLISHED` de uma jornada diretamente pela versão, afetando apenas o deployment dela no runtime; a despublicação de uma versão só deve refletir no status da jornada (`UNPUBLISHED`) quando não restar nenhuma outra versão publicada — se outra versão da mesma jornada continuar `PUBLISHED`, a jornada permanece `PUBLISHED`.
#### REQ-06.04.011 - O sistema deve permitir republicar qualquer versão `UNPUBLISHED` de uma jornada (não apenas a mais recente), sem alterar seu conteúdo/snapshot, retornando-a ao estado `PUBLISHED` e refletindo no status da jornada, que volta a `PUBLISHED`. Uma versão `PUBLISHED` já existente na jornada, se houver, permanece intacta (mesmo comportamento de REQ-06.04.004). Versões `INACTIVE` (jornada excluída) permanecem fora de alcance (REQ-06.05.004).
#### REQ-06.04.012 - Antes de republicar uma versão, o sistema deve informar ao usuário que ela volta a ficar publicada e que outras versões publicadas da jornada não são afetadas, solicitando confirmação antes de prosseguir.
#### REQ-06.04.013 - O sistema deve distinguir uma falha de publicação genuinamente indisponível (runtime inacessível) de uma rejeição de conteúdo (fluxo inválido para o motor de runtime), apresentando ao usuário uma mensagem de erro única e legível, nunca a resposta de erro crua ou aninhada do serviço subjacente.
#### REQ-06.04.014 - O sistema não deve permitir despublicar uma versão que possua uma ou mais instâncias de processo ativas (em execução) no runtime — a operação deve ser bloqueada antes de qualquer remoção de deployment, com uma mensagem clara informando a quantidade de instâncias ativas, para nunca interromper silenciosamente quem já está no meio de uma jornada.

### US-06.05 Compatibilidade e limites da Versão 1.0.0
#### REQ-06.05.001 - O sistema deve preservar versões de jornadas desativadas.
#### REQ-06.05.002 - Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual.
#### REQ-06.05.003 - O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação.
#### REQ-06.05.004 - O sistema não deve permitir restauração ou rollback de versão na versão 1.0.0.
#### REQ-06.05.005 - O sistema deve registrar a versão associada a cada publicação.

# FT-07 Autenticação e autorização

### US-07.01 Autenticação mockada por provedor externo
#### REQ-07.01.001 - O sistema deve representar a autenticação por meio de um provedor externo.
#### REQ-07.01.002 - Na versão 1.0.0, a integração com o provedor externo deve ser mockada.
#### REQ-07.01.003 - O sistema deve disponibilizar uma tela de login padrão.
#### REQ-07.01.004 - A tela de login deve permitir informar usuário e senha.
#### REQ-07.01.005 - A versão 1.0.0 deve disponibilizar o usuário mockado `admin`, com senha `admin` e perfil `ADMIN`.
#### REQ-07.01.006 - O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas.
#### REQ-07.01.007 - O sistema deve indicar que a autenticação utilizada na versão 1.0.0 é mockada e não representa integração real com um provedor.

### US-07.02 Sessão e proteção de acesso
#### REQ-07.02.001 - O sistema deve criar uma sessão autenticada após login bem-sucedido.
#### REQ-07.02.002 - O sistema deve permitir encerrar a sessão.
#### REQ-07.02.003 - O sistema deve expirar sessões após período configurável de inatividade.
#### REQ-07.02.004 - O sistema deve rejeitar requisições com sessão expirada ou inválida.
#### REQ-07.02.005 - As rotas administrativas devem ser protegidas contra acesso anônimo.
#### REQ-07.02.006 - O sistema deve preservar a identificação do usuário autenticado nas operações realizadas.

### US-07.03 Papéis e permissões
#### REQ-07.03.001 - O sistema deve suportar os papéis `ADMIN`, `EDITOR` e `VIEWER`.
#### REQ-07.03.002 - O sistema deve permitir associar um papel a cada usuário.
#### REQ-07.03.003 - O sistema deve impedir operações não autorizadas pelo papel do usuário.
#### REQ-07.03.004 - `VIEWER` deve permitir consulta sem permitir alterações.
#### REQ-07.03.005 - `EDITOR` deve permitir criar e editar jornadas e versões.
#### REQ-07.03.006 - `EDITOR` deve permitir publicar versões.
#### REQ-07.03.007 - `ADMIN` deve possuir acesso administrativo aos recursos do portal.
#### REQ-07.03.008 - A autorização deve ser validada no backend, independentemente da interface.

### US-07.04 Administração de usuários mockados
#### REQ-07.04.001 - O sistema deve representar na versão 1.0.0 o usuário `admin` como usuário administrativo mockado.
#### REQ-07.04.002 - O sistema deve impedir a remoção do último usuário com papel `ADMIN`.
#### REQ-07.04.003 - O sistema deve permitir consultar o usuário autenticado e seu papel.
#### REQ-07.04.004 - O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora da versão 1.0.0.

# FT-08 Auditoria

### US-08.01 Registro de eventos
#### REQ-08.01.001 - O sistema deve registrar eventos relevantes de autenticação, autorização e negócio.
#### REQ-08.01.002 - Cada evento deve possuir identificador único (`auditEventId`).
#### REQ-08.01.003 - Cada evento deve registrar data e hora, ação, resultado e recurso afetado.
#### REQ-08.01.004 - Cada evento deve registrar o usuário responsável ou indicar que foi anônimo.
#### REQ-08.01.005 - Cada evento deve registrar identificador de correlação da requisição, quando disponível.
#### REQ-08.01.006 - O sistema deve registrar eventos de sucesso, falha e acesso negado.

### US-08.02 Eventos auditáveis
#### REQ-08.02.001 - O sistema deve auditar login bem-sucedido e malsucedido.
#### REQ-08.02.002 - O sistema deve auditar logout, expiração e bloqueio de sessão.
#### REQ-08.02.003 - O sistema deve auditar criação, alteração e desativação de produtos, canais e jornadas.
#### REQ-08.02.004 - O sistema deve auditar criação e alteração de versões.
#### REQ-08.02.005 - O sistema deve auditar publicação, republicação e despublicação de jornadas.
#### REQ-08.02.006 - O sistema deve auditar tentativas de acesso negadas por falta de permissão.
#### REQ-08.02.007 - O sistema deve auditar alterações de papéis e configurações de acesso mockadas.

### US-08.03 Proteção dos registros
#### REQ-08.03.001 - Os registros de auditoria não devem ser editáveis por usuários comuns.
#### REQ-08.03.002 - Os registros de auditoria não devem ser removidos por operações normais do sistema.
#### REQ-08.03.003 - O sistema não deve armazenar senhas, tokens, segredos ou credenciais sensíveis nos registros.
#### REQ-08.03.004 - O sistema deve evitar o armazenamento de dados sensíveis nos valores anterior e posterior.
#### REQ-08.03.005 - Falhas de auditoria não podem ser ignoradas silenciosamente.

### US-08.04 Consulta de auditoria
#### REQ-08.04.001 - Usuários autorizados devem poder consultar eventos de auditoria.
#### REQ-08.04.002 - O sistema deve permitir filtrar eventos por usuário, ação, recurso, resultado e período.
#### REQ-08.04.003 - O sistema deve permitir pesquisar eventos por recurso ou correlação.
#### REQ-08.04.004 - O sistema deve apresentar os eventos em ordem cronológica e com paginação.

### US-08.05 Integração com SIEM

> **Nova (2026-09-05), não iniciada.** Cobre o envio dos eventos já registrados (US-08.01/US-08.02)
> a uma ferramenta de SIEM (Security Information and Event Management) corporativa, seguindo os
> padrões de formato/transporte/segurança de mercado (CEF/Syslog RFC 5424, controles de log e
> monitoramento equivalentes aos exigidos por ISO 27001/SOC 2/PCI-DSS) — não um formato proprietário
> deste sistema.

#### REQ-08.05.001 - O sistema deve permitir configurar o envio dos eventos de auditoria (US-08.01/US-08.02) a uma ferramenta de SIEM corporativa, habilitável e desabilitável por ambiente sem alteração de código.
#### REQ-08.05.002 - O sistema deve exportar cada evento de auditoria em um formato padrão de mercado reconhecido por ferramentas de SIEM (ex.: CEF — Common Event Format —, ou um JSON estruturado equivalente), preservando os campos mínimos já exigidos para o evento local (REQ-08.01.002 a 006).
#### REQ-08.05.003 - O sistema deve transportar os eventos ao SIEM por um canal padrão de mercado — Syslog (RFC 5424) sobre TCP, ou um endpoint HTTP/HTTPS de recebimento — configurável conforme a ferramenta de destino.
#### REQ-08.05.004 - A comunicação com o SIEM deve ser cifrada em trânsito (TLS); a integração não deve operar em texto plano.
#### REQ-08.05.005 - A integração deve se autenticar perante o SIEM (token, certificado ou credencial equivalente), com a credencial configurável por ambiente e nunca embutida em código-fonte.
#### REQ-08.05.006 - O timestamp de cada evento exportado deve ser expresso em UTC, no formato ISO 8601, permitindo correlação cronológica confiável com outros sistemas monitorados pelo mesmo SIEM.
#### REQ-08.05.007 - O envio de eventos ao SIEM deve ser assíncrono, sem bloquear ou atrasar a operação que originou o evento nem a gravação do registro de auditoria local — a fonte de verdade do evento é sempre o registro local (US-08.01), nunca a entrega ao SIEM.
#### REQ-08.05.008 - Uma falha ou indisponibilidade do SIEM não pode impedir, atrasar ou reverter a operação de negócio que originou o evento, nem impedir seu registro local.
#### REQ-08.05.009 - O sistema deve reter temporariamente (fila ou buffer local) os eventos não entregues durante uma indisponibilidade do SIEM, reenviando-os automaticamente quando a conectividade for restabelecida, com uma política documentada de limite e descarte caso o volume acumulado exceda a capacidade prevista.
#### REQ-08.05.010 - Uma falha de entrega ao SIEM deve ser registrada em log técnico da própria aplicação, sem gerar um novo evento de auditoria recursivo para essa falha.
#### REQ-08.05.011 - O sistema deve prover um mecanismo de teste de conectividade com o SIEM configurado, verificável sob demanda por um administrador.
#### REQ-08.05.012 - Por padrão, todo evento de auditoria já registrado (US-08.02) deve ser elegível para envio ao SIEM; o sistema deve permitir filtrar quais categorias ou níveis de severidade são efetivamente encaminhados, para controlar volume sem deixar de registrar localmente os eventos filtrados.
#### REQ-08.05.013 - Eventos que representem indício de ataque ou abuso — múltiplas tentativas de login malsucedidas, múltiplos acessos negados por falta de permissão, alteração de papel/permissão de usuário, alteração ou remoção de credencial — devem ser sempre elegíveis para envio ao SIEM, independentemente do filtro de severidade configurado (REQ-08.05.012).
#### REQ-08.05.014 - Os eventos exportados ao SIEM devem seguir a mesma política de dados do registro local: nenhuma senha, token, segredo ou credencial sensível deve trafegar para o SIEM (mesma regra de REQ-08.03.003/004).
#### REQ-08.05.015 - O sistema deve identificar, em cada evento exportado, o sistema de origem (nome e ambiente do Admin Portal) e um identificador de correlação, permitindo que o SIEM associe eventos deste sistema aos de outros sistemas corporativos monitorados.

# FT-09 Ajuda e Suporte

## Objetivo

Fornecer aos usuários do Admin Portal orientação sobre o uso do sistema por
meio de perguntas frequentes e um canal direto de contato com o time de
sustentação.

### US-09.01 Central de ajuda
#### REQ-09.01.001 - O sistema deve disponibilizar uma tela de ajuda acessível a partir do menu do Admin Portal.
#### REQ-09.01.002 - A tela de ajuda deve apresentar um conjunto de perguntas frequentes (FAQ) organizadas por tema.
#### REQ-09.01.003 - O sistema deve permitir pesquisar textualmente o conteúdo do FAQ.
#### REQ-09.01.004 - O conteúdo do FAQ deve ser mantido como conteúdo estático versionado com o sistema.
#### REQ-09.01.005 - A tela de ajuda deve exibir o contato do time de sustentação (`sustentacao@telefonica.com`) como link `mailto:`, abrindo o cliente de e-mail padrão do usuário.

# FT-10 Observabilidade

## Objetivo

Registrar em log técnico da aplicação toda transação de persistência em banco
de dados e toda entrada/saída de API do backend, correlacionando as linhas de
log de uma mesma requisição, para apoiar diagnóstico e troubleshooting em
produção. Distinto da auditoria de negócio (FT-08), que é uma trilha
persistida em banco para fins de compliance/rastreabilidade — observabilidade
aqui é log técnico de execução, consumido via console/arquivo e, futuramente,
por uma stack de observabilidade centralizada (ELK).

### US-10.01 Log de requisições de API
#### REQ-10.01.001 - O sistema deve registrar em log a entrada de toda requisição HTTP recebida pela API, incluindo método e caminho.
#### REQ-10.01.002 - O sistema deve registrar em log a saída de toda requisição HTTP, incluindo status de resposta e duração do processamento.
#### REQ-10.01.003 - O log de requisição e resposta não deve registrar o corpo (body) da requisição por padrão, para evitar exposição de dados sensíveis.

### US-10.02 Log de transações de persistência
#### REQ-10.02.001 - O sistema deve registrar em log o início de toda transação da camada de aplicação que represente uma operação de persistência em banco de dados.
#### REQ-10.02.002 - O sistema deve registrar em log a conclusão de uma transação bem-sucedida, incluindo sua duração.
#### REQ-10.02.003 - O sistema deve registrar em log a falha de uma transação, incluindo a causa do erro, sem interromper a propagação da exceção original.

### US-10.03 Correlação de logs
#### REQ-10.03.001 - Toda requisição de API deve ser associada a um identificador de correlação.
#### REQ-10.03.002 - O identificador de correlação deve ser reaproveitado do cabeçalho `X-Correlation-Id` da requisição quando presente, ou gerado pelo sistema quando ausente.
#### REQ-10.03.003 - O identificador de correlação deve estar presente em todas as linhas de log emitidas durante o processamento da requisição, incluindo as de transação de persistência.
#### REQ-10.03.004 - O identificador de correlação deve ser retornado ao cliente no cabeçalho de resposta.

### US-10.04 Preparação para integração com ELK
#### REQ-10.04.001 - O sistema deve estar tecnicamente preparado para o envio dos logs de aplicação a uma stack ELK (Elasticsearch/Logstash/Kibana), permanecendo essa integração desativada na versão 1.0.0 por não haver ambiente ELK disponível.
#### REQ-10.04.002 - O sistema deve documentar o procedimento (how-to) para habilitar a integração com o ELK quando um ambiente estiver disponível.

<br/>

# FT-11 Testes

## Objetivo

Garantir cobertura de teste automatizado nas camadas críticas do Admin Portal, permitindo detectar regressões antes de produção.

### US-11.01 Testes unitários de domínio (back)
#### REQ-11.01.001 - O sistema deve possuir testes unitários para as regras estruturais do fluxo (`FlowValidator`): cardinalidade de START/END, caminho contínuo entre início e fim, elemento inicial único.
#### REQ-11.01.002 - O sistema deve possuir testes unitários para as regras de versionamento de jornada: criação de DRAFT, publicação, despublicação, republicação, imutabilidade de versão `PUBLISHED`.
#### REQ-11.01.003 - O sistema deve possuir testes unitários para as regras de formulário: nome de campo único, tipos/subtipos de campo, geração da árvore SDUI.
#### REQ-11.01.004 - O sistema deve possuir testes unitários para as regras de integridade entre produto/canal/jornada (bloqueio de desativação com publicação ativa).

### US-11.02 Testes de integração de API (back)
#### REQ-11.02.001 - O sistema deve possuir testes de integração cobrindo o CRUD completo de produtos, canais e jornadas via API.
#### REQ-11.02.002 - O sistema deve possuir testes de integração cobrindo o ciclo de publicação/despublicação/republicação de versões, incluindo o registro de auditoria de sucesso e falha.
#### REQ-11.02.003 - O sistema deve possuir testes de integração cobrindo autenticação e autorização por papel (`ADMIN`/`EDITOR`/`VIEWER`) nos principais endpoints.
#### REQ-11.02.004 - O sistema deve possuir testes de integração cobrindo o CRUD de formulários e a associação a User Tasks.

### US-11.03 Testes de frontend
#### REQ-11.03.001 - O sistema deve possuir testes automatizados para o form builder (adicionar/remover campo, validação de nome técnico único, subtipos de `INPUT`).
#### REQ-11.03.002 - O sistema deve possuir testes automatizados para a validação estrutural do editor de fluxo (bloqueio de ações inválidas).

### US-11.04 Cenários end-to-end
#### REQ-11.04.001 - O sistema deve possuir um cenário end-to-end cobrindo o fluxo completo: criar produto → canal → jornada → formulário → fluxo → publicar → despublicar.
#### REQ-11.04.002 - O sistema deve possuir um cenário end-to-end cobrindo criação, publicação e republicação de múltiplas versões de uma mesma jornada.

<br/>

# FT-12 Infraestrutura

## Objetivo

Definir e implementar a infraestrutura de suporte à solução: identidade, containerização, orquestração, esteira de entrega e configuração de ambientes/banco de dados.

### US-12.01 Identidade da solução
#### REQ-12.01.001 - Definição da sigla sistêmica e disponibilização de ambiente na Azure.

### US-12.02 Containerização (Docker)
#### REQ-12.02.001 - Criar Dockerfile para o admin-back.
#### REQ-12.02.002 - Criar Dockerfile para o admin-front (build estático servido por um servidor web).
#### REQ-12.02.003 - Criar docker-compose para ambiente de desenvolvimento local (back + front + banco de dados).

### US-12.03 Orquestração (Kubernetes)
#### REQ-12.03.001 - Criar manifests/Helm chart para deploy do admin-back no cluster.
#### REQ-12.03.002 - Criar manifests/Helm chart para deploy do admin-front no cluster.
#### REQ-12.03.003 - Configurar ConfigMap/Secret para variáveis de ambiente e credenciais por ambiente.
#### REQ-12.03.004 - Definir requests/limits de recursos e health checks (liveness/readiness) para os workloads.
#### REQ-12.03.005 - Configurar ingress/roteamento externo para os serviços expostos.

### US-12.04 Esteira CI/CD
#### REQ-12.04.001 - Pipeline de build e testes automatizados a cada push/PR (integrado ao FT-11 Testes).
#### REQ-12.04.002 - Pipeline de build e publicação de imagem Docker em um registry.
#### REQ-12.04.003 - Pipeline de deploy automatizado por ambiente (dev/qa/prod), com aprovação manual obrigatória para produção.
#### REQ-12.04.004 - Versionamento semântico e tagueamento de releases.

### US-12.05 Ambientes e configuração
#### REQ-12.05.001 - Formalizar a configuração dos perfis dev/qa/prod, com variáveis de ambiente próprias por ambiente.
#### REQ-12.05.002 - Documentar o procedimento de subida de cada ambiente (how-to).

### US-12.06 Banco de dados
#### REQ-12.06.001 - Indicar a necessidade de criação da base de dados por ambiente.

<br/><br/>

# FT-13 Dashboard

## Objetivo

Dar visibilidade operacional em tempo real sobre os processos em execução no motor de runtime — instâncias ativas, tarefas pendentes, incidentes, tendências e processos por volume — a partir de uma única tela, sem precisar acessar o motor diretamente. É a primeira tela apresentada ao entrar no Admin Portal.

### US-13.01 Indicadores em tempo real
#### REQ-13.01.001 - O sistema deve apresentar a quantidade de instâncias ativas no motor de runtime.
#### REQ-13.01.002 - O sistema deve apresentar a quantidade de tarefas pendentes no motor de runtime.
#### REQ-13.01.003 - O sistema deve apresentar a quantidade de incidentes abertos no motor de runtime.
#### REQ-13.01.004 - O sistema deve apresentar a quantidade de jornadas distintas implantadas no motor de runtime.
#### REQ-13.01.005 - O sistema deve apresentar a quantidade de instâncias concluídas no dia corrente.

### US-13.02 Tendência de execução
#### REQ-13.02.001 - O sistema deve apresentar um gráfico de instâncias iniciadas versus concluídas ao longo do tempo.
#### REQ-13.02.002 - O gráfico deve permitir alternar a granularidade entre últimas 24 horas (por hora), últimos 7 dias (por dia) e últimos 30 dias (por dia), com últimas 24 horas como visão padrão.

### US-13.03 Processos por volume
#### REQ-13.03.001 - O sistema deve apresentar um gráfico com a quantidade de instâncias por jornada, somando todas as versões implantadas.
#### REQ-13.03.002 - O gráfico deve indicar quando uma jornada possui incidentes associados.

### US-13.04 Incidentes ativos
#### REQ-13.04.001 - O sistema deve listar os incidentes ativos, com jornada, tipo e mensagem.
#### REQ-13.04.002 - O sistema deve indicar visualmente quando não há incidentes ativos.

### US-13.05 Instâncias pendentes e encerramento manual
#### REQ-13.05.001 - O sistema deve listar as instâncias ativas há mais tempo, como candidatas a abandonadas.
#### REQ-13.05.002 - O sistema deve permitir encerrar manualmente uma instância.
#### REQ-13.05.003 - O sistema deve permitir selecionar e encerrar múltiplas instâncias de uma vez.
#### REQ-13.05.004 - O sistema deve exigir confirmação do usuário antes de encerrar uma ou mais instâncias.
#### REQ-13.05.005 - O encerramento manual de instâncias deve ser restrito aos papéis `EDITOR` e `ADMIN`.

### US-13.06 Execução recente
#### REQ-13.06.001 - O sistema deve listar as instâncias iniciadas mais recentemente, com jornada, identificador e tempo em execução.

### US-13.07 Atualização dos dados
#### REQ-13.07.001 - O sistema deve permitir atualizar manualmente os dados do dashboard.
#### REQ-13.07.002 - O sistema deve permitir ligar e desligar a atualização automática periódica.
#### REQ-13.07.003 - O sistema deve indicar o horário da última atualização.

### US-13.08 Acesso
#### REQ-13.08.001 - O dashboard deve ser a primeira tela apresentada ao acessar o portal.
#### REQ-13.08.002 - O sistema deve disponibilizar um item de menu dedicado ao dashboard.

### US-13.09 Auditoria de ações administrativas
#### REQ-13.09.001 - O encerramento manual de uma instância deve ser registrado na auditoria do portal.
#### REQ-13.09.002 - O início de uma execução deve ser registrado na auditoria do portal.

<br/><br/>

# FT-14 Catálogo de Integrações

## Objetivo

Centralizar o cadastro de clusters/brokers de mensageria corporativos e das
referências de credencial usadas para acessá-los, servindo de base para os
conectores de mensageria (Kafka, Event Hubs, Service Bus) configurados nas
jornadas (FT-03) — sem que a plataforma armazene segredo algum: cada
credencial é apenas uma referência a um segredo mantido no Azure Key Vault da
empresa.

### US-14.01 Catálogo de clusters e brokers corporativos
#### REQ-14.01.001 - O sistema deve permitir cadastrar um cluster/broker de mensageria corporativo, com nome amigável, tipo (`KAFKA`, `EVENT_HUBS` ou `SERVICE_BUS`) e endereço de conexão (bootstrap servers para Kafka; namespace para Event Hubs/Service Bus).
#### REQ-14.01.002 - Cada cluster deve possuir identificador único (`clusterId`), nome único na plataforma e status (ativo/inativo).
#### REQ-14.01.003 - O sistema deve permitir editar, consultar e desativar um cluster cadastrado.
#### REQ-14.01.004 - O sistema deve impedir a desativação de um cluster referenciado por alguma credencial ativa (US-14.02) ou por algum conector de jornada publicada.
#### REQ-14.01.005 - O sistema deve permitir pesquisar e filtrar clusters por tipo e por status.
#### REQ-14.01.006 - A empresa opera múltiplos clusters corporativos por tipo (ex.: mais de um cluster Kafka); o catálogo não deve assumir um único cluster fixo por tipo de conector.
---

### US-14.02 Catálogo de credenciais
#### REQ-14.02.001 - O sistema deve permitir cadastrar uma credencial associada a um cluster do catálogo (US-14.01), composta por nome de referência (o valor usado como `credentialRef` na configuração do conector), URI do Azure Key Vault e nome do secret dentro dele.
#### REQ-14.02.002 - Cada credencial deve possuir identificador único (`credentialId`), nome de referência único na plataforma, cluster associado e status (ativa/inativa).
#### REQ-14.02.003 - O sistema não deve, em nenhuma tela, campo, log ou registro de auditoria, armazenar ou exibir o valor do secret — apenas a referência (URI do Key Vault + nome do secret). O valor real do segredo nunca deve ser lido pelo Admin Portal, em nenhuma circunstância.
#### REQ-14.02.004 - O sistema deve permitir editar, consultar e desativar uma credencial cadastrada.
#### REQ-14.02.005 - O sistema deve impedir a desativação de uma credencial referenciada por algum conector de jornada publicada.
#### REQ-14.02.006 - O sistema deve permitir pesquisar e filtrar credenciais por cluster associado e por status.
---

### US-14.03 Acesso restrito à administração dos catálogos
#### REQ-14.03.001 - A criação, edição e desativação de clusters (US-14.01) e credenciais (US-14.02) deve ser restrita ao papel `ADMIN` (FT-07); os papéis `EDITOR` e `VIEWER` não devem ter acesso a essas ações.
#### REQ-14.03.002 - O papel `EDITOR`, ao configurar um conector de mensageria numa jornada (FT-03), deve poder selecionar um cluster e uma credencial já cadastrados no catálogo, sem poder criar, editar ou desativar entradas do catálogo.
#### REQ-14.03.003 - Toda criação, edição e desativação de cluster ou credencial deve ser registrada na auditoria do portal (FT-08), incluindo o usuário responsável.
---

### US-14.04 Teste de conexão
#### REQ-14.04.001 - O sistema deve permitir, a partir do catálogo, disparar um teste de conexão para um par cluster + credencial cadastrado, validando alcançabilidade do cluster e validade da credencial associada.
#### REQ-14.04.002 - O teste de conexão deve se limitar a uma operação de metadado (ex.: descrever/listar o tópico, fila ou hub) — o sistema não deve, em nenhuma hipótese, publicar ou consumir uma mensagem real como parte do teste.
#### REQ-14.04.003 - A execução do teste de conexão deve ser delegada ao componente de runtime responsável por resolver credenciais junto ao Key Vault (o mesmo worker que executa a integração de verdade), nunca executada diretamente pelo admin-back ou pelo navegador — preservando a regra de que o admin-back nunca acessa o Key Vault.
#### REQ-14.04.004 - O resultado do teste deve indicar sucesso, ou falha traduzida para uma causa reconhecível (cluster inacessível, credencial inválida, sem permissão/ACL no recurso) — nunca repassar ao usuário o erro cru do broker ou do Key Vault sem tradução.
#### REQ-14.04.005 - O teste de conexão também deve estar disponível a partir do painel/assistente de configuração de um conector de mensageria na jornada (US-03.14), reaproveitando o par cluster + credencial já selecionado naquele conector.
---

### US-14.05 Conectores de mensageria adicionais no framework
#### REQ-14.05.001 - O catálogo de conectores (REQ-03.08.003/004) deve habilitar `EVENT_HUBS` e `SERVICE_BUS` como tipos válidos para uso em `SERVICE_TASK`, `RECEIVE_TASK` e `MESSAGE_START_EVENT`, seguindo a mesma regra de operação determinada pelo tipo de nó já aplicada ao Kafka (REQ-03.09.008): `PRODUCE` para `SERVICE_TASK`, `CONSUME` para `RECEIVE_TASK`/`MESSAGE_START_EVENT`.
#### REQ-14.05.002 - A configuração de `EVENT_HUBS`/`SERVICE_BUS` deve reaproveitar o mesmo padrão de mapeamento de saída (REQ-03.09.010) e de referência a variáveis `{{nome}}` (REQ-03.09.012) já usado por REST e Kafka.
#### REQ-14.05.003 - O campo equivalente a "tópico" — nome do Event Hub, ou fila/tópico do Service Bus — deve ser selecionado a partir do catálogo de clusters (US-14.01), nunca digitado como texto livre.
#### REQ-14.05.004 - A partir desta capacidade, o campo de credencial de um conector `KAFKA`, `EVENT_HUBS` ou `SERVICE_BUS` deve ser selecionado a partir do catálogo de credenciais (US-14.02) em vez de texto livre — substitui, para esses conectores, o campo de texto livre descrito em REQ-03.09.005.
#### REQ-14.05.005 - O assistente de configuração de conector (US-03.14) deve ganhar as mesmas 3 etapas hoje aplicadas ao Kafka (Conexão, Payload, Mapear saída) para `EVENT_HUBS` e `SERVICE_BUS`, com a etapa "Conexão" oferecendo os seletores de cluster e credencial em vez de campos de texto.
---

### US-14.06 Credencial de IA
#### REQ-14.06.001 - O sistema deve permitir cadastrar, atualizar e remover uma credencial de API de um provedor de IA (Gemini), restrito ao papel `ADMIN`.
#### REQ-14.06.002 - A API não deve, em nenhuma resposta, retornar o valor da chave salva — apenas seu status (configurada/não configurada) e a data da última atualização.
#### REQ-14.06.003 - Diferente do catálogo de credenciais de mensageria (REQ-14.02.003), esta credencial é armazenada em texto plano no banco de dados, como desvio deliberado e temporário do princípio de nunca persistir segredo — decisão registrada no código com pendência explícita de criptografia antes de produção.
---

<br/><br/>

# FT-15 Diagnóstico

## Objetivo

Permitir investigar o comportamento de qualquer execução de jornada no motor de runtime — iniciada pela funcionalidade Executar do Admin Portal (FT-05) ou por um canal digital — de forma independente da tela de Execução ao vivo. Como toda execução roda contra o mesmo motor de runtime (REQ-05.04.001), o Diagnóstico enxerga as duas origens sem distinção, sem exigir nenhuma marcação adicional na instância.

### US-15.01 Busca de execuções
#### REQ-15.01.001 - O sistema deve permitir buscar execuções por jornada, por business key ou por instance ID, com o usuário escolhendo explicitamente o tipo de busca.
#### REQ-15.01.002 - A busca por jornada deve oferecer um autocomplete das jornadas publicadas e filtrar as execuções pela jornada selecionada.
#### REQ-15.01.003 - A busca por business key deve filtrar exatamente pelo valor informado.
#### REQ-15.01.004 - A busca por instance ID deve levar diretamente ao detalhe da execução (US-15.03), sem passar pela listagem.
#### REQ-15.01.005 - Ao buscar por um instance ID que não exista, o sistema deve apresentar a mensagem de erro na própria tela de busca, sem navegar para a tela de detalhe.
#### REQ-15.01.006 - O sistema deve permitir filtrar a busca por período (data de início).
#### REQ-15.01.007 - A tela de Diagnóstico não deve apresentar nenhuma listagem de execuções antes de uma busca ser realizada.
---

### US-15.02 Listagem de execuções
#### REQ-15.02.001 - A listagem deve agrupar as execuções por jornada e versão por padrão, com opção de desagrupar e ver a lista plana.
#### REQ-15.02.002 - A listagem deve permitir ordenar pela data/hora de início, de forma crescente ou decrescente.
#### REQ-15.02.003 - Cada execução listada deve indicar seu estado (em execução, concluída ou encerrada) com destaque visual.
#### REQ-15.02.004 - A listagem deve cobrir execuções originadas tanto pela funcionalidade Executar do Admin Portal quanto por canais digitais, sem distinção de origem entre elas.
---

### US-15.03 Detalhe de uma execução
#### REQ-15.03.001 - Ao selecionar uma execução, o sistema deve apresentar o fluxo percorrido, as variáveis do processo e o log cronológico, reaproveitando o mesmo painel de observabilidade da Execução (FT-05 US-05.06/US-05.10).
#### REQ-15.03.002 - O sistema deve permitir voltar da tela de detalhe para a busca sem perder os resultados da busca anterior.
---

### US-15.04 Independência da tela de Execução
#### REQ-15.04.001 - O Diagnóstico deve ser uma funcionalidade separada da Execução, acessível por item de menu próprio.
#### REQ-15.04.002 - A tela de Execução não deve oferecer busca ou consulta de execuções passadas — cobre apenas a execução ao vivo em andamento.
---

<br/><br/>

# 5. Fora do Escopo da Versão 1.0.0 

## Evolução de Plataforma
```text
Governança Corporativa
Workflow de Aprovação
Publicação Agendada
Rollback
Promotion Between Environments
Analytics
Gestão de Tenants

```
## Modelagem Visual

```text
Criação rápida de elementos
Seleção múltipla
Duplicação em massa
Criação automática de próximos passos
Gateway com mais de duas saídas (múltiplas condições em cascata/"senão se")
Gateway inclusivo (múltiplos caminhos simultâneos)
Gateway paralelo (fork/join)
Combinação de condições com operadores lógicos (E/OU) numa mesma saída
Edição visual de expressões compostas (grupos de condições aninhados)
```

## Jornadas e Versionamento

```text
Clonagem de jornadas entre tipos de canal
Biblioteca de componentes de formulário
Comparação (diff) visual entre versões de uma jornada
```

## Catálogo Server Driven UI (SDUI)

```text
Formulários multi-etapas (wizard)
Fontes de dados dinâmicas - $dataSource e estratégia de prefetch no servidor ou no cliente
Paginação de opções carregadas dinamicamente
```

> **Nota de revisão (2026-08-24):** "Seções" e "Organização dinâmica de campos" saíram desta lista — implementadas nesta revisão (REQ-04.02.011, US-03.16).
>
> **Nota de revisão (2026-09-05):** "Exibição condicional" saiu desta lista — implementada nesta revisão como visibilidade condicional de componente (US-04.12), avaliada em runtime. A seção inteira foi renomeada de "Formulários Avançados (SDUI)" pra acompanhar o novo nome da FT-04 (Catálogo Server Driven UI).
