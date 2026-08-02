package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.FlowNodeType;
import java.util.UUID;

public record FlowNodeRecord(String id, FlowNodeType type, String name, String description, int positionX,
                              int positionY, UUID formId) {
}
