# ADR-002: Dados em telas SDUI — dado de processo vem do fluxo, dado de referência vem da tela; listas materializadas no servidor

- **Status:** Proposta
- **Data:** 2026-09-29
- **Afeta:** catálogo de componentes SDUI (`requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md`, §1, §8 e §14.4), saída de integrações (REST e Kafka), ms-espec-registry, ms-journey, editor de telas, preview, execução, emulador de canais e massa de fábrica

## Resumo

Uma tarefa de usuário precisa mostrar uma lista vinda de um sistema externo (por exemplo, os bilhetes de defeito do cliente), deixar o usuário escolher um item e aplicar uma ação sobre ele (reagendar ou cancelar), com as ações liberadas de acordo com o item escolhido — nos canais web, mobile e WhatsApp. A plataforma não faz isso hoje.

A decisão separa os dados que uma tela usa em dois tipos, cada um com sua origem:

- **Dado de processo** — decide caminho, precisa de auditoria (ex.: os bilhetes do cliente): vem de uma **integração no fluxo**, que grava a lista numa variável da instância.
- **Dado de referência** — só apoia a tela (ex.: horários disponíveis para reagendar, motivos de cancelamento): vem de uma **fonte de dados declarada na tela** (`dataSources`), buscada pelo servidor ao montar a tela.

Nos dois casos, a lista é **materializada no servidor** (ms-espec-registry) antes de chegar ao canal: o canal recebe os itens prontos e só desenha. Um componente novo de **lista de seleção** consome essa lista, com as ações sobre o item selecionado declaradas no próprio componente.

## Contexto

### O que impede o caso hoje

- Nenhum dos 19 componentes do catálogo v1 lista itens de uma coleção — o §1 do catálogo deixa "tabelas avançadas" fora do v1 "até comprovação de uso". O caso dos bilhetes é essa comprovação.
- `ui.select.options` é estático: definido na autoria, sem vínculo com variável.
- A saída de integração grava só valores escalares. Um jsonPath que aponta para um array (`$.bilhetes`) não vira variável; no Kafka, um array em `payload.data` é repassado como objeto Java cru e gravado num formato binário ilegível.
- `action.submit` ignora os parâmetros do botão: dois botões ("Reagendar", "Cancelar") não conseguem dizer ao motor qual foi apertado.
- `$active` só compara uma variável com um valor; não expressa "o item selecionado permite esta ação".
- `dataSources` existe no envelope da tela, mas é obrigatoriamente `{}` no v1 (§14.4), com a lista de pontos a decidir antes de qualquer uso.

### Como plataformas SDUI de mercado resolvem

Com base no que foi publicado (posts de engenharia e frameworks abertos):

- **Quem busca o dado é sempre o servidor**, ao montar a tela. O cliente não conhece a API de domínio (Airbnb Ghost Platform, Lyft, HubFramework do Spotify). É a mesma regra que o §14.4 já adota: renderers não executam URLs.
- **Duas escolas para listas:** a *materializada* (o servidor manda os N itens prontos — Airbnb, Lyft) e a de *modelo + dados* (o servidor manda um modelo de item e o array; o cliente repete — Beagle da Zup, Adaptive Cards da Microsoft). A materializada é a mais comum com muitos canais diferentes.
- **A ação volta com o identificador, nunca com o objeto:** o servidor rebusca o dado confiável pelo id antes de agir.
- **Paginação por cursor controlado pelo servidor**, e estados de vazio/erro montados pelo servidor.

A particularidade desta plataforma é ter um **motor de fluxo** entre o canal e os sistemas de domínio. Nas plataformas citadas, o BFF é o orquestrador; aqui, o motor orquestra. Daí a separação entre dado de processo (passa pelo motor, fica no histórico, pode decidir caminho) e dado de referência (não precisa passar pelo motor).

## Decisão

### 1. Componente de lista de seleção

O usuário escolhe **um** item da lista. Não há botões repetidos em cada linha: as **ações sobre o item selecionado pertencem ao componente de lista**.

O autor configura no editor de telas:

