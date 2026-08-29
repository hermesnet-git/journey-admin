package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.FormSduiSerializer;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import java.util.List;
import java.util.UUID;

public record PublicationSnapshotRecord(UUID journeyId, String journeyName, String journeyDescription,
                                         UUID productId, String productName, UUID channelId, String channelName,
                                         ChannelType channelType, Integer versionNumber,
                                         List<SnapshotFlowNodeRecord> flowNodes,
                                         List<FlowConnectionRecord> flowConnections) {

    // Shared by the outbound call to the runtime's publication API (PublicationAdapter) and by
    // REQ-02.10.001 (inspecting that same JSON from the admin UI) — one mapping, one shape.
    // versionNumber travels along so ms-transform-publication can stamp it onto the BPMN as
    // camunda:versionTag — Camunda's own "Definition Version" is a deploy counter it manages
    // itself (see BpmnTransformer), so it never matches JourneyVersion.versionNumber; versionTag
    // is the one Cockpit field meant for an external version identifier like this.
    // versionTag is also the de/para read BACK by ms-espec-registry's InstanceHistoryController: given
    // an old process instance's processDefinitionId, the runtime engine's GET /process-definition/{id}
    // returns this same versionTag, which maps straight back to journey_version.version_number — used
    // to fetch that instance's EXACT flow snapshot via GET /journeys/{id}/versions/{versionId}
    // (journey_version.version_snapshot is immutable per version) instead of this endpoint's always-current
    // one, which would mislabel old instances if the journey was republished since they ran.
    public static PublicationSnapshotRecord from(Publication publication) {
        return new PublicationSnapshotRecord(
                publication.getJourneyId(), publication.getJourneyName(), publication.getJourneyDescription(),
                publication.getProductId(), publication.getProductName(), publication.getChannelId(),
                publication.getChannelName(), publication.getChannelType(), publication.getVersionNumber(),
                publication.getFlowNodes().stream()
                        .map(n -> new SnapshotFlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(),
                                FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig()),
                                n.getStartVariables(), n.getMessageText(),
                                embeddedScreenSduiOf(n, publication.getChannelType())))
                        .toList(),
                publication.getFlowConnections().stream()
                        .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId(), c.getCondition(),
                                c.isDefault()))
                        .toList());
    }

    // Prefere o embeddedScreenSdui já calculado (nó reconstruído de uma snapshot já persistida —
    // Publication/JourneyVersion, onde embeddedScreen não sobrevive à volta); só recompila a partir
    // de embeddedScreen quando o nó vem direto de um Flow ao vivo, que nunca tem sdui pré-calculado.
    public static List<Object> embeddedScreenSduiOf(FlowNode node, ChannelType channelType) {
        if (node.getEmbeddedScreenSdui() != null) {
            return node.getEmbeddedScreenSdui();
        }
        return node.getEmbeddedScreen() == null || node.getEmbeddedScreen().isEmpty() ? null
                : FormSduiSerializer.serialize(node.getEmbeddedScreen(), channelType);
    }
}
