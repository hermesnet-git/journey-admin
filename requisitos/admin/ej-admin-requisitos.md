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

Permitir o gerenciamento dos produtos e dos canais através dos quais suas
jornadas serão disponibilizadas.



### US-01.01 Gestão de produtos

#### REQ-01.01.001 - O sistema deve permitir cadastrar produtos.
#### REQ-01.01.002 - O sistema deve permitir editar produtos.
#### REQ-01.01.003 - O sistema deve permitir consultar produtos.
#### REQ-01.01.004 - O sistema deve permitir desativar e reativar produtos.
#### REQ-01.01.005 - Cada produto deve possuir identificador único (`productId`), nome, descrição obrigatória e status.

### US-01.02 Gestão de canais
#### REQ-01.02.001 - O sistema deve permitir cadastrar canais dentro de um produto.
#### REQ-01.02.002 - O sistema deve permitir editar canais.
#### REQ-01.02.003 - O sistema deve permitir consultar canais.
#### REQ-01.02.004 - O sistema deve permitir desativar e reativar canais.
#### REQ-01.02.005 - Todo canal deve pertencer a exatamente um produto.
#### REQ-01.02.006 - Cada canal deve possuir identificador único (`channelId`), nome, descrição obrigatória, tipo e status.
#### REQ-01.02.007 - O sistema deve suportar os tipos de canal `WEB`, `MOBILE`, `WHATSAPP`, `URA`, `CONTACT_CENTER` e `OTHER`.


### US-01.03 Catálogo e descoberta
#### REQ-01.03.001 - O sistema deve permitir pesquisar produtos por nome.
#### REQ-01.03.002 - O sistema deve permitir filtrar produtos por status.
#### REQ-01.03.003 - O sistema deve permitir listar os canais de um produto.
#### REQ-01.03.004 - O sistema deve permitir pesquisar canais por nome.
#### REQ-01.03.005 - O sistema deve permitir filtrar canais por produto, tipo e status.
#### REQ-01.03.006 - O sistema deve exibir a quantidade de canais associados a cada produto.
#### REQ-01.03.007 - O sistema deve exibir a quantidade de jornadas associadas a cada canal.


### US-01.04 Integridade e ciclo de vida
#### REQ-01.04.001 - A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes.
#### REQ-01.04.002 - A desativação de um canal não deve remover suas jornadas ou publicações existentes.
#### REQ-01.04.003 - O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo.
#### REQ-01.04.004 - O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa.
#### REQ-01.04.005 - O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa.

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
#### REQ-02.02.005 - Toda jornada deve estar associada a exatamente um canal.
#### REQ-02.02.006 - O sistema deve identificar o produto da jornada a partir do canal associado.


### US-02.03 Pesquisa
#### REQ-02.03.001 - O sistema deve permitir pesquisar jornadas por nome.
#### REQ-02.03.002 - O sistema deve permitir filtrar jornadas por produto.
#### REQ-02.03.003 - O sistema deve permitir filtrar jornadas por canal.
#### REQ-02.03.004 - O sistema deve permitir ordenar jornadas por data de criação.
#### REQ-02.03.005 - O sistema deve permitir ordenar jornadas por data de alteração.
#### REQ-02.03.006 - O sistema deve permitir agrupar a listagem de jornadas por produto, por produto e canal, por canal, ou sem agrupamento algum.
#### REQ-02.03.007 - O sistema deve permitir ordenar a listagem de jornadas, em ordem crescente ou decrescente, pelos campos jornada (nome), canal, status ou data de atualização.


Fora do escopo da versão 1.0.0. Esta capacidade permanece registrada como evolução
futura e não faz parte dos requisitos entregáveis desta versão.

### US-02.05 Jornadas específicas por canal
#### REQ-02.05.001 - O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.
#### REQ-02.05.002 - Cada jornada deve possuir definição independente de fluxo e formulários.
#### REQ-02.05.003 - Alterações reali zadas em uma jornada não devem modificar automaticamente jornadas de outros canais.
#### REQ-02.05.004 - O sistema deve exibir o produto e o canal durante toda a edição da jornada.
---

