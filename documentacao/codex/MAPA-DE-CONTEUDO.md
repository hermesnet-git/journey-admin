# Mapa de conteúdo e rastreabilidade

| Visão | Objetivo | Principais fontes |
|---|---|---|
| 01. Capa | Posicionar a plataforma multijornada e multicanal | Briefing; catálogo SDUI V1 |
| 02. Tese arquitetural | Separar intenção, execução e experiência | Catálogo SDUI §§ 1–4; `JourneyController` |
| 03. Visão de contexto | Mostrar as três soluções e os dois momentos | Arquitetura lógica; código dos microserviços; arquitetura do emulador |
| 04. Portal Administrativo | Consolidar capacidades de autoria e operação | `progresso.md`; arquitetura lógica |
| 05. Publicação | Evidenciar BPMN e SDUI como artefatos coordenados | `PublishJourneyVersion`; `PublicationController`; `SnapshotController` |
| 06. Runtime | Explicar `ms-journey` como fachada de execução | `JourneyController`; `JourneyStepResolver`; `FormSpecController` |
| 07. Sequência | Demonstrar o ciclo de uma User Task | `JourneyController`; `JourneyStepResolver` |
| 08. Contrato SDUI | Resumir responsabilidades, envelope e invariantes | Catálogo SDUI V1 §§ 3, 4, 11–17 |
| 09. Emulador de Canais | Mostrar cockpit, BFF, hosts e upstreams | `emulador-canais/docs/arquitetura.md`; `channel-lab.md` |
| 10. Renderers e SDKs | Mostrar dependências headless e última milha | Arquitetura do emulador § 4 |
| 11. Matriz multicanal | Comparar projeções do mesmo componente | Catálogo SDUI V1 § 7 |
| 12. Princípios e fronteiras | Registrar guardrails arquiteturais | Catálogo SDUI; arquitetura do emulador § 6 |
| 13. Estado atual | Exibir prontidão e lacunas de validação | `progresso.md`; `status-implementacao.md` |
| 14. Evolução recomendada | Organizar a passagem de prova para produto | Inferência arquitetural baseada nas lacunas documentadas |
| 15. Referências | Explicitar fontes, atalhos e premissas | Todos os documentos acima |

## Decisões de representação

1. O diagrama de publicação mostra o Admin Backend como coordenador porque `PublishJourneyVersion` valida o fluxo, verifica a disponibilidade do serviço SDUI, implanta pelo `RuntimePublicationPort` e publica envelopes pelo `SduiScreenPublicationPort`.
2. O `ms-espec-registry` aparece no runtime como serviço de especificação, não como executor: seu próprio controller declara que não conhece `processInstanceId` nem toca o motor.
3. O `ms-journey` aparece como fachada única do canal porque seu controller se define dessa forma e a arquitetura do emulador impede acesso direto dos hosts ao motor e ao registry.
4. O Strapi aparece como store de snapshots, nunca como owner do contrato, conforme o catálogo SDUI V1.
5. Os renderers são apresentados como “SDKs em preparação”: a forma de pacote existe, mas publicação, exports e documentação de consumo ainda são lacunas explícitas.

