# Memória de arquitetura v0 — Emulador de Canais do Elastic Journey

**Data do acordo:** 2026-09-06  
**Status:** baseline para implementação  
**Escopo físico autorizado:** `admin/simulacoes/emulador-canais`

## 1. Propósito desta memória

Este documento registra as decisões e os limites acordados para construir uma aplicação de referência capaz de executar jornadas publicadas pelo Elastic Journey em tecnologias reais de canal.

Ele deve ser usado como contexto inicial nas próximas sessões. Se uma decisão futura substituir algo descrito aqui, a nova decisão deve gerar outra versão da memória, preservando esta v0 como registro histórico.

## 2. Objetivo do produto

Construir um **Emulador de Canais** que permita:

- selecionar uma jornada disponível para determinado canal;
- iniciar uma instância por meio do `ms-journey`;
- obter e renderizar o passo atual;
- coletar respostas do usuário;
- concluir a tarefa ativa e avançar passo a passo;
- representar estados `USER_TASK`, `WAITING`, `ENDED` e falhas recuperáveis;
- comparar a mesma experiência SDUI em implementações reais de React Web, React Native, Flutter Web, Flutter Mobile e em uma projeção conversacional para WhatsApp;
- produzir SDKs, runtimes e renderizadores reaproveitáveis pelos canais digitais reais.

O produto é simultaneamente:

1. **simulador de execução**, pois controla cenários, entradas e inspeção da jornada;
2. **emulador de canal**, pois hospeda a experiência em runtimes reais ou equivalentes de cada canal;
3. **aplicação de referência**, pois demonstra como um canal deve integrar-se ao `ms-journey` e ao contrato SDUI.

## 3. Fontes de verdade e fronteiras

### 3.1 Contrato SDUI

A fonte de verdade funcional é:

`requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md`

Princípios herdados desse contrato:

- o namespace corporativo é `ui.*`;
- o contrato é independente de React, Flutter e Mística;
- os frameworks implementam adapters do contrato;
- o snapshot é uma árvore declarativa, sem execução de código arbitrário;
- bindings, placeholders, ações e tokens devem ser resolvidos de forma controlada;
- paridade funcional e semântica tem prioridade sobre identidade visual absoluta;
- falhas de compatibilidade devem ser previsíveis e observáveis;
- cada alvo mantém compatibilidade independente, mesmo quando compartilha código.

Alvos oficiais do catálogo:

- `react.web`;
- `react.mobile`, implementado como **React Native real**;
- `flutter.web`;
- `flutter.mobile`.

WhatsApp é uma adaptação conversacional do conteúdo, e não um quinto alvo visual do catálogo v1.

### 3.2 Fachada pública de jornadas

O `ms-journey` é a única integração upstream permitida ao Emulator BFF. Ele é a fachada disponibilizada aos BFFs dos canais e continua responsável por orquestrar engine e especificações.

Contrato observado em `ms-journey`, sob `/api/v1`:

| Operação | Endpoint |
|---|---|
| Listar jornadas do canal | `GET /journeys?channelType={tipo}` |
| Consultar fluxo publicado | `GET /journeys/{journeyId}/flow` |
| Iniciar instância | `POST /journeys/{journeyId}/instances?channelType={tipo}` |
| Consultar passo atual | `GET /instances/{processInstanceId}/current-step` |
| Concluir tarefa ativa | `POST /instances/{processInstanceId}/tasks/{taskId}/complete` |
| Encerrar instância | `DELETE /instances/{processInstanceId}` |

O passo retornado possui os estados:

- `USER_TASK`: contém tarefa ativa e, quando aplicável, formulário com `sdui`;
- `WAITING`: a engine ainda aguarda um evento ou processamento;
- `ENDED`: a jornada terminou.

O campo `form.sdui` é deliberadamente opaco para o `ms-journey`. A fachada o transporta; os canais o interpretam.

### 3.3 Limite inviolável de alteração

É terminantemente proibido alterar qualquer fonte do Admin, especialmente:

`back/src/main/java/com/jouney/admin/`

Todo o projeto deve ser implementado somente em:

`simulacoes/emulador-canais/`

