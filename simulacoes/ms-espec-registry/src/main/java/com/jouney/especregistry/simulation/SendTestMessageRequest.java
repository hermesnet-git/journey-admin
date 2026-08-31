package com.jouney.especregistry.simulation;

import java.util.Map;

/** {@code correlationId} é obrigatório — é ele que o worker Kafka do ms-runtime-camunda usa pra achar
 * a instância a correlacionar (ou o businessKey da nova instância, no caso de MESSAGE_START_EVENT);
 * sem ele a mensagem seria descartada silenciosamente do outro lado. {@code messageName} é opcional,
 * igual ao envelope real ({@code EventMessageDTO}). {@code data} é só o corpo de negócio — o envelope
 * completo é montado aqui antes de publicar. */
public record SendTestMessageRequest(String correlationId, String messageName, Map<String, Object> data) {
}
