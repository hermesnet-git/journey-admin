package com.jouney.journey.especregistry;

/** Versão enxuta do StepResponse do ms-espec-registry — sem trail/errorNodeId/errorNodeName/
 * errorConnectorConfig (diagnóstico do simulador interno do admin, fora do escopo de um canal
 * real: o canal só precisa saber que algo falhou, não qual nó exatamente nem sua config bruta). */
public record StepResponse(String type, String taskId, String nodeId, String nodeName, String nodeType,
                            FormPayload form, String errorMessage) {

    public static StepResponse userTask(String taskId, String nodeId, String nodeName, FormPayload form) {
        return new StepResponse("USER_TASK", taskId, nodeId, nodeName, "USER_TASK", form, null);
    }

    public static StepResponse waiting(String nodeId, String nodeName, String nodeType) {
        return new StepResponse("WAITING", null, nodeId, nodeName, nodeType, null, null);
    }

    public static StepResponse ended() {
        return new StepResponse("ENDED", null, null, null, null, null, null);
    }

    public StepResponse withError(String errorMessage) {
        return new StepResponse(type, taskId, nodeId, nodeName, nodeType, form, errorMessage);
    }
}
