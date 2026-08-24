package com.jouney.transformpublication.interfaces.publication;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Mirrors the shape of {@code PublicationSnapshotRecord} sent by the Admin Portal
 * (ej-admin-requisitos.md EP-02.09 / EP-04.06) when a journey is published. Only the
 * fields this service actually needs are modeled — {@code embeddedScreen(Sdui)} é ignorado aqui de
 * propósito (@JsonIgnoreProperties): a tela de uma User Task não entra no BPMN, o simulador resolve
 * ela direto do snapshot pelo id do nó (ver StepResolver no ms-espec-registry).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PublicationSnapshotRequest(
        @NotNull UUID journeyId,
        @NotBlank String journeyName,
        String journeyDescription,
        UUID productId,
        String productName,
        UUID channelId,
        String channelName,
        String channelType,
        Integer versionNumber,
        @NotEmpty @Valid List<FlowNodeRequest> flowNodes,
        @NotNull @Valid List<FlowConnectionRequest> flowConnections) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FlowNodeRequest(
            @NotBlank String id,
            @NotBlank String type,
            @NotBlank String name,
            String description,
            Integer positionX,
            Integer positionY,
            ConnectorConfigRequest connectorConfig) {
    }

    public record ConnectorConfigRequest(String connectorType, Map<String, Object> config, String credentialRef) {
    }

    // condition/isDefault only apply when sourceNodeId is a GATEWAY node (REQ-03.11.002/003).
    public record FlowConnectionRequest(@NotBlank String id, @NotBlank String sourceNodeId,
                                         @NotBlank String targetNodeId, String condition, boolean isDefault) {
    }
}
