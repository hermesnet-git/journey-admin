# Canal React Native

## O que foi implementado

O alvo `react.mobile` é uma aplicação React Native real gerenciada pelo Expo SDK 57. O Metro usa a porta `18081`; essa porta entrega o bundle de desenvolvimento ao aplicativo e não representa uma página web.

O host:

- recebe o bootstrap do Channel Lab por `elasticjourney://run?labBootstrap={token}` e inicia automaticamente com o contexto informado;
- preserva o `journeyId` manual, `EXPO_PUBLIC_JOURNEY_ID` e `elasticjourney://run?journeyId={uuid}` como alternativas de desenvolvimento;
- acessa somente as rotas de execução do Emulator BFF;
- consulta o fluxo, coleta variáveis iniciais e inicia a instância com `channelType=MOBILE`;
- representa os estados `USER_TASK`, `WAITING` e `ENDED`;
- envia respostas no envelope `{ "answers": { ... } }`;
- permite atualizar um passo em espera e encerrar uma instância ativa;
- bloqueia URLs que não usem HTTP ou HTTPS;
- exibe diagnósticos de capacidades SDUI sem registrar respostas do usuário.

O pacote `@elastic-journey/renderer-react-native-mistica` implementa os 19 tipos do catálogo SDUI v1 usando controles React Native. `ui.select` usa o picker nativo e `ui.datePicker` usa o seletor nativo de data/hora. Tokens semânticos ficam isolados no adapter e podem ser substituídos por uma biblioteca Mística oficial para React Native sem alterar o contrato ou o runtime.

## Pré-requisitos

- Node.js `22.13+`, `24.3+` ou `25+`;
- BFF em execução na porta `18085`;
- uma destas opções: Expo Go compatível, emulador Android, simulador iOS em macOS ou development build nativa.

O Android SDK e o comando `adb` são necessários para abrir automaticamente um emulador Android pelo CLI. Eles não são necessários para o Metro gerar o bundle.

## Subir o Metro

Na raiz de `emulador-canais`:

```powershell
npm run dev:react-native
```

O comando executa o Metro na porta `18081`. No terminal do Expo, use o QR code com o Expo Go ou a opção correspondente ao dispositivo disponível.

Para solicitar que o Expo abra um emulador Android já instalado e em execução:

```powershell
npm run android --workspace @elastic-journey/react-native-host
```

## Endereço do BFF por ambiente

O endereço padrão depende da plataforma:

| Execução | URL padrão do BFF |
|---|---|
| Android Emulator | `http://10.0.2.2:18085/api/v1` |
| iOS Simulator | `http://127.0.0.1:18085/api/v1` |
| Aparelho físico | deve usar o IP da máquina na rede local |

Para um aparelho físico, o BFF precisa aceitar conexões pela rede local. Na próxima vez que ele for iniciado, configure o bind e informe o IP da máquina antes de subir o Metro:

```powershell
$env:EMULATOR_BFF_HOST = '0.0.0.0'
npm run dev:bff
```

Em outro terminal:

```powershell
$env:EXPO_PUBLIC_EMULATOR_BFF_URL = 'http://192.168.0.10:18085/api/v1'
npm run dev:react-native
```

Substitua `192.168.0.10` pelo endereço real da máquina. O aparelho e a máquina precisam conseguir se alcançar na mesma rede.

## Informar a jornada sem o Channel Lab

Para trabalhar com o host isoladamente, informe diretamente o UUID no campo **Journey ID** do aplicativo. Também é possível carregar um ID ao iniciar o Metro:

```powershell
$env:EXPO_PUBLIC_JOURNEY_ID = 'uuid-da-jornada'
npm run dev:react-native
```

O deep link reservado para um development build ou aplicativo instalado é:

```text
elasticjourney://run?journeyId={uuid}
```

Essa entrada apenas transporta o identificador selecionado. O aplicativo não lista jornadas e não acessa o Admin Backend.

Quando a execução parte do Channel Lab, use o deep link exibido pelo cockpit:

```text
elasticjourney://run?labBootstrap={token}
```

O aplicativo troca o token no BFF, valida o alvo `react.mobile`, carrega o fluxo e inicia a instância com as variáveis do Lab. Esse deep link exige um development build ou aplicativo instalado com o scheme `elasticjourney`.

## Validações de desenvolvimento

Sem iniciar serviços e sem executar testes automatizados:

```powershell
npm run typecheck
npm run bundle --workspace @elastic-journey/react-native-host
npx expo install --check
```

O bundle exportado fica em `apps/react-native-host/dist` e é ignorado pelo Git.
