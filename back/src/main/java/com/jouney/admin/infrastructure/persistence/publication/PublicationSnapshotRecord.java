package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.form.FormSduiSerializer;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.infrastructure.persistence.flow.FlowConnectionRecord;
import com.jouney.admin.infrastructure.persistence.flow.FlowNodeRecord;
import com.jouney.admin.infrastructure.persistence.form.FormFieldRecord;
import java.util.List;
import java.util.UUID;

public record PublicationSnapshotRecord(UUID journeyId, String journeyName, String journeyDescription,
                                         UUID productId, String productName, UUID channelId, String channelName,
                                         ChannelType channelType, List<FlowNodeRecord> flowNodes,
                                         List<FlowConnectionRecord> flowConnections, List<SnapshotFormRecord> forms) {

    // Shared by the outbound call to the runtime's publication API (PublicationAdapter) and by
    // REQ-02.10.001 (inspecting that same JSON from the admin UI) — one mapping, one shape.
    public static PublicationSnapshotRecord from(Publication publication) {
        return new PublicationSnapshotRecord(
                publication.getJourneyId(), publication.getJourneyName(), publication.getJourneyDescription(),
                publication.getProductId(), publication.getProductName(), publication.getChannelId(),
                publication.getChannelName(), publication.getChannelType(),
                publication.getFlowNodes().stream()
                        .map(n -> new FlowNodeRecord(n.getId(), n.getType(), n.getName(), n.getDescription(),
                                n.getPositionX(), n.getPositionY(), n.getFormId(),
                                FlowNodeRecord.ConnectorConfigRecord.from(n.getConnectorConfig())))
                        .toList(),
                publication.getFlowConnections().stream()
                        .map(c -> new FlowConnectionRecord(c.getId(), c.getSourceNodeId(), c.getTargetNodeId(), c.getCondition(),
                                c.isDefault()))
                        .toList(),
                publication.getForms().stream()
                        .map(f -> new SnapshotFormRecord(f.getId(), f.getName(), f.getDescription(),
                                f.getFields().stream()
                                        .map(field -> new FormFieldRecord(field.getName(), field.getType(),
                                                field.getInputSubtype(), field.getLabel(), field.isRequired(),
                                                field.getDefaultValue(), field.getHelpText(), field.getOptions(),
                                                field.getMinValue(), field.getMaxValue(),
                                                field.getValidationPattern(), field.getAcceptedExtensions(),
                                                field.getMaxFileSizeBytes()))
                                        .toList(),
                                FormSduiSerializer.serialize(f)))
                        .toList());
    }
}
