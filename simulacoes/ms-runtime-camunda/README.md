# ms-runtime-camunda

Motor de execução Camunda 7 (Community Edition, 7.24.0) embutido num serviço Spring Boot que a gente
controla — substitui a distribuição Camunda Run baixada à parte (fora de qualquer repo git). Expõe a
mesma `engine-rest`/porta 8080 que `ms-espec-registry` (`CamundaClient`) já espera, então nenhum outro
serviço do projeto `admin` precisa mudar.

## Por quê

O conector REST nativo do Camunda (`camunda:connector`) roda a chamada HTTP dentro do próprio motor,
mas suas variáveis internas (`url`/`method`/`headers`/`payload`/`response`) nunca tocam
`execution.setVariable()` — ficam invisíveis pro histórico assim que a atividade termina — e
`credentialRef` nunca era resolvido em nada. Trocado por um `JavaDelegate` nosso
(`HttpConnectorDelegate`), referenciado no BPMN gerado via `camunda:delegateExpression`, com
`camunda:inputOutput` padrão (não o wrapper `camunda:connector`) — mantém a chamada síncrona (mesmo
comportamento de hoje pro canal), mas agora com variáveis locais de verdade, visíveis via
`/history/variable-instance?activityInstanceIdIn=...`.

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

## O que falta (fora de escopo desta rodada)

- Resolução real de `credentialRef` num Azure Key Vault — `HttpConnectorDelegate.applyCredential` é
  um stub proposital (mesmo estágio que `CredentialResolver`/`LocalCredentialResolver` em
  `ms-espec-registry` hoje).
