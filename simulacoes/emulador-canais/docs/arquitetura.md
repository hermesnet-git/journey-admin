# Arquitetura do Emulador de Canais

**Atualizado em:** 2026-09-08

Este documento descreve os componentes reais do Emulador de Canais e as integrações entre eles, em nível de processo (quem chama quem em runtime) e em nível de código (quem depende de qual pacote). Ele não substitui as decisões já registradas; consolida e ilustra o que está implementado hoje.

Fontes complementares, não duplicadas aqui:

- decisões e histórico de arquitetura: [memoria-arquitetura-v0.md](memoria-arquitetura-v0.md) a [memoria-arquitetura-v4.md](memoria-arquitetura-v4.md);
- estado de cada etapa: [status-implementacao.md](status-implementacao.md);
- operação do cockpit: [channel-lab.md](channel-lab.md);
- canal WhatsApp/WCE: [whatsapp-wce.md](whatsapp-wce.md);
- canal React Native: [react-native.md](react-native.md);
- canal Flutter: [flutter.md](flutter.md);
- contrato SDUI fonte da verdade: [../../../requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md](../../../requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md).

## 1. Papel do emulador

O Emulador de Canais existe para provar, com implementações reais (React Web, React Native, Flutter Web, Flutter Mobile e uma projeção conversacional WhatsApp), que uma jornada publicada no Elastic Journey pode ser executada por um canal usando somente o `ms-journey` como fachada de execução, e o Admin Backend como única fonte de descoberta de jornadas publicadas. Nenhum canal acessa Camunda, `ms-espec-registry` ou Strapi diretamente.

Todo o código deste sistema vive em `simulacoes/emulador-canais/`; nada fora dali é alterado por ele.

## 2. Inventário de componentes

| Componente | Diretório | Porta | Tipo de processo | Integra com |
|---|---|---:|---|---|
| Channel Lab | `apps/channel-lab` | `15170` | SPA React/Vite (tema Mística Vivo-evolution) | Emulator BFF |
| React Web Host | `apps/react-web-host` | `15171` | SPA React/Vite | Emulator BFF |
| Flutter Web Host | `apps/flutter-host` (target web) | `15172` | Build web Flutter | Emulator BFF |
| React Native Host | `apps/react-native-host` | `18081` (Metro) | App Expo/RN, bundler Metro | Emulator BFF (via `adb reverse`) |
| Flutter Mobile Host | `apps/flutter-host` (target mobile) | — (app instalado no device/AVD) | App Flutter Android | Emulator BFF (via `adb reverse`) |
| WCE Web UI | `apps/wce-web-ui` | `15173` | SPA React/Vite | WCE Bridge (HTTP + Socket.IO) |
| Emulator BFF | `services/emulator-bff` | `18085` | Servidor Node HTTP puro | `ms-journey`, Admin Backend, WCE Bridge, orquestra ADB/Flutter |
| WCE Bridge | `services/wce-bridge` | `13001` | Servidor Node HTTP + Socket.IO | WCE Web UI, Emulator BFF |
| `ms-journey` | fora do escopo (upstream) | `8085` (default) | serviço já existente | Engine/orquestração de jornada |
| Admin Backend | fora do escopo (upstream) | `8081` (default) | serviço já existente | Catálogo de jornadas publicadas |

Pacotes de biblioteca (sem porta própria, consumidos em tempo de build):

| Pacote | Linguagem | Papel |
|---|---|---|
| `sdui-contract` | TS | Tipos e validação do catálogo SDUI v1 |
| `sdui-runtime-ts` | TS | Runtime headless: bindings, interpolação, validação, visibilidade, ações |
| `journey-client-ts` | TS | Cliente HTTP tipado do contrato `ms-journey` |
| `renderer-react-web-mistica` | TS | Adapter SDUI → componentes Mística Web |
| `renderer-react-native-mistica` | TS | Adapter SDUI → componentes React Native com tokens Mística |
| `renderer-whatsapp` | TS | Adapter SDUI → sequência de mensagens conversacionais |
| `journey-client-dart` | Dart | Equivalente Dart do cliente `ms-journey` |
| `sdui-runtime-dart` | Dart | Equivalente Dart do runtime headless |
| `renderer-flutter-mistica` | Dart | Adapter SDUI → widgets Flutter com tokens Mística |

