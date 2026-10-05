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
#### REQ-02.01.010 - Uma jornada recém-criada, de qualquer forma (em branco, a partir de um modelo, por IA ou por importação do Figma), só passa a valer depois que o autor a confirma com "Salvar" no editor; ao cancelar no editor, o sistema deve pedir confirmação e excluir a jornada como se nunca tivesse existido.
#### REQ-02.01.011 - O fluxo gerado por IA ou importado do Figma deve abrir no editor como alteração ainda não salva; "Salvar" grava o fluxo e deixa o rascunho (versão `DRAFT`) para publicação posterior, e numa jornada recém-criada confirma a criação mesmo quando nada mais foi alterado.


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
#### REQ-02.04.002 - O sistema deve listar os modelos disponíveis com identificador estável, nome, descrição, trilha (Primeiros passos, Integrações, Canais, Jornadas de negócio ou Padrões avançados), área de negócio quando houver, canais para os quais o modelo foi pensado, o que o exemplo mostra, os recursos que ele usa e o desenho do fluxo para prévia. Os recursos usados devem ser obtidos do próprio fluxo do modelo, nunca declarados à parte, para que a lista não anuncie algo que o exemplo não faz.
#### REQ-02.04.003 - O modelo escolhido deve preencher somente o fluxo. Nome, descrição, produto e canais da nova jornada devem ser sempre os valores informados pelo usuário.
#### REQ-02.04.004 - Cada uso de um modelo deve gerar novos identificadores de fluxo, nós e conexões, sem compartilhar identidade ou estado mutável entre jornadas.
#### REQ-02.04.005 - A criação da jornada, do fluxo escolhido e da versão inicial `DRAFT` deve ocorrer numa única transação; o snapshot da versão 1 deve conter exatamente os mesmos nós e conexões do fluxo criado.
#### REQ-02.04.006 - Um modelo é uma jornada de exemplo completa — telas, integrações, decisões e notas no canvas explicando cada parte — que o autor ajusta livremente. As configurações que dependem do ambiente (cluster, tópico e credencial de mensageria; fonte de dados de tela) vêm em branco de propósito, são listadas ao autor como "Antes de publicar, escolha" e sinalizadas por nota no canvas. O fluxo resultante permanece sujeito às mesmas regras de validação e publicação de qualquer rascunho.
#### REQ-02.04.007 - A escolha do modelo deve oferecer filtro por trilha (com a quantidade de modelos de cada uma), busca por nome, descrição, área ou recurso sem diferenciar acentos e maiúsculas, e um painel de detalhe com a prévia do fluxo, a quantidade de telas, integrações e decisões, o que o modelo mostra, os recursos usados, os canais e o que configurar antes de publicar. Quando nenhum canal do modelo estiver entre os canais escolhidos para a jornada, o painel deve avisar.
#### REQ-02.04.008 - O catálogo deve conter apenas modelos que a plataforma executa de ponta a ponta: um modelo que dependa de capacidade ainda inexistente (ex.: temporizador, execução em paralelo, subprocesso) só entra junto com a capacidade. As integrações REST dos modelos apontam para o serviço de simulação de APIs do ambiente local.
#### REQ-02.04.009 - Os modelos devem ser mantidos como arquivos versionados com o produto, no mesmo formato do fluxo do editor; na versão 1.0.0 não há cadastro de modelos pela interface.
#### REQ-02.04.010 - Os modelos com nove ou mais etapas devem trazer o fluxo dividido em seções nomeadas (US-03.20), copiadas para a jornada criada junto com o fluxo. Uma jornada recém-criada a partir de modelo deve abrir no editor com o tour das anotações (REQ-03.15.008) na primeira vez, no navegador de quem a criou.

> **Nota de revisão (2026-10-01):** o piloto com um único modelo (“Aprovação de Pedido”) deu lugar a um catálogo de 32 exemplos em cinco trilhas, pensado como ponto de partida e material de aprendizado para quem desenha jornadas. Cada modelo passou a trazer o fluxo completo, em vez de um esqueleto, e a deixar em branco só o que depende do ambiente.

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
#### REQ-03.02.004 - O elemento inicial não deve possuir entrada e deve possuir exatamente uma saída; cada `USER_TASK`, `SERVICE_TASK` e `RECEIVE_TASK` deve possuir ao menos uma entrada e exatamente uma saída; o nó `END` deve possuir ao menos uma entrada e nenhuma saída. A saída "Se falhar" de uma integração REST (REQ-03.02.009) é adicional e não conta nesse limite.
#### REQ-03.02.005 - Todos os nós devem pertencer a um caminho contínuo e alcançável entre o elemento inicial e `END`.
#### REQ-03.02.006 - O editor deve impedir ações que produ zam uma estrutura incompatível, e o backend deve rejeitar com `422` qualquer tentativa de persistir um fluxo que não cumpra as restrições estruturais.
#### REQ-03.02.007 - Uma `USER_TASK` deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma `USER_TASK` que já possua saída.
#### REQ-03.02.008 - O backend deve rejeitar (422), ao salvar o fluxo, um caminho que parta do elemento inicial e alcance um nó `END` sem passar por nenhum "checkpoint" (`USER_TASK`, `RECEIVE_TASK`, `SERVICE_TASK` com conector diferente de `REST`, ou `SERVICE_TASK` REST executada em segundo plano — REQ-03.18.006) — evita uma jornada que resolveria inteiramente dentro de uma única transação síncrona do motor de runtime, cenário em que o motor não expõe histórico algum da execução (sofre rollback antes de qualquer consulta conseguir lê-lo).
#### REQ-03.02.009 - Uma `SERVICE_TASK` com conector — `REST` ou de mensageria (publicar mensagem) — pode ter, além da saída normal, uma única saída "Se falhar", usada quando a chamada ou o envio falha de vez (REQ-03.18.004 e REQ-03.18.010). Uma `RECEIVE_TASK` com conector de mensageria (espera por mensagem) também pode tê-la, usada quando o tempo limite da espera esgota (REQ-03.18.014). Essa saída não leva condição nem pode ser o caminho padrão, e não é permitida em nenhum outro tipo de etapa; o editor deve oferecê-la por um ponto de conexão próprio na etapa, sempre visível e disponível assim que um conector é escolhido (mesmo antes de configurado), e desenhá-la de forma distinta (linha tracejada na cor de erro, com o rótulo "Se falhar"), e o backend deve rejeitar (422) qualquer saída "Se falhar" fora dessas regras. Numa `SERVICE_TASK` sem conector, o mesmo ponto aparece desabilitado, explicando ao passar o mouse que é preciso escolher um conector; o grupo Conector do painel de propriedades traz a mesma explicação.
#### REQ-03.02.010 - Quando o editor recusar uma ligação, deve avisar o motivo: a etapa já tem um caminho "Se falhar" (com a orientação de arrastar a ponta do caminho existente para trocar o destino), o caminho "Se falhar" existe só para integração REST, publicação de mensagem ou espera por mensagem, ou a etapa já tem o número máximo de saídas. Vale ao puxar uma ligação nova e ao mudar a origem de uma existente.
#### REQ-03.02.011 - Uma ligação puxada deve poder ser solta em qualquer parte da etapa de destino, não só no ponto de entrada; etapas sem entrada (elementos iniciais), a própria etapa de origem e as anotações não recebem ligação.
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
#### REQ-03.09.011 - O nome de cada variável de saída de integração (outputMapping, REQ-03.09.010) deve ser único no escopo da jornada inteira. O nome técnico de um campo que coleta valor na tela embutida de uma User Task (`embeddedScreen`, US-03.16) compartilha esse mesmo espaço de nomes em relação às variáveis de saída de integração e às variáveis de entrada da jornada (REQ-03.12.002) — não pode colidir com nenhuma delas — mas pode se repetir entre campos de telas diferentes, seguindo a mesma regra de nome técnico dos campos de formulário (REQ-04.01.007).

> **Nota de revisão (2026-08-24):** requisito reescrito para deixar explícito que campos de tela embutida entram no mesmo espaço de nomes — mesma mudança que substituiu a associação por `formId` pelo desenho direto da tela no nó, motivada pela limitação da Runtime Engine a poucos tipos de campo nativos.