Fontes fora desse diretório podem ser consultadas e trechos podem ser copiados quando fizer sentido, mas permanecem somente leitura. Qualquer alteração fora do diretório autorizado exige permissão explícita prévia.

Também não é permitido contornar o `ms-journey` chamando diretamente Admin, Camunda, Strapi ou `ms-espec-registry`.

## 4. Restrições operacionais

- Os demais serviços do ambiente já estão em execução.
- Nenhum processo, container ou serviço existente deve ser parado, reiniciado ou derrubado.
- Portas padrão já ocupadas não devem ser reutilizadas.
- Nesta etapa inicial não serão implementados nem executados testes automatizados.
- Cada processo deve aceitar configuração por ambiente, mantendo as portas acordadas como padrão local.
- Hosts executados em dispositivo ou emulador móvel não podem presumir que `localhost` aponta para a máquina de desenvolvimento; a URL do BFF deve ser configurável.

## 5. Arquitetura acordada

```text
                           ┌──────────────────────┐
                           │     Channel Lab      │
                           │ seleção e inspeção   │
                           └──────────┬───────────┘
                                      │ controla/embute
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
         ┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
         │ React Web Host │  │ Flutter Web Host│  │    WCE Web UI   │
         └───────┬────────┘  └────────┬────────┘  └────────┬────────┘
                 │                    │                    │
         ┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
         │ SDK/runtime TS │  │ SDK/runtime Dart│  │   WCE Bridge    │
         └───────┬────────┘  └────────┬────────┘  └────────┬────────┘
                 │                    │                    │ webhook/API
                 └────────────────────┼────────────────────┘
                                      │
                           ┌──────────▼───────────┐
                           │    Emulator BFF      │
                           │ única borda upstream │
                           └──────────┬───────────┘
                                      │ HTTP
                           ┌──────────▼───────────┐
                           │     ms-journey       │
                           │ fachada dos canais   │
                           └──────────────────────┘

React Native Host ── SDK/runtime TS ── Emulator BFF
Flutter Mobile Host ─ SDK/runtime Dart ─ Emulator BFF
```

### 5.1 Tecnologias-base

- Monorepo JavaScript/TypeScript com **npm workspaces** para apps, serviços e packages TS.
- **React + TypeScript + Vite** para Channel Lab e React Web Host.
- **Mística Web** no adapter `react.web`.
- **React Native + TypeScript + Metro** para `react.mobile`.
- Adapter próprio com semântica/tokens Mística para React Native, salvo surgimento de biblioteca corporativa oficial compatível.
- **Dart + Flutter** para Flutter Web e Flutter Mobile, compartilhando núcleo e adapter quando possível, mas mantendo os alvos separados.
- **Node.js + TypeScript** no Emulator BFF.
- WCE isolado atrás de uma integração substituível para emular a interface e o protocolo do WhatsApp.

Mística não faz parte do contrato SDUI. É uma implementação visual substituível por alvo.

## 6. Processos e portas reservadas

| Componente | Porta | Responsabilidade |
|---|---:|---|
| Channel Lab | `15170` | Cockpit do operador: escolhe jornada/canal/alvo, fornece variáveis iniciais, abre hosts e exibe diagnóstico técnico. Não renderiza SDUI por conta própria. |
| React Web Host | `15171` | Aplicação de canal React Web real; consome SDK/runtime e adapter Mística Web. |
| Flutter Web Host | `15172` | Build web real da aplicação Flutter; usa os mesmos contratos Dart destinados ao app móvel. |
| WCE Web UI | `15173` | Cliente visual de WhatsApp em navegador; não conhece jornada nem SDUI. |
| WCE Bridge | `13001` | Emula a borda da API do WhatsApp, conecta UI e webhooks e traduz mensagens. Não executa regras de jornada. |
| React Native Metro | `18081` | Bundler de desenvolvimento, assets e atualização do app React Native; não é backend nem aplicação web final. |
| Emulator BFF | `18085` | Única fachada local para os canais e única integração com `ms-journey`; normaliza transporte, erros, correlação e sessões conversacionais. |

Bibliotecas e SDKs não escutam portas.

