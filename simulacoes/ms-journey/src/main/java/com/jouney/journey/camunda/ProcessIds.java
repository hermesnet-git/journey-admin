package com.jouney.journey.camunda;

import java.util.UUID;

/** Mesma convenção usada em ms-transform-publication e ms-espec-registry (sem módulo compartilhado
 * entre os serviços): chave de definição de processo = "Journey_" + UUID sem hifens. */
public final class ProcessIds {

    private static final String PREFIX = "Journey_";

    private ProcessIds() {
    }

    public static String keyForJourney(UUID journeyId) {
        return PREFIX + journeyId.toString().replace("-", "");
    }

    public static UUID journeyIdFromKey(String processDefinitionKey) {
        String hex = processDefinitionKey.substring(PREFIX.length());
        String withDashes = hex.substring(0, 8) + "-" + hex.substring(8, 12) + "-" + hex.substring(12, 16) + "-"
                + hex.substring(16, 20) + "-" + hex.substring(20);
        return UUID.fromString(withDashes);
    }
}