> **Nota de revisão (2026-09-12):** requisito ajustado para permitir que um campo de tela reapareça em mais de uma etapa da jornada usando o mesmo nome técnico — releitura e edição de um valor já coletado, prevista desde sempre no vínculo de leitura-e-escrita do catálogo SDUI v1 (seção 8.1: o valor atual do caminho é lido antes de aceitar a alteração), mas até então bloqueada por uma checagem de unicidade mais rígida do que o necessário. A colisão continua proibida contra variável de saída de integração ou de entrada da jornada, onde reaproveitar o nome à revelia seria quase sempre um erro de digitação, nunca uma reedição intencional — e não há ambiguidade em tempo de execução ao permitir a repetição entre campos de tela, já que o gateway desta versão é sempre exclusivo (REQ-03.11.001): nunca há dois caminhos da jornada rodando ao mesmo tempo para colidir de verdade.
#### REQ-03.09.012 - O sistema deve permitir referenciar, nos campos de entrada de URL, headers e body/payload de uma integração, variáveis produzidas por passos anteriores do fluxo (respostas de formulário e saídas de integrações), usando o nome da variável no motor entre chaves duplas: `{{form_nome}}` (campo de tela), `{{data_nome}}` (saída de integração ou variável de entrada do início) ou `{{channel}}` (o canal).
#### REQ-03.09.013 - O editor deve exibir, para cada `SERVICE_TASK`/`RECEIVE_TASK`, a lista de variáveis disponíveis naquele ponto do fluxo, calculada a partir dos nós alcançáveis entre o elemento inicial e o nó selecionado.
#### REQ-03.09.014 - O backend deve rejeitar (422), ao salvar o fluxo, a configuração de conector que referencie `{{variavel}}` inexistente no contexto do nó (nome não declarado por nenhum passo anterior alcançável) ou que use uma forma diferente do nome da variável no motor (`{{nome}}` sem prefixo, ou com ponto, como `{{form.nome}}`).
#### REQ-03.09.015 - O campo de tópico de um conector Kafka deve oferecer, como sugestão, a lista de tópicos existentes no cluster selecionado (US-14.01), consultada em tempo real a partir do catálogo de integrações; a digitação livre deve continuar disponível quando a listagem não estiver disponível.
#### REQ-03.09.016 - Uma regra de mapeamento de saída (REST ou Kafka) deve poder ser do tipo lista: o valor apontado pela expressão JSONPath é um array, gravado como uma única variável da jornada em formato JSON do Runtime Engine — sem o limite de tamanho de uma variável de texto e legível no Diagnóstico. Quando a chamada REST não é bem-sucedida, a variável do tipo lista recebe uma lista vazia.
#### REQ-03.09.017 - A regra do tipo lista deve permitir declarar os campos a manter de cada item; só esses campos são gravados na variável, para não guardar no histórico da instância dados que a tela e as regras não usam. Sem campos declarados, o item é gravado inteiro.
#### REQ-03.09.018 - Um campo de lista ou de objeto recebido numa mensagem Kafka também deve ser gravado como variável em formato JSON do Runtime Engine, nunca como objeto binário.
#### REQ-03.09.019 - Uma variável do tipo lista não deve ser oferecida em condição de Decisão — ela só alimenta a lista de seleção (US-04.15) e as opções de um select (US-04.16).
#### REQ-03.09.020 - A validação sob demanda ("Validar") e a publicação devem recusar uma integração de mensageria sem cluster, tópico e credencial escolhidos. A geração de fluxo por IA (US-03.17) não faz essa exigência, já que esses valores dependem do ambiente e são escolhidos pelo autor no editor.
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
#### REQ-03.11.001 - O sistema deve suportar um nó de gateway de decisão (exclusivo) no fluxo, com duas ou mais saídas (caminhos A, B, C…), sem limite de quantidade.
#### REQ-03.11.002 - Uma das saídas do gateway deve ser marcada como saída padrão (sem condição própria), usada quando nenhuma condição das demais saídas for satisfeita — garantindo que o fluxo sempre tenha um caminho definido em tempo de execução.
#### REQ-03.11.003 - Cada saída não padrão do gateway deve possuir uma condição composta por variável, operador de comparação (igual, diferente, maior que, menor que) e um valor de referência informado pelo usuário, editados como combos/campo tipado (não texto livre).
#### REQ-03.11.004 - A condição deve poder referenciar tanto uma variável de saída de um Service Task/Receive Task (mapeamento de saída, REQ-03.09.010) quanto um campo de resposta de um User Task (nome técnico do campo, REQ-04.01.007), desde que alcançável a partir do gateway. A variável é referenciada pelo nome que ela tem no motor (`form_nome`, `data_nome` ou `channel`); a forma com ponto ou sem prefixo é recusada.
#### REQ-03.11.005 - O editor deve exibir, ao configurar a condição da saída do gateway, a lista de variáveis disponíveis naquele ponto do fluxo — mesmo mecanismo do painel de variáveis do conector (REQ-03.09.013), estendido para incluir campos de formulário de User Tasks alcançáveis.
#### REQ-03.11.006 - O gateway deve possuir ao menos uma entrada e duas ou mais saídas; o backend deve rejeitar (422) um gateway com menos de duas saídas, sem exatamente uma saída padrão, ou com alguma saída não padrão sem condição.
#### REQ-03.11.007 - Na publicação, o gateway deve ser traduzido para um `exclusiveGateway` BPMN nativo, com cada `sequenceFlow` de saída carregando a expressão de condição correspondente (ou marcado como fluxo padrão), avaliado pelo próprio motor do runtime — sem necessidade de implementação especializada (worker), no mesmo princípio do conector REST nativo (US-03.09).
#### REQ-03.11.008 - Cada variável de saída (REQ-03.09.010) deve possuir um tipo declarado — texto, número, booleano, data ou data e hora — inferido automaticamente ao gerar o mapeamento a partir de uma resposta real (REQ-03.10.001) ou escolhido manualmente pelo usuário. O editor da condição do gateway deve oferecer apenas os operadores compatíveis com o tipo da variável escolhida (texto/booleano: igual/diferente; número/data/data e hora: igual/diferente/maior que/menor que) e um campo de valor no formato correspondente (numérico, seletor verdadeiro/falso, ou seletor de data/data e hora).
#### REQ-03.11.009 - A condição do gateway pode referenciar a variável reservada `channel` — injetada automaticamente pelo tipo de canal que inicia a instância (REQ-05.04.004), nunca declarável pelo usuário no nó START — permitindo que o fluxo siga caminhos diferentes conforme o tipo de canal (`WEB`, `MOBILE`, `WHATSAPP`).
#### REQ-03.11.010 - As condições das saídas devem ser avaliadas na ordem em que as saídas aparecem, e vale a primeira cuja condição for verdadeira; a saída padrão só é usada quando nenhuma condição é. O painel da Decisão deve informar essa regra e permitir mudar a ordem das saídas (subir e descer), e essa ordem deve ser salva com o fluxo e mantida na publicação.

> **Nota de revisão (2026-10-03):** a Decisão deixou de ter exatamente duas saídas: uma escolha com três ou mais caminhos (por exemplo, as ações de uma tela) virava uma cadeia de Decisões encadeadas, o que multiplicava as etapas e as linhas do fluxo. As condições não precisam ser mutuamente exclusivas — vale a primeira verdadeira, na ordem do painel, que é como o Runtime Engine já avalia um gateway exclusivo. A importação de um desenho do Figma passa a trazer todos os caminhos de uma decisão (antes só os dois primeiros), com o último como padrão.
---

### US-03.12 Variáveis de entrada da jornada
#### REQ-03.12.001 - O sistema deve permitir declarar, no nó START de um fluxo, uma lista de variáveis de entrada da jornada, cada uma com nome e tipo (mesmo vocabulário de REQ-03.11.008: texto, número, booleano, data, data e hora) — são as variáveis que a aplicação cliente (canal digital/BFF) deve fornecer ao iniciar uma instância. Não se aplica a `MESSAGE_START_EVENT`, que já declara suas variáveis via mapeamento de saída sobre o payload da mensagem recebida (REQ-03.09.004).
#### REQ-03.12.002 - O nome de cada variável de entrada deve ser único no escopo da jornada, compartilhando o mesmo espaço de nomes das variáveis de saída (REQ-03.09.011) — uma variável de entrada não pode colidir com o nome de saída de integração de nenhum nó do fluxo, com outra variável de entrada, nem com o nome técnico de um campo de tela de User Task; um campo de tela, por sua vez, pode repetir seu próprio nome entre etapas diferentes (REQ-03.09.011), mas nunca reaproveitar o nome de uma variável de entrada.

> **Nota de revisão (2026-09-12):** ajustado em conjunto com REQ-03.09.011 — a exceção de reaproveitamento de nome vale só entre campos de tela; variável de entrada continua com nome exclusivo na jornada, inclusive contra campo de tela.
#### REQ-03.12.003 - As variáveis de entrada declaradas no nó START tornam-se disponíveis para referência `{{data_nome}}` em qualquer conector ou condição de gateway do fluxo, do mesmo jeito que uma variável de saída de integração já é (REQ-03.09.012/013) — o nó START é sempre alcançável a partir de qualquer outro nó do fluxo.
#### REQ-03.12.004 - O endpoint de início de instância deve aceitar um mapa de valores no corpo da requisição e recusar a chamada, com mensagem indicando os nomes faltantes, se alguma variável declarada no nó START não vier preenchida.
#### REQ-03.12.005 - Valores extras informados pelo chamador que não correspondam a nenhuma variável declarada são aceitos e repassados como variável de processo sem erro.
---

### US-03.13 Assistência de variáveis na configuração de conector
#### REQ-03.13.001 - O painel de propriedades de um `SERVICE_TASK`/`RECEIVE_TASK`/`MESSAGE_START_EVENT` deve exibir uma seção "Variáveis" com as variáveis disponíveis naquele ponto do fluxo (entrada da jornada, REQ-03.12.001, e saída de integrações anteriores alcançáveis, REQ-03.09.010), agrupadas por origem — rótulo derivado do nome/tipo do nó e do tipo de conector, calculado de forma genérica para que um tipo de nó/conector novo no futuro já ganhe um rótulo razoável sem exigir código específico.
#### REQ-03.13.002 - Os campos de URL, cada valor de header, e cada campo de valor de Body/Params devem oferecer um seletor que insere a referência à variável, no formato do motor (`{{form_nome}}`, `{{data_nome}}`), na posição do cursor do campo, dispensando o usuário de digitar a sintaxe manualmente.
#### REQ-03.13.003 - Body e Params (REST) devem ser editados, por padrão, como uma lista de campos nome→valor (mesmo padrão de Headers, REQ-03.09.009), com um "modo avançado" de JSON livre disponível para corpos que não sejam um objeto plano — uma configuração aninhada já existente nunca deve ser achatada automaticamente.
---

### US-03.14 Assistente de configuração de conector
#### REQ-03.14.001 - O sistema deve oferecer um assistente (wizard) em etapas como forma adicional — não substituta — de configurar um conector REST ou Kafka, editando a mesma configuração que o painel de propriedades inline.
#### REQ-03.14.002 - Para REST, o assistente deve ter 4 etapas: Conexão (método, URL, credencial), Headers, Parâmetros & Corpo, e Testar e Mapear. Para Kafka, 3 etapas: Conexão (cluster, credencial, tópico, operação — nessa ordem, porque a credencial depende do cluster), Payload, e Mapear saída — sem etapa de teste, que não se aplica a esse conector.
#### REQ-03.14.003 - A navegação entre as etapas do assistente deve ser livre: selecionar qualquer etapa no indicador deve levar direto a ela, sem exigir conclusão sequencial das etapas anteriores.
#### REQ-03.14.004 - As alterações feitas no assistente devem ficar num rascunho local, aplicado à configuração real do conector somente ao concluir. Fechar o assistente de qualquer outra forma (botão "X", "Cancelar", clique fora do modal ou tecla Esc) deve verificar se há alteração pendente e pedir confirmação do usuário antes de descartá-la.
#### REQ-03.14.005 - A etapa "Testar e Mapear" deve executar a chamada de teste de verdade diretamente na tela do assistente (sem depender do modal "Testar API" do painel inline, que continua existindo separadamente), exibindo status e corpo da resposta. Em caso de sucesso, o mapeamento de saída deve ser gerado automaticamente a partir da resposta; a edição manual do mapeamento deve permanecer disponível independentemente do resultado do teste.
---

