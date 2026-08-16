package com.jouney.especregistry.simulation;

import java.util.List;

/**
 * Passo atual de uma simulação, num único formato achatado (mais simples de consumir no front do
 * que polimorfismo de JSON) — {@code type} discrimina qual dos demais campos está preenchido:
 * USER_TASK (taskId + form), WAITING (nodeId/nodeName/nodeType, pede "Simular conclusão") ou ENDED.
 * {@code trail} lista os nós que o motor executou sozinho (SERVICE_TASK, gateway, e o END
 * efetivamente alcançado) entre a ação que originou esta resposta e este novo passo — sem isso o
 * simulador não teria como saber que, por exemplo, uma verificação de elegibilidade rodou entre uma
 * User Task e o fim da jornada.
 * {@code errorNodeId}/{@code errorNodeName}/{@code errorMessage} só vêm preenchidos quando a última
 * ação falhou (ex.: conector REST fora do ar) — nesse caso {@code type}/demais campos continuam
 * descrevendo o passo atual sem alteração, já que a transação da engine deu rollback e nada avançou.
 */
public record StepResponse(String type, String taskId, String nodeId, String nodeName, String nodeType,
                            FormPayload form, List<TrailEntry> trail, String errorNodeId, String errorNodeName,
                            String errorMessage) {

    public static StepResponse userTask(String taskId, String nodeId, String nodeName, FormPayload form) {
        return new StepResponse("USER_TASK", taskId, nodeId, nodeName, "USER_TASK", form, List.of(), null, null, null);
    }

    public static StepResponse waiting(String nodeId, String nodeName, String nodeType) {
        return new StepResponse("WAITING", null, nodeId, nodeName, nodeType, null, List.of(), null, null, null);
    }

    public static StepResponse ended() {
        return new StepResponse("ENDED", null, null, null, null, null, List.of(), null, null, null);
    }

    public StepResponse withTrail(List<TrailEntry> trail) {
        return new StepResponse(type, taskId, nodeId, nodeName, nodeType, form, trail, errorNodeId, errorNodeName, errorMessage);
    }

    public StepResponse withError(String errorNodeId, String errorNodeName, String errorMessage) {
        return new StepResponse(type, taskId, nodeId, nodeName, nodeType, form, trail, errorNodeId, errorNodeName, errorMessage);
    }
}
