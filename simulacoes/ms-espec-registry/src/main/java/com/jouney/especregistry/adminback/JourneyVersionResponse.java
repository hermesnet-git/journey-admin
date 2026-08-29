package com.jouney.especregistry.adminback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;

/** Mapeia só os campos usados do JourneyVersionResponse do admin/back (GET
 * /api/v1/journeys/{journeyId}/versions e /versions/{versionId}) — o snapshot de uma versão
 * ESPECÍFICA, imutável mesmo depois de republicar (ao contrário de PublicationSnapshot, que é sempre
 * a versão atualmente publicada). Reaproveita {@link FlowNode}/{@link FlowConnection}: o
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} deles já absorve o campo extra
 * {@code description} que o {@code SnapshotFlowNodeRecord} do admin/back tem e que não é usado aqui. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JourneyVersionResponse(UUID versionId, int versionNumber, VersionSnapshot snapshot) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VersionSnapshot(String journeyName, String channelType, List<FlowNode> flowNodes,
                                   List<FlowConnection> flowConnections) {
    }
}
