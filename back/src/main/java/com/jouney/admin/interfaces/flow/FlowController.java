package com.jouney.admin.interfaces.flow;

import com.jouney.admin.application.flow.GetFlow;
import com.jouney.admin.application.flow.UpdateFlow;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journeys/{journeyId}/flow")
public class FlowController {

    private final GetFlow getFlow;
    private final UpdateFlow updateFlow;

    public FlowController(GetFlow getFlow, UpdateFlow updateFlow) {
        this.getFlow = getFlow;
        this.updateFlow = updateFlow;
    }

    @GetMapping
    public FlowResponse get(@PathVariable UUID journeyId) {
        return FlowResponse.from(getFlow.execute(journeyId));
    }

    @PutMapping
    public FlowResponse update(@PathVariable UUID journeyId, @Valid @RequestBody FlowInput input) {
        var nodes = input.nodes().stream().map(FlowNodeInput::toDomain).toList();
        var connections = input.connections().stream().map(FlowConnectionInput::toDomain).toList();
        return FlowResponse.from(updateFlow.execute(journeyId, input.name(), nodes, connections));
    }
}