`integrations/whatsapp-wce/` não contém código: guarda apenas o aviso de licença (`THIRD_PARTY_NOTICES.md`) do protocolo WCE avaliado como referência para o Bridge.

## 3. Diagrama de processos e integrações em runtime

```text
                              ┌───────────────────────────┐
                              │       Channel Lab :15170    │
                              │  seleção · bootstrap · diag │
                              └───────────┬─────────────────┘
             plano administrativo         │ plano de bootstrap/execução
        GET /api/lab/v1/journeys          │ POST /api/lab/v1/bootstraps
                                          │ POST /api/lab/v1/android/launch
                                          │ POST /api/whatsapp/v1/sessions
                                          ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                          Emulator BFF :18085                       │
   │  única borda upstream · CORS restrito · correlação · erros sanit.  │
   └───┬──────────────┬───────────────┬───────────────┬─────────────────┘
       │              │               │               │
       │ HTTP         │ HTTP          │ HTTP           │ adb / flutter cli
       │ (execução)   │ (catálogo)    │ (WA outbound)  │ (lançamento sob demanda)
       ▼              ▼               ▼               ▼
 ┌───────────┐  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────────┐
 │ ms-journey │  │Admin Backend│ │ WCE Bridge   │ │ AVD/dispositivo Android    │
 │  :8085     │  │   :8081     │ │   :13001     │ │ Expo Go (RN) / app Flutter │
 └───────────┘  └─────────────┘ └──────┬───────┘ └───────────────┬────────────┘
                                        │ Socket.IO                │ adb reverse
                                        │ ui_message / ui_reply    │ tcp:18081, tcp:18085
                                        ▼                           │
                                ┌───────────────┐                   │
                                │ WCE Web UI    │                   │
                                │   :15173      │                   │
                                └───────────────┘                   │
                                                                     ▼
                                                          fala com Emulator BFF
                                                          como se fosse localhost

     Hosts web abertos em iframe pelo Channel Lab, cada um chamando o BFF
     diretamente com o mesmo contrato de execução:

     React Web Host :15171 ──────┐
     Flutter Web Host :15172 ────┼──► Emulator BFF :18085 (GET flow, POST instances,
                                 │     GET current-step, POST tasks/complete, DELETE instance)
     React Native (Metro :18081,│
       app no device) ──────────┘
     Flutter Mobile (app no AVD)┘
```

Pontos que o diagrama fixa:

- o **único** consumidor do `ms-journey` é o Emulator BFF, por meio de `journey-client-ts`; nenhum host chama `ms-journey` diretamente;
- o **único** consumidor do Admin Backend é o Emulator BFF (`admin-catalog.ts`), e só para listar jornadas `PUBLISHED` — o Admin nunca entrega credenciais ao navegador;
- WhatsApp é uma cadeia à parte: `WCE Web UI → WCE Bridge → Emulator BFF → ms-journey`, e a volta usa o mesmo caminho invertido (`ms-journey → BFF → WCE Bridge → WCE Web UI`) porque o BFF mantém a sessão conversacional e o adapter `renderer-whatsapp`;
- o BFF é também um **controlador de processos locais**: `android-controller.ts` chama `adb`/`emulator`/`flutter` para localizar ou subir um AVD, configurar `adb reverse` das portas `18081` e `18085`, e abrir o app certo (Expo Go via deep link, ou `flutter run` para o host Flutter) — isso só acontece sob demanda, disparado pelo Channel Lab depois que uma jornada `MOBILE` é selecionada;
- Metro (`18081`) é só o bundler do React Native; nunca é embutido como página, apenas referenciado por deep link/URL do projeto.

