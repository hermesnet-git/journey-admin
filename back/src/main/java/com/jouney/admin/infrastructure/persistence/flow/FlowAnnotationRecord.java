package com.jouney.admin.infrastructure.persistence.flow;

import com.jouney.admin.domain.flow.FlowAnnotation;
import java.util.List;

public record FlowAnnotationRecord(String id, String text, int positionX, int positionY, List<String> linkedNodeIds) {

    public static FlowAnnotationRecord from(FlowAnnotation annotation) {
        return new FlowAnnotationRecord(annotation.getId(), annotation.getText(), annotation.getPositionX(),
                annotation.getPositionY(), annotation.getLinkedNodeIds());
    }

    public FlowAnnotation toDomain() {
        return new FlowAnnotation(id, text, positionX, positionY, linkedNodeIds != null ? linkedNodeIds : List.of());
    }
}
