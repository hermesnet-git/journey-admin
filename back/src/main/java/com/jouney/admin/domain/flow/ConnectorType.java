package com.jouney.admin.domain.flow;

/**
 * Connector catalog for FT-03.08: REST, KAFKA, EVENT_HUBS and SERVICE_BUS are enabled for use in
 * flows (FT-14); SOAP is registered as a disabled placeholder proving the catalog supports future
 * connectors without allowing their use yet (REQ-03.08.004).
 */
public enum ConnectorType {
    REST(true, false),
    KAFKA(true, true),
    EVENT_HUBS(true, true),
    SERVICE_BUS(true, true),
    SOAP(false, false);

    private final boolean enabled;
    private final boolean messageBroker;

    ConnectorType(boolean enabled, boolean messageBroker) {
        this.enabled = enabled;
        this.messageBroker = messageBroker;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Conectores baseados em mensageria (Kafka, Event Hubs, Service Bus) podem iniciar um fluxo a
     * partir de uma mensagem recebida (MESSAGE_START_EVENT) e têm operação PRODUCE/CONSUME
     * determinada pelo tipo de nó (REQ-03.09.008); REST/SOAP não (REQ-03.09.007).
     */
    public boolean isMessageBroker() {
        return messageBroker;
    }
}
