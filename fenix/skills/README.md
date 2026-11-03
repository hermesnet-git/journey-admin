# Scripts da jornada "Abertura de BD pelo VE"

Dois scripts para recriar a jornada no Elastic Journey e gerar o BPMN organizado que está em
`fenix/abertura-bd-pelo-ve.bpmn`.

## Antes de rodar

- Node.js 18 ou mais novo.
- Admin (back) no ar em `http://localhost:8081`, com o usuário `admin` / `admin`.
- Motor de execução no ar em `http://localhost:8080` (só para o segundo script).
- Dependências instaladas (`npm install`) em `front/` e em `simulacoes/emulador-canais/`. Os scripts
  usam o `elkjs` e o `@xmldom/xmldom` dessas pastas e também os ajudantes da skill em
  `.claude/skills/criar_jornada_publicada/scripts/sdui_helpers.mjs`.
- O produto "Vivo empresas - VE" precisa existir no admin com o id
  `66896bd3-f42d-4549-af38-df2c1c0e34df` (fixo no script).

Rode os comandos a partir da raiz do repositório (`admin/`).

## 1. Criar e publicar a jornada

```
node fenix/skills/jornada_abertura_bd_ve.mjs
```

- Procura a jornada "Abertura de BD pelo VE" no produto "Vivo empresas - VE" (canal App) e a cria se
  ela ainda não existir.
- Grava o fluxo completo: telas do Figma, integrações, decisões, seções e as notas que explicam a
  origem de cada decisão.
- Gera uma nova versão e publica.
- Mostra no terminal o `journeyId` e o número da versão publicada.

Cada execução publica uma versão nova e **substitui o fluxo da jornada pelo que está no script**.
Alterações feitas à mão no editor se perdem; leve-as para o script antes de rodar de novo.

As integrações apontam para o simulador de APIs (`http://localhost:8084/v1`) e para o tópico de
teste `eljy.eventos.entrada`. Isso basta para publicar. Para usar APIs reais, troque as URLs, o
tópico e o cluster no script ou na própria jornada.

## 2. Gerar o BPMN organizado

```
node fenix/skills/organizar_bpmn.mjs c4de98d7-8525-4ffd-8cde-ce66c0660830 fenix/abertura-bd-pelo-ve.bpmn
```

Parâmetros: o `journeyId` (o valor acima é o da jornada atual; use o que o primeiro script mostrar
se a jornada for recriada) e o arquivo de saída.

- Baixa do motor o BPMN da versão publicada e, do admin, os rótulos das ligações e as seções.
- Refaz só o desenho: ligações em ângulo reto com rótulo ("Sim", "Sem resposta em 3 min"...),
  eventos "Se falhar" na borda de baixo das etapas e as seções como grupos.
- A lógica do processo não muda.
- Sobrescreve o arquivo de saída.

Rode este script depois de cada publicação para o BPMN acompanhar a versão publicada.