## 4. Diagrama de dependências de pacotes (tempo de build)

```text
apps/channel-lab ─────────────► journey-client-ts        (só para o /api/lab/v1/journeys via BFF)

apps/react-web-host ──────────► sdui-contract
                        ├──────► sdui-runtime-ts
                        ├──────► journey-client-ts
                        └──────► renderer-react-web-mistica ──► sdui-contract, sdui-runtime-ts, @telefonica/mistica

apps/react-native-host ───────► sdui-contract
                        ├──────► sdui-runtime-ts
                        ├──────► journey-client-ts
                        └──────► renderer-react-native-mistica ──► sdui-contract, sdui-runtime-ts, react-native

apps/flutter-host ────────────► journey-client-dart
                        ├──────► sdui-runtime-dart
                        └──────► renderer-flutter-mistica ──► sdui-runtime-dart

apps/wce-web-ui ──────────────► socket.io-client            (fala só com WCE Bridge)

services/emulator-bff ────────► journey-client-ts
                        └──────► renderer-whatsapp ──► sdui-contract, sdui-runtime-ts

services/wce-bridge ──────────► socket.io                   (sem dependência do contrato SDUI)
```

Leitura do grafo: `sdui-contract` e `sdui-runtime-ts`/`sdui-runtime-dart` são headless e nunca importam Mística, React Native ou Flutter UI — só os pacotes `renderer-*` fazem essa ponte, e nenhum deles depende de nada deste emulador para funcionar (a dependência corre só na direção contrária, até `sdui-contract`/`sdui-runtime-*`).

`renderer-whatsapp` é o único consumido por um serviço de backend (o BFF), não por um app visual, porque a "tela" em WhatsApp é uma sequência de mensagens — mas isso não o torna menos reaproveitável. Ele não importa nada do WCE: recebe a árvore SDUI publicada pelo `ms-journey` para o canal `WHATSAPP` e devolve `WhatsAppOutboundMessage[]` no formato da Cloud API, além de expor handlers (`submit`, `navigate`, `openUrl`, `track`) para quem o hospeda decidir o que fazer. O que é exclusivo deste laboratório — e não deve ser reaproveitado — é o par WCE Bridge/WCE Web UI, que só emula a borda de transporte.

### Os renderers são SDKs? Confirmado, com uma ressalva

Os quatro pacotes têm forma de SDK: versionados (`semver` próprio — `1.2.0`, `1.1.0`, `1.0.0`, `1.3.0`), sem dependência reversa deste emulador, e com script `build` que compila para `dist/` com tipos `.d.ts`. Isso foi verificado lendo `package.json`/`pubspec.yaml` de cada um, não presumido.

O que falta para serem SDKs publicáveis de fato: todos os quatro estão marcados `"private": true` no npm (ou `publish_to: none` no `pubspec.yaml` do Dart), e o campo `exports` aponta para o código-fonte (`./src/index.ts`), não para o `dist/` já compilado — hoje só um workspace que enxerga o monorepo (via npm/pub workspaces) consegue importar. Nenhum dos pacotes tem README de consumo. Destravar a publicação não exige mudança de arquitetura: é trocar `private` para `false` (ou apontar para um registry interno), redirecionar `exports`/`main`/`types` para `dist/`, e documentar a API pública.

## 5. Fluxos principais

### 5.1 Plano administrativo (descoberta de jornadas)

```text
Channel Lab → GET /api/lab/v1/journeys?channelType=... → Emulator BFF → Admin Backend
```

Só lista jornadas `PUBLISHED`. Autenticação do Admin fica só no servidor (`ADMIN_SERVICE_USERNAME`/`ADMIN_SERVICE_PASSWORD`); o navegador nunca recebe essas credenciais.

### 5.2 Plano de bootstrap (Web e Mobile)

