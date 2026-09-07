# Memória de arquitetura v3 — Channel Lab e bootstrap dos hosts

**Data da decisão:** 2026-09-07  
**Complementa:** `memoria-arquitetura-v0.md`, `memoria-arquitetura-v1.md` e `memoria-arquitetura-v2.md`

## 1. Decisão

O Channel Lab é um cockpit de coordenação. Ele seleciona uma publicação, coleta o contexto inicial e abre a implementação real do canal, mas não possui renderer SDUI e não chama Admin ou `ms-journey` diretamente.

Para transportar `journeyId`, alvo e variáveis iniciais sem colocar valores na URL, o Emulator BFF mantém um bootstrap efêmero em memória e devolve um token opaco. O host troca esse token pelo contexto, confere se o alvo lhe pertence e inicia a jornada automaticamente.

## 2. Fluxos preservados

O plano administrativo definido na v1 permanece:

```text
Channel Lab → Emulator BFF → Admin Backend
```

A execução continua isolada do plano administrativo:

```text
Host real → Emulator BFF → ms-journey
```

O browser do Lab e os hosts não recebem credenciais administrativas. A rota local `GET /api/lab/v1/journeys` continua sendo exclusiva do laboratório e não passa a fazer parte do SDK dos canais.

## 3. Contrato do bootstrap

Criação pelo Channel Lab:

```http
POST /api/lab/v1/bootstraps
Content-Type: application/json

{
  "journeyId": "uuid",
  "target": "react.web",
  "variables": {
    "chave": "valor"
  }
}
```

O alvo deve ser um de:

- `react.web`;
- `react.mobile`;
- `flutter.web`;
- `flutter.mobile`.

O BFF devolve `token`, `journeyId`, `target`, `variables`, `createdAt` e `expiresAt`. O host consulta:

```http
GET /api/lab/v1/bootstraps/{token}
```

Regras acordadas:

- armazenamento somente em memória;
- TTL padrão de dez minutos, configurável por `LAB_BOOTSTRAP_TTL_MS`;
- limite local de 500 entradas, removendo as mais antigas;
- respostas com `Cache-Control: no-store`;
- token opaco e repetível durante o TTL para suportar remontagem de hosts em desenvolvimento;
- rejeição do token por um host cujo alvo não corresponda ao campo `target`;
- remoção do token da barra de endereço pelos hosts web depois da leitura, quando a plataforma permitir;
- valores de variáveis não aparecem no link nem no diagnóstico do Lab.

O token coordena uma sessão local; não é autenticação nem autoriza expor o BFF em rede não confiável.

## 4. Semântica de inicialização

Receber `labBootstrap` significa que o host deve:

1. consultar o bootstrap no BFF;
2. validar seu alvo;
3. consultar o fluxo publicado pelo cliente de execução;
4. iniciar uma instância com o canal e as variáveis do bootstrap;
5. renderizar o passo retornado.

Essa semântica evita dois botões de início e impede que Lab e host iniciem instâncias concorrentes. O Channel Lab nunca chama o endpoint de início de Web ou Mobile.

Os mecanismos manuais definidos anteriormente continuam como fallback de desenvolvimento:

- Web: `?journeyId={uuid}`;
- React Native: deep link com `journeyId` ou `EXPO_PUBLIC_JOURNEY_ID`;
- Flutter Mobile: `--dart-define=JOURNEY_ID={uuid}`.

## 5. Abertura por alvo

| Alvo | Canal | Bootstrap |
|---|---|---|
| React Web | `WEB` | `http://127.0.0.1:15171/?labBootstrap={token}` |
| Flutter Web | `WEB` | `http://127.0.0.1:15172/?labBootstrap={token}` |
| React Native | `MOBILE` | `elasticjourney://run?labBootstrap={token}` |
| Flutter Mobile | `MOBILE` | `--dart-define=LAB_BOOTSTRAP_TOKEN={token}` |

Metro na porta `18081` é um bundler e nunca é incorporado como página web.

## 6. WhatsApp

WhatsApp não usa o bootstrap visual. O Channel Lab chama `POST /api/whatsapp/v1/sessions` no BFF com `journeyId`, `from` e variáveis. O BFF inicia a jornada, mantém a conversa e envia a projeção ao WCE Bridge. O Lab incorpora apenas a WCE Web UI.

O número `from` deve ser igual ao `WCE_USER_PHONE` configurado no Bridge. O padrão local compartilhado é `5511999999999`.

## 7. Diagnóstico e limites

- O health mostrado pelo Lab é somente a vivacidade do Emulator BFF; não comprova a saúde dos upstreams.
- Sem um protocolo `postMessage`, o estado detalhado dos hosts Web permanece visível dentro do próprio host incorporado.
- Reiniciar o BFF elimina bootstraps e sessões WhatsApp mantidos em memória.
- O BFF deve permanecer limitado ao ambiente local ou receber autenticação e controles de rede antes de qualquer exposição compartilhada.
- O Channel Lab não registra valores do contexto inicial em seu painel de diagnóstico.
- Os logs HTTP do BFF mascaram o token de bootstrap e o número `from` presentes em segmentos de rota.

## 8. Decisões anteriores

Esta v3 substitui apenas o transporte inicial por `journeyId` como mecanismo principal entre o Lab e os hosts. O `journeyId` direto permanece como fallback. Todas as demais fronteiras das memórias v0, v1 e v2 continuam válidas.
