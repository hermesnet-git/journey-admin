package com.jouney.runtimecamunda.delegate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.camunda.bpm.engine.delegate.BpmnError;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.camunda.bpm.engine.impl.context.Context;
import org.camunda.bpm.engine.impl.jobexecutor.JobExecutorContext;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
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
 *
 * Resiliência (configurada no passo "Resiliência" do conector): tempo limite de conexão e de
 * resposta, novas tentativas só para falha passageira (sem conexão, tempo esgotado, 429/502/503/504)
 * com espera crescente, e Idempotency-Key automática em POST. Esgotadas as tentativas, a falha vai
 * pela saída "Se falhar" (BpmnError) quando a etapa tem uma; senão a etapa falha com uma mensagem
 * legível — o envio da tela anterior volta com erro, ou, em segundo plano, vira incidente.
 */
@Component("httpConnectorDelegate")
public class HttpConnectorDelegate implements JavaDelegate {

    /** Mesmo código que BpmnTransformer (ms-transform-publication) usa no evento de erro preso à
     * tarefa — a saída "Se falhar" desenhada no editor. */
    static final String INTEGRATION_FAILED_ERROR_CODE = "INTEGRACAO_FALHOU";

    // Padrões e tetos. Valores fora da faixa já são barrados pelo FlowValidator (admin); o teto é
    // reaplicado aqui só por segurança.
    private static final int DEFAULT_CONNECT_MS = 2_000;
    private static final int MAX_CONNECT_MS = 10_000;
    private static final int DEFAULT_READ_MS = 10_000;
    private static final int MAX_READ_MS = 30_000;
    private static final int MAX_RETRIES = 2;
    private static final int DEFAULT_RETRY_INTERVAL_MS = 1_000;
    private static final int MAX_RETRY_INTERVAL_MS = 5_000;
    // Falha passageira: vale tentar de novo. Qualquer outra resposta (inclusive 4xx) é definitiva.
    private static final Set<Integer> TRANSIENT_STATUS = Set.of(429, 502, 503, 504);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        String url = stringVariable(execution, "url");
        String method = stringVariable(execution, "method");
        HttpMethod httpMethod = HttpMethod.valueOf(method == null || method.isBlank() ? "GET" : method);
        Map<String, String> headers = parseHeaders(stringVariable(execution, "headers"));
        String payload = stringVariable(execution, "payload");
        applyCredential(stringVariable(execution, "credentialRef"), headers);

        int connectMs = intVariable(execution, "connectTimeoutMs", DEFAULT_CONNECT_MS, MAX_CONNECT_MS);
        int readMs = intVariable(execution, "readTimeoutMs", DEFAULT_READ_MS, MAX_READ_MS);
        int retries = intVariable(execution, "retries", 0, MAX_RETRIES);
        int retryIntervalMs = intVariable(execution, "retryIntervalMs", DEFAULT_RETRY_INTERVAL_MS, MAX_RETRY_INTERVAL_MS);
        boolean hasErrorPath = Boolean.parseBoolean(stringVariable(execution, "hasErrorPath"));

        // Mesma chave em todas as tentativas desta execução da etapa: o destino reconhece a repetição
        // e não cria o recurso duas vezes. Uma chave já definida pelo autor nos headers é respeitada.
        if (httpMethod == HttpMethod.POST && headers.keySet().stream().noneMatch("Idempotency-Key"::equalsIgnoreCase)) {
            headers.put("Idempotency-Key", idempotencyKey(execution));
            execution.setVariableLocal("headers", objectMapper.writeValueAsString(headers));
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectMs);
        requestFactory.setReadTimeout(readMs);
        RestClient restClient = RestClient.builder().requestFactory(requestFactory).build();

