---
name: sync-sobre
description: Sincroniza a página estática "Sobre" (front/src/shell/sobreData.ts) com o estado real de requisitos/admin/progresso.md e ej-admin-requisitos.md. Use quando progresso.md mudar (novos requisitos, status atualizado, requisitos mockados) ou quando o usuário pedir para "atualizar a página Sobre", "sincronizar o progresso", "atualizar o status do MVP".
---

# Sincronizar página Sobre

A página `front/src/shell/SobrePage.tsx` (aba "Sobre", acessível pelo link no rodapé do menu) é um
**dashboard estático e temporário** (não lê dados ao vivo). Todo o conteúdo vem de
`front/src/shell/sobreData.ts`, que precisa ser mantido manualmente em sincronia com:

- `requisitos/admin/progresso.md` — fonte de verdade do status de cada requisito (é o "registro
  vivo" do projeto).
- `requisitos/admin/ej-admin-requisitos.md` — fonte da seção "Fora do Escopo do MVP" (§5).

## Passo a passo

1. **Leia `requisitos/admin/progresso.md` por completo** (é longo — use offset/limit ou grep por
   `^## EP-` e `^### FT-` para navegar). Para cada requisito, extraia:
   - código (`REQ-xx.xx.xxx`)
   - descrição
   - status: checkbox `[x]` + coluna Status `done` → `done`; `todo`/`in_progress` → `todo`;
     `blocked` → `todo` (não há status dedicado ainda); `n/a` → `na`.
   - coluna **Notas**: se não vazia, vira o campo `notes` do requisito.

2. **Requisitos mockados**: se a descrição ou a nota deixar claro que o comportamento é atendido
   apenas por um mock/simulação no MVP (ex.: "deve ser mockada", "API representada por um mock",
   "usuário mockado"), o status correto é **`todo`** (não conta como entregue), com nota
   `"Implementado, porém mockado — não é uma integração real."`. Use o helper `mock()` já existente
   em `sobreData.ts` para isso — não marque como `done`.

3. **Compare contagem por feature**: para cada `### FT-xx.xx`, o número de linhas de requisito no
   `progresso.md` deve bater exatamente com o array `requirements` da feature correspondente em
   `sobreData.ts`. Rode este comando para conferir rapidamente:

   ```bash
   awk '
   /^### FT-[0-9]+\.[0-9]+/{ft=$2}
   /^\| \[.\] \| REQ-[0-9]+\.[0-9]+\.[0-9]+ \|/{c[ft]++}
   END{for (k in c) print k, c[k]}' requisitos/admin/progresso.md | sort
   ```

   Compare a saída com a contagem de `requirements.length` de cada feature no arquivo TS. Qualquer
   divergência é sinal de requisito faltando ou sobrando — corrija antes de prosseguir.

4. **Edite `front/src/shell/sobreData.ts`**:
   - Adicione/remova/atualize requisitos usando os helpers `d()` (done), `todo()` (não iniciado),
     `na()` (não aplicável) e `mock()` (implementado porém mockado).
   - **Não** edite números totais/percentuais à mão — `TOTAL_EPICS`, `TOTAL_FEATURES`,
     `TOTAL_REQS`, `TOTAL_REQS_DONE`, `TOTAL_REQS_NA` e `OVERALL_PERCENT`, além de
     `epicCounts`/`featureCounts`, são todos derivados dinamicamente do array `EPICS` — apenas os
     dados de requisito precisam mudar.
   - Se `ej-admin-requisitos.md` §5 (Fora do Escopo) mudou, atualize `OUT_OF_SCOPE` também.
   - Se a versão do produto mudou, atualize `APP_VERSION` em `front/src/shell/appInfo.ts` (usada
     no título da aba "Sobre vX.Y.Z" e no rodapé do menu).

5. **Se `progresso.md` tiver sua própria tabela de resumo/por-épico desatualizada** em relação às
   seções detalhadas (já aconteceu — ver histórico), corrija também os números do próprio
   `progresso.md` para os dois documentos ficarem coerentes entre si.

6. **Valide**:
   ```bash
   cd front && npx tsc --noEmit -p .
   ```
   Type-check limpo é o critério mínimo de sucesso.

7. Ao final, resuma para o usuário: quantos requisitos mudaram de status, quais épicos tiveram o
   percentual alterado, e se algum requisito mockado novo foi identificado.

## Não fazer

- Não torne a página dinâmica (sem fetch/API) — ela é deliberadamente estática, é um retrato
  pontual do MVP, não deve refletir o progresso "ao vivo" do projeto.
- Não invente evidências/notas que não estejam em `progresso.md`.
