package com.jouney.journey.especregistry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** Sem flowConnections: o canal não desenha diagrama, só precisa do channelType (pra filtrar por
 * canal) e dos nós (pra achar o START e seu startVariables). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowBundle(String channelType, List<FlowNode> flowNodes) {
}
