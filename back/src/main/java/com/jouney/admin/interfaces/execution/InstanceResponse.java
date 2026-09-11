package com.jouney.admin.interfaces.execution;

import com.jouney.admin.domain.execution.ExecutionInstance;

public record InstanceResponse(String processInstanceId, String businessKey, FlowBundleResponse flow,
                                StepResponse step, boolean manualKafkaControl) {

    public static InstanceResponse from(ExecutionInstance instance) {
        return new InstanceResponse(instance.processInstanceId(), instance.businessKey(),
                FlowBundleResponse.from(instance.flow()), StepResponse.from(instance.step()),
                instance.manualKafkaControl());
    }
}
