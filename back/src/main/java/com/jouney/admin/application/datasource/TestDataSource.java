package com.jouney.admin.application.datasource;

import com.jouney.admin.application.flow.ConnectorTestCommand;
import com.jouney.admin.application.flow.ConnectorTestPort;
import com.jouney.admin.application.flow.ConnectorTestResult;
import com.jouney.admin.domain.datasource.DataSource;
import com.jouney.admin.domain.datasource.DataSourceItems;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;

/**
 * Botão "Testar" do catálogo de fontes: chama a fonte com valores de exemplo pros parâmetros da URL,
 * no admin-back (nunca no navegador — mesma chamada protegida do teste de conector, REQ-03.10), e
 * devolve os itens já com só os campos expostos. O resultado também serve de exemplo pro preview da
 * tela no editor.
 */
@Service
public class TestDataSource {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ManageDataSources manageDataSources;
    private final ConnectorTestPort connectorTestPort;

    public TestDataSource(ManageDataSources manageDataSources, ConnectorTestPort connectorTestPort) {
        this.manageDataSources = manageDataSources;
        this.connectorTestPort = connectorTestPort;
    }

    public Result execute(UUID id, Map<String, String> params) {
        DataSource dataSource = manageDataSources.get(id);
        String url = dataSource.getUrl();
        for (String param : dataSource.getParams()) {
            String value = params != null ? params.getOrDefault(param, "") : "";
            url = url.replace("{" + param + "}", URLEncoder.encode(value, StandardCharsets.UTF_8));
        }
        long started = System.currentTimeMillis();
        ConnectorTestResult response = connectorTestPort.test(new ConnectorTestCommand("GET", url, Map.of(), null, Map.of()));
        long durationMs = System.currentTimeMillis() - started;
        if (response.status() < 200 || response.status() >= 300) {
            return new Result(response.status(), durationMs, MAPPER.createArrayNode(),
                    "A fonte respondeu com o status " + response.status() + ".");
        }
        JsonNode body;
        try {
            body = MAPPER.readTree(response.body());
        } catch (Exception e) {
            return new Result(response.status(), durationMs, MAPPER.createArrayNode(), "A resposta da fonte não é um JSON válido.");
        }
        ArrayNode items = DataSourceItems.extract(body, dataSource.getItemsPath(), dataSource.getExposedFields());
        String message = items.isEmpty() ? "Nenhum item encontrado em " + dataSource.getItemsPath() + "." : null;
        return new Result(response.status(), durationMs, items, message);
    }

    public record Result(int status, long durationMs, ArrayNode items, String message) {
    }
}
