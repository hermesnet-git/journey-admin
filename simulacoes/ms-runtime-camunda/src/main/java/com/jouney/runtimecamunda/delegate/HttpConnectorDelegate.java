package com.jouney.runtimecamunda.delegate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Executa de verdade a chamada REST de um Service Task (REQ-03.09) — substitui o conector nativo
 * http-connector do Camunda (ver BpmnTransformer.attachHttpConnector, ms-transform-publication, pro
 * motivo completo: as variáveis internas do conector nativo nunca tocavam execution.setVariable(),
 * então ficavam invisíveis pro histórico do motor assim que a atividade terminava, e credentialRef
 * nunca era resolvido em nada).
 *
 * url/method/headers/payload chegam aqui como variáveis LOCAIS desta atividade (camunda:inputOutput
 * comum, gerado por BpmnTransformer — não mais camunda:connector), e por isso ficam visíveis no
 * histórico do motor como qualquer outra variável: ms-espec-registry lê de volta via
 * CamundaClient.getLocalVariablesForActivity pra montar a aba Log do Executor.
 */
@Component("httpConnectorDelegate")
public class HttpConnectorDelegate implements JavaDelegate {

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        String url = stringVariable(execution, "url");
        String method = stringVariable(execution, "method");
        Map<String, String> headers = parseHeaders(stringVariable(execution, "headers"));
        String payload = stringVariable(execution, "payload");
        applyCredential(stringVariable(execution, "credentialRef"), headers);

        // .onStatus(status -> true, noop) desarma o ResponseErrorHandler padrão do RestClient (que
        // lançaria RestClientResponseException em qualquer 4xx/5xx e derrubaria a atividade num
        // incidente do Camunda antes do outputMapping rodar). Um 404 "não encontrado" é uma resposta
        // HTTP válida de negócio, não uma falha de infraestrutura — deixa o fluxo seguir pro
        // outputMapping/gateway com o status e o corpo de erro disponíveis, do mesmo jeito que um 200.
        // Falha real de conectividade (host inválido, timeout) continua propagando normalmente, já que
        // não passa por aqui — é lançada antes de haver uma resposta.
        ResponseEntity<String> response = restClient
                .method(HttpMethod.valueOf(method == null || method.isBlank() ? "GET" : method))
                .uri(url)
                .headers(h -> headers.forEach(h::set))
                .body(payload != null ? payload : "")
                .retrieve()
                .onStatus(status -> true, (req, res) -> { })
                .toEntity(String.class);

        // Local, não process-scope: cada outputMapping rule (BpmnTransformer) resolve
        // "${S(response).jsonPath(...)}" ainda dentro desta atividade, antes dela terminar — e nunca
        // deve vazar como uma variável de processo genérica chamada "response" (sobrescreveria a cada
        // nó, e um Service Task REST nunca teve essa variável endereçável diretamente por design, só
        // via outputMapping nomeado).
        execution.setVariableLocal("response", response.getBody() != null ? response.getBody() : "");
        // statusCode fica endereçável por uma outputMapping rule com jsonPath "$httpStatus" (sentinela
        // reservada em BpmnTransformer.attachHttpConnector — não é um JSONPath real, então não colide
        // com nenhum "$.status" de corpo de resposta de verdade).
        execution.setVariableLocal("statusCode", response.getStatusCode().value());
    }

    private String stringVariable(DelegateExecution execution, String name) {
        Object value = execution.getVariable(name);
        return value != null ? String.valueOf(value) : null;
    }

    private Map<String, String> parseHeaders(String headersJson) throws Exception {
        Map<String, String> headers = new LinkedHashMap<>();
        if (headersJson == null || headersJson.isBlank()) {
            return headers;
        }
        Map<String, Object> raw = objectMapper.readValue(headersJson, new TypeReference<Map<String, Object>>() { });
        raw.forEach((key, value) -> headers.put(key, String.valueOf(value)));
        return headers;
    }

    // ponytail: sem resolução real de Key Vault ainda — mesmo estágio que CredentialResolver/
    // LocalCredentialResolver em ms-espec-registry hoje (nenhuma dependência Azure no projeto).
    // credentialRef chega até aqui e fica disponível pra quando essa integração existir; por ora não
    // aplica nenhum header extra.
    private void applyCredential(String credentialRef, Map<String, String> headers) {
        if (credentialRef == null || credentialRef.isBlank()) {
            return;
        }
        // TODO: resolver credentialRef num Azure Key Vault de verdade e aplicar o(s) header(s) de
        // autenticação resultantes em `headers` antes da chamada.
    }
}
