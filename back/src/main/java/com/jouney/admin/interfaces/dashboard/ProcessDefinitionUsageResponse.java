package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.domain.dashboard.ProcessDefinitionUsage;

public record ProcessDefinitionUsageResponse(String definitionId, String key, String name, int version,
                                              int instances, int incidents, int failedJobs) {

    static ProcessDefinitionUsageResponse from(ProcessDefinitionUsage u) {
        return new ProcessDefinitionUsageResponse(u.definitionId(), u.key(), u.name(), u.version(), u.instances(),
                u.incidents(), u.failedJobs());
    }
}
