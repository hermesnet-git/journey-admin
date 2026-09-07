# Canal WhatsApp e WCE

## Componentes

| Componente | Porta | Responsabilidade |
|---|---:|---|
| WCE Web UI | `15173` | Exibir a conversa e coletar respostas. Não conhece jornada ou SDUI. |
| WCE Bridge | `13001` | Emular a borda da WhatsApp Cloud API, manter histórico visual e converter respostas em webhooks. |
| Emulator BFF | `18085` | Manter sessões, projetar SDUI em conversa e executar jornadas pelo `ms-journey`. |

O adapter reutilizável está em `packages/renderer-whatsapp`. A seleção tecnológica e os limites arquiteturais estão registrados em `docs/memoria-arquitetura-v2.md`.

## Como executar

Use três terminais na raiz de `simulacoes/emulador-canais`:

```bash
npm run dev:bff
```

```bash
npm run dev:wce-bridge
```

```bash
npm run dev:wce-ui
```

Abra `http://127.0.0.1:15173`.

Para desenvolvimento, envie na conversa:

```text
/start <journeyId>
```

Se a jornada possuir variáveis iniciais, acrescente um objeto JSON:

```text
/start <journeyId> {"customerId":"123","attempt":1}
```

O `journeyId` deve ser obtido no Admin. O comando não consulta nem lista jornadas publicadas.

## Bootstrap pelo Channel Lab

O futuro Channel Lab poderá iniciar a conversa com:

```http
POST http://127.0.0.1:18085/api/whatsapp/v1/sessions
Content-Type: application/json

{
  "journeyId": "uuid-da-jornada",
  "from": "5511999999999",
  "variables": {}
}
```

Para encerrar:

```http
DELETE http://127.0.0.1:18085/api/whatsapp/v1/sessions/5511999999999
```

Na conversa, `/sair` ou `/stop` produzem o mesmo resultado. Em passos `WAITING`, envie `atualizar` para consultar novamente o `ms-journey`.

## Configuração

O Bridge usa por padrão:

- webhook do bot: `http://127.0.0.1:18085/api/whatsapp/v1/webhook`;
- número do usuário simulado: `5511999999999`;
- origem permitida da UI: `http://127.0.0.1:15173`.

As opções completas estão em `services/wce-bridge/.env.example` e `services/emulator-bff/.env.example`.

## Limites do WhatsApp

- Respostas rápidas exibem no máximo três botões.
- Listas exibem até dez opções por seção nesta versão.
- Layouts visuais são linearizados na ordem da árvore.
- Ícones, divisores e espaçadores não geram bolhas próprias.
- O histórico fica em memória no Bridge e é perdido quando o processo é encerrado.

Nenhuma dessas limitações altera o snapshot SDUI; elas pertencem ao adapter do canal.
