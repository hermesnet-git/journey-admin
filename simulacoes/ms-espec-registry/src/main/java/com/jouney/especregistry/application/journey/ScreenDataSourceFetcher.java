package com.jouney.especregistry.application.journey;

import com.jouney.especregistry.domain.engine.EngineVariable;
import com.jouney.especregistry.domain.screen.SourceError;
import com.jouney.especregistry.domain.screen.TemplateResolver;
import com.jouney.especregistry.infrastructure.persistence.screen.DataSourceCallLog;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Executa as fontes de dados de referência declaradas no envelope da tela (ADR-002, catálogo §14.4)
 * ao montá-la — o canal e o BFF nunca chamam a fonte. A configuração vem congelada na publicação
 * (url, timeout, caminho da lista, campos expostos); os parâmetros da URL são resolvidos contra as
 * variáveis da instância. Cada chamada é registrada pro Diagnóstico.
 */
@Component
public class ScreenDataSourceFetcher {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final DataSourceCallLog callLog;

    public ScreenDataSourceFetcher(DataSourceCallLog callLog) {
        this.callLog = callLog;
    }

    public record Fetched(Map<String, EngineVariable> lists, Map<String, SourceError> errors) {
    }

    public record CallContext(String processInstanceId, UUID journeyId, int journeyVersion, String nodeId) {
    }

    public Fetched fetchAll(Map<String, Object> dataSources, Map<String, EngineVariable> variables, CallContext context) {
        Map<String, EngineVariable> lists = new LinkedHashMap<>();
        Map<String, SourceError> errors = new LinkedHashMap<>();
        if (dataSources == null) {
            return new Fetched(lists, errors);
        }
        dataSources.forEach((alias, raw) -> {
            JsonNode config = MAPPER.valueToTree(raw);
            String variableName = "data_" + alias;
            ArrayNode items = fetch(alias, config, variables, context);
            if (items == null) {
                errors.put(variableName, new SourceError(config.path("errorMessage").asText("Não foi possível carregar as informações agora."),
                        config.path("required").asBoolean(false)));
                items = MAPPER.createArrayNode();
            }
            lists.put(variableName, new EngineVariable(items.toString(), "Json"));
        });
        return new Fetched(lists, errors);
    }

    /** null = falhou (status fora de 2xx, timeout, resposta inválida). */
    private ArrayNode fetch(String alias, JsonNode config, Map<String, EngineVariable> variables, CallContext context) {
        String url = config.path("url").asText("");
        JsonNode params = config.path("params");
        if (params.isObject()) {
            for (var entry : params.properties()) {
                String value = TemplateResolver.resolveTemplate(entry.getValue().asText(""), variables);
                url = url.replace("{" + entry.getKey() + "}", URLEncoder.encode(value, StandardCharsets.UTF_8));
            }
        }
        String sourceName = config.path("source").asText(alias);
        int timeoutMs = config.path("timeoutMs").asInt(5000);
        long started = System.currentTimeMillis();
        // ponytail: credentialRef segue sem resolução, mesmo estágio do HttpConnectorDelegate
        // (ms-runtime-camunda) — nenhuma integração com Key Vault ainda.
        try {
            HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMillis(timeoutMs))
                            .header("Accept", "application/json").GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            long duration = System.currentTimeMillis() - started;
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                callLog.record(context, alias, sourceName, url, "ERROR", response.statusCode(), duration, null,
                        "A fonte respondeu com o status " + response.statusCode());
                return null;
            }
            ArrayNode items = extract(MAPPER.readTree(response.body()), config.path("itemsPath").asText("$"),
                    exposedFields(config.path("exposedFields")));
            callLog.record(context, alias, sourceName, url, "SUCCESS", response.statusCode(), duration, items.size(), null);
            return items;
        } catch (HttpTimeoutException e) {
            callLog.record(context, alias, sourceName, url, "TIMEOUT", null, System.currentTimeMillis() - started, null,
                    "A fonte não respondeu em até " + timeoutMs + " ms");
            return null;
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            callLog.record(context, alias, sourceName, url, "ERROR", null, System.currentTimeMillis() - started, null,
                    e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            return null;
        }
    }

    private static List<String> exposedFields(JsonNode node) {
        List<String> fields = new ArrayList<>();
        node.forEach(f -> fields.add(f.asText()));
        return fields;
    }

    // Mesmo caminho simples do catálogo de fontes (admin/back, DataSourceItems): $ ou $.a.b; só os
    // campos expostos saem do servidor.
    static ArrayNode extract(JsonNode response, String itemsPath, List<String> exposedFields) {
        JsonNode node = response;
        if (!"$".equals(itemsPath.trim())) {
            for (String segment : itemsPath.trim().substring(2).split("\\.")) {
                node = node == null ? null : node.get(segment);
            }
        }
        ArrayNode items = MAPPER.createArrayNode();
        if (node == null || !node.isArray()) {
            return items;
        }
        for (JsonNode item : node) {
            if (exposedFields.isEmpty() || !item.isObject()) {
                items.add(item);
                continue;
            }
            ObjectNode kept = MAPPER.createObjectNode();
            for (String field : exposedFields) {
                if (item.has(field)) kept.set(field, item.get(field));
            }
            items.add(kept);
        }
        return items;
    }
}
