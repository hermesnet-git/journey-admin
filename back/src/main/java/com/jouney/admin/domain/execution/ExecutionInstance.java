package com.jouney.admin.domain.execution;

import com.jouney.admin.domain.publication.Publication;

/** Resultado de iniciar uma instância: a publicação ativa da jornada (diagrama — nós, conexões,
 * canais) e o primeiro passo a mostrar. {@code manualKafkaControl} sempre falso nesta primeira
 * fatia (controle manual de Kafka é uma fatia seguinte). */
public record ExecutionInstance(String processInstanceId, String businessKey, Publication flow, ExecutionStep step,
                                 boolean manualKafkaControl) {
}