| Propriedade | Exemplo |
|---|---|
| Lista de itens | `data.bilhetes` |
| Valor gravado na seleção | `numeroBilhete` → `form.bilheteSelecionado` |
| Título do item | `{{item.tipoDefeito}} — prioridade {{item.prioridade}}` |
| Descrição do item | `{{item.numeroBilhete}} · aberto em {{item.dataAbertura}}` |
| Mensagem de lista vazia | `Você não tem bilhetes em aberto.` |
| Ações | `reagendar` — "Reagendar visita" — liberada quando `{{item.podeReagendar}} == true`; `cancelar` — "Cancelar bilhete" (perigo) — liberada quando `{{item.podeCancelar}} == true` |
| Ação gravada | `form.acaoBilhete` |
| Aviso por item (opcional) | `{{item.motivoBloqueio}}` |
| Máximo de itens | 50 (padrão) |

- O prefixo **`item`** é válido **só dentro desse componente**. Ele é resolvido no servidor e nunca chega ao canal. É a única exceção à regra de namespaces reduzidos a `form` e `data`.
- A regra de negócio "este item pode ser cancelado" vem do **sistema de origem** (campos por item na resposta da API), não é reescrita na tela.
- A seleção grava **duas variáveis por vínculo**: o item e a ação. Isso contorna a limitação do `action.submit` sem parâmetros.
- **O fluxo revalida no servidor** antes de agir (Decisão que rebusca o item pelo id, ou o sistema de destino recusando). Um botão habilitado no canal é conforto para o usuário, não garantia.

Os nomes de componente e de propriedades nesta ADR são ilustrativos; os definitivos saem da implementação.

### 2. Materialização no servidor

O snapshot publicado guarda o modelo (`itemTitle`, `itemDescription`, regras das ações, vínculo `items` → `data.bilhetes`). Ao montar a tela, o ms-espec-registry lê a lista e entrega ao canal os itens prontos:

```json
{
  "value": "BD-2026-502871",
  "title": "Lentidão na conexão — prioridade Média",
  "description": "BD-2026-502871 · aberto em 28/09/2026 09:45",
  "enabledActions": ["cancelar"],
  "hint": "O técnico já está a caminho, não é possível reagendar."
}
```

O canal não vê `{{item.x}}`, o array original nem as regras das ações — só `value`, `title`, `description`, `enabledActions` e `hint`.

### 3. Experiência por canal

- **Web e mobile:** lista com seleção; as ações ficam abaixo, desabilitadas até a escolha, e habilitam conforme `enabledActions` do item, sem ida ao servidor.
- **WhatsApp:** mensagem de lista nativa; ao escolher uma linha, o adaptador responde com botões de resposta só das ações liberadas daquele item. Sem ação liberada, mostra o aviso e reoferece a lista. É a mesma definição SDUI, na "projeção conversacional" que o catálogo já prevê.

### 4. Limites

| Limite | Tratamento |
|---|---|
| Mais de 3 ações, ou rótulo de ação acima de 20 caracteres, em jornada com WhatsApp | Recusa na publicação |
| Título acima de 24 caracteres ou descrição acima de 72 (resolvidos) | Corte com "…" no adaptador WhatsApp; aviso no editor quando só a parte fixa já excede |
| Mais de 10 itens no WhatsApp | "Ver mais" paginado pelo próprio adaptador (os itens já vieram com a tela) |
| Mais itens que o máximo configurado (padrão 50) | Corte com aviso "mostrando 50 de N", em todos os canais |

### 5. Dado de processo: lista como variável da instância

- A saída de integração ganha o tipo **lista**. O REST e o Kafka passam a gravar o array como **JSON do Spin**, o tipo JSON nativo do motor. Texto é descartado pelo limite de 4.000 caracteres. Objeto Java é descartado por ser binário e ilegível no Diagnóstico.
- O tipo lista tem **"campos a manter"**, para não guardar no histórico da instância campos sensíveis que a tela e as regras não usam.

### 6. Dado de referência: `dataSources`

**Caminho:** canal → BFF → ms-journey → **ms-espec-registry**. O ms-journey repassa o pedido da tela com as variáveis da instância. O ms-espec-registry busca as fontes declaradas e monta a tela. Nenhum canal chama o registry diretamente, e nenhum renderer ou BFF chama a fonte.