### US-03.15 Anotações
#### REQ-03.15.001 - O sistema deve permitir adicionar anotações — notas livres em formato de post-it — ao canvas do editor de fluxo, para fins de documentação, sem que façam parte do fluxo executável.
#### REQ-03.15.002 - Uma anotação deve possuir texto editável e posição livre no canvas; anotações não devem ser incluídas nas regras de validação estrutural do fluxo (US-03.02) nem traduzidas para BPMN na publicação.
#### REQ-03.15.003 - O sistema deve permitir vincular uma anotação a um ou mais nós do fluxo. A anotação vinculada deixa de aparecer como post-it e passa a ser um marcador numerado no canto de cada etapa vinculada (REQ-03.15.006); a anotação solta continua como post-it.
#### REQ-03.15.004 - O sistema deve permitir desvincular uma anotação de um nó e excluir uma anotação, sem afetar o fluxo executável.
#### REQ-03.15.005 - As anotações devem ser persistidas junto com o fluxo da jornada e restauradas ao reabrir o editor.
#### REQ-03.15.006 - Os marcadores das anotações vinculadas devem ser numerados na ordem do fluxo (a primeira etapa vinculada de cada anotação). Clicar no marcador abre um balão com o texto, que permite editar, soltar da etapa (a anotação volta a ser post-it logo abaixo dela) ou excluir. Quando o texto começa com "Título: …", o trecho antes dos dois-pontos é o título do balão.
#### REQ-03.15.007 - O editor deve oferecer o painel "Guia deste modelo", aberto por um botão no canto do canvas, com as anotações vinculadas em ordem; passar o mouse numa anotação destaca a etapa e clicar leva até ela.
#### REQ-03.15.008 - O painel deve oferecer "Ver guia", um tour que percorre as anotações uma a uma, centralizando e destacando a etapa de cada passo, com Anterior, Próximo e Concluir.
---

### US-03.16 Editor de tela embutido no editor de fluxo
#### REQ-03.16.001 - Ao selecionar, no canvas, uma `USER_TASK`, o editor deve exibir automaticamente um dock ancorado à base do canvas com o editor da tela embutida do nó (`embeddedScreen`), desenhada diretamente ali, sem exigir uma ação dedicada de clique.

> **Nota de revisão (2026-08-24):** requisito reescrito — a Runtime Engine só suporta um conjunto básico de tipos de campo nativos (~5-6), inviabilizando manter a User Task associada a um formulário do catálogo por `formId`; a tela passou a ser desenhada diretamente no nó (`embeddedScreen`), com o formulário do catálogo servindo apenas como modelo de cópia opcional.

#### REQ-03.16.002 - Ao selecionar qualquer outro elemento do canvas, o dock deve deixar de ser exibido.
---

### US-03.17 Geração de fluxo assistida por IA
#### REQ-03.17.001 - O sistema deve permitir criar uma jornada completa a partir de uma descrição em linguagem natural (prompt), na aba "IA" de "Nova jornada": o fluxo (etapas, ligações, decisões e caminho "Se falhar"), as telas com seus campos, as integrações e as seções e anotações do canvas.
#### REQ-03.17.002 - A geração deve depender de uma credencial de API do provedor de IA ativo (US-14.06; o Gemini quando nenhum outro está ativo); sem credencial configurada, o sistema deve informar o usuário e recusar a geração, sem expor detalhe técnico do provedor.
#### REQ-03.17.003 - O modelo de IA descreve a jornada de forma compacta (etapas, campos de cada tela, decisões, integrações e ligações pelo nome) e o sistema monta o fluxo real: identificadores, telas com os componentes do catálogo, ligações e grafia das variáveis. O que o sistema consegue inferir (identificador de campo a partir do enunciado, etapa seguinte pela ordem da lista, fim da jornada) é preenchido sem recusar a descrição; o que violar as regras de validação (US-03.02 e as da tela) volta ao modelo para correção, em até cinco tentativas, com os problemas escritos em termos da descrição e agrupados quando repetidos. Esgotadas as tentativas, o usuário recebe uma mensagem clara do que fazer. Inclui a rejeição de aspas escapadas (`\"`) em condição de decisão, formato que quebra o parser de expressão do motor de runtime.
#### REQ-03.17.004 - O fluxo gerado deve ser apresentado como um rascunho editável no canvas, sujeito às mesmas regras de validação e à mesma revisão manual de qualquer fluxo criado por edição direta — a geração por IA não substitui a revisão do usuário antes de salvar ou publicar.
#### REQ-03.17.005 - Ao concluir a geração, o canvas deve reposicionar automaticamente a visualização do fluxo gerado (REQ-03.05.005).
#### REQ-03.17.007 - A geração deve se limitar a jornadas digitais de atendimento e autoatendimento (questionários e pesquisas, cadastros e formulários, menus, consultas e solicitações com chamada a APIs, decisões, aprovações e mensageria). O sistema deve recusar, com um motivo escrito ao usuário, o pedido que não seja criar uma jornada, que tente revelar, ignorar ou mudar as instruções da IA, que peça para coletar senha, número completo de cartão, CVV, token ou outro segredo, que tenha conteúdo ilegal, fraudulento ou ofensivo, que mande dados a um endereço não informado no pedido, ou que peça mais de 20 telas; o limite de 20 telas também é conferido pelo sistema ao montar a jornada.
#### REQ-03.17.008 - As telas geradas devem usar somente componentes do catálogo (FT-04) e perguntas de tipo escolha, nota de 1 a 5, nota de 0 a 10, sim ou não, texto curto, texto longo, data ou marcar uma afirmação; em questionário, o sistema deve montar os campos, os valores e as escalas das opções, e quando o pedido deixa o conteúdo em aberto a IA deve criar perguntas e opções completas, nunca telas vazias.
#### REQ-03.17.009 - A grafia das variáveis deve ser garantida pelo sistema, não pela IA: dentro das telas, vínculos e textos usam `form.x`/`data.x`; em conector, mensageria e decisão, somente a forma do motor (`{{form_x}}`, `{{data_x}}`, `{{channel}}`). Numa decisão sobre pergunta de escolha, a comparação deve aceitar o texto da escolha ou o valor interno e gravar o valor interno; comparações de maior e menor com valor numérico devem ser numéricas; um valor que não é nenhuma das escolhas, ou um campo que nenhuma tela define, deve voltar à IA para correção.
#### REQ-03.17.010 - O que depende do ambiente ou não foi informado no pedido não deve ser inventado nem ser motivo de recusa: cluster, tópico e credencial de mensageria, endereço de API ausente e o mapeamento da resposta de uma API (que a IA só supõe) devem ficar em branco ou marcados e sinalizados por anotação no canvas, para o autor completar; em chamada com corpo, o corpo deve levar os dados coletados pelas telas. Um endereço de API ou um campo de resposta que o modelo inventou, sem constar do pedido nem das respostas do usuário, é descartado pelo sistema.
#### REQ-03.17.011 - A jornada gerada deve começar pelo canal, sem entradas nem início por mensagem, a menos que o pedido indique isso explicitamente; entradas da jornada que repetem um campo coletado numa tela devem ser descartadas.
#### REQ-03.17.012 - Falhas passageiras do provedor de IA (excesso de uso, indisponibilidade ou queda de conexão) devem ser repetidas automaticamente algumas vezes antes de falhar; chave recusada, modelo inexistente e excesso de uso devem ter mensagens claras ao usuário, apontando para a credencial de IA.
#### REQ-03.17.013 - A IA deve perguntar ao usuário, antes de gerar, quando falta um dado decisivo para criar a jornada — o objetivo, o endereço de uma API, os dados que a resposta da API devolve ou o critério de uma decisão —, em vez de supor. Cada rodada traz de uma a três perguntas, em abas (uma por pergunta), cada uma com respostas prontas, a primeira marcada como recomendada, e a opção "Outra resposta" para o usuário escrever a sua. Nenhuma resposta vem pré-selecionada: o usuário precisa escolher uma. As perguntas de uma mesma rodada são independentes, porque o usuário as responde de uma vez: nenhuma pressupõe a resposta de outra, e o que depende de outra resposta fica para a rodada seguinte. "Continuar" leva à próxima pergunta sem resposta e só segue para o resumo com todas respondidas. A IA pode perguntar em quantas rodadas forem necessárias, até o limite de cinco, sem repetir uma pergunta já respondida e sem perguntar o que pode decidir sozinha (textos, nomes de etapas, visual das telas).
#### REQ-03.17.014 - Depois de responder às perguntas, o usuário deve ver o resumo do que será enviado à IA — o pedido e as decisões de todas as rodadas até ali — e confirmar antes de gerar; pode voltar às perguntas ou editar o pedido, o que recomeça as perguntas.
#### REQ-03.17.015 - A IA pode tratar a falha de publicação de mensagem: quando o pedido exigir (sem conexão, tentar de novo), gera a etapa de publicar com a saída "Se falhar" apontando para uma etapa que explica o problema e oferece tentar de novo (uma Decisão que volta ao envio). O envio não devolve status para uma Decisão consultar: a falha só segue pela saída "Se falhar".
#### REQ-03.17.016 - Quando a jornada ramifica, cada caminho deve terminar no seu próprio fim, com nome que diz o desfecho (ex.: "Fim — concluído", "Fim — com erro"), em vez de todos convergirem para um único fim, para reduzir as linhas que se cruzam no canvas.
#### REQ-03.17.017 - O andamento da geração aparece num registro que ocupa o espaço restante do modal "Nova jornada", com cor por tipo de mensagem (jornada válida, problema apontado, pedido de correção, erro e andamento comum); o campo do pedido pode ser redimensionado na vertical e o exemplo e o texto digitado têm a mesma cor.
#### REQ-03.17.018 - A IA pode gerar a espera por mensagem com tempo limite quando o pedido disser quanto esperar, ligando o limite ao caminho "Se falhar" que explica que a resposta não chegou; nunca inventa um tempo que o pedido não deu.
---