### US-02.06 Publicação de jornadas
#### REQ-02.06.001 - O sistema deve permitir publicar jornadas.
#### REQ-02.06.002 - O sistema deve permitir despublicar jornadas por meio da API do runtime.
#### REQ-02.06.003 - O sistema deve permitir consultar jornadas publicadas.
#### REQ-02.06.004 - Cada jornada deve possuir no maximo uma publicacao ativa, associada a uma versao imutavel. Alteracoes realizadas apos a publicacao nao devem modificar o snapshot publicado; para disponibiliza-las, o usuario deve publicar uma nova versao.
---

### US-02.07 Estado da publicação
#### REQ-02.07.001 - O sistema deve indicar se uma jornada esta publicada.
#### REQ-02.07.002 - O sistema deve indicar a data da publicacao.
#### REQ-02.07.003 - O sistema deve indicar o produto associado a publicacao.
#### REQ-02.07.004 - O sistema deve indicar o canal associado a publicacao.
---

### US-02.08 Catálogo de publicações
#### REQ-02.08.001 - O sistema deve permitir listar jornadas publicadas.
#### REQ-02.08.002 - O sistema deve permitir pesquisar jornadas publicadas.
#### REQ-02.08.003 - O sistema deve permitir filtrar jornadas publicadas por produto.
#### REQ-02.08.004 - O sistema deve permitir filtrar jornadas publicadas por canal.
---

### US-02.09 Publicação no runtime
#### REQ-02.09.001 - O Admin Portal deve iniciar a publicacao por meio de uma chamada de saida para a API de publicacao do runtime.
#### REQ-02.09.002 - A chamada deve enviar a definicao completa da jornada, incluindo produto, canal, fluxo e formularios.
#### REQ-02.09.003 - O Admin Portal deve realizar uma chamada de saída real (HTTP) para a API de publicação do runtime. Após o retorno de sucesso, o Admin Portal deve substituir o snapshot anterior, quando existir, e alterar o estado da jornada para `PUBLISHED`; em caso de falha na chamada, o erro deve propagar e nenhum estado deve ser alterado.
#### REQ-02.09.004 - Ao despublicar, o Admin Portal deve chamar a API de publicação do runtime para remover/desfazer a publicação. Apos o retorno de sucesso, a jornada e sua publicacao devem assumir o estado `UNPUBLISHED`; em caso de falha, os estados atuais devem ser preservados.
---

### US-02.10 Inspeção da publicação
#### REQ-02.10.001 - Para uma jornada com publicação ativa (`PUBLISHED`), o sistema deve permitir visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários, incluindo a árvore SDUI de cada formulário), por meio de uma ação na listagem de jornadas ao lado de "Editar" e "Excluir".
---

<br/>

# FT-03 Modelagem Visual

## Objetivo

Permitir a construção visual do fluxo específico de cada jornada.

---

### US-03.01 Flow designer
#### REQ-03.01.001 - O sistema deve suportar eventos de início, incluindo `START` e `MESSAGE_START_EVENT`.
#### REQ-03.01.002 - O sistema deve suportar eventos de término.
#### REQ-03.01.003 - O sistema deve suportar User Tasks, Service Tasks e Receive Tasks.
#### REQ-03.01.004 - Cada fluxo deve possuir exatamente um elemento inicial (`START` ou `MESSAGE_START_EVENT`) e ao menos um nó `END`; um `GATEWAY` (US-03.11) pode ramificar o fluxo em caminhos que terminam em nós `END` distintos, em vez de reconvergir num único fim.
#### REQ-03.01.005 - Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o elemento inicial `START`, cabendo ao usuário adicionar o nó `END` e os demais elementos antes de salvar.
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
#### REQ-03.09.011 - O nome de cada variável de saída deve ser único no escopo da jornada e seguir a mesma regra de nome técnico dos campos de formulário (REQ-04.01.007).
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

### US-03.16 Pré-visualização de formulário no editor
#### REQ-03.16.001 - Ao selecionar, no canvas, uma `USER_TASK` com formulário associado, o editor deve exibir automaticamente uma pré-visualização do formulário, ancorada à base do canvas, sem exigir uma ação dedicada de clique.
#### REQ-03.16.002 - Ao selecionar qualquer outro elemento do canvas, a pré-visualização deve deixar de ser exibida.
---

