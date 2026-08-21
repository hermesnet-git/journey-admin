# 001-complementar — Ocupação de thread do motor × complexidade imposta ao BFF

- **Complementa:** [001-integracao.md](./001-integracao.md)
- **Versão visual interativa:** https://claude.ai/code/artifact/57943f04-b5ae-4704-be00-9cd8d2e01975

Este documento é o comparativo técnico que fundamenta a ADR-001-integracao — não é, ele mesmo, uma decisão. Mostra o que cada abordagem de integração custa em dois eixos: **ocupação de recurso do motor** e **complexidade imposta ao BFF/canal digital**.

## O que cada abordagem custa

| Abordagem | Thread do motor | Isolamento de falha | Complexidade imposta ao BFF/canal | Quando usar |
|---|---|---|---|---|
| Conector HTTP nativo | Bloqueia, sem limite | Nenhum | Nenhuma (resposta síncrona imediata) | Nunca — mesmo risco do Delegate puro, sem necessidade |
| Java Delegate (chamada direta) | Bloqueia, sem limite | Nenhum | Nenhuma (resposta síncrona imediata) | Nunca — idêntico ao nativo |
| **Java Delegate + Resilience4j** | Bloqueia até o teto do `TimeLimiter` (mitigado) | Parcial — `Bulkhead` isola a pool | **Nenhuma** (resposta síncrona imediata) | Consultas HTTP rápidas, delimitadas, resposta previsível |
| **External Task** | Livre quase de imediato | Total | **Alta** — exige correlação (`businessKey`) + notificação assíncrona (polling, webhook ou canal de evento) | Integração obrigatória por evento com domínio corporativo, ou chamada sem garantia de tempo de resposta |

## Por que isso muda a decisão

Java Delegate puro é, para o motor, indistinguível do conector nativo — mesma thread, mesma transação, sem limite. Trocar um pelo outro não muda o risco em nada, e os dois devem ser evitados.

Resilience4j acrescenta um teto de espera (`TimeLimiter`) e isola a pool (`Bulkhead`) — reduz o pior caso e contém o estrago a um grupo menor de threads, sem exigir nada de novo do BFF. Para a maior parte das chamadas de uma jornada — consultas rápidas — a coluna que mais pesa na decisão não é "a thread do motor pode ficar presa por alguns segundos" (risco baixo e mitigável); é "toda chamada por External Task obriga o BFF a lidar com resultado assíncrono" (custo certo, repetido em cada etapa).

Só a etapa que é, de fato, uma integração obrigatória por evento com o domínio corporativo — ou uma chamada sem garantia nenhuma de tempo de resposta — paga o custo da External Task, porque só ali ele se justifica: nesses casos, vale aceitar a complexidade adicional no BFF em troca de nunca comprometer a saúde do motor.

## Ressalva técnica sobre o Resilience4j

`TimeLimiter` sozinho não cancela uma chamada já presa num socket — ele só para de esperar na thread chamadora. Sem timeout de conexão/leitura configurado no client HTTP usado dentro do Delegate, a chamada real pode continuar presa (numa pool diferente, isolada pelo `Bulkhead`, mas presa) além do teto configurado. O ganho de resiliência só se concretiza com as duas coisas configuradas juntas — ver diretrizes obrigatórias em [001-integracao.md](./001-integracao.md#diretrizes-obrigatórias-para-usar-java-delegate--resilience4j).