### US-03.18 Resiliência das integrações (REST e mensageria)
#### REQ-03.18.001 - O assistente de configuração da integração REST (US-03.14) deve ter um passo "Resiliência" com o tempo para conectar e o tempo para responder, em segundos. Sem configuração, valem 2 s para conectar e 10 s para responder; o máximo é 10 s e 30 s, respectivamente. Esgotado o tempo, a chamada conta como falha.
#### REQ-03.18.002 - O autor deve poder configurar de 0 a 2 novas tentativas e o intervalo entre elas (até 5 s, dobrando a cada nova tentativa, com pequena variação aleatória). Só falhas passageiras se repetem: sem conexão, tempo esgotado ou resposta 429, 502, 503 ou 504. Qualquer outra resposta, inclusive 4xx, é definitiva.
#### REQ-03.18.003 - Toda chamada `POST` deve levar o cabeçalho `Idempotency-Key`, com o mesmo valor em todas as tentativas de uma mesma execução da etapa, para o serviço chamado não criar nada em dobro. Uma chave definida pelo autor nos headers deve ser respeitada.
#### REQ-03.18.004 - A chamada falha de vez quando, esgotadas as tentativas, não houve resposta, o tempo se esgotou ou o serviço continuou respondendo com erro 5xx. Com a saída "Se falhar" (REQ-03.02.009), a jornada segue por ela; os campos mapeados da resposta ficam vazios e o status HTTP fica sem valor quando não houve resposta.
#### REQ-03.18.005 - Sem a saída "Se falhar", uma chamada sem resposta ou com tempo esgotado faz a etapa falhar: o envio da tela anterior volta com uma mensagem legível (serviço chamado, motivo e quantidade de tentativas). Uma resposta 5xx, nesse caso, segue para a etapa seguinte com o status disponível para a Decisão, como qualquer outra resposta.
#### REQ-03.18.006 - O autor deve poder marcar a integração para executar em segundo plano: a chamada sai da espera do usuário, e o canal mostra que a jornada está aguardando até ela terminar. Se ela falhar de vez sem a saída "Se falhar", a execução para num incidente — sem novas tentativas do Runtime Engine além das configuradas no passo "Resiliência" — que pode ser retomado pelo Diagnóstico (REQ-15.03.004).
#### REQ-03.18.007 - O backend deve rejeitar (422), na validação sob demanda e na publicação, valores de resiliência fora dos limites (REQ-03.18.001/002). O resumo da integração no painel de propriedades deve mostrar o tempo para responder, as novas tentativas e se a execução é em segundo plano.
#### REQ-03.18.008 - O assistente de configuração da publicação de mensagem (US-03.14) deve ter um passo "Resiliência" com o tempo limite do envio (padrão 5 s, máximo 10 s), de 0 a 2 novas tentativas (padrão 2) e o intervalo entre elas (padrão 2 s, até 5 s, dobrando a cada nova tentativa, com pequena variação aleatória). Esgotado o tempo sem confirmação do broker, o envio conta como falha. O passo não existe em receber mensagem.
#### REQ-03.18.009 - Só falhas passageiras de publicação se repetem: sem conexão com o broker ou tempo esgotado. Erros definitivos — nome de tópico inválido, credencial ou permissão recusada, mensagem grande demais, tópico não configurado — não se repetem.
#### REQ-03.18.010 - A publicação falha de vez quando, esgotadas as tentativas, o envio não foi confirmado. Com a saída "Se falhar" (REQ-03.02.009), a jornada segue por ela; sem ela, a execução para num incidente — sem repetir para sempre — que pode ser retomado pelo Diagnóstico (REQ-15.03.004). O motivo e cada tentativa aparecem no detalhe do Diagnóstico.
#### REQ-03.18.011 - Com o broker fora do ar, a espera de cada envio fica limitada ao tempo limite da etapa (no máximo 10 s), em vez de até 60 s, para a publicação de uma instância atrasar o mínimo possível a das outras e o recebimento de mensagens.
#### REQ-03.18.012 - O assistente deve avisar, quando houver novas tentativas, que uma nova tentativa pode entregar a mesma mensagem mais de uma vez e que o consumidor deve tolerar mensagem repetida; o identificador da instância vai na mensagem (correlationId) para reconhecê-la. O backend rejeita (422) valores de resiliência de mensagem fora dos limites, e o resumo da etapa mostra o tempo limite e as tentativas.
#### REQ-03.18.013 - Em "Receber mensagem", o assistente de configuração (US-03.14) deve ter um passo "Espera" com o tempo limite da espera, opcional, de 10 segundos a 30 dias, em segundos, minutos, horas ou dias. Sem limite — o padrão —, a jornada espera a mensagem para sempre. O passo não existe no início por mensagem, que não espera.
#### REQ-03.18.014 - Esgotado o tempo limite sem a mensagem chegar, a espera é interrompida e a jornada segue pela saída "Se falhar" da etapa (REQ-03.02.009); o motor confere o tempo a cada poucos segundos, então a saída pode disparar um pouco depois do tempo configurado. O limite e a saída andam juntos: o backend rejeita (422) um sem o outro e um limite fora da faixa, na validação sob demanda e na publicação.
#### REQ-03.18.015 - Mensagem que não é desta jornada, sem identificador de instância, mal formatada ou dirigida a uma instância que não existe ou não está esperando é descartada sem erro: a espera continua até a mensagem certa chegar ou o tempo esgotar. O descarte fica só no registro do Runtime Engine, sem lista no Diagnóstico.
#### REQ-03.18.016 - O detalhe do Diagnóstico deve mostrar há quanto tempo a instância aguarda a mensagem, e o resumo da etapa no painel de propriedades deve mostrar o tempo limite da espera (ou que ela não tem limite).
#### REQ-03.18.017 - Uma mensagem enviada enquanto o Runtime Engine estava parado deve ser entregue quando ele voltar: o Runtime Engine só confirma a leitura de uma mensagem depois de tratá-la (entregá-la à jornada ou descartá-la). Uma falha passageira ao tratar a mensagem é repetida até 3 vezes, e depois a mensagem é descartada com registro de erro. Como a entrega é "pelo menos uma vez", uma mensagem repetida só cai em "nenhuma instância esperando" e é descartada, sem efeito na jornada.
---

### US-03.19 Apresentação do fluxo no canvas
#### REQ-03.19.001 - O canvas deve oferecer três formas de exibir as etapas: Círculo, Compacto (pílula com ícone e nome) e Detalhado (cartão). A escolha é uma preferência de cada usuário e vale no editor, na Execução e no Diagnóstico. Trocar de forma reorganiza o fluxo; o fluxo guarda a forma em que foi organizado e, ao ser aberto em outra, é reorganizado sem contar como alteração não salva.
#### REQ-03.19.002 - O cartão detalhado deve mostrar o tipo da etapa em linguagem do autor ("Tela", "Integração REST"; os demais tipos com o nome usado na paleta), o nome e até três etiquetas tiradas da própria configuração (campos ou opções da tela, avisos ou textos de uma tela informativa, método, novas tentativas, segundo plano, tópico, configuração faltando). Fora do modo Círculo, eventos e Decisão aparecem preenchidos com a cor do tipo e com o nome em letra do tamanho do cartão.
#### REQ-03.19.003 - "Organizar" deve dispor o fluxo em camadas da esquerda para a direita: o caminho com condição de uma Decisão segue reto e o "senão" desvia; o ramo "Se falhar" vai para uma faixa logo abaixo da etapa que falhou, quando houver espaço; cada seção (US-03.20) é organizada como um bloco, sem sobrepor outra.
#### REQ-03.19.004 - As ligações devem ser desenhadas automaticamente em ângulo reto, desviando das etapas, do nome escrito embaixo delas e do cabeçalho das seções, e recalculadas quando o fluxo para de mudar. As ligações saem sempre pela direita da etapa (a exceção é a saída "Se falhar", que sai por baixo da etapa e é a única ligação que pode chegar por cima ou pela direita da etapa de destino, prevalecendo o topo no "Organizar", e as saídas de uma Decisão, que seguem a posição de cada caminho); uma ligação de volta (laço) contorna o fluxo sem cruzar as linhas já traçadas sempre que possível; nenhuma linha passa por cima de texto.
#### REQ-03.19.005 - O rótulo de uma ligação deve aparecer como etiqueta sobre a linha: "Se falhar" em vermelho, "senão" no caminho padrão e, nas demais, a condição em linguagem do autor — a opção escolhida num campo de escolha da tela ("Tentar de novo"), o nome no caso sim/não, a primeira palavra do nome com o valor numa igualdade ("status 201") e o nome com o sinal e o valor nas comparações. A expressão original aparece ao passar o mouse.
#### REQ-03.19.006 - O autor deve poder escrever um rótulo livre (até 40 caracteres) em qualquer ligação, com duplo clique na linha ou na etiqueta; Enter grava, Esc descarta e texto vazio remove. O rótulo escrito tem prioridade sobre a condição, é salvo junto com a ligação (fluxo e versão), aparece também na Execução e no Diagnóstico e não é usado pelo Runtime Engine.
#### REQ-03.19.007 - O nível de detalhe deve mudar com o zoom: de perto, o cartão completo; no meio, a pílula com ícone e nome; de longe, cada etapa vira um ponto na cor do tipo (na Execução e no Diagnóstico, na cor do caminho percorrido), as ligações vão de centro a centro sem rótulo e o nome das seções cresce para continuar legível.
#### REQ-03.19.008 - O canvas deve ter uma barra de navegação com "Buscar etapa" (Ctrl+F, por nome ou tipo, com a lista logo abaixo do campo), diminuir/aumentar zoom, 50%, 75%, 100%, "Ajustar" (F) e, com etapas selecionadas, "Zoom na seleção" (Shift+2) e "Agrupar em seção" (Ctrl+G, com duas ou mais). Os pontos de conexão das etapas só aparecem ao passar o mouse, com a etapa selecionada ou enquanto uma ligação está sendo puxada — exceto o ponto "Se falhar" de uma integração REST, sempre visível (REQ-03.02.009).
#### REQ-03.19.009 - Enquanto o fluxo carrega e o canvas ainda calcula as linhas, o editor, a Execução e o Diagnóstico devem mostrar um indicador de carregamento ("Carregando a jornada…" / "Desenhando a jornada…") no lugar do canvas, que some assim que o desenho está pronto.
---

### US-03.20 Seções do fluxo
#### REQ-03.20.001 - O autor deve poder agrupar duas ou mais etapas selecionadas numa seção com nome; uma etapa pertence a no máximo uma seção. A seção aparece como uma moldura tracejada com o nome em maiúsculas atrás das etapas. O componente "Seção" também fica na paleta, logo acima de "Anotação", e pode ser arrastado para o canvas, criando uma moldura vazia no ponto onde for solto, ou clicado, criando uma seção numerada automaticamente ("Seção 1", "Seção 2"…) num lugar livre do canvas, de preferência à esquerda e abaixo do início do desenho, sem cobrir etapa, linha ou outra seção.
#### REQ-03.20.002 - O autor deve poder renomear a seção (duplo clique no nome) e desfazê-la, sem afetar as etapas.
#### REQ-03.20.003 - A seção deve poder ser recolhida: vira um bloco com o nome, a quantidade de etapas recolhidas e "Clique para abrir". Toda ligação que entra ou sai das etapas recolhidas passa a ligar no bloco: a saída da seção vai até a etapa de destino, ou até o bloco da seção de destino quando ela também está recolhida, e várias ligações entre os mesmos dois pontos aparecem como uma só, indicando que existe ao menos uma ligação entre eles. Essas linhas são só de visualização: o usuário não as seleciona, apaga nem religa, e não puxa ligação a partir de uma seção. Recolhida ou aberta é preferência de cada usuário, não faz parte do fluxo.
#### REQ-03.20.004 - A seção que contém o destino de uma saída "Se falhar" deve aparecer com o nome em vermelho (faixa de falha).
#### REQ-03.20.005 - As seções devem ser salvas junto com o fluxo e com cada versão, incluindo a posição e o tamanho da moldura e o modo de exibição em que foram desenhadas, e aparecer como moldura com nome na Execução e no Diagnóstico: no mesmo modo de exibição do editor a moldura é a salva; em outro modo, as etapas são reorganizadas e a moldura acompanha a caixa delas. Uma seção representa um subfluxo apenas visualmente: no motor de execução continua existindo um único fluxo principal, de modo que a seção não é validada, não chega ao Runtime Engine e etapas excluídas saem dela automaticamente.
#### REQ-03.20.006 - A moldura da seção deve poder ser movida pelo canvas (arrastando o cabeçalho; as etapas de dentro vão junto) e redimensionada pelas bordas e cantos, sem ficar menor que as etapas que contém. Uma etapa pertence à seção em que o centro dela está: arrastar uma etapa para dentro ou para fora da moldura a inclui ou a retira. Uma seção pode ficar vazia.
#### REQ-03.20.007 - "Organizar" deve tratar a seção recolhida como um bloco com as dimensões dele, e ao reabrir a seção só o conteúdo dela é reorganizado, a partir do canto da moldura, sem mexer no resto do fluxo; "Organizar" também ajusta cada moldura às etapas que ficaram dentro dela.
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

