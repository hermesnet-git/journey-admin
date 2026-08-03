# AGENTS.md — back

Instruções para agentes de IA (Claude Code, GitHub Copilot, Codex etc.) trabalhando neste projeto.

## Stack

- Java 21, Spring Boot 4.1 (spring-boot-starter-webmvc, data-jpa, validation)
- PostgreSQL + Flyway (migrations em `src/main/resources/db/migration`)
- Maven (`./mvnw` / `mvnw.cmd`)

Build/test: `./mvnw verify` (Windows: `mvnw.cmd verify`). Rode sempre após alterações relevantes.

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
- Rodar `./mvnw verify` antes de considerar uma tarefa concluída.
