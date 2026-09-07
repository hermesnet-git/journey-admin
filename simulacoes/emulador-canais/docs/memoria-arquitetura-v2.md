# Memória de arquitetura v2 — Integração WhatsApp e WCE

**Data da decisão:** 2026-09-07  
**Complementa:** `memoria-arquitetura-v0.md` e `memoria-arquitetura-v1.md`

## 1. Decisão

O laboratório adota um protocolo compatível com o projeto open source **WCE — WhatsApp Cloud Emulator**, mantendo a implementação isolada e substituível.

O código-fonte integral do WCE não será incorporado. A implementação upstream avaliada possui licença MIT e oferece o desenho adequado — Bridge Node.js, UI React, endpoint `send-to-emulator` e eventos Socket.IO — mas inclui um conjunto amplo de dependências visuais que não é necessário para o escopo reduzido do Elastic Journey.

Foram mantidos os pontos de compatibilidade relevantes:

- `POST /send-to-emulator` recebe mensagens no formato da WhatsApp Cloud API;
- evento Socket.IO `ui_message` leva mensagens do Bridge para a UI;
- evento Socket.IO `ui_reply` leva respostas da UI para o Bridge;
- respostas são convertidas para o envelope de webhook da Cloud API;
- textos, imagens, botões, listas e CTA são representados no navegador.

Referência avaliada: <https://github.com/DonnC/wce-emulator>.

## 2. Fronteiras preservadas

```text
WCE Web UI :15173
        │ Simple UI Contract / Socket.IO
        ▼
WCE Bridge :13001
        │ webhook compatível com WhatsApp Cloud API
        ▼
Emulator BFF :18085
        │ API de execução
        ▼
ms-journey
```

- A WCE Web UI não conhece `journeyId`, SDUI, tarefas ou processos.
- O WCE Bridge não executa jornada e não interpreta SDUI.
- O Emulator BFF mantém a sessão conversacional, projeta SDUI e é a única camada que chama o `ms-journey`.
- O `ms-journey` continua sendo responsável por iniciar, avançar, consultar e encerrar a jornada.
- A descoberta de jornadas publicadas continua pertencendo ao plano administrativo descrito na v1.

## 3. Bootstrap temporário

Até o Channel Lab existir, uma sessão pode ser iniciada na própria conversa com:

```text
/start <journeyId> {"variavel":"valor"}
```

Esse comando é uma conveniência local interpretada pelo BFF. Ele não faz parte do contrato de produção do canal. O Channel Lab utilizará a rota de operação `POST /api/whatsapp/v1/sessions` e o usuário verá apenas as mensagens da jornada.

## 4. Projeção do catálogo SDUI

O adapter conversacional preserva semântica e ordem da árvore, mas não tenta reproduzir layout visual:

- tela e textos viram mensagens de texto;
- imagem vira mensagem de imagem;
- campos de texto, área de texto e data viram perguntas sequenciais;
- select com até três opções vira botões; acima disso vira lista;
- checkbox vira botões Sim/Não;
- botão com ação vira resposta rápida ao final dos campos;
- link com `action.openUrl` vira CTA;
- alerta, progresso e loading viram feedback textual;
- container, stack e card preservam apenas a ordem dos filhos;
- ícone, divisor e spacer não geram mensagem própria e produzem diagnóstico técnico.

Bindings, visibilidade, interpolação, validação e ações permitidas continuam sendo executados pelo runtime SDUI, não pela UI do WCE.

## 5. Substituição futura

O transporte para o WCE usa payloads da Cloud API. Uma integração real poderá substituir o destino local por um adapter da Meta/BSP sem mudar o contrato SDUI nem transferir regras de jornada para o Bridge.
