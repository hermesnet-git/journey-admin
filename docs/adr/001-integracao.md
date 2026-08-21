# ADR-001: Integração de saída — Java Delegate + Resilience4j para consultas rápidas, External Task para integração obrigatória por evento

- **Status:** Proposta
- **Data:** 2026-08-21
- **Substitui:** decisão anterior de usar External Task de forma exclusiva para toda integração de saída/entrada do motor (revisada nesta ADR)
- **Complementa:** [001-complementar-integracao-20260821.md](./001-complementar-integracao-20260821.md) — comparativo visual de ocupação de thread e complexidade imposta ao BFF

## Resumo

Nem toda chamada de integração de uma jornada tem o mesmo perfil de risco. Quando a jornada faz várias consultas HTTP rápidas e delimitadas, e só uma etapa é, de fato, uma integração obrigatória por evento com um domínio corporativo, forçar **todas** as chamadas a passar por External Task impõe ao BFF/canal digital uma complexidade de assincronicidade (correlação, notificação, mais ciclo de teste e observabilidade) que nem sempre se paga.

A decisão passa a ser **por tipo de chamada**, não uma regra única para a plataforma inteira:

- **Java Delegate + Resilience4j** para chamadas HTTP síncronas, rápidas e de perfil de resposta previsível — mantém o contrato simples com o BFF (uma chamada, uma resposta).
- **External Task** para qualquer integração que seja, por natureza, assíncrona/baseada em evento (Kafka, Event Hubs, Service Bus) ou que constitua a integração obrigatória do domínio corporativo na jornada — aceitando a complexidade adicional no BFF em troca de nunca comprometer a saúde do motor.

## Contexto

Uma análise anterior sobre esse tema concluiu que Java Delegate, sozinho ou com Resilience4j, não elimina o bloqueio da thread do motor — só a External Task desacopla de fato a duração da chamada do tempo de vida da thread. Essa conclusão técnica **continua correta** (ver comparativo em [001-complementar-integracao-20260821.md](./001-complementar-integracao-20260821.md)) — o que mudou foi reconhecer que a External Task também tem um custo próprio, do lado do BFF/canal digital: toda chamada de integração por esse caminho deixa de devolver o resultado de negócio na mesma resposta HTTP, exigindo um mecanismo de correlação e notificação assíncrona (polling, webhook ou canal de evento). Isso aumenta o esforço de implementação, teste e observabilidade de cada etapa que adota esse padrão.

Para jornadas com muitas chamadas HTTP rápidas — consultas de dados, validações — e apenas uma etapa que de fato integra de forma assíncrona/obrigatória com um domínio corporativo, exigir que todas as etapas paguem o custo de assincronicidade da External Task é desproporcional ao risco real: uma consulta rápida e bem delimitada tem baixa chance de travar por tempo longo, e o Resilience4j (`TimeLimiter` + `Bulkhead` + `CircuitBreaker`), bem configurado, mitiga esse risco residual o suficiente para esse tipo de chamada.

## Decisão

Adotar um critério por chamada, não uma regra única:

| Perfil da chamada | Padrão adotado |
|---|---|
| Consulta HTTP síncrona, rápida, resposta previsível (ex.: validação de CEP, consulta de saldo) | Java Delegate + Resilience4j |
| Integração que é, por natureza, assíncrona/baseada em evento (Kafka, Event Hubs, Service Bus) | External Task |
| Chamada HTTP que constitui a integração obrigatória do domínio corporativo na jornada (mesmo que síncrona) | External Task |
| Chamada HTTP sem garantia de tempo de resposta ou para sistema historicamente instável | External Task |

O conector HTTP nativo do Camunda (`camunda:type="connector"`) segue **não recomendado** em nenhum cenário — tem o mesmo comportamento de bloqueio do Java Delegate puro, sem o benefício de mitigação que o Resilience4j traz.

### Diretrizes obrigatórias para usar Java Delegate + Resilience4j

- O client HTTP usado dentro do Delegate precisa ter timeout de conexão e de leitura configurados explicitamente — o `TimeLimiter` do Resilience4j sozinho não cancela uma chamada já presa num socket, só para de esperar na thread chamadora.
- Usar `Bulkhead` com uma pool dedicada e de tamanho deliberado, separada da pool geral do job executor do motor.
- Não duplicar retry: o Camunda já tem retry no nível de job (`retryTimeCycle`) — decidir explicitamente qual camada é dona da política de retry para não multiplicar tentativas.
- Evitar `Fallback` que esconda uma falha de negócio relevante — se a chamada falhar de um jeito que importa para o fluxo, isso deve virar um erro BPMN tratado no processo (boundary event, compensação), não um valor substituto silencioso no código.

## Consequências

**Positivas**
- Contrato HTTP simples e síncrono preservado para a maior parte das chamadas de uma jornada.
- Menor esforço de implementação, teste e observabilidade nessas etapas.
- BFF/canal digital não precisa de mecanismo de correlação/notificação assíncrona para todo passo — só para os que de fato exigem.

**Negativas / trade-offs**
- A thread do motor segue ocupada durante as chamadas via Delegate (mitigada pelo Resilience4j, não eliminada) — decisão consciente de aceitar esse risco residual e limitado em troca de menos complexidade.
- Exige disciplina de implementação (timeouts reais no client HTTP, dimensionamento do Bulkhead) para o Resilience4j funcionar como esperado — mal configurado, o ganho de resiliência não se concretiza.
- Conviver com dois padrões na mesma plataforma exige documentar claramente, por conector, qual dos dois está em uso — evitar ambiguidade sobre por que uma chamada específica é síncrona ou assíncrona.

## Referências

- [001-complementar-integracao-20260821.md](./001-complementar-integracao-20260821.md) — comparativo visual de ocupação de thread e complexidade imposta ao BFF
- Catálogo de credenciais e resolução via Azure Key Vault (Workload Identity, AKS) — discussão relacionada, ainda sem ADR própria
- Modelo de múltiplos brokers — Kafka, Event Hubs e Service Bus como conectores External Task de primeira classe