        ResponseEntity<String> response = null;
        String failure = null;
        int attempts = 0;
        while (true) {
            attempts++;
            try {
                // .onStatus(status -> true, noop) desarma o ResponseErrorHandler padrão do RestClient:
                // um 404 "não encontrado" é resposta de negócio, não falha — segue pro outputMapping/
                // Decisão com o status e o corpo disponíveis, do mesmo jeito que um 200.
                response = restClient.method(httpMethod)
                        .uri(url)
                        .headers(h -> headers.forEach(h::set))
                        .body(payload != null ? payload : "")
                        .retrieve()
                        .onStatus(status -> true, (req, res) -> { })
                        .toEntity(String.class);
                failure = null;
                if (!TRANSIENT_STATUS.contains(response.getStatusCode().value()) || attempts > retries) {
                    break;
                }
            } catch (ResourceAccessException e) {
                response = null;
                failure = hasCause(e, SocketTimeoutException.class)
                        ? "não respondeu dentro do tempo limite"
                        : "não aceitou a conexão";
                if (attempts > retries) {
                    break;
                }
            }
            Thread.sleep(backoff(retryIntervalMs, attempts));
        }
        execution.setVariableLocal("attempts", attempts);

        if (response == null) {
            String message = "O serviço " + host(url) + " " + failure + attemptsSuffix(attempts) + ".";
            execution.setVariableLocal("failure", message);
            // O motor ainda roda o mapeamento de saída da etapa quando o BpmnError sai daqui, e ele lê
            // statusCode/response: sem resposta, os dois existem vazios (o status vira null e os
            // campos mapeados, null/lista vazia) em vez de a expressão quebrar e a falha não chegar à
            // saída "Se falhar".
            execution.setVariableLocal("statusCode", null);
            execution.setVariableLocal("response", "");
            if (hasErrorPath) {
                throw new BpmnError(INTEGRATION_FAILED_ERROR_CODE, message);
            }
            throw new IllegalStateException(message);
        }

        // Local, não process-scope: cada outputMapping rule (BpmnTransformer) resolve
        // "${S(response).jsonPath(...)}" ainda dentro desta atividade, antes dela terminar — e nunca
        // deve vazar como uma variável de processo genérica chamada "response".
        execution.setVariableLocal("response", response.getBody() != null ? response.getBody() : "");
        // statusCode fica endereçável por uma outputMapping rule com jsonPath "$httpStatus" (sentinela
        // reservada em BpmnTransformer.attachHttpConnector).
        int status = response.getStatusCode().value();
        execution.setVariableLocal("statusCode", status);
        if (status >= 500 && hasErrorPath) {
            String message = "O serviço " + host(url) + " respondeu com erro " + status + attemptsSuffix(attempts) + ".";
            execution.setVariableLocal("failure", message);
            throw new BpmnError(INTEGRATION_FAILED_ERROR_CODE, message);
        }
    }

    // Em segundo plano a etapa roda num job, cujo id se mantém a cada "Tentar de novo"; fora dele, a
    // instância da atividade é única por passagem (um laço que volta a esta etapa gera chave nova).
    private static String idempotencyKey(DelegateExecution execution) {
        JobExecutorContext jobContext = Context.getJobExecutorContext();
        return jobContext != null && jobContext.getCurrentJob() != null
                ? "job-" + jobContext.getCurrentJob().getId()
                : execution.getActivityInstanceId();
    }

    // Espera crescente (1x, 2x o intervalo) com variação de ±20%, pra várias instâncias não repetirem
    // contra o mesmo serviço no mesmo instante.
    private static long backoff(int intervalMs, int attempt) {
        double base = intervalMs * Math.pow(2, attempt - 1);
        return Math.round(base * (0.8 + ThreadLocalRandom.current().nextDouble() * 0.4));
    }

    private static String attemptsSuffix(int attempts) {
        return attempts > 1 ? " (" + attempts + " tentativas)" : "";
    }

    private static String host(String url) {
        try {
            String host = URI.create(url).getHost();
            return host != null ? host : url;
        } catch (IllegalArgumentException e) {
            return url;
        }
    }

    private static boolean hasCause(Throwable error, Class<? extends Throwable> type) {
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (type.isInstance(t)) {
                return true;
            }
        }
        return false;
    }

    private int intVariable(DelegateExecution execution, String name, int fallback, int max) {
        String value = stringVariable(execution, name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Math.max(0, Math.min(max, Integer.parseInt(value.trim())));
        } catch (NumberFormatException e) {
            return fallback;
        }
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
