# Instruções gerais do repositório

Este repositório tem dois projetos independentes:

- `front/` — React + TypeScript + Vite + Tailwind + Mística. Ver [front/AGENTS.md](../front/AGENTS.md).
- `back/` — Java 21 + Spring Boot + Maven. Ver [back/AGENTS.md](../back/AGENTS.md).

Antes de editar qualquer arquivo em `front/` ou `back/`, leia o `AGENTS.md` correspondente — ele descreve stack, convenções (ex: padrão de tema claro/escuro e de formulários no front, camadas e migrations no back) e como rodar build/testes.

## Atualizando a página "Sobre" (progresso do MVP)

Sempre que `requisitos/admin/progresso.md` ou a seção `§5 Fora do Escopo do MVP` de
`requisitos/admin/ej-admin-requisitos.md` mudarem (requisito novo, status atualizado, requisito
mockado/parcial), sincronize `front/src/shell/sobreData.ts` com o novo estado. O processo completo
está documentado em `.claude/skills/sync-sobre/SKILL.md` — abra e siga passo a passo mesmo fora do
Claude Code (essa é a fonte de verdade; o resumo abaixo pode ficar desatualizado):

1. Releia `progresso.md` por completo; para cada requisito extraia código, descrição, status
   (`done`→`done`; `in_progress`→`partial`; `todo`/`blocked`→`todo`; `n/a`→`na`) e a coluna Notas.
2. Requisitos mockados usam o helper `mock()`; requisitos parciais usam
   `partial(code, description, notes)` com a nota explicando exatamente o que falta.
3. Confira que a contagem de requisitos por feature bate entre `progresso.md` e `sobreData.ts`
   (uma linha da tabela = um item no array `requirements` da feature correspondente).
4. Edite `sobreData.ts` com os helpers `d()`/`todo()`/`na()`/`mock()`/`partial()` — nunca edite
   totais/percentuais à mão, são derivados do array `EPICS`.
5. Se a seção §5 (Fora do Escopo) mudou, atualize `OUT_OF_SCOPE` também.
6. Só crie uma linha nova no changelog (`## Changelog deste arquivo` em `progresso.md` +
   `CHANGELOG_PROGRESSO` em `sobreData.ts`, copiada verbatim) quando os **requisitos em si**
   mudarem — nunca para detalhe de implementação/refactor/config. Toda entrada leva data **e
   hora**: horário real do commit (`git log --pretty=format:'%ad' --date=format:'%Y-%m-%d %H:%M'`)
   se já commitado, ou `date '+%Y-%m-%d %H:%M'` marcado `(não commitado)` caso contrário.
7. Valide com `cd front && npx tsc --noEmit -p .` — tem que compilar limpo.
