package com.jouney.journey;

import com.jouney.journey.especregistry.FlowBundle;
import com.jouney.journey.especregistry.StepResponse;

public record InstanceResponse(String processInstanceId, String businessKey, FlowBundle flow, StepResponse step) {
}
