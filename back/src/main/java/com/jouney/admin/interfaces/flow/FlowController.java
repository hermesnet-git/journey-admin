package com.jouney.admin.interfaces.flow;

import com.jouney.admin.application.flow.GetFlow;
import com.jouney.admin.application.flow.TestConnector;
import com.jouney.admin.application.flow.UpdateFlow;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/flow")
public class FlowController {

    private final GetFlow getFlow;
    private final UpdateFlow updateFlow;
    private final TestConnector testConnector;

    public FlowController(GetFlow getFlow, UpdateFlow updateFlow, TestConnector testConnector) {
        this.getFlow = getFlow;
        this.updateFlow = updateFlow;
        this.testConnector = testConnector;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public FlowResponse get(@PathVariable UUID journeyId) {
        return FlowResponse.from(getFlow.execute(journeyId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PutMapping
    public FlowResponse update(@PathVariable UUID journeyId, @Valid @RequestBody FlowInput input) {
        var nodes = input.nodes().stream().map(FlowNodeInput::toDomain).toList();
        var connections = input.connections().stream().map(FlowConnectionInput::toDomain).toList();
        var annotations = input.annotations().stream().map(FlowAnnotationInput::toDomain).toList();
        return FlowResponse.from(updateFlow.execute(journeyId, input.name(), nodes, connections, annotations));
    }

    // journeyId/nodeId scope the resource in the URL (REQ-03.10.001) but aren't needed by the
    // call itself — the test runs against the values currently in the editor, not the saved flow.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/nodes/{nodeId}/connector-test")
    public ConnectorTestResponse testConnector(@PathVariable UUID journeyId, @PathVariable String nodeId,
                                                 @Valid @RequestBody ConnectorTestInput input) {
        return ConnectorTestResponse.from(testConnector.execute(input.toCommand()));
    }
}
