package com.jouney.especregistry.infrastructure.persistence.screen;

import com.jouney.especregistry.application.journey.ScreenDataSourceFetcher.CallContext;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Registro das consultas a fontes de dados feitas ao montar telas (espec_registry.data_source_call). */
@Component
public class DataSourceCallLog {

    private static final Logger log = LoggerFactory.getLogger(DataSourceCallLog.class);

    private final JdbcTemplate jdbc;

    public DataSourceCallLog(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Call(UUID callId, String processInstanceId, UUID journeyId, int journeyVersion, String nodeId,
                       String alias, String sourceName, String url, String status, Integer httpStatus,
                       long durationMs, Integer itemCount, String errorMessage, OffsetDateTime calledAt) {
    }

    // Falhar ao registrar nunca derruba a montagem da tela — só perde a linha do Diagnóstico.
    public void record(CallContext context, String alias, String sourceName, String url, String status,
                       Integer httpStatus, long durationMs, Integer itemCount, String errorMessage) {
        try {
            jdbc.update("INSERT INTO espec_registry.data_source_call (call_id, process_instance_id, journey_id, journey_version,"
                            + " node_id, alias, source_name, url, status, http_status, duration_ms, item_count, error_message)"
                            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), context.processInstanceId(), context.journeyId(), context.journeyVersion(),
                    context.nodeId(), alias, sourceName, truncate(url, 1000), status, httpStatus, durationMs, itemCount,
                    truncate(errorMessage, 1000));
        } catch (RuntimeException e) {
            log.warn("Não foi possível registrar a consulta à fonte de dados {}: {}", sourceName, e.getMessage());
        }
    }

    public List<Call> findByProcessInstance(String processInstanceId) {
        return jdbc.query("SELECT * FROM espec_registry.data_source_call WHERE process_instance_id = ? ORDER BY called_at",
                (rs, i) -> new Call(rs.getObject("call_id", UUID.class), rs.getString("process_instance_id"),
                        rs.getObject("journey_id", UUID.class), rs.getInt("journey_version"), rs.getString("node_id"),
                        rs.getString("alias"), rs.getString("source_name"), rs.getString("url"), rs.getString("status"),
                        (Integer) rs.getObject("http_status"), rs.getLong("duration_ms"), (Integer) rs.getObject("item_count"),
                        rs.getString("error_message"), rs.getObject("called_at", OffsetDateTime.class)),
                processInstanceId);
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }
}
