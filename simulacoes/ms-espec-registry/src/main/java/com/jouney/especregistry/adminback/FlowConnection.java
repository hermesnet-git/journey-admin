package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// GET .../publication (PublicationSnapshotRecord, admin/back) serializes this field as "isDefault"
// (a record component, keeps its own name) — but GET .../versions/{versionId} serializes the domain
// FlowConnection class directly (JourneyVersionResponse.VersionSnapshotResponse.flowConnections()),
// whose isDefault() getter Jackson treats as the JavaBean property "default" (strips the "is"
// prefix). Confirmed live: {"default":false} came back from /versions and blew up deserialization
// here before @JsonAlias was added. Accepting both keeps this one record usable for either endpoint
// without touching admin/back's two different (and inconsistent) serialization shapes.
@JsonIgnoreProperties(ignoreUnknown = true)
public record FlowConnection(String id, String sourceNodeId, String targetNodeId, String condition,
                              @JsonAlias("default") boolean isDefault) {
}
