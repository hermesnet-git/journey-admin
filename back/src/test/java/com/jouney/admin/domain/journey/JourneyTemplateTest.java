package com.jouney.admin.domain.journey;

import static org.assertj.core.api.Assertions.assertThat;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.infrastructure.journey.PredefinedJourneyTemplateCatalog;
import java.util.HashSet;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JourneyTemplateTest {

    private final PredefinedJourneyTemplateCatalog catalog = new PredefinedJourneyTemplateCatalog();

    @Test
    void instantiatesApprovalTemplateWithFreshIdsAndExpectedTopology() {
        JourneyTemplate template = catalog.findById(PredefinedJourneyTemplateCatalog.APPROVAL_TEMPLATE_ID)
                .orElseThrow();

        Flow first = template.instantiate(UUID.randomUUID());
        Flow second = template.instantiate(UUID.randomUUID());

        assertThat(first.getNodes()).hasSize(7);
        assertThat(first.getConnections()).hasSize(6);
        assertThat(first.getNodes()).extracting(node -> node.getType()).containsExactlyInAnyOrder(
                FlowNodeType.START, FlowNodeType.USER_TASK, FlowNodeType.GATEWAY,
                FlowNodeType.SERVICE_TASK, FlowNodeType.SERVICE_TASK, FlowNodeType.END, FlowNodeType.END);
        assertThat(first.getConnections()).filteredOn(connection -> connection.isDefault()).hasSize(1);
        assertThat(first.getNodes()).allMatch(node -> node.getId().startsWith("Node_"));
        assertThat(first.getConnections()).allMatch(connection -> connection.getId().startsWith("Flow_"));

        var firstIds = new HashSet<>(first.getNodes().stream().map(node -> node.getId()).toList());
        var secondIds = new HashSet<>(second.getNodes().stream().map(node -> node.getId()).toList());
        assertThat(firstIds).doesNotContainAnyElementsOf(secondIds);
    }
}