As portas são defaults do projeto e devem poder ser sobrescritas por variáveis de ambiente. Antes de iniciar qualquer processo, a disponibilidade da porta deve ser novamente verificada.

## 7. Responsabilidades dos módulos

### 7.1 Channel Lab

O laboratório coordena a demonstração, sem concentrar lógica que pertencerá aos canais:

- lista jornadas por tipo de canal via BFF;
- coleta variáveis de início;
- inicia ou encerra uma sessão;
- seleciona o alvo de renderização;
- incorpora hosts web em painel isolado;
- mostra IDs técnicos, estado do passo e erros sanitizados;
- fornece instruções de conexão para apps móveis.

### 7.2 Emulator BFF

O BFF:

- chama apenas o `ms-journey`;
- não interpreta BPMN nem executa o fluxo;
- não busca formulários diretamente em outro serviço;
- expõe uma API local estável aos hosts;
- trata timeout, indisponibilidade, CORS, correlação e erros sem vazar detalhes internos;
- preserva `processInstanceId` e `taskId` fornecidos pelo `ms-journey`;
- encaminha respostas no formato `{ "answers": { ... } }` ao concluir uma tarefa;
- mantém apenas o estado transitório necessário à conversa do WhatsApp;
- aceita a URL upstream por configuração, com `http://localhost:8085/api/v1` como referência do ambiente atual.

O BFF não deve compensar lacunas do contrato acessando serviços internos. Melhorias como envelope versionado, idempotência, códigos de erro estáveis, revisão de passo ou streaming de estados devem evoluir na responsabilidade do `ms-journey`.

### 7.3 SDKs e runtimes

O núcleo compartilhado deve ser headless e separado dos componentes visuais:

- tipos do catálogo e do contrato de execução;
- validação estrutural defensiva no cliente;
- leitura e escrita segura de bindings;
- interpolação de placeholders sem avaliação de código;
- estado do formulário;
- validações declarativas homologadas;
- avaliação de visibilidade;
- despacho de ações por allowlist;
- diagnóstico de componente, versão, token ou ação não suportada;
- serialização determinística das respostas.

O runtime não deve importar Mística, React Native ou Flutter UI.

### 7.4 Renderizadores

Cada renderizador:

- resolve `type + version` por mapa fechado;
- converte propriedades semânticas em componentes reais da plataforma;
- resolve tokens por mapa explícito;
- mantém ordem de leitura e foco da árvore;
- oferece fallback seguro para nós incompatíveis;
- envia eventos ao runtime, em vez de executar comandos arbitrários;
- declara alvo e versão próprios.

### 7.5 WhatsApp

WhatsApp é uma projeção sequencial da tela SDUI:

| SDUI | Projeção conversacional |
|---|---|
| `ui.screen`, `ui.container`, `ui.stack`, `ui.card` | Estrutura e agrupamento; não viram necessariamente uma mensagem própria |
| `ui.text` | Mensagem de texto |
| `ui.image` | Mensagem de mídia |
| `ui.textInput`, `ui.textArea`, `ui.datePicker` | Pergunta seguida de resposta livre validada |
| `ui.select` | Botões de resposta ou lista |
| `ui.checkbox` | Confirmação sim/não |
| `ui.button` | Resposta interativa ou confirmação de envio |
| `ui.link` | CTA com URL validada |
| `ui.alert` | Mensagem de destaque |
| `ui.progress` | Progresso textual |
| `ui.loading` | Indicador de digitação/estado |
| `ui.icon`, `ui.divider`, `ui.spacer` | Degradação semântica, separador textual ou omissão segura |

Para cada contato, o adapter pode manter estado transitório com:

- identificador do contato;
- `processInstanceId`;
- `taskId` atual;
- pergunta pendente;
- respostas acumuladas da tela;
- posição atual na sequência.

A tarefa do `ms-journey` só é concluída depois que todas as respostas necessárias da tela forem coletadas e validadas.

O WCE será integrado atrás de interfaces próprias e com versão/commit fixado, pois é uma dependência de laboratório substituível, não parte do contrato corporativo.

## 8. Catálogo SDUI v1 a implementar

### 8.1 Layout e composição

- `ui.screen`
- `ui.container`
- `ui.stack`
- `ui.card`

