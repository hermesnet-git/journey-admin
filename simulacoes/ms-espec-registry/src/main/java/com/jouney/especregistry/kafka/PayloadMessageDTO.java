package com.jouney.especregistry.kafka;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/** Mesmo formato do wf-journey-v1 ({@code PayloadMessageDTO}): {@code status}/{@code code} são
 * promovidos a campos de topo do envelope; o resto vira variáveis soltas via {@code data}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PayloadMessageDTO(String status, String code, Map<String, Object> data) {
}
