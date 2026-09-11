package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.ExecutionStep;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.version.JourneyVersion;
import java.util.Map;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

/** Heurística compartilhada por {@link CompleteExecutionTask} e {@link SkipStep}: a transação da
 * engine dá rollback inteira quando um conector síncrono falha no meio da continuação — nada
 * avança, e nada fica registrado no histórico pro nó que efetivamente falhou. O próximo nó com
 * conector a partir do passo atual é a melhor hipótese de onde a falha aconteceu (ver {@link
 * com.jouney.admin.domain.execution.FlowGraph}). */
final class ExecutionErrorAttribution {

    private ExecutionErrorAttribution() {
    }

    static ExecutionStep attribute(ExecutionStep current, JourneyVersion version, ExecutionStepResolver stepResolver,
                                    RestClientException e) {
        FlowNode failedNode = stepResolver.nextConnectorNodeAfter(version, current.nodeId()).orElse(null);
        return current.withError(
                failedNode != null ? failedNode.getId() : null,
                failedNode != null ? failedNode.getName() : null,
                describeRequest(failedNode) + errorMessageFrom(e),
                failedNode != null ? failedNode.getConnectorConfig() : null);
    }

    private static String errorMessageFrom(RestClientException e) {
        if (e instanceof HttpStatusCodeException httpEx && !httpEx.getResponseBodyAsString().isBlank()) {
            return httpEx.getResponseBodyAsString();
        }
        return e.getMessage();
    }

    // O erro que volta da engine não diz pra onde a chamada ia — prefixa com o que o conector do
    // nó de fato tentou chamar (método+URL/tópico), antes de qualquer resolução de {{variável}} (a
    // já resolvida não sobrevive ao rollback, só o que está salvo no fluxo mesmo).
    private static String describeRequest(FlowNode failedNode) {
        if (failedNode == null || failedNode.getConnectorConfig() == null) {
            return "";
        }
        ConnectorConfig connectorConfig = failedNode.getConnectorConfig();
        Map<String, Object> config = connectorConfig.getConfig();
        if (config == null) {
            return "";
        }
        if (connectorConfig.getConnectorType() == ConnectorType.REST && config.get("url") instanceof String url && !url.isBlank()) {
            String method = config.get("method") instanceof String m && !m.isBlank() ? m : "GET";
            return method + " " + url + " — ";
        }
        if (config.get("topic") instanceof String topic && !topic.isBlank()) {
            return "tópico " + topic + " — ";
        }
        return "";
    }
}
