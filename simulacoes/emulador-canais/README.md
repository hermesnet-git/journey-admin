# Elastic Journey — Emulador de Canais

Aplicação de referência para executar jornadas do Elastic Journey em canais reais, sempre por meio do `ms-journey`.

A arquitetura, as fronteiras e as portas reservadas estão registradas em [docs/memoria-arquitetura-v0.md](docs/memoria-arquitetura-v0.md). Um diagrama consolidado dos componentes e de quem integra com quem está em [docs/arquitetura.md](docs/arquitetura.md).
O andamento das oito etapas está registrado em [docs/status-implementacao.md](docs/status-implementacao.md).

## Estado atual

Primeira fundação implementada:

- contrato SDUI v1 canônico em tuplas Hiccup, tipado e validável (`uiStepId`, `journeyVersion`, `data`, `dataSources`, `$bindings`, `$events`, `$visibility` e `$active`);
- runtime SDUI headless em TypeScript;
- cliente TypeScript do contrato atual do `ms-journey`;
- Emulator BFF com API espelhada, CORS restrito, correlação, timeout e erros sanitizados.
- renderer React Web/Mística cobrindo o catálogo v1 e React Web Host executável na porta `15171`.
- renderer React Native cobrindo os 19 componentes do catálogo v1 e host Expo/React Native servido pelo Metro na porta `18081`.
- runtime SDUI headless, cliente do BFF e renderer Flutter/Mística em Dart, compartilhados pelo host Flutter Web e Mobile; o alvo Web usa a porta `15172`.
- adapter conversacional WhatsApp no Emulator BFF, WCE Bridge compatível com a Cloud API na porta `13001` e WCE Web UI na porta `15173`.
- Channel Lab em React/Vite com tema Mística `Vivo-evolution` na porta `15170`, coordenando catálogo, contexto inicial, bootstraps temporários e abertura dos hosts reais sem renderizar SDUI.

A descoberta de jornadas publicadas pertence ao plano administrativo: `GET /api/lab/v1/journeys` do BFF consulta exclusivamente o Admin Backend. O cliente de execução não lista jornadas; recebe um `journeyId` e usa o `ms-journey` somente para obter o fluxo e executar a instância.

Nenhum serviço é iniciado automaticamente por scripts de instalação ou build.

O emulador aceita somente o contrato SDUI v1 atual. Formatos anteriores baseados em objetos com `root`, `props`, `children`, `screenId`, `revision`, `bindings`, `events` ou `visibility` não são convertidos e geram diagnóstico de incompatibilidade no canal.

## Comandos

```bash
npm install
npm run typecheck
npm run build
npm run dev:lab
npm run dev:bff
npm run dev --workspace @elastic-journey/react-web-host
npm run dev:react-native
npm run dev:flutter
npm run build:flutter
npm run dev:wce-bridge
npm run dev:wce-ui
```

O BFF usa a porta `18085` e aponta para `http://localhost:8085/api/v1` por padrão. Para sobrepor qualquer variável (portas, timeouts, credenciais), copie `services/emulator-bff/.env.example` para `services/emulator-bff/.env` e edite — o arquivo é carregado automaticamente por `dev:bff`, `dev:all` e `dev:android` (via `--env-file-if-exists`, nativo do Node), sem precisar exportar nada no shell. `.env` não é versionado.

## Subir o ambiente completo

Com o Admin e o `ms-journey` já disponíveis, execute:

```bash
npm run dev:all
```

O `dev:all` não inicia emuladores ou aplicativos mobile. React Native Android e Flutter Android são iniciados sob demanda pelo Channel Lab, através do Emulator BFF, depois que uma jornada MOBILE é selecionada. O Metro permanece no `dev:all` para que o Expo Go possa carregar o bundle quando solicitado.

O comando inicia Channel Lab, React Web, Flutter Web, WCE UI, WCE Bridge, Emulator BFF e React Native Metro. Portas que já estiverem ativas são preservadas. Após aguardar a prontidão, ele apresenta um resumo com os componentes rodando, já ativos, sob demanda, indisponíveis ou não aplicáveis ao sistema operacional. `Ctrl+C` encerra somente os processos e subprocessos iniciados pelo comando, tanto no Windows quanto no macOS/Linux. O Flutter Web usa `web-server`, portanto não abre uma segunda janela do navegador.

Para iniciar ou reiniciar somente os aplicativos Android, sem subir novamente todo o ambiente:

```bash
npm run dev:android
```

O comando seleciona o primeiro Android autorizado pelo ADB, configura o redirecionamento das portas `18081` e `18085` e não executa nenhuma etapa de iOS.

Para executar o canal React Native em emulador ou aparelho físico, consulte [docs/react-native.md](docs/react-native.md). O conjunto Expo/React Native requer Node `22.13+`, `24.3+` ou `25+`.

Para executar Flutter Web, Android ou iOS e configurar o endereço do BFF, consulte [docs/flutter.md](docs/flutter.md).

Para executar e entender a projeção conversacional WhatsApp, consulte [docs/whatsapp-wce.md](docs/whatsapp-wce.md).

Para operar o cockpit e entender o bootstrap dos hosts, consulte [docs/channel-lab.md](docs/channel-lab.md).