### US-03.17 Geração de fluxo assistida por IA
#### REQ-03.17.001 - O sistema deve permitir gerar automaticamente um rascunho de fluxo a partir de uma descrição em linguagem natural (prompt) informada pelo usuário, preenchendo nós e conexões no canvas do editor.
#### REQ-03.17.002 - A geração deve depender de uma credencial de API de IA configurada (US-14.06); sem credencial configurada, o sistema deve informar o usuário e recusar a geração, sem expor detalhe técnico do provedor.
#### REQ-03.17.003 - Um fluxo gerado que viole as regras estruturais de validação (US-03.02) deve ser automaticamente corrigido e reenviado ao modelo de IA (retry/reparo) antes de ser apresentado ao usuário, dentro de um número limitado de tentativas — inclui a rejeição de aspas escapadas (`\"`) em condição de gateway, formato que quebra o parser de expressão do motor de runtime.
#### REQ-03.17.004 - O fluxo gerado deve ser apresentado como um rascunho editável no canvas, sujeito às mesmas regras de validação e à mesma revisão manual de qualquer fluxo criado por edição direta — a geração por IA não substitui a revisão do usuário antes de salvar ou publicar.
#### REQ-03.17.005 - Ao concluir a geração, o canvas deve reposicionar automaticamente a visualização do fluxo gerado (REQ-03.05.005).
---


<br/><br/>

# FT-04 Formulários (SDUI)

## Objetivo

Permitir a criação de formulários utilizados pelas User Tasks.

---

### US-04.01 Form builder
#### REQ-04.01.001 - O sistema deve permitir criar formulários.
#### REQ-04.01.002 - O sistema deve permitir editar formulários.
#### REQ-04.01.003 - O sistema deve permitir remover formulários.
#### REQ-04.01.004 - O sistema deve permitir associar formulários a User Tasks.
#### REQ-04.01.005 - O sistema deve permitir manter uma User Task sem formulário associado; nesse caso, o sistema deve permitir configurar uma mensagem exibida ao usuário, com suporte a interpolação de variáveis do fluxo pela sintaxe `{{nome}}`, resolvida com os valores reais da execução no momento em que a tarefa é apresentada.
#### REQ-04.01.006 - Ao associar um formulário a uma User Task no editor de fluxo, o sistema deve permitir criar um novo formulário sem sair do editor, sendo levado à tela de criação, e deve permitir atualizar a lista de formulários disponíveis para refletir formulários criados nesse meio-tempo.
#### REQ-04.01.007 - Cada campo de formulário deve possuir um `name` técnico, definido pelo usuário, único dentro do formulário e imutável após a criação do campo; o `name` substitui o identificador interno anteriormente usado para referenciar o campo.
---

### US-04.02 Componentes
#### REQ-04.02.001 - O sistema deve suportar componente de texto (`TEXT`), que também cobre o uso anteriormente coberto por um tipo de conteúdo estático separado.
#### REQ-04.02.002 - O sistema deve suportar campo de entrada (`INPUT`).
#### REQ-04.02.003 - O sistema deve suportar seleção simples.
#### REQ-04.02.004 - O sistema deve suportar seleção múltipla.
#### REQ-04.02.005 - O sistema deve suportar upload de arquivo.
#### ~~REQ-04.02.006~~ - ~~O sistema deve suportar conteúdo estático.~~ **Removido**: o tipo `STATIC_CONTENT` foi colapsado em `TEXT` (REQ-04.02.001); os dois tipos tinham o mesmo modelo de dados e divergiam apenas no estilo visual de apresentação.
#### REQ-04.02.007 - O campo `INPUT` deve suportar subtipos de entrada: texto livre, número, e-mail e data.
#### REQ-04.02.008 - O sistema deve permitir configurar validação de formato por subtipo de `INPUT`: faixa mínima/máxima para o subtipo número; expressão regular/máscara para o subtipo texto.
#### REQ-04.02.009 - As opções de campos de seleção simples e múltipla devem ser definidas como pares rótulo/valor (não apenas um rótulo), permitindo que o valor técnico persistido seja diferente do texto exibido ao usuário.
#### REQ-04.02.010 - O campo de upload de arquivo deve permitir configurar as extensões de arquivo aceitas e o tamanho máximo do arquivo.
---

### US-04.03 Reutilização
#### REQ-04.03.001 - O sistema deve permitir reutili zar formulários em múltiplas jornadas.
#### REQ-04.03.002 - O sistema deve permitir reutilizar formulários em múltiplas User Tasks.
---