```text
Channel Lab → POST /api/lab/v1/bootstraps {journeyId, target, variables} → Emulator BFF
Emulator BFF → token opaco, TTL em memória (LAB_BOOTSTRAP_TTL_MS, default 10 min)
Host (Web via ?labBootstrap=, Mobile via deep link/dart-define) → GET /api/lab/v1/bootstraps/{token}
Host valida o próprio target, chama o plano de execução e inicia a instância sozinho
```

Para mobile, o Channel Lab ainda chama `POST /api/lab/v1/android/launch {target, bootstrapToken}`, e o BFF é quem aciona ADB/emulator/Flutter (ver `android-controller.ts`) antes de o app consumir o bootstrap.

### 5.3 Plano de execução (Web e Mobile, direto no `ms-journey` via BFF)

```text
Host → GET  /api/v1/journeys/{journeyId}/flow
Host → POST /api/v1/journeys/{journeyId}/instances?channelType=...
Host → GET  /api/v1/instances/{processInstanceId}/current-step
Host → POST /api/v1/instances/{processInstanceId}/tasks/{taskId}/complete {answers}
Host → DELETE /api/v1/instances/{processInstanceId}
```

O BFF só repassa essas chamadas ao `ms-journey`, sem interpretar o fluxo nem os formulários (`form.sdui` é opaco para ele).

### 5.4 Plano de execução WhatsApp

```text
Channel Lab → POST /api/whatsapp/v1/sessions {journeyId, from, variables} → Emulator BFF
Emulator BFF inicia a instância no ms-journey e monta uma WhatsAppSduiConversation
Emulator BFF → POST /send-to-emulator → WCE Bridge → Socket.IO ui_message → WCE Web UI
WCE Web UI (resposta do usuário) → Socket.IO ui_reply → WCE Bridge
WCE Bridge → POST /api/whatsapp/v1/webhook (payload no formato Cloud API) → Emulator BFF
Emulator BFF interpreta a resposta, avança a tarefa no ms-journey e projeta a próxima mensagem
```

A sessão conversacional (contato, `processInstanceId`, `taskId`, pergunta pendente) vive só em memória no BFF; reiniciar o BFF descarta sessões e bootstraps.

## 6. Fronteiras que a arquitetura protege

- nenhum host chama Camunda, `ms-espec-registry`, Strapi ou o Admin diretamente — sempre via Emulator BFF;
- o contrato SDUI (`sdui-contract`, `sdui-runtime-*`) é independente de framework visual; cada `renderer-*` é a única camada que conhece Mística/React Native/Flutter;
- o Admin só é acessado para catálogo de publicações; a execução da jornada nunca depende do Admin;
- credenciais do Admin e tokens de bootstrap não chegam ao navegador nem aos logs (a rota é mascarada em `sanitizedLogPath`);
- o WCE (Bridge + Web UI) é uma dependência de laboratório isolada atrás de um contrato próprio — pode ser trocado por um BSP real sem tocar no contrato SDUI, no `ms-journey` ou no `renderer-whatsapp`, que atravessa a troca sem mudar.

### Contrato SDUI consumido pelos canais

Os canais recebem o snapshot publicado no formato canônico v1: envelope com `uiStepId`, `journeyVersion`, `supportedTargets`, `minRendererVersion`, `dataSources` e uma raiz `data` em tupla Hiccup. O contrato executável valida os 19 componentes, versões SemVer, propriedades, bindings, eventos e condições antes de criar a árvore interna do runtime.

Essa árvore normalizada (`attributes`, `bindings`, `events`, `visibility`, `active` e `children`) existe apenas dentro dos runtimes. Ela não é um segundo formato de publicação. Não há parser legado nem conversão de documentos baseados em `root`/`props`; uma publicação fora do contrato falha com diagnóstico explícito no host ou adapter correspondente.

## 7. O que este documento não cobre

Passo a passo de instalação, scripts `dev:*`/`dev:all`/`dev:android` e configuração de ambiente (variáveis, SDKs, emuladores) estão no [README.md](../README.md) e nos guias por canal já listados no topo deste documento.
