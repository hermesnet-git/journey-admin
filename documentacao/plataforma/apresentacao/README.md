# Dynamic Journey — Arquitetura de Plataformas e Canais Digitais

Apresentação HTML interativa que também serve como documentação navegável da arquitetura da plataforma: portal administrativo (design-time), motor de runtime (execução) e emulador de canais (prova arquitetural).

## Como abrir

Abra `index.html` no navegador. Não há dependências externas, instalação nem servidor: funciona por `file://`.

Para servir por HTTP a partir desta pasta, qualquer servidor estático resolve:

```powershell
python -m http.server 4173
```

## Modos de uso

| Modo | Para quê |
|---|---|
| Apresentação | Uma visão por tela, navegação por setas, trilha inferior ou teclado. |
| Leitura | Todas as visões empilhadas, para consulta como documento. |
| Impressão / PDF | Uma página por visão em proporção de apresentação, direto pelo diálogo de impressão. |
| Detalhe | Cartões com “detalhes →” abrem um painel lateral com responsabilidade, fronteira e fonte. |

Atalhos: `←` `→` navegam · `O` sumário · `R` modo leitura · `T` tema claro/escuro · `F` tela cheia · `A` alterna o cenário do comparativo · `Esc` fecha sobreposições.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | As 18 visões, com os diagramas em SVG embutido. |
| `styles.css` | Tema derivado dos tokens reais da skin Vivo Evolution (Mística), claro e escuro, mais a folha de impressão. |
| `app.js` | Navegação, sumário, painéis de detalhe, explorador do catálogo, player de sequência e o renderizador SDUI multicanal. |
| `MAPA-DE-CONTEUDO.md` | Rastreabilidade: o que cada visão afirma e onde isso foi verificado. |

## Estrutura narrativa

| Bloco | Visões | Papel |
|---|---|---|
| Abertura | 01–02 | O valor da plataforma em três pilares (portal, catálogo SDUI e motor de estados), e o custo das capacidades replicadas em cada canal sem ela. |
| Catálogo SDUI | 03–06 | O contrato que torna o multicanal possível: por que é central, o que contém, como uma tela trafega e a prova ao vivo. |
| Arquitetura | 07–13 | Mapa, portal, publicação, runtime, ciclo de uma etapa, emulador e renderizadores. |
| Decisão | 14–18 | Fronteiras, achados do código, estado atual, evolução e fontes. |

O catálogo vem antes da arquitetura de propósito: jornadas multicanal dependem estritamente dele, e ele é a única dependência compartilhada por editor, publicação, runtime e renderizadores.

## O que é gerado ao vivo nesta página

Cinco peças não são ilustração:

- **Capa (visão 01).** Um passo, três canais, em ciclo de 16 segundos: o Dynamic Journey decide cada passo e entrega a mesma especificação sdui ao mesmo tempo para web, app e WhatsApp, que a exibem cada um na sua forma (planos lado a lado, lista e conversa com respostas rápidas). Antes das ofertas, ele consulta o catálogo de ofertas no sistema corporativo. O fluxo é desenhado a 732×600 e escalado para a coluna; com movimento reduzido, fica parado com as ofertas já entregues aos três canais.
- **Comparativo antes e depois (visão 02).** As colunas de capacidades replicadas em cada canal convergem para o centro e desaparecem quando o cenário muda, e os indicadores viram junto. O colapso de trinta capacidades em seis é o próprio argumento. Quem apresenta alterna o cenário pelo seletor, clicando no diagrama ou com a tecla `A`.
- **Explorador do catálogo (visão 04).** Transcrição navegável do de/para normativo: para cada um dos 19 componentes, as propriedades com as obrigatórias em destaque, os campos reservados aceitos e a forma nativa em cada um dos cinco alvos.
- **Projeção multicanal (visão 06).** O renderizador em `app.js` percorre a árvore Hiccup do envelope e aplica as regras de projeção do catálogo v1, produzindo as três telas na hora. Trocar o envelope muda os três canais, incluindo os diagnósticos listados abaixo do código.
- **Ciclo de uma etapa (visão 11).** Cada passo acende o salto correspondente no diagrama e mostra a chamada e o corpo reais daquela etapa, extraídos da implementação.

As regras de projeção implementadas foram verificadas com um arnês em Node que renderiza os três envelopes de exemplo fora do navegador e confere: interpolação de placeholder, remoção de subárvore por regra de visibilidade não satisfeita, limite de três respostas rápidas antes de virar lista interativa, omissão de componentes puramente visuais com diagnóstico informativo e projeção textual de progresso.

## Paleta

Os tokens de cor vêm da skin `vivo-evolution` do Mística, lida do pacote oficial presente no repositório, e não de uma aproximação visual:

`vivoPurple700 #660099` · `vivoPurple900 #380057` · `vivoPurple600 #7a2fb3` (marca no tema escuro) · `vivoGreen600 #99cc33` · `vivoPepper600 #cc1f59` · neutros `#0e0c14` a `#ffffff`.

## Premissas editoriais

- **Runtime Engine** é o nome lógico apresentado. O módulo correspondente no repositório embarca um motor BPMN de mercado; o nome do produto de mercado não aparece no material, seguindo a convenção já adotada nos documentos de requisitos.
- Serviços são citados por papel nas visões executivas e por identificador apenas onde a precisão exige, nos painéis de detalhe.
- O emulador de canais é descrito como laboratório e prova arquitetural, nunca como topologia produtiva.
- Percentuais e estados refletem o registro de progresso na data de elaboração.
- A visão “Achados de arquitetura” reporta divergências observadas na implementação, não defeitos confirmados em produção. Cada item indica o efeito prático conhecido.
