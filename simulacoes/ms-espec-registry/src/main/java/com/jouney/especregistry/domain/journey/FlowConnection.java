package com.jouney.especregistry.domain.journey;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// PublicationSnapshotRecord (admin/back) serializa este campo como "isDefault" (nome do próprio
// record component) — mas manteve-se o @JsonAlias("default") por precaução: já existiu um caminho
// (endpoint HTTP /versions/{id}, hoje removido) que serializava via getter JavaBean e mandava
// "default" em vez de "isDefault". Aceitar os dois nomes é barato e evita repetir aquele bug caso
// outro caminho volte a usar esse formato.
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowConnection(String id, String sourceNodeId, String targetNodeId, String condition,
                              @JsonAlias("default") boolean isDefault) {
}
