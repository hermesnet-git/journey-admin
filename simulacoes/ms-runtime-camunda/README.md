# ms-runtime-camunda

Motor de execução Camunda 7 (Community Edition, 7.24.0) embutido num serviço Spring Boot.

## Rodar localmente

```powershell
cd D:\her\desenv\camunda\ms-runtime-camunda
.\mvnw.cmd spring-boot:run
```

Sobe na porta **8080** — a mesma do Camunda Run antigo. Pare o Camunda Run antes de subir este (só um
pode ocupar a porta). Banco H2 relativo ao diretório deste módulo (`./camunda-h2-default/`), começa
vazio na primeira execução.

- `engine-rest`: `http://localhost:8080/engine-rest`
- Cockpit/Tasklist/Admin: `http://localhost:8080/camunda`
