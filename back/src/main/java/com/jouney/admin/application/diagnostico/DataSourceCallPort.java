package com.jouney.admin.application.diagnostico;

import java.util.List;

/** Consultas a fontes de dados feitas ao montar as telas de uma instância (ADR-002) — registradas
 * pelo ms-espec-registry, que é quem busca a fonte; a busca acontece fora do motor, então não aparece
 * no histórico da instância. */
public interface DataSourceCallPort {

    List<DataSourceCall> findByProcessInstance(String processInstanceId);

    /** {@code time} no mesmo formato das datas do histórico do motor (hora local, yyyy-MM-dd'T'HH:mm:ss.SSSZ). */
    record DataSourceCall(String nodeId, String alias, String sourceName, String url, String status,
                          Integer httpStatus, long durationMs, Integer itemCount, String errorMessage, String time) {
    }
}
