package com.jouney.especregistry.simulation;

import com.jayway.jsonpath.JsonPath;
import com.jouney.especregistry.adminback.ConnectorConfig;
import com.jouney.especregistry.adminback.FlowConnection;
import com.jouney.especregistry.adminback.FlowNode;
import com.jouney.especregistry.adminback.PublicationSnapshot;
import com.jouney.especregistry.camunda.CamundaVariable;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

/**
 * Called on demand from the front's "Diagnosticar em segundo plano" button after a start attempt
 * fails with {@code SYNCHRONOUS_CHAIN_JSONPATH_FAILURE} (see GlobalExceptionHandler) — Camunda's own
 * error never says which node/field caused it, since the whole instantiation transaction rolls back
 * before anything is recorded. Replays the same synchronous chain the engine would have run (START
 * -> SERVICE_TASK REST/GATEWAY nodes -> first checkpoint) outside the engine, calling each REST
 * connector for real with the same variables, to catch the exact outputMapping rule that fails
 * against the real response.
 */
@Component
public class StartFailureDiagnostic {

    // Same {{name}} syntax as BpmnTransformer's ADMIN_VARIABLE_TOKEN, resolved here with the real
    // variable value instead of turned into a Camunda ${...} JUEL reference — there's no engine
    // evaluating expressions in this replay, just a straight string substitution.
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");
    // Only the shape gateway conditions actually use in this app (REQ-03.11.003):
    // "{{var}} == literal" / "{{var}} != literal". ponytail: no &&/||/>/< support, add if a journey
    // ever needs it — the engine's real JUEL condition stays the source of truth either way, this
    // only has to be good enough to pick the same branch during a replay.
    private static final Pattern CONDITION = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}\\s*(==|!=)\\s*(.+)");
    private static final int MAX_HOPS = 200;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DiagnosisResult run(PublicationSnapshot snapshot, Map<String, CamundaVariable> startVariables) {
        Map<String, FlowNode> byId = new HashMap<>();
        snapshot.flowNodes().forEach(n -> byId.put(n.id(), n));
        Map<String, List<FlowConnection>> outgoing = new HashMap<>();
        snapshot.flowConnections().forEach(c -> outgoing.computeIfAbsent(c.sourceNodeId(), k -> new ArrayList<>()).add(c));

        Map<String, Object> variables = new HashMap<>();
        startVariables.forEach((name, variable) -> variables.put(name, variable.value()));

        FlowNode start = snapshot.findStartNode().orElse(null);
        FlowNode current = start != null ? nextNode(start, outgoing, byId, variables) : null;
        List<String> visited = new ArrayList<>();

        for (int hop = 0; current != null && hop < MAX_HOPS; hop++) {
            if (isSynchronousRestTask(current)) {
                visited.add(current.name());
                NodeAttempt attempt = tryNode(current, variables);
                if (attempt.failure != null) {
                    return DiagnosisResult.confirmed(current.id(), current.name(), attempt.failure.field(),
                            attempt.failure.jsonPath(), attempt.failure.reason(), attempt.failure.responseSnippet());
                }
                variables.putAll(attempt.resolvedVariables);
                current = nextNode(current, outgoing, byId, variables);
            } else if ("GATEWAY".equals(current.type())) {
                current = nextNode(current, outgoing, byId, variables);
            } else {
                break; // reached a checkpoint (User Task/Receive Task/non-REST Service Task) or END without reproducing the failure
            }
        }
        return DiagnosisResult.suspects(visited);
    }

    private boolean isSynchronousRestTask(FlowNode node) {
        return "SERVICE_TASK".equals(node.type()) && node.connectorConfig() != null
                && "REST".equalsIgnoreCase(node.connectorConfig().connectorType());
    }

    // START/SERVICE_TASK always have exactly one outgoing flow; a GATEWAY picks the first outgoing
    // edge whose condition evaluates true against the current variables, falling back to whichever
    // edge is marked default — same semantics as Camunda's own exclusive gateway.
    private FlowNode nextNode(FlowNode node, Map<String, List<FlowConnection>> outgoing, Map<String, FlowNode> byId,
                               Map<String, Object> variables) {
        List<FlowConnection> edges = outgoing.getOrDefault(node.id(), List.of());
        if (edges.size() == 1) {
            return byId.get(edges.get(0).targetNodeId());
        }
        FlowConnection defaultEdge = null;
        for (FlowConnection edge : edges) {
            if (edge.isDefault()) {
                defaultEdge = edge;
                continue;
            }
            if (edge.condition() != null && !edge.condition().isBlank() && evaluateCondition(edge.condition(), variables)) {
                return byId.get(edge.targetNodeId());
            }
        }
        return defaultEdge != null ? byId.get(defaultEdge.targetNodeId()) : null;
    }

    private boolean evaluateCondition(String condition, Map<String, Object> variables) {
        Matcher matcher = CONDITION.matcher(condition.trim());
        if (!matcher.matches()) {
            return false;
        }
        Object actual = variables.get(matcher.group(1));
        Object expected = parseLiteral(matcher.group(3).trim());
        boolean equal = actual instanceof Number an && expected instanceof Number en
                ? an.doubleValue() == en.doubleValue()
                : String.valueOf(actual).equals(String.valueOf(expected));
        return "==".equals(matcher.group(2)) == equal;
    }

    private Object parseLiteral(String raw) {
        if (raw.length() >= 2 && (raw.charAt(0) == '\'' || raw.charAt(0) == '"') && raw.charAt(raw.length() - 1) == raw.charAt(0)) {
            return raw.substring(1, raw.length() - 1);
        }
        if ("true".equalsIgnoreCase(raw) || "false".equalsIgnoreCase(raw)) {
            return Boolean.valueOf(raw);
        }
        try {
            return Double.valueOf(raw);
        } catch (NumberFormatException e) {
            return raw;
        }
    }

    private record MappingFailure(String field, String jsonPath, String reason, String responseSnippet) {
    }

    private record NodeAttempt(Map<String, Object> resolvedVariables, MappingFailure failure) {
    }

    // Replays the same request HttpConnectorDelegate (ms-runtime-camunda) would make for this node —
    // same url/method/headers/body construction as BpmnTransformer.attachHttpConnector, just resolving
    // {{tokens}} with real values here instead of turning them into ${...} for the engine to evaluate
    // later. Real HTTP call, accepted risk per REST connectors already used in local/mock journeys.
    private NodeAttempt tryNode(FlowNode node, Map<String, Object> variables) {
        ConnectorConfig connectorConfig = node.connectorConfig();
        Map<String, Object> config = connectorConfig.config() != null ? connectorConfig.config() : Map.of();
        String method = config.get("method") instanceof String m && !m.isBlank() ? m : "GET";
        String url = appendQueryParams(resolveTokens(asString(config.get("url")), variables), config.get("params"));
        Map<String, String> headers = buildHeaders(config, variables);
        String body = config.get("body") != null ? resolveTokens(serialize(config.get("body")), variables) : null;

        String responseBody;
        try {
            responseBody = restClient.method(HttpMethod.valueOf(method))
                    .uri(url)
                    .headers(h -> headers.forEach(h::set))
                    .body(body != null ? body : "")
                    .retrieve()
                    .toEntity(String.class)
                    .getBody();
        } catch (RestClientException e) {
            return new NodeAttempt(Map.of(),
                    new MappingFailure(null, null, "Falha ao chamar " + method + " " + url + ": " + e.getMessage(), null));
        }

        Map<String, Object> resolved = new HashMap<>();
        for (Map<String, Object> rule : connectorConfig.outputMapping()) {
            if (!(rule.get("name") instanceof String name) || name.isBlank() || !(rule.get("jsonPath") instanceof String jsonPath)) {
                continue;
            }
            try {
                resolved.put(name, JsonPath.read(responseBody, jsonPath));
            } catch (Exception e) {
                return new NodeAttempt(resolved, new MappingFailure(name, jsonPath,
                        "Campo '" + name + "' (jsonPath " + jsonPath + ") não encontrado na resposta.",
                        snippet(responseBody)));
            }
        }
        return new NodeAttempt(resolved, null);
    }

    private Map<String, String> buildHeaders(Map<String, Object> config, Map<String, Object> variables) {
        Map<String, String> headers = new LinkedHashMap<>();
        if (config.get("headers") instanceof Map<?, ?> configuredHeaders) {
            configuredHeaders.forEach((key, value) -> headers.put(String.valueOf(key), resolveTokens(String.valueOf(value), variables)));
        }
        boolean hasContentType = headers.keySet().stream().anyMatch(key -> key.equalsIgnoreCase("Content-Type"));
        if (config.get("body") != null && !hasContentType) {
            headers.put("Content-Type", "application/json");
        }
        return headers;
    }

    // ponytail: same as BpmnTransformer.appendQueryParams — params are static per journey, not
    // resolved from runtime data, so no token resolution needed here either.
    private String appendQueryParams(String url, Object paramsValue) {
        if (!(paramsValue instanceof Map<?, ?> params) || params.isEmpty()) {
            return url;
        }
        String query = params.entrySet().stream()
                .map(e -> URLEncoder.encode(String.valueOf(e.getKey()), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(String.valueOf(e.getValue()), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        return url + (url.contains("?") ? "&" : "?") + query;
    }

    private String resolveTokens(String text, Map<String, Object> variables) {
        if (text == null) {
            return null;
        }
        Matcher matcher = VARIABLE_TOKEN.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            Object value = variables.get(matcher.group(1));
            matcher.appendReplacement(result, Matcher.quoteReplacement(value != null ? String.valueOf(value) : ""));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String asString(Object value) {
        return value instanceof String s ? s : "";
    }

    private String serialize(Object value) {
        return value instanceof String s ? s : objectMapper.writeValueAsString(value);
    }

    private String snippet(String response) {
        if (response == null) {
            return null;
        }
        return response.length() > 300 ? response.substring(0, 300) + "…" : response;
    }
}
