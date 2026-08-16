package com.jouney.especregistry.simulation;

/** Um nó que o motor executou sozinho (sem parar) a caminho do novo passo — mesmo formato de tipo
 * usado em {@link com.jouney.especregistry.adminback.FlowNode#type()} (SERVICE_TASK, GATEWAY, END...). */
public record TrailEntry(String nodeId, String nodeName, String nodeType) {
}
