package com.jouney.admin.interfaces.execution;

import com.jouney.admin.domain.execution.ResumedExecution;
import java.util.UUID;

public record ResumeInstanceResponse(UUID journeyId, String journeyName, String channel, InstanceResponse instance) {

    public static ResumeInstanceResponse from(ResumedExecution resumed) {
        return new ResumeInstanceResponse(resumed.journeyId(), resumed.journeyName(), resumed.channel(),
                InstanceResponse.from(resumed.instance()));
    }
}
