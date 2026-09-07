# Estado de implementação do Emulador de Canais

**Atualizado em:** 2026-09-07

Este arquivo registra o andamento das oito etapas acordadas. Vue, Angular e Next.js não fazem parte deste escopo.

| Etapa | Estado | Observação |
|---|---|---|
| 1. Monorepo e contrato SDUI v1 | Concluída | Contrato tipado e validação base disponíveis. |
| 2. Emulator BFF e cliente do `ms-journey` | Concluída | Execução ocorre pelo BFF; descoberta administrativa permanece separada. |
| 3. Runtime SDUI headless TypeScript | Concluída | Bindings, interpolação, validação, visibilidade e ações declarativas. |
| 4. React Web Host e renderer Mística | Em validação | Implementados e compilados; falta validação integrada e visual com jornada publicada. |
| 5. React Native | Em validação | Host e renderer dos 19 componentes implementados; falta validação integrada e visual em dispositivo/emulador. |
| 6. Flutter Web e Mobile | Em validação | Cliente, runtime Dart, renderer dos 19 componentes e host compartilhado implementados; Web e Android compilados, faltando validação integrada e visual. A compilação iOS requer macOS/Xcode. |
| 7. WhatsApp e WCE | Em validação | Adapter conversacional, sessões no BFF, WCE Bridge e WCE Web UI implementados e compilados; falta validação integrada e visual com jornada publicada. |
| 8. Channel Lab | Em validação | Cockpit, catálogo administrativo via BFF, variáveis iniciais, bootstrap efêmero e abertura dos cinco alvos implementados; falta validação integrada e visual. |

## Situação do plano

As oito etapas de construção estão implementadas. As etapas 4 a 8 permanecem **em validação** até que os respectivos hosts sejam exercitados de ponta a ponta, com uma jornada publicada e os serviços existentes ativos. Essa validação não altera as responsabilidades entre Admin, Emulator BFF e `ms-journey`.
