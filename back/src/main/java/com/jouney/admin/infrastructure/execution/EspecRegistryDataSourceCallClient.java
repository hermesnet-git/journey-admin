package com.jouney.admin.infrastructure.execution;

import com.jouney.admin.application.diagnostico.DataSourceCallPort;
import com.jouney.admin.infrastructure.publication.TimeoutAwareRestClient;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class EspecRegistryDataSourceCallClient implements DataSourceCallPort {

    private static final Logger log = LoggerFactory.getLogger(EspecRegistryDataSourceCallClient.class);
    private static final DateTimeFormatter ENGINE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ");

    private final RestClient restClient;
    private final String baseUrl;

    public EspecRegistryDataSourceCallClient(@Value("${app.espec-registry.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = TimeoutAwareRestClient.create(Duration.ofSeconds(3), Duration.ofSeconds(10));
    }

    private record RegistryCall(String nodeId, String alias, String sourceName, String url, String status,
                                Integer httpStatus, long durationMs, Integer itemCount, String errorMessage,
                                OffsetDateTime calledAt) {
    }

    // Registry fora do ar não derruba o Diagnóstico — só some a linha "consulta da tela".
    @Override
    public List<DataSourceCall> findByProcessInstance(String processInstanceId) {
        try {
            List<RegistryCall> calls = restClient.get()
                    .uri(baseUrl + "/api/v1/data-source-calls?processInstanceId={id}", processInstanceId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<RegistryCall>>() {
                    });
            return calls == null ? List.of() : calls.stream()
                    .map(c -> new DataSourceCall(c.nodeId(), c.alias(), c.sourceName(), c.url(), c.status(), c.httpStatus(),
                            c.durationMs(), c.itemCount(), c.errorMessage(),
                            c.calledAt().atZoneSameInstant(ZoneId.systemDefault()).format(ENGINE_FORMAT)))
                    .toList();
        } catch (RestClientException e) {
            log.warn("Não foi possível ler as consultas a fontes de dados da instância {}: {}", processInstanceId, e.getMessage());
            return List.of();
        }
    }
}
