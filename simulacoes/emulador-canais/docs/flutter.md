# Canal Flutter Web e Mobile

O alvo Flutter é uma aplicação Flutter real compartilhada entre `flutter.web` e `flutter.mobile`. O contrato SDUI permanece independente da interface; o código está dividido em:

- `packages/sdui-runtime-dart`: árvore SDUI, bindings, interpolação, visibilidade, validação e ações;
- `packages/journey-client-dart`: cliente HTTP reutilizável do Emulator BFF;
- `packages/renderer-flutter-mistica`: adapter dos 19 componentes do catálogo v1 para widgets Flutter e tokens semânticos equivalentes ao Mística;
- `apps/flutter-host`: aplicação de referência que inicia e executa a jornada.

O host nunca acessa o Admin nem o `ms-journey` diretamente. O Channel Lab envia um token temporário; o host troca esse token no BFF, valida `flutter.web` ou `flutter.mobile` e inicia automaticamente com o contexto recebido. O `journeyId` manual continua disponível como fallback de desenvolvimento.

## Flutter Web

Com o BFF ativo na porta `18085`, execute na raiz do emulador:

```bash
npm run dev:flutter
```

O Chrome abrirá `http://127.0.0.1:15172`. O host usa `http://127.0.0.1:18085/api/v1` por padrão e inicia a jornada com `channelType=WEB`.

O Channel Lab abre o host com `?labBootstrap={token}`. Depois de validar o alvo, o host remove o token da URL, preserva os demais parâmetros e mantém somente o `journeyId` como referência. O modo isolado continua aceitando `?journeyId={uuid}`.

## Android

Liste os dispositivos e execute o host:

```bash
flutter devices
cd apps/flutter-host
flutter run -d <device-id>
```

No emulador Android, o endereço padrão do BFF é `http://10.0.2.2:18085/api/v1` e a jornada usa `channelType=MOBILE`.

## iOS

No simulador iOS, `127.0.0.1` aponta para a máquina de desenvolvimento, portanto o endereço padrão do BFF é `http://127.0.0.1:18085/api/v1`. A compilação iOS exige macOS e Xcode.

## Aparelho físico ou endereço alternativo

Use `--dart-define` para indicar um BFF alcançável pelo dispositivo:

```bash
flutter run -d <device-id> --dart-define=EMULATOR_BFF_BASE_URL=http://192.168.0.10:18085/api/v1
```

Nesse caso, o BFF precisa escutar em uma interface de rede acessível, e firewall/rede devem permitir a conexão. Um `journeyId` inicial também pode ser fornecido com `--dart-define=JOURNEY_ID={uuid}`.

Para consumir um bootstrap criado pelo Channel Lab em Mobile:

```bash
flutter run -d <device-id> \
  --dart-define=LAB_BOOTSTRAP_TOKEN={token} \
  --dart-define=EMULATOR_BFF_BASE_URL=http://192.168.0.10:18085/api/v1
```

No Android Emulator, a última opção pode ser omitida porque o default usa `10.0.2.2`. Como `LAB_BOOTSTRAP_TOKEN` é um `dart-define`, outro bootstrap exige uma nova execução do comando.

## Limite do adapter visual

Não há dependência de uma biblioteca Flutter oficial do Mística nesta versão. O adapter traduz os tokens e a semântica do contrato para Material 3 de forma isolada. Se uma implementação corporativa Mística para Flutter for disponibilizada, ela poderá substituir os widgets dentro do renderer sem mudar o documento SDUI, o runtime ou o cliente do BFF.
