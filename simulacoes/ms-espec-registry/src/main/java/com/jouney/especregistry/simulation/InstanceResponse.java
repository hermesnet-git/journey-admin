package com.jouney.especregistry.simulation;

public record InstanceResponse(String processInstanceId, String businessKey, FlowBundle flow, StepResponse step) {
}
