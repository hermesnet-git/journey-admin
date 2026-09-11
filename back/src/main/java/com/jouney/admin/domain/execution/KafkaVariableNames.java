package com.jouney.admin.domain.execution;

/** Nomes de variável de processo reservados pro conector Kafka — mesmos nomes usados pelo worker
 * automático do {@code ms-runtime-camunda} (o motor é o mesmo Camunda pros dois lados). */
public final class KafkaVariableNames {

    /** Setada no início da instância (REQ-05.09.010) pra tirar um Service Task Kafka do piloto
     * automático do worker — só então o envio manual desta tela encontra algo pendente pra
     * completar. */
    public static final String MANUAL_CONTROL = "__kafkaManualControl__";

    public static final String TOPIC_PREFIX = "__kafkaTopic__";
    public static final String PAYLOAD_PREFIX = "__kafkaPayload__";

    private KafkaVariableNames() {
    }
}
