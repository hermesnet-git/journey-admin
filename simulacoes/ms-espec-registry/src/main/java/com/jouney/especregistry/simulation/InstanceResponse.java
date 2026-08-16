package com.jouney.especregistry.simulation;

public record InstanceResponse(String processInstanceId, FlowBundle flow, StepResponse step) {
}