#### REQ-04.01.007 - Na tela embutida de uma User Task (US-03.16), cada campo que coleta valor deve possuir um identificador técnico, editável a qualquer momento — com unicidade verificada em toda a jornada (não só na tela do nó) contra variável de saída de integração e variável de entrada da jornada, mas não contra outro campo de tela, que pode reaproveitar o mesmo nome numa etapa diferente (ver REQ-03.09.011).

> **Nota de revisão (2026-09-05):** o campo já não guarda um atributo `name` próprio — o identificador técnico passou a ser o nome usado no vínculo de dados de leitura-e-escrita (US-04.10, REQ-04.10.005). A unicidade na jornada inteira permanece obrigatória.

> **Nota de revisão (2026-09-12):** ver nota de REQ-03.09.011 — a unicidade deixou de valer entre dois campos de tela, só contra variável de saída de integração e de entrada.

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
#### REQ-04.09.007 - O sistema deve exibir um painel de camadas com a estrutura hierárquica da árvore, permitindo selecionar e reordenar entre irmãos; a remoção de um componente é feita no canvas.
#### REQ-04.09.008 - O usuário deve poder editar as propriedades do componente selecionado num painel dedicado, com o campo de entrada apropriado ao tipo de cada propriedade declarada pelo catálogo.
#### REQ-04.09.009 - No modo de construção da tela, os componentes não devem aceitar digitação de valores reais — não é o formulário sendo preenchido, é uma prancheta de montagem.
#### REQ-04.09.010 - O sistema deve oferecer um modo de pré-visualização que renderiza a árvore como seria apresentada ao usuário final, alternável a qualquer momento com o modo de construção.
#### REQ-04.09.011 - O sistema deve sinalizar pendências de preenchimento da tela — propriedade obrigatória vazia, valor de propriedade incompatível com o schema do catálogo, componente de entrada sem vínculo de dados, botão ou link sem ação associada, ou componente incompatível com o canal selecionado — classificadas por severidade, permitindo ao usuário navegar de uma pendência até o campo correspondente no painel de propriedades.
#### REQ-04.09.012 - No modo de construção da tela, uma propriedade que tenha um vínculo de dados configurado (US-04.10) deve ser exibida no canvas pelo próprio vínculo — o nome da variável de processo que será lida em execução — no lugar do valor literal ou do texto de exemplo do componente. O valor literal continua existindo como valor de reserva de execução (catálogo, seção 8.4), mas exibi-lo sozinho esconderia do autor que o valor real vem de outra origem.

---

### US-04.10 Vínculo de dados
#### REQ-04.10.001 - O usuário deve poder associar o valor de um componente a um caminho identificado por um namespace (variável do fluxo preenchível ou dado somente-leitura) e um nome dentro desse namespace.
#### REQ-04.10.002 - O vínculo deve poder ser configurado como leitura-e-escrita ou somente leitura.
#### REQ-04.10.003 - Um componente sem vínculo configurado não deve gerar variável de processo nem ser considerado no envio do formulário.
#### REQ-04.10.004 - Ao configurar um vínculo de leitura-e-escrita no namespace de variável do fluxo, o sistema deve sugerir os nomes de variável já conhecidos até aquele ponto do fluxo.

> **Nota de revisão (2026-09-26):** a sugestão passou a incluir também os campos que a própria tela em edição já coleta, exibidos pelo rótulo visível ("Nome do Cliente"), não pelo identificador técnico — um campo da mesma tela ainda não é uma variável do fluxo no sentido estrito (não veio de "um ponto anterior"), mas é a referência mais comum na prática ("mostrar o que o cliente acabou de preencher ali em cima") e ficava de fora antes desta revisão. As sugestões de cada namespace oferecem apenas as variáveis que pertencem a ele — `form` só os campos de tela, `data` só saídas de integração e variáveis de entrada, `session` só o canal — em vez da mesma lista nos três, que levava a um caminho que nunca resolve em execução.

#### REQ-04.10.005 - O nome técnico de um campo que coleta valor passa a ser o nome usado no vínculo de leitura-e-escrita do namespace de variável do fluxo; sua unicidade deve continuar sendo verificada na jornada inteira, não só na tela do nó, contra variável de saída de integração e de entrada — mas não contra outro campo de tela, que pode reaproveitar o mesmo nome numa etapa diferente (REQ-03.09.011).

---

### US-04.11 Ações e eventos
#### REQ-04.11.001 - O usuário deve poder associar um evento disparado por um componente a uma ação, escolhida dentre um conjunto fechado definido pelo sistema: enviar formulário, navegar, abrir URL, definir valor, registrar telemetria ou dispensar.
#### REQ-04.11.002 - Os eventos oferecidos para configuração num componente devem se limitar aos eventos que aquele componente, conforme declarado no catálogo (REQ-04.07.007), realmente dispara.
#### REQ-04.11.003 - Cada ação deve permitir configurar parâmetros próprios (ex.: rota de destino, URL, caminho e valor a definir, nome do evento de telemetria).
#### REQ-04.11.004 - Um componente não deve poder disparar uma ação fora do conjunto fechado do sistema — isso deve ser impedido na validação estrutural (US-04.13).
#### REQ-04.11.005 - O conjunto fechado de ações deve incluir "tentar novamente", que pede de novo a etapa atual e refaz a montagem da tela — usada quando uma fonte de dados obrigatória da tela falha (US-04.16).
#### REQ-04.11.006 - A ação "enviar formulário" deve poder gravar, junto com a conclusão da etapa, um valor num caminho do namespace de variável do fluxo (`form.x`), configurado no editor ("Guardar a escolha em" e "Valor guardado"). Assim, uma tela com mais de um botão diz à jornada qual foi acionado, e a Decisão seguinte segue pelo valor gravado. A variável gravada vale como variável do fluxo para a Decisão e para a verificação de nomes (REQ-04.10.005), como um campo da tela.
#### REQ-04.11.007 - A ação "navegar" com o destino "voltar" deve reabrir a tela anterior da jornada sem concluir a tela atual nem validar seus campos, sem Decisão depois da tela nem ligação de retorno desenhada no fluxo. A tela anterior é a última tela concluída antes de a atual abrir, e reabre com os valores já informados. Vale na Execução, onde o log registra "Voltou de X para Y", e em todos os canais (web, mobile, Flutter e WhatsApp).
#### REQ-04.11.008 - O "voltar" deve seguir três regras: uma tela que já serviu de destino de um "voltar" não é reaberta de novo, para que dois "voltar" seguidos recuem duas telas; não se volta por cima de uma integração que grava no sistema de origem (qualquer integração que não seja uma consulta REST `GET`) concluída com sucesso entre as duas telas — a tela continua e o motivo é mostrado; uma integração que falhou e seguiu pelo caminho "Se falhar" não impede voltar, que é o caso de "Tentar novamente" numa tela de indisponibilidade.

> **Nota de revisão (2026-10-03):** sem estas duas ações, cada tela com mais de um botão (ex.: "Continuar" e "Voltar") só concluía a etapa, e o fluxo precisava de uma variável preenchida à mão e de uma Decisão depois de cada tela para saber qual botão foi acionado — além de uma ligação de retorno desenhada para cada "Voltar". O botão que grava a escolha (REQ-04.11.006) resolve as escolhas de verdade; o "voltar" (REQ-04.11.007/008) tira do fluxo as Decisões e ligações que só existiam para voltar. Nada disso entra no catálogo SDUI: o componente continua emitindo as ações que já existiam (`action.submit` e `action.navigate`); o que muda é como a jornada as trata. Como o "voltar" não desenha ligação, uma tela cuja única saída fosse o "voltar" ficaria fora de um caminho até um Fim e é recusada na publicação — nesse caso o retorno continua desenhado, com Decisão.

---

### US-04.12 Visibilidade condicional
#### REQ-04.12.001 - O usuário deve poder condicionar a exibição de um componente a uma comparação entre um valor do contexto de dados (mesmos namespaces de US-04.10) e um valor informado.
#### REQ-04.12.002 - As comparações suportadas devem incluir, no mínimo, igualdade e diferença.
#### REQ-04.12.003 - Um componente sem condição de visibilidade configurada deve ser sempre exibido.
#### REQ-04.12.004 - As comparações também devem suportar "está em"/"não está em" uma lista de valores — usado para condicionar um componente a um subconjunto dos tipos de canal da jornada (o canal, `channel`), sem exigir uma regra por tipo de canal.
#### REQ-04.12.005 - A habilitação condicional de um componente de ação usa a mesma forma de condição da visibilidade. Quando a condição de visibilidade ou de habilitação aponta para um dado somente-leitura (`data.x`), deve ser avaliada com o valor que a variável tem no Runtime Engine, na Execução e em todos os canais (web, mobile, Flutter e WhatsApp) — por exemplo, um botão desabilitado conforme o status devolvido por uma integração.

---

