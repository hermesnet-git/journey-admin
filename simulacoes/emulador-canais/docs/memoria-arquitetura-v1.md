# Memória de arquitetura v1 — Separação entre catálogo administrativo e runtime

**Data da decisão:** 2026-09-06  
**Substitui parcialmente:** `memoria-arquitetura-v0.md`

## 1. Decisão

A descoberta de jornadas publicadas pertence exclusivamente ao **Admin Backend**. Não é responsabilidade do `ms-journey` nem do `ms-espec-registry` oferecer ao canal uma listagem de jornadas publicadas.

O emulador não deve consumir os endpoints de listagem encontrados atualmente nesses serviços. Esses fontes permanecem intocados por estarem fora do diretório autorizado.

## 2. Separação de planos

### Plano administrativo

```text
Channel Lab → Emulator BFF → Admin Backend
```

Responsabilidades:

- listar somente jornadas com status `PUBLISHED`;
- permitir busca e filtro por canal no laboratório;
- selecionar o `journeyId` que será enviado ao host escolhido;
- manter autenticação e credencial do Admin exclusivamente no servidor.

Rota local reservada para o laboratório:

```http
GET /api/lab/v1/journeys?channelType={WEB|MOBILE|WHATSAPP}
```

Essa rota não faz parte do SDK de execução dos canais.

### Plano de execução

```text
Channel Host → Emulator BFF → ms-journey
```

O host recebe um `journeyId` já selecionado. O `ms-journey` continua responsável por:

- fornecer o fluxo necessário à preparação da execução;
- iniciar a instância;
- informar o passo atual;
- concluir a tarefa ativa;
- encerrar a instância.

O cliente de execução não oferece `listJourneys()`.

## 3. Bootstrap dos hosts

O Channel Lab deverá abrir ou instruir o host com o identificador selecionado. Para hosts web, o contrato inicial é:

```text
http://localhost:{porta}/?journeyId={uuid}
```

Enquanto o Channel Lab ainda não estiver implementado, o host pode oferecer entrada manual do `journeyId` para desenvolvimento. Essa entrada não consulta o Admin e não pertence ao SDK reutilizável.

## 4. Segurança

- O navegador não recebe usuário, senha ou token do Admin.
- O Emulator BFF autentica no Admin com credencial server-side configurada por ambiente.
- Tokens administrativos não são registrados em logs nem devolvidos aos hosts.
- Os canais reais continuam sem dependência do Admin Backend.
- Rotas administrativas e rotas de execução usam namespaces separados no BFF.

## 5. Decisões da v0 preservadas

Permanecem válidos o catálogo SDUI v1, os quatro alvos oficiais, a adaptação de WhatsApp, as portas reservadas, os limites de alteração, a proibição de acessos laterais para executar jornadas e a separação entre runtime headless e renderizadores.

Fica substituído apenas o trecho da v0 que atribuía ao `ms-journey` a listagem de jornadas para o laboratório.
