package com.jouney.admin.domain.diagnostico;

/** Um incidente (erro) de uma instância, já com o nome do nó resolvido — mostrado no Diagnóstico
 * tanto pra instância ativa parada num erro quanto terminada por falha (via história, existe mesmo
 * pra incidente já resolvido). */
public record IncidentEntry(String nodeId, String nodeName, String incidentType, String message, String createTime,
                             String endTime, boolean open) {
}