### US-04.13 Validação estrutural
#### REQ-04.13.001 - O sistema não deve permitir publicar uma jornada cuja árvore de alguma tela tenha identificador de componente duplicado.
#### REQ-04.13.002 - O sistema não deve permitir publicar uma jornada que use, em alguma tela, um tipo de componente não encontrado no catálogo.
#### REQ-04.13.003 - O sistema não deve permitir publicar uma jornada que use, em alguma tela, um componente marcado como indisponível no catálogo (REQ-04.07.011).
#### REQ-04.13.004 - O sistema não deve permitir publicar uma jornada em que um componente tenha filhos sem que seu tipo aceite filhos (REQ-04.07.005).
#### REQ-04.13.005 - O sistema não deve permitir publicar uma jornada com um vínculo de dados cujo namespace não seja um dos namespaces reconhecidos (US-04.10).
#### REQ-04.13.006 - O sistema não deve permitir publicar uma jornada com um evento associado a uma ação fora do conjunto fechado (US-04.11).
#### REQ-04.13.007 - Ao rejeitar a publicação, o sistema deve informar todas as violações encontradas, não só a primeira.
#### REQ-04.13.008 - O sistema não deve permitir publicar uma jornada em que, para algum dos tipos de canal da jornada, a árvore de alguma tela fique sem nenhum componente visível para aquele tipo — considerando as regras de visibilidade condicionadas ao canal, `channel` (REQ-04.12.004).
#### REQ-04.13.009 - O sistema não deve permitir publicar uma jornada em que o valor de uma propriedade, em alguma tela, viole o schema declarado pelo componente no catálogo (tipo de valor, faixa numérica ou enumeração — REQ-04.07.006).

> **Nota de revisão (2026-09-26):** uma propriedade obrigatória que também aceita `$bindings` (US-04.10) é considerada preenchida por um valor literal OU por um vínculo válido — nunca os dois em falta ao mesmo tempo, mas também nunca os dois exigidos juntos. Faltando os dois, o sistema deve informar as duas formas de resolver, não só cobrar o valor literal.

#### REQ-04.13.010 - O sistema não deve permitir publicar uma jornada em que uma tela referencie uma variável de dados da jornada (namespaces `form` ou `data`) que não exista naquele ponto do fluxo — seja por vínculo de leitura, por placeholder em qualquer propriedade de texto, por condição de visibilidade ou por condição de estado ativo. Contam como existentes o que passos anteriores do fluxo produzem, as variáveis de entrada do início da jornada e os campos que a própria tela coleta, em qualquer ordem. A violação deve indicar o componente, a variável e as variáveis disponíveis naquele ponto. Não é conferido o vínculo de leitura-e-escrita (ele cria a variável).

#### REQ-04.13.011 - O sistema não deve permitir publicar uma jornada em que um placeholder de texto de tela use um formato fora do previsto. São válidos `{{form.nome}}` e `{{data.nome}}` (caminho do contrato), `{{form_nome}}` e `{{data_nome}}` (nome da variável no motor) e `{{channel}}` (o canal). Um placeholder sem prefixo (`{{nome}}`) ou de outro namespace resolveria vazio em execução e deve ser recusado, com a indicação das formas válidas.

---

### US-04.15 Lista de seleção
#### REQ-04.15.001 - O catálogo deve oferecer o componente lista de seleção, em que o usuário escolhe um item de uma lista vinda da jornada e, opcionalmente, uma ação sobre o item escolhido.
#### REQ-04.15.002 - Os itens da lista devem vir, por vínculo somente leitura, de uma variável do tipo lista: a saída de uma integração do tipo lista (REQ-03.09.016) ou uma fonte de dados da própria tela (US-04.16). A publicação deve ser recusada quando o vínculo aponta para uma variável que não é do tipo lista.
#### REQ-04.15.003 - O autor deve configurar o campo do item gravado na escolha e os textos de cada item — título, descrição e aviso — combinando texto fixo com campos do item no formato `{{item.campo}}`. O prefixo `item` só é aceito nesses textos do componente de lista.
#### REQ-04.15.004 - A escolha do usuário deve gravar o valor do campo configurado do item numa variável do formulário, por vínculo de leitura-e-escrita.
#### REQ-04.15.005 - O autor deve poder declarar ações sobre o item escolhido, cada uma com identificador, rótulo, estilo (principal, secundário ou destrutivo) e uma regra "liberada quando" que compara um campo do item com um valor (`{{item.campo}} == valor` ou `!=`). A regra de negócio vem do sistema de origem, pelo campo do item, e não é reescrita na tela.
#### REQ-04.15.006 - A ação escolhida deve ser gravada numa segunda variável do formulário, por vínculo de leitura-e-escrita, e concluir a etapa — o que permite a uma Decisão seguinte seguir o caminho da ação.
#### REQ-04.15.007 - Os itens devem chegar ao canal já montados pelo serviço de telas (valor, título, descrição, aviso e ações liberadas de cada item): o canal nunca recebe o array original, os textos com `{{item.campo}}` nem as regras das ações.
#### REQ-04.15.008 - Na web e no mobile, as ações devem ficar desabilitadas até o usuário escolher um item e habilitar conforme as ações liberadas para ele, sem nova chamada ao servidor. No WhatsApp, a lista deve ser apresentada como mensagem de lista e, após a escolha, com botões só das ações liberadas para o item — ou, sem nenhuma liberada, com o aviso do item e a lista de novo.
#### REQ-04.15.009 - A lista deve ter um máximo de itens configurável (padrão 50); o excesso não é mostrado e a tela informa quantos itens existem. No WhatsApp, acima de 10 itens a lista mostra 9 por vez e uma linha "Ver mais", paginada pelo próprio canal; título e descrição longos são cortados com reticências nos limites do WhatsApp (24 e 72 caracteres).
#### REQ-04.15.010 - Em jornada com o canal WhatsApp, a publicação deve ser recusada quando a lista tiver mais de 3 ações ou rótulo de ação com mais de 20 caracteres — os limites de botões de resposta do WhatsApp.
#### REQ-04.15.011 - A lista deve mostrar uma mensagem configurável quando não houver itens.
#### REQ-04.15.012 - Habilitar uma ação no canal não substitui a verificação no servidor: o fluxo seguinte deve confirmar no sistema de origem, pelo identificador do item, se a ação é permitida.

---

### US-04.16 Fontes de dados da tela
#### REQ-04.16.001 - A tela de uma Tarefa de Usuário deve poder declarar fontes de dados de referência — listas de apoio que só servem à tela, como horários disponíveis ou motivos —, cada uma com um apelido, a fonte do catálogo (US-14.07), o valor de cada parâmetro da fonte, se ela é obrigatória e a mensagem mostrada se falhar.
#### REQ-04.16.002 - Dado que decide caminho ou precisa constar do histórico da instância deve vir de integração no fluxo (REQ-03.09.016), não de fonte de dados da tela.
#### REQ-04.16.003 - O resultado de cada fonte deve ficar disponível na própria tela como `data.<apelido>`, uma lista, e nunca ser gravado como variável da instância; só a escolha do usuário é gravada. A publicação deve ser recusada se o apelido repetir o nome de uma variável da jornada disponível naquele ponto.
#### REQ-04.16.004 - Os parâmetros da fonte só devem aceitar variáveis da jornada no formato do motor (`{{form_x}}`, `{{data_x}}`) já disponíveis naquele ponto do fluxo, ou texto fixo; a publicação deve ser recusada se faltar o valor de um parâmetro da fonte.
#### REQ-04.16.005 - A busca deve ser feita pelo serviço de telas a cada vez que a tela é montada, antes de entregá-la ao canal; o canal e o BFF nunca chamam a fonte. Não há cache.
#### REQ-04.16.006 - A configuração da fonte usada (URL, parâmetros, tempo limite, caminho da lista, campos expostos e referência de credencial) deve ser copiada na publicação da tela; alterar ou excluir a fonte no catálogo só vale para as próximas publicações. Essa configuração nunca deve ser enviada ao canal.
#### REQ-04.16.007 - Se uma fonte opcional falhar ou exceder o tempo limite, a tela deve abrir com a lista vazia e a mensagem configurada. Se uma fonte obrigatória falhar, a tela deve mostrar a mensagem com a ação "tentar novamente" (REQ-04.11.005) e não permitir concluir a etapa.
#### REQ-04.16.008 - O resultado de uma fonte deve poder alimentar a lista de seleção (US-04.15) e as opções de um select, por vínculo somente leitura; no select, cada item precisa ter `label` e `value`.
#### REQ-04.16.009 - O editor de telas deve permitir testar cada fonte com valores de exemplo para os parâmetros; os itens retornados passam a ser usados no preview da tela.

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
#### REQ-05.03.004 - A tela de Execução deve mostrar lado a lado o canal (a tela da etapa atual), o fluxo e a linha do tempo, com Variáveis e Log no painel inferior. A linha do tempo pode ser redimensionada na largura e recolhida; o painel de Variáveis e Log abre recolhido e pode ser expandido ou recolhido.
#### REQ-05.03.005 - Cada etapa percorrida deve ganhar o número do passo (mais de um quando a jornada volta por um laço), e as etapas e ligações ainda não percorridas devem aparecer esmaecidas.
#### REQ-05.03.006 - "Seguir a execução" deve manter a etapa atual no centro do fluxo a cada passo; desligado, o usuário controla o enquadramento.
#### REQ-05.03.007 - As etapas que o motor percorre sozinho entre um passo e outro (integrações, Decisões) devem ser destacadas uma a uma no fluxo, em sequência, sem animação para quem pediu movimento reduzido ao sistema.
#### REQ-05.03.008 - A linha do tempo deve listar os passos em ordem, com o número, o tipo, a hora, se foi feito pelo motor e a falha que levou ao caminho "Se falhar"; ao abrir um passo, o card mostra todos os detalhes da etapa (US-05.10), e é o único lugar da Execução com esses detalhes. Selecionar uma etapa no fluxo abre o card dela; uma etapa ainda não alcançada aparece num card próprio com a configuração. No fim, o que a jornada está esperando agora em linguagem do usuário (cliente respondendo uma tela, mensagem num tópico, integração em segundo plano, concluída ou parada por erro).
#### REQ-05.03.009 - Ao chegar a uma etapa, uma bolinha deve percorrer, de origem a destino, a ligação por onde a execução chegou e recomeçar enquanto a execução espera nessa etapa, parando no fim apenas quando o destino é o Fim; ao concluir a etapa, ou ao avançar de passo no Diagnóstico, o movimento é interrompido e a bolinha recomeça imediatamente na nova origem. A etapa atual deve ganhar um halo que pulsa. Para quem pediu movimento reduzido ao sistema, a bolinha não aparece e o halo fica parado.
#### REQ-05.03.010 - A ordem dos passos na linha do tempo e no caminho destacado da Execução, e na reprodução do Diagnóstico (REQ-15.03.005), deve ser a ordem real de execução do Runtime Engine, mesmo quando duas etapas começam no mesmo instante — por exemplo, uma Decisão e a etapa seguinte, que antes podiam aparecer invertidas.
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
#### REQ-05.06.008 - O log e o detalhe de uma etapa de integração REST devem mostrar quantas tentativas a chamada levou e, quando ela falhou de vez e seguiu pela saída "Se falhar", o motivo da falha.
---