### US-04.04 Configuração
#### REQ-04.04.001 - O usuário deve poder definir campos obrigatórios.
#### REQ-04.04.002 - O usuário deve poder definir valores padrão.
#### REQ-04.04.003 - O usuário deve poder definir textos de ajuda.
### US-04.05 Preview
#### REQ-04.05.001 - O sistema deve permitir visuali zar o formulário durante a edição.
#### REQ-04.05.002 - O preview deve refletir alterações em tempo real.
---

### US-04.06 Imutabilidade e serialização para publicação
#### REQ-04.06.001 - Ao publicar uma jornada, o conteúdo de cada formulário referenciado pelas User Tasks da versão publicada deve ser copiado integralmente para o snapshot da publicação, tornando-se imutável a alterações futuras feitas no formulário original (mesmo princípio de congelamento aplicado à versão da jornada no FT-06).
#### REQ-04.06.002 - O snapshot de publicação deve conter, para cada formulário, uma representação em árvore de nós no formato `[tag, props, children]` (estilo hyperscript/SDUI), derivada do conteúdo congelado do formulário no momento da publicação. Essa árvore é uma projeção de leitura gerada a partir do modelo de campos; o modelo de campos (não a árvore) continua sendo a fonte de dados editável no form builder.
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
#### REQ-05.02.005 - Para uma User Task sem formulário associado (REQ-04.01.005), o sistema deve apresentar a mensagem configurada com as referências `{{nome}}` já substituídas pelos valores atuais das variáveis do processo.
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
#### REQ-05.07.003 - A pré-visualização da execução deve se adaptar ao canal da jornada (Web ou App), incluindo uma representação visual compatível com o canal (ex.: layout de dispositivo móvel para jornadas de canal App).
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
#### REQ-06.02.004 - A nova versão deve possuir cópia independente do fluxo, conexões e referências aos formulários.
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
#### REQ-06.04.004 - Ao publicar uma nova versão, a versão anteriormente publicada deve ser marcada como `UNPUBLISHED`.
#### REQ-06.04.005 - O sistema deve preservar o snapshot da versão anteriormente publicada.
#### REQ-06.04.006 - A publicação deve registrar qual versão foi enviada ao runtime.
#### REQ-06.04.007 - A jornada deve indicar sua versão atualmente publicada.
#### REQ-06.04.008 - Alterações em `DRAFT` não devem modificar o snapshot publicado.
#### REQ-06.04.009 - Ao despublicar uma jornada, a versão `PUBLISHED` correspondente deve ser marcada como `UNPUBLISHED`, preservando seu snapshot; a jornada deixa de indicar uma versão atualmente publicada.
#### REQ-06.04.010 - O sistema deve permitir despublicar a versão atualmente `PUBLISHED` de uma jornada diretamente pela versão; a despublicação de uma versão deve refletir no status da jornada, que passa a `UNPUBLISHED`.
#### REQ-06.04.011 - O sistema deve permitir republicar qualquer versão `UNPUBLISHED` de uma jornada (não apenas a mais recente), sem alterar seu conteúdo/snapshot, retornando-a ao estado `PUBLISHED` e refletindo no status da jornada, que volta a `PUBLISHED`. Se já existir uma versão `PUBLISHED` na jornada no momento da republicação, essa versão deve ser marcada como `UNPUBLISHED` antes (mesmo comportamento de REQ-06.04.004). Versões `INACTIVE` (jornada excluída) permanecem fora de alcance (REQ-06.05.004).
#### REQ-06.04.012 - Antes de republicar uma versão, se já existir uma versão `PUBLISHED` na jornada, o sistema deve informar ao usuário que a versão publicada atual será substituída e solicitar confirmação antes de prosseguir.
#### REQ-06.04.013 - O sistema deve distinguir uma falha de publicação genuinamente indisponível (runtime inacessível) de uma rejeição de conteúdo (fluxo inválido para o motor de runtime), apresentando ao usuário uma mensagem de erro única e legível, nunca a resposta de erro crua ou aninhada do serviço subjacente.

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
Clonagem de jornadas entre canais
Templates de jornadas
Biblioteca de componentes de formulário
Comparação (diff) visual entre versões de uma jornada
```

## Formulários Avançados (SDUI)

```text
Seções
Exibição condicional
Organização dinâmica de campos
Formulários multi-etapas (wizard)
Fontes de dados dinâmicas - $dataSource e estratégia de prefetch no servidor ou no cliente
Paginação de opções carregadas dinamicamente
```