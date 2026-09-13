---
name: criar_jornada_publicada
description: Cria (ou atualiza) um produto, uma jornada multicanal e um fluxo com N telas SDUI publicado via API do admin/back, sem passar pelo navegador ou pela geração por IA — usado pra gerar massa de teste rapidamente (ex.: jornadas de laboratório pra validar Diagnóstico, timeline de variáveis, ou qualquer funcionalidade que precise de uma jornada publicada de verdade). Use quando o usuário pedir "cria uma jornada publicada", "gera uma jornada de teste", "monta um fluxo com N telas e publica", ou pedir uma jornada de laboratório/exemplo.
---

# Criar jornada publicada via API

Monta produto → jornada → fluxo (telas SDUI) → versão → publicação inteiramente por chamadas HTTP
ao admin/back (porta 8081), do mesmo jeito que o editor faz clique a clique — mas em segundos, sem
depender do navegador. Existe porque massa de teste pra validar uma funcionalidade nova (ex.: a
timeline de variáveis do Diagnóstico) precisa de uma jornada publicada de verdade, com telas reais,
não um mock.

## Pré-requisitos

- `admin/back` já rodando em `localhost:8081` (não suba/reinicie o serviço — se não estiver no ar,
  peça pro usuário subir a stack local, `start-all.bat`/`start-all.command`).
- Node 18+ disponível (`fetch` nativo) — sem dependências externas.
- Login mockado do MVP: `admin`/`admin` (REQ-07.01/02/04) — `sdui_helpers.mjs` já faz isso.

## Passo a passo

1. **Escreva um script `.mjs`** importando `scripts/sdui_helpers.mjs` (mesma pasta desta skill).
   Use `scripts/example_laboratorio_variaveis.mjs` como referência direta — é um caso real e
   funcional (jornada "Laboratório de Variáveis", produto "Laboratorio").
2. `login()` → token.
3. `ensureProduct(token, { name, description, channelTypes })` — reaproveita um produto existente
   com o mesmo nome em vez de duplicar; `channelTypes` é um subconjunto de `WEB`/`MOBILE`/`WHATSAPP`.
4. `ensureJourney(token, { productId, channelTypes, name, description })` — idem para a jornada.
5. Monte `nodes`/`connections` com os construtores de `sdui_helpers.mjs`:
   - `startNode`/`endNode`/`userTaskNode` — os três tipos de nó de fluxo que este helper cobre hoje
     (sem GATEWAY/SERVICE_TASK/RECEIVE_TASK — acrescente à mão seguindo o mesmo formato de
     `FlowNodeInput`, `back/src/main/java/com/jouney/admin/interfaces/flow/FlowNodeInput.java`, se
     precisar de decisão/integração).
   - Dentro de `userTaskNode`, os filhos da tela vêm de `text`/`textInput`/`textArea`/`select`/
     `checkbox`/e um botão de ação (`{ type: 'ui.button', events: { onPress: { action:
     'action.submit', params: {} } } }` — copie o padrão do exemplo).
   - `connection(id, sourceNodeId, targetNodeId)` liga os nós; `nodeId` sempre com prefixo `Node_`,
     `connectionId` sempre com prefixo `Flow_` (validado pelo back, `FlowNodeInput`/
     `FlowConnectionInput`).
   - **Sempre use `layoutRow(items, opts)`** pra calcular `positionX`/`positionY` em vez de números
     soltos — veja "Posicionamento" abaixo. Sem isso, o fluxo aparece torto no Flow Designer.
6. `publishNewFlow(token, journeyId, { name, nodes, connections }, descrição da versão)` — faz
   PUT do fluxo, cria a versão e publica, nessa ordem. Devolve a versão publicada.
7. Rode com `node seu-script.mjs` e confira a saída (`published.status` deve ser `PUBLISHED`).

## Posicionamento: sempre use `layoutRow`

