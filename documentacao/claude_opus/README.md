# Dynamic Journey — Arquitetura de Solução

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

Atalhos: `←` `→` navegam · `O` sumário · `R` modo leitura · `T` tema claro/escuro · `F` tela cheia · `Esc` fecha sobreposições.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | As 17 visões, com os diagramas em SVG embutido. |
| `styles.css` | Tema derivado dos tokens reais da skin Vivo Evolution (Mística), claro e escuro, mais a folha de impressão. |
| `app.js` | Navegação, sumário, painéis de detalhe, player de sequência e o renderizador SDUI multicanal. |
| `MAPA-DE-CONTEUDO.md` | Rastreabilidade: o que cada visão afirma e onde isso foi verificado. |

## O que é gerado ao vivo nesta página

Três peças não são ilustração, são execução:

- **Comparativo antes e depois (visão 02).** As colunas de responsabilidade duplicadas em cada canal convergem para o centro e desaparecem quando o cenário muda, e os indicadores viram junto. O colapso de trinta blocos em seis é o próprio argumento.
- **Projeção multicanal (visão 10).** O renderizador em `app.js` percorre a árvore Hiccup do envelope e aplica as regras de projeção do catálogo v1, produzindo as três telas na hora. Trocar o envelope muda os três canais, incluindo os diagnósticos listados abaixo do código.
- **Ciclo de uma etapa (visão 08).** Cada passo acende o salto correspondente no diagrama e mostra a chamada e o corpo reais daquela etapa, extraídos da implementação.

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
