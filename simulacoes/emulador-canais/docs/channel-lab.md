# Channel Lab

O Channel Lab é o cockpit local do Emulador de Canais. Ele roda em `http://127.0.0.1:15170`, lista publicações por canal, coleta variáveis iniciais e encaminha a execução para o host real selecionado.

Ele não renderiza SDUI, não executa BPMN e não acessa diretamente Admin ou `ms-journey`.

## Pré-requisitos por alvo

| Alvo | Processos necessários |
|---|---|
| React Web | Emulator BFF, React Web Host e Channel Lab |
| Flutter Web | Emulator BFF, Flutter Web Host e Channel Lab |
| React Native | Emulator BFF acessível pelo dispositivo, Metro e Channel Lab |
| Flutter Mobile | Emulator BFF acessível pelo dispositivo e Channel Lab |
| WhatsApp WCE | Emulator BFF, WCE Bridge, WCE Web UI e Channel Lab |

O Admin Backend e o `ms-journey` precisam estar ativos para uma jornada publicada ser descoberta e executada. O Channel Lab não inicia, reinicia nem encerra esses serviços.

## Inicialização

Em terminais separados, suba apenas os componentes necessários ao alvo:

```bash
npm run dev:bff
npm run dev:lab
```

Para Web ou WCE, acrescente o respectivo host:

```bash
npm run dev --workspace @elastic-journey/react-web-host
npm run dev:flutter
npm run dev:wce-bridge
npm run dev:wce-ui
```

Os endereços e a porta do Lab podem ser alterados em `apps/channel-lab/.env`:

```dotenv
CHANNEL_LAB_HOST=127.0.0.1
CHANNEL_LAB_PORT=15170
VITE_EMULATOR_BFF_ORIGIN=http://127.0.0.1:18085
VITE_REACT_WEB_ORIGIN=http://127.0.0.1:15171
VITE_FLUTTER_WEB_ORIGIN=http://127.0.0.1:15172
VITE_WCE_UI_ORIGIN=http://127.0.0.1:15173
```

## Operação

1. Escolha `WEB`, `MOBILE` ou `WHATSAPP`.
2. Selecione uma implementação real compatível.
3. Escolha uma jornada publicada retornada pelo Admin Backend via BFF.
4. Preencha as variáveis iniciais obrigatórias.
5. Abra o canal.

React Web e Flutter Web aparecem em iframe e também podem ser abertos em nova janela. Para React Native, o Lab fornece um deep link. Para Flutter Mobile, ele fornece o comando com `LAB_BOOTSTRAP_TOKEN`.

O host troca o token pelo contexto no BFF, valida o alvo e inicia a instância. O modo manual por `journeyId` continua disponível para executar cada host sem o Lab.

## WhatsApp WCE

O Lab cria a sessão no BFF e abre a WCE Web UI. O campo "Número simulado" precisa ser igual a `WCE_USER_PHONE` no processo do WCE Bridge; o padrão é `5511999999999`.

Encerrar a sessão no Lab pede ao `ms-journey` que encerre a instância e remove o estado conversacional local. Trocar de canal não encerra silenciosamente uma sessão WhatsApp já iniciada.

## Diagnóstico e segurança

- O indicador do BFF é liveness local, não health agregado dos demais serviços.
- Erros exibem a mensagem sanitizada e, quando fornecido, o `correlationId`.
- Valores das variáveis não são registrados no diagnóstico.
- O bootstrap fica em memória por dez minutos por padrão e desaparece ao reiniciar o BFF.
- O token opaco não é mecanismo de autenticação.
- Para dispositivo físico, configure o BFF com um endereço alcançável na rede e revise CORS e exposição antes de abrir a interface fora da máquina local.