### US-05.07 Seleção e apresentação
#### REQ-05.07.001 - O sistema deve permitir localizar uma jornada publicada por busca, listando as jornadas disponíveis e filtrando a lista conforme o texto digitado. O mesmo campo aceita o ID da instância ou o business key de uma execução em andamento (US-05.11) e, na busca por nome, lista também as execuções em andamento das jornadas encontradas.
#### REQ-05.07.002 - A execução deve ocorrer na mesma tela de seleção da jornada, sem navegação entre telas.
#### REQ-05.07.003 - A pré-visualização da execução deve se adaptar ao tipo de canal escolhido para a instância (REQ-05.04.004), incluindo uma representação visual compatível (ex.: layout de dispositivo móvel para `MOBILE`).
#### REQ-05.07.004 - O sistema deve exibir o número da versão publicada da jornada (`v<N>`) tanto na lista de busca quanto no cabeçalho de uma execução em andamento.
#### REQ-05.07.005 - O sistema deve permitir iniciar a execução de uma jornada publicada diretamente do grid de Jornadas (FT-02), abrindo uma aba de Execução dedicada já com essa jornada selecionada.
#### REQ-05.07.006 - Quando a jornada tiver mais de um tipo de canal habilitado, o sistema deve permitir escolher qual tipo simular antes de iniciar a execução; com um único tipo habilitado, o sistema deve usá-lo automaticamente, sem exigir escolha do usuário.
#### REQ-05.07.007 - Quando uma jornada tiver mais de uma versão publicada simultaneamente (REQ-06.04.004), o sistema deve permitir escolher qual versão executar antes de iniciar a instância; com uma única versão publicada, o sistema deve usá-la automaticamente, sem exigir escolha do usuário.

> **Nota de revisão (2026-09-11):** implementado. `StartExecution` (admin/back) resolve a versão
> escolhida via `JourneyVersionRepository` (precisa estar `PUBLISHED`) em vez da publicação ativa;
> `RuntimeEngineMonitoringAdapter.startProcessInstance` mira o deployment certo no motor via
> `versionTag`. Front: `StartPanel.tsx` mostra o seletor só quando há mais de uma versão publicada
> (`listJourneyVersions`, já existente). Testado em runtime: instâncias iniciadas com e sem versão
> explícita confirmadas rodando nos `processDefinitionId`s corretos (v1 vs. v3) direto no motor.
---

### US-05.08 Tratamento de falhas de integração
#### REQ-05.08.001 - O sistema deve detectar quando uma etapa de integração (Service Task ou Receive Task) falha durante a execução (ex.: conector REST inacessível) e identificar qual nó do fluxo causou a falha, mesmo quando o motor não expõe isso diretamente (a transação dá rollback antes de qualquer histórico ser gravado).
#### REQ-05.08.002 - O sistema deve destacar visualmente, no diagrama do fluxo, o nó que causou a falha, de forma distinta dos demais estados (concluído, atual, pendente).
#### REQ-05.08.003 - O sistema deve registrar a falha no log cronológico da execução.
#### REQ-05.08.004 - O sistema deve permitir consultar a mensagem de erro completa da falha sob demanda, sem exibi-la de forma intrusiva na tela principal de execução.
#### REQ-05.08.005 - Antes de iniciar uma instância, completar uma tarefa ou pular uma etapa, o sistema deve detectar quando o trecho seguinte do fluxo executaria integralmente dentro de uma única transação síncrona do motor de runtime até um nó `END`, sem passar por nenhum checkpoint (mesma regra estrutural de REQ-03.02.008), e recusar a operação com uma mensagem explicativa — proteção em tempo de execução para fluxos persistidos antes da validação estrutural existir, complementando a prevenção em tempo de edição.
#### REQ-05.08.006 - A mensagem de uma falha de integração apresentada na Execução e devolvida ao canal deve ser só o texto do erro (ex.: "O serviço X não aceitou a conexão (3 tentativas)."), nunca o corpo técnico bruto devolvido pelo Runtime Engine.
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

> Os detalhes de etapa descritos nesta user story aparecem, na Execução, no card da etapa na linha do tempo (REQ-05.03.008) e, no Diagnóstico (FT-15), no painel de detalhe do nó.

#### REQ-05.10.001 - Ao selecionar uma Tarefa de Serviço ou uma Tarefa de Recebimento no Fluxo da Jornada, o painel deve apresentar a configuração do conector: tipo (API REST, Kafka, Event Hubs ou Service Bus) e, para REST, método e URL configurados, quantidade/lista de headers e indicação de body configurado; para conectores de tópico, o nome do tópico/Event Hub, o cluster associado e se a tarefa é produtora (Producer) ou consumidora (Consumer) da mensagem.
#### REQ-05.10.002 - Ao selecionar um nó de Decisão (Gateway) no Fluxo da Jornada, o painel deve apresentar as condições de cada saída configurada (ou "Caminho padrão"), destacando visualmente qual saída foi de fato percorrida quando houver uma instância associada.
#### REQ-05.10.003 - Ao selecionar o nó de Início, o painel deve apresentar as variáveis de entrada declaradas para a jornada com o valor que de fato foi informado na execução selecionada, não apenas o tipo declarado.
#### REQ-05.10.004 - Ao selecionar o nó de Início por Mensagem (Message Start Event), o painel deve apresentar a configuração do conector de tópico que inicia a jornada, com o mesmo tratamento de REQ-05.10.001 (a jornada é consumidora da mensagem que a inicia).
#### REQ-05.10.005 - As seções de entrada e saída do painel devem ser colapsáveis individualmente.
#### REQ-05.10.006 - Para um conector de tópico (Kafka, Event Hubs ou Service Bus), a seção de entrada deve se chamar "Payload da Mensagem" em vez de "Entrada" — o que chega não é uma requisição/resposta, é a mensagem publicada ou consumida.
#### REQ-05.10.007 - O painel de detalhe do nó do Diagnóstico e a linha do tempo da Execução devem ser redimensionáveis horizontalmente (largura), sem alterar a altura.
#### REQ-05.10.008 - O log cronológico deve indicar o tipo de conector também para uma Tarefa de Recebimento (API REST, Kafka, Event Hubs ou Service Bus), da mesma forma que já indica para uma Tarefa de Serviço.
#### REQ-05.10.009 - Uma mensagem Kafka recebida por uma Tarefa de Recebimento ou por um Início por Mensagem deve ficar disponível para consulta (painel de detalhe do nó e log) da mesma forma que uma mensagem publicada por uma Tarefa de Serviço — cobrindo tanto o lado produtor quanto o consumidor.
#### REQ-05.10.010 - O diagrama do fluxo deve permitir aumentar e diminuir o zoom com o scroll do mouse.
---

### US-05.11 Retomada de instância em andamento
#### REQ-05.11.001 - O sistema deve permitir retomar, na própria tela de Execução, uma instância em andamento (`ACTIVE`), pelo mesmo campo de busca de jornadas (REQ-05.07.001), colando o ID da instância ou o business key ou escolhendo-a entre as execuções em andamento listadas, sem passar pelo Diagnóstico.
#### REQ-05.11.002 - Ao retomar, o sistema deve reconstruir o estado da execução (fluxo, passo atual, variáveis, canal e controle manual de Kafka) a partir do estado real da instância no motor de runtime, sem depender de nenhum histórico acumulado no navegador antes da retomada.
#### REQ-05.11.003 - Buscar por uma instância que exista mas não esteja `ACTIVE` (concluída ou encerrada) deve informar isso ao usuário na própria busca, sem tentar retomá-la ao vivo — essa consulta continua sendo papel do Diagnóstico (FT-15).
#### REQ-05.11.004 - Buscar por um ID de instância ou business key que não corresponda a nenhuma instância deve mostrar erro claro na própria busca, sem navegar.
#### REQ-05.11.005 - Durante uma execução, o usuário deve poder sair para a tela inicial sem encerrá-la ("Sair sem parar"); a instância continua no motor e o campo de busca volta com o business key dela, pronto para retomar.
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
#### REQ-06.02.004 - A nova versão deve possuir cópia independente do fluxo, conexões e das telas embutidas (`embeddedScreen`) de cada User Task.

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