`positionX`/`positionY` é o canto superior-esquerdo do nó, não o centro — e `START`/`END`
(52px) são menores que `USER_TASK` (78px) no canvas do Flow Designer
(`front/src/flow-designer/model.ts`, `NODE_DIMENSIONS`). Usar o mesmo Y bruto pra tipos de tamanhos
diferentes desalinha os centros verticais, e é do centro que a aresta sai (Handle do React Flow) —
o fluxo aparece com as linhas de conexão levemente tortas em vez de retas.

`layoutRow(items, { startX, spacingX, centerY })` resolve isso: recebe a lista ordenada de
`{ nodeId, nodeType }` (esquerda pra direita) e devolve um `Map` com a posição já compensada por
tipo, todos os centros alinhados em `centerY`. Use assim:

```js
const layout = layoutRow([
  { nodeId: 'Node_Start', nodeType: 'START' },
  { nodeId: 'Node_Tela1', nodeType: 'USER_TASK' },
  { nodeId: 'Node_End', nodeType: 'END' },
]);
const posOf = (id) => [layout.get(id).positionX, layout.get(id).positionY];
// ...
startNode('Node_Start', 'Início', ...posOf('Node_Start')),
userTaskNode('Node_Tela1', 'Tela 1', 'descrição', ...posOf('Node_Tela1'), 'tela1', 'Tela 1', [...]),
```

Veja `example_laboratorio_variaveis.mjs` pro caso completo.

## Regra importante: reaproveitar o nome de uma variável entre telas

Desde 2026-09-12 (REQ-03.09.011 em `requisitos/admin/ej-admin-requisitos.md`), o **mesmo** nome de
variável pode aparecer em campos de telas (`USER_TASK`) diferentes — é o padrão de
releitura-e-edição do vínculo `twoWay` (catálogo SDUI v1, seção 8.1): a tela seguinte relê o valor
já coletado antes de aceitar a alteração. Use isso de propósito quando o objetivo for testar algo
que dependa da variável mudando de valor ao longo da jornada (ex.: a timeline de variáveis do
Diagnóstico, FT-15) — veja `Node_Confirmacao`/`Node_Revisao` em
`example_laboratorio_variaveis.mjs`, que reaproveitam `nomeCompleto` e `planoEscolhido`.

A única coisa que continua proibida (o back rejeita a publicação, 422) é colidir o nome de um campo
de tela com uma variável de **saída de integração** (`outputMapping` de um Service/Receive Task) ou
de **entrada da jornada** (`startVariables` do nó START) — ver `FlowValidator.java`
(`back/src/main/java/com/jouney/admin/domain/flow/FlowValidator.java`).

## Erros comuns

- **422 "Variável de saída 'X' foi declarada mais de uma vez no fluxo"** — o nome colidiu com uma
  variável de saída de integração ou de entrada, não com outro campo de tela (isso é permitido).
  Renomeie um dos dois.
- **422 estrutural genérico** (ex.: "precisa ter exatamente um passo inicial") — confira que há
  exatamente um `START`, ao menos um `END`, e que toda etapa tem entrada e saída únicas (ver
  `FlowValidator.validate`).
- **401 depois de reiniciar o admin/back** — sessões ficam em memória (`SessionStore`); refaça o
  login, o token antigo não sobrevive a um restart do serviço.

## Conexão com a geração de jornada por IA

O mesmo formato de nó/tela/binding montado aqui é exatamente o que
`back/src/main/java/com/jouney/admin/domain/flow/AiFlowGenerator.java` e
`back/src/main/java/com/jouney/admin/infrastructure/ai/FlowGenerationPrompt.java` precisam produzir
quando o usuário pede uma jornada nova pela IA (`POST /journeys/{id}/flow/generate`). Se um dia a
IA passar a reaproveitar variável entre telas (ex.: pra modelar uma etapa de revisão) ou a evoluir
esse padrão, `sdui_helpers.mjs` é a referência de "como fica o JSON válido" — vale usar como
material de apoio ao ajustar o prompt de geração, não como código compartilhado (a geração por IA
roda dentro do backend Java, não em Node).