| Tópico do §14.4 | Decisão |
|---|---|
| Fontes registradas ou estáticas | Registradas, num **catálogo de fontes de dados** (US nova no FT-14, restrita ao papel ADMIN): nome, descrição, URL com os lugares dos parâmetros, parâmetros declarados, credencial do catálogo, timeout, caminho da lista na resposta, campos expostos e botão "Testar" |
| Tipos de fonte | Só REST GET. Mensageria fica fora, porque a tela precisa de resposta síncrona |
| Declaração na tela | `dataSources: { "horarios": { "source": "agenda-tecnica", "params": { "bilhete": "{{form_bilheteSelecionado}}" } } }`. Parâmetros só de `form` e `data` |
| Congelamento | A configuração da fonte vai congelada na publicação, junto da tela no registry. Alterar a fonte no catálogo afeta só as próximas publicações |
| Namespace | O resultado aparece como `data.<apelido>`. O validador recusa apelido que colida com variável da instância |
| Resultado × instância | O resultado não vira variável da instância; só a escolha do usuário vai para `form.x` |
| Prefetch e cache | Busca a cada montagem da tela, inclusive ao voltar a ela. Sem cache |
| Timeout e fallback | Por fonte, o autor escolhe **opcional** (a tela abre com a lista vazia e uma mensagem) ou **obrigatória** (estado de erro com "Tentar novamente", uma ação nova no catálogo que refaz a montagem) |
| Autenticação | Credencial do catálogo resolvida no servidor (Key Vault), como no REQ-14.04.003 |
| Dados sensíveis e allowlist | Campos expostos obrigatórios: só eles saem do servidor. A URL cadastrada é a allowlist |
| Consumidores | A lista de seleção e as opções do `ui.select`, que passam a aceitar vínculo com uma lista |
| Editor e preview | O preview usa a resposta do "Testar" da fonte |
| Observabilidade | Cada busca é registrada (fonte, instância, tarefa, duração, status, número de itens) e aparece no Diagnóstico da instância como "consulta da tela". Entra na primeira entrega |

## Alternativas consideradas

- **Repetidor genérico com botões por linha:** descartado. Exigiria `action.submit` com parâmetros e um modelo de componentes por item em cada renderizador, e não tem forma natural no WhatsApp.
- **Botões soltos na tela com uma condição nova no `$active`** ("item selecionado permite X"): descartado. Criaria um caminho e uma regra de condição genéricos para um caso específico, e o adaptador do WhatsApp teria de inferir a relação entre os botões e a lista.
- **Mapeamento de um campo por linha** (`titleField`, `descriptionField`) em vez de `{{item.x}}`: evitaria a exceção de namespace, mas não permite compor texto (juntar prioridade ao título, "aberto em…" na descrição).
- **Repetição no cliente (modelo + dados):** descartado. Exigiria implementar repetição e o escopo `item` em cada renderizador (React web e mobile, Flutter web e mobile, WhatsApp) e nos dois runtimes do emulador.
- **`dataSources` para todo dado de tela, inclusive o de processo:** descartado. O dado que decide caminho sairia do histórico da instância e do Diagnóstico.
- **Busca da fonte no ms-journey:** descartada. O ms-journey só repassa o pedido; a montagem da tela, inclusive o dado que ela usa, fica no ms-espec-registry.

## Consequências

**Positivas**
- O caso dos bilhetes (e qualquer "escolha um item e aja sobre ele") passa a ser modelável sem código específico por jornada.
- Uma única implementação de materialização, no servidor. Os renderizadores só desenham itens prontos.
- Dado de processo continua auditável no histórico da instância. Dado de referência não polui o fluxo com tarefas de serviço que só servem para popular a tela.
- `dataSources` deixa de ser só reserva e ganha um desenho alinhado ao §14.4, sem abrir chamadas de URL no cliente.

**Negativas / trade-offs**
- O prefixo `item` é uma exceção à regra de namespaces `form`/`data`, que precisa ser tratada no validador, no editor e na resolução.
- O ms-espec-registry passa a fazer chamadas externas e a resolver credenciais do Key Vault, o que hoje só o admin-back faz.
- Uma chamada lenta de fonte atrasa a montagem da tela: o timeout por fonte e a escolha opcional/obrigatória precisam ser bem configurados.
- Listas grandes aumentam o histórico da instância. "Campos a manter" e o máximo de itens mitigam, mas não eliminam.
- O catálogo SDUI ganha um componente e uma ação novos ("Tentar novamente"); a massa de fábrica precisa recriá-los, porque o TRUNCATE limpa `component_definition`.

## Referências

- `requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md` — §1 (fora do v1), §8 (vínculos e placeholders), §14.1 e §14.4 (`dataSources`)
- `requisitos/admin/ej-admin-requisitos.md` — FT-14 Catálogo de Integrações (US-14.01 a US-14.06)
- [001-integracao.md](./001-integracao.md) — padrão de integração do motor (Java Delegate + Resilience4j × External Task)
- Jornada "Consulta BD" (produto VE) — caso de origem da discussão