### US-13.10 Novo visual
#### REQ-13.10.001 - O Dashboard deve oferecer um interruptor entre o visual atual e o novo visual.
#### REQ-13.10.002 - O novo visual deve organizar o conteúdo em abas: Visão geral, uma aba para cada visão adicionada e uma aba para cada painel montado.
#### REQ-13.10.003 - O administrador deve poder adicionar e remover as visões prontas (Mapa do portfólio, Monitoramento e impacto, Governança do ciclo de vida); cada visão adicionada vira uma aba e libera os seus widgets para os painéis.
#### REQ-13.10.004 - O administrador deve poder criar, renomear e excluir painéis, e montá-los arrastando ou clicando em widgets, reordenando-os e escolhendo a largura de cada um (1, 2 ou 4 colunas).
#### REQ-13.10.005 - Os recortes do topo (período e etapa do ciclo de vida) devem valer para a aba ativa inteira.
#### REQ-13.10.006 - O sistema deve guardar no servidor os painéis, as abas escolhidas e os recortes de cada usuário.
#### REQ-13.10.007 - O sistema deve oferecer recortes por produto, canal, status da jornada e time dono, e permitir escolher o período.
#### REQ-13.10.008 - O editor de fluxo deve permitir classificar cada Fim como Sucesso, Adiado ou Falha, e o sistema deve guardar o resultado de cada instância a partir do Fim em que ela terminou.
#### REQ-13.10.009 - O sistema deve calcular a taxa de sucesso de cada jornada (ponderada pelo volume no portfólio) e a variação em pontos percentuais contra a semana anterior.
#### REQ-13.10.010 - O sistema deve permitir cadastrar o time dono de cada jornada.
#### REQ-13.10.011 - O sistema deve permitir cadastrar a etapa do ciclo de vida de cada jornada: Aquisição, Ativação, Uso, Cobrança ou Retenção.
#### REQ-13.10.012 - O sistema deve obter o canal de cada instância, para os recortes e as matrizes por canal.
#### REQ-13.10.013 - O Mapa do portfólio deve dimensionar cada jornada pelo volume de execuções e colori-la por sucesso, incidentes ou variação, agrupando por produto, canal ou time dono; a jornada que piorou muito deve se destacar, e o clique deve abrir o resumo da jornada e levar ao Diagnóstico dela.
#### REQ-13.10.014 - O sistema deve apresentar a taxa de sucesso por produto e canal numa matriz.
#### REQ-13.10.015 - O sistema deve apresentar, com dados reais, os indicadores do portfólio (jornadas publicadas, execuções da semana e sucesso médio) e o ranking de jornadas por volume.
#### REQ-13.10.016 - O administrador deve poder criar, editar, excluir e testar regras de alerta escritas como frase: o quê, de quem, limite, janela de tempo, quem avisar e por qual meio.
#### REQ-13.10.017 - O sistema deve verificar as regras de alerta em segundo plano, a cada minuto, marcando a regra como disparada e limpando-a quando o valor voltar ao normal.
#### REQ-13.10.018 - O sistema deve enviar o aviso de uma regra disparada ao time dono por e-mail, Teams, webhook ou abertura de chamado.
#### REQ-13.10.019 - O sistema deve apresentar a saúde de cada integração do catálogo: latência p95, taxa de falha, jornadas que dependem dela e estado (ok, degradada ou fora do ar).
#### REQ-13.10.020 - O sistema deve apresentar o impacto de uma integração fora do ar ou degradada: as jornadas que a usam, as instâncias paradas por jornada e por canal, e os caminhos "Se falhar" em uso.
#### REQ-13.10.021 - O sistema deve comparar as execuções por hora do dia com a faixa esperada, calculada na mesma hora das últimas quatro semanas.
#### REQ-13.10.022 - O sistema deve apresentar a esteira de publicação: quantas jornadas há em cada estado, há quanto tempo estão nele e a lista das jornadas ao escolher um estado.
#### REQ-13.10.023 - O sistema deve listar as versões antigas que ainda têm instâncias em andamento, com a opção de encerrá-las (REQ-13.05.002).
#### REQ-13.10.024 - O sistema deve atribuir a cada jornada uma nota de A a E, recalculada todo dia, com o motivo escrito ao lado; a regra de cálculo será definida no refinamento.
#### REQ-13.10.025 - O sistema deve apontar a higiene do portfólio: jornada sem time dono, sem execução há 30 dias, rascunho sem edição há 30 dias, despublicada com instâncias ativas e integração sem "Se falhar".
#### REQ-13.10.026 - O sistema deve listar as últimas mudanças do portfólio a partir da auditoria (FT-08).
#### REQ-13.10.027 - O sistema deve alertar sobre instâncias aguardando mensagem há mais tempo que um limiar global (padrão de 1 hora, ajustável): a contagem, uma lista curta das mais antigas com jornada, etapa e há quanto tempo, e a abertura do Diagnóstico da instância. O alerta só avisa — não interrompe nem falha nada — e importa sobretudo para a espera sem limite de tempo (US-03.18).

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
#### REQ-14.01.002 - Cada cluster deve possuir identificador único (`clusterId`) e nome único na plataforma.
#### REQ-14.01.003 - O sistema deve permitir editar, consultar e excluir um cluster cadastrado.
#### REQ-14.01.004 - O sistema deve impedir a exclusão de um cluster referenciado por algum conector de jornada publicada, diretamente ou por meio de uma credencial dele (US-14.02). Sem essa referência, excluir o cluster remove também as credenciais associadas a ele.
#### REQ-14.01.005 - O sistema deve permitir pesquisar e filtrar clusters por tipo.
#### REQ-14.01.006 - A empresa opera múltiplos clusters corporativos por tipo (ex.: mais de um cluster Kafka); o catálogo não deve assumir um único cluster fixo por tipo de conector.
---

### US-14.02 Catálogo de credenciais
#### REQ-14.02.001 - O sistema deve permitir cadastrar uma credencial associada a um cluster do catálogo (US-14.01), composta por nome de referência (o valor usado como `credentialRef` na configuração do conector), URI do Azure Key Vault e nome do secret dentro dele.
#### REQ-14.02.002 - Cada credencial deve possuir identificador único (`credentialId`), nome de referência único na plataforma e cluster associado.
#### REQ-14.02.003 - O sistema não deve, em nenhuma tela, campo, log ou registro de auditoria, armazenar ou exibir o valor do secret — apenas a referência (URI do Key Vault + nome do secret). O admin-back pode ler o valor real do segredo em memória, no momento de uma conexão de teste ou de integração real, para autenticar contra o broker/API — nunca para persisti-lo, logá-lo ou expô-lo de volta ao usuário.
#### REQ-14.02.004 - O sistema deve permitir editar, consultar e excluir uma credencial cadastrada.
#### REQ-14.02.005 - O sistema deve impedir a exclusão de uma credencial referenciada por algum conector de jornada publicada.
#### REQ-14.02.006 - O sistema deve permitir pesquisar e filtrar credenciais por cluster associado.
---

### US-14.03 Acesso restrito à administração dos catálogos
#### REQ-14.03.001 - A criação, edição e exclusão de clusters (US-14.01) e credenciais (US-14.02) deve ser restrita ao papel `ADMIN` (FT-07); os papéis `EDITOR` e `VIEWER` não devem ter acesso a essas ações.
#### REQ-14.03.002 - O papel `EDITOR`, ao configurar um conector de mensageria numa jornada (FT-03), deve poder selecionar um cluster e uma credencial já cadastrados no catálogo, sem poder criar, editar ou excluir entradas do catálogo.
#### REQ-14.03.003 - Toda criação, edição e exclusão de cluster ou credencial deve ser registrada na auditoria do portal (FT-08), incluindo o usuário responsável.
---

### US-14.04 Teste de conexão
#### REQ-14.04.001 - O sistema deve permitir, a partir do catálogo, disparar um teste de conexão para um par cluster + credencial cadastrado, validando alcançabilidade do cluster e validade da credencial associada.
#### REQ-14.04.002 - O teste de conexão deve se limitar a uma operação de metadado (ex.: descrever/listar o tópico, fila ou hub) — o sistema não deve, em nenhuma hipótese, publicar ou consumir uma mensagem real como parte do teste.
#### REQ-14.04.003 - A execução do teste de conexão deve ocorrer no admin-back (nunca no navegador). Em ambiente local sem broker corporativo, a credencial pode ser dispensada (broker sem autenticação); no ambiente corporativo, o admin-back deve resolver a credencial cadastrada (US-14.02) e obter o segredo do Key Vault dinamicamente a cada chamada — nunca via configuração estática (YAML/properties) por ambiente.
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

### US-14.07 Catálogo de fontes de dados
#### REQ-14.07.001 - O sistema deve permitir cadastrar, editar e excluir fontes de dados de referência, restrito ao papel `ADMIN` (REQ-14.03.001); qualquer papel autenticado pode listá-las, para escolher uma fonte no editor de telas.
#### REQ-14.07.002 - Cada fonte deve ter nome único, descrição opcional, URL de uma consulta GET com os parâmetros marcados entre chaves (`{bilhete}`), tempo limite (100 ms a 30 s), caminho da lista na resposta (`$` ou `$.campo`), campos expostos e, opcionalmente, a referência de uma credencial.
#### REQ-14.07.003 - Os campos expostos são obrigatórios: só esses campos de cada item saem do servidor. A URL cadastrada é a única que a fonte pode chamar.
#### REQ-14.07.004 - O sistema deve permitir testar uma fonte informando valores de exemplo para os parâmetros; a chamada é feita pelo backend, com a mesma proteção do teste de conector (US-03.10), e mostra status, duração e os itens já com só os campos expostos.
#### REQ-14.07.005 - A credencial referenciada deve ser resolvida no servidor; ela nunca é enviada ao canal.

---

### US-14.06 Credencial de IA
#### REQ-14.06.001 - O sistema deve permitir cadastrar, atualizar e remover a credencial de API de um provedor de IA — Gemini, Claude (Anthropic), OpenAI ou GitHub Models —, restrito ao papel `ADMIN`.
#### REQ-14.06.002 - A API não deve, em nenhuma resposta, retornar o valor da chave salva — apenas se está configurada, o modelo escolhido, se é o provedor ativo e a data da última atualização.
#### REQ-14.06.003 - Diferente do catálogo de credenciais de mensageria (REQ-14.02.003), esta credencial é armazenada em texto plano no banco de dados, como desvio deliberado e temporário do princípio de nunca persistir segredo — decisão registrada no código com pendência explícita de criptografia antes de produção.
#### REQ-14.06.004 - Cada provedor deve poder ter o modelo escolhido; em branco, vale o modelo padrão do provedor (no Gemini, o configurado no sistema).
#### REQ-14.06.005 - No máximo um provedor pode estar ativo para a geração; sem nenhum ativo, vale o Gemini. Ativar um provedor desativa o anterior, e remover a credencial do provedor ativo devolve a geração ao Gemini.
#### REQ-14.06.006 - Ao editar a credencial de um provedor já configurado, a chave em branco mantém a atual; a chave só é obrigatória na primeira configuração do provedor.
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
#### REQ-15.03.003 - O log do detalhe deve incluir cada consulta a uma fonte de dados feita ao montar uma tela da instância (US-04.16) — fonte, tela, URL, status, duração e quantidade de itens —, já que essa busca acontece fora do Runtime Engine e não aparece no histórico da instância.
#### REQ-15.03.004 - Quando a execução estiver parada num incidente de integração em segundo plano (REQ-03.18.006) ou de publicação de mensagem que esgotou as tentativas (REQ-03.18.010), o detalhe deve oferecer "Tentar de novo", que faz o Runtime Engine executar a etapa outra vez (uma nova tentativa) e recarrega o detalhe. A ação é restrita aos perfis EDITOR e ADMIN.
#### REQ-15.03.005 - O detalhe deve oferecer a reprodução da execução: reproduzir/pausar (avanço automático), passo anterior e próximo passo (avanço manual, que pausa o automático), controle deslizante e voltar ao começo. No passo escolhido, o fluxo mostra só o caminho até ali (numerado, com o resto esmaecido e a mesma animação de chegada da Execução, REQ-05.03.009), o log mostra só o que aconteceu até ali e o histórico de variáveis mostra só as variáveis já definidas, cada uma com o valor que tinha naquele momento.
#### REQ-15.03.006 - O painel de Histórico de Variáveis e Log do detalhe deve abrir recolhido e poder ser expandido ou recolhido.
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
>
> **Nota de revisão (2026-10-04):** parte do que "Analytics" cobre foi registrada como ideação do novo visual do Dashboard (US-13.10), com os requisitos descritos para refinamento posterior. O estudo completo está em [novo_dashboard.html](../ideacao/novo_dashboard.html). "Analytics" segue nesta lista até que esses requisitos sejam refinados e implementados.