### 8.2 Conteúdo e primitivos

- `ui.text`
- `ui.image`
- `ui.icon`
- `ui.divider`
- `ui.spacer`

### 8.3 Entrada

- `ui.textInput`
- `ui.textArea`
- `ui.select`
- `ui.checkbox`
- `ui.datePicker`

### 8.4 Ação e feedback

- `ui.button`
- `ui.link`
- `ui.alert`
- `ui.progress`
- `ui.loading`

O comportamento precisa cobrir propriedades, bindings, placeholders, eventos, ações, visibilidade e tokens descritos no catálogo v1. Um componente visualmente presente, mas sem sua semântica contratual, não é considerado concluído.

## 9. Ações permitidas no runtime

- `action.submit`
- `action.navigate`
- `action.openUrl`
- `action.setValue`
- `action.track`
- `action.dismiss`

Regras:

- não aceitar callbacks no snapshot;
- não executar JavaScript, Dart ou templates arbitrários;
- validar caminhos de bindings e parâmetros;
- restringir navegação e abertura de URL por handlers/allowlist do host;
- não registrar valores pessoais em telemetria;
- manter ações específicas do canal fora do contrato comum.

## 10. Estrutura de diretórios pretendida

```text
emulador-canais/
├── apps/
│   ├── channel-lab/
│   ├── react-web-host/
│   ├── react-native-host/
│   └── flutter-host/
├── services/
│   └── emulator-bff/
├── packages/
│   ├── sdui-contract/
│   ├── journey-client-ts/
│   ├── sdui-runtime-ts/
│   ├── renderer-react-web-mistica/
│   └── renderer-react-native-mistica/
├── flutter/
│   ├── journey_client_dart/
│   ├── sdui_core/
│   └── sdui_renderer_mistica/
├── integrations/
│   └── whatsapp-wce/
└── docs/
```

## 11. Sequência de implementação

1. Criar o monorepo e materializar o contrato SDUI v1 em tipos e validação executável.
2. Implementar o Emulator BFF e o cliente TypeScript do `ms-journey`.
3. Implementar o runtime SDUI headless em TypeScript.
4. Implementar React Web Host e adapter Mística Web.
5. Implementar React Native Host e adapter móvel próprio.
6. Implementar cliente, runtime e adapters Dart/Flutter para Web e Mobile.
7. Integrar o adapter conversacional e o WCE isolado.
8. Implementar o Channel Lab como cockpit sobre os hosts já funcionais.

Embora a arquitetura preveja validação de conformidade futura, testes automatizados não fazem parte da implementação inicial por decisão explícita.

## 12. Critério de conclusão funcional

Uma implementação de alvo estará funcional quando conseguir, usando somente o BFF:

1. listar uma jornada compatível;
2. coletar variáveis de início;
3. iniciar uma instância;
4. renderizar ou projetar todos os 19 tipos do catálogo v1;
5. manter bindings e validação de formulário;
6. executar somente ações permitidas;
7. enviar respostas à tarefa ativa;
8. representar espera, término e erro recuperável;
9. falhar com segurança diante de contrato ou capacidade incompatível;
10. expor diagnóstico técnico sem dados pessoais.

## 13. Decisões ainda condicionais

- A disponibilidade de bibliotecas corporativas Mística para React Native ou Flutter deve ser reavaliada antes de consolidar os adapters; na ausência delas, serão adapters próprios compatíveis com tokens e semântica Mística.
- WCE é o candidato inicial para o laboratório de WhatsApp. Sua aderência será validada numa integração isolada; ele poderá ser substituído sem afetar BFF, runtime ou contrato SDUI.
- O `ms-journey` hoje entrega `form.sdui` sem o envelope completo sugerido pelo catálogo. O consumidor deve aceitar o contrato real de modo defensivo, mas a solução definitiva de metadados de versão pertence à fachada, não a acessos laterais do emulador.

## 14. Regra de atualização desta memória

Esta v0 não deve ser reescrita para esconder mudanças de direção. Alterações arquiteturais relevantes devem ser registradas em nova memória (`v1`, `v2` e assim por diante), apontando explicitamente quais decisões desta versão foram mantidas, substituídas ou descartadas.
