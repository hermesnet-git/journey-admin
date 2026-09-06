# AGENTS.md — back

Instruções para agentes de IA (Claude Code, GitHub Copilot, Codex etc.) trabalhando neste projeto.

## Fase atual: protótipo

- Não criar, alterar nem complementar testes automatizados durante esta fase.
- Não executar testes existentes.
- Build e verificações estáticas podem ser executados normalmente, desde que os testes sejam explicitamente ignorados.
- Os testes serão planejados em uma etapa posterior pelo usuário.

## Stack

- Java 21, Spring Boot 4.1 (spring-boot-starter-webmvc, data-jpa, validation)
- PostgreSQL + Flyway (migrations em `src/main/resources/db/migration`)
- Maven (`./mvnw` / `mvnw.cmd`)

Build: usar um comando Maven que ignore a compilação e a execução dos testes durante a fase de protótipo (por exemplo, `./mvnw package -Dmaven.test.skip=true`; no Windows, `mvnw.cmd package -Dmaven.test.skip=true`).

## Arquitetura

Pacotes sob `com.jouney.admin` seguem uma separação por camadas (arquitetura hexagonal/em camadas):

- `domain/` — entidades e regras de negócio, sem dependência de framework web/persistência quando possível
- `application/` — casos de uso / orquestração
- `infrastructure/` — implementações técnicas (repositórios JPA, integrações externas, config)
- `interfaces/` — camada de entrada (controllers REST, DTOs)

Ao adicionar funcionalidade nova, respeitar essa separação: não colocar lógica de negócio em controller, não vazar entidade JPA diretamente como resposta de API sem necessidade.

## Migrations

- Toda alteração de schema via nova migration Flyway em `src/main/resources/db/migration` (nunca editar uma migration já aplicada/commitada).
- Nome segue o padrão `V<versão>__descricao.sql` já usado no projeto — verificar a última versão existente antes de criar a próxima.

## Regras gerais

- Validar entradas na camada de `interfaces` (DTOs com Bean Validation), não confiar em validação só no domínio.
- Durante a fase de protótipo, não rodar metas ou comandos que compilem ou executem testes. Build sem testes e lint estão autorizados.
