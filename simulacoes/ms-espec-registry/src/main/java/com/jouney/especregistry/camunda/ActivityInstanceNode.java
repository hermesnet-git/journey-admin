package com.jouney.especregistry.camunda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ActivityInstanceNode(String id, String activityId, String activityType, String activityName,
                                    List<ActivityInstanceNode> childActivityInstances) {
}
