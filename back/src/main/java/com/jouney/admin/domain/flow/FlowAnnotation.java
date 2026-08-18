package com.jouney.admin.domain.flow;

import java.util.List;

/** A free-floating note on the designer canvas — never reaches FlowValidator, the publication
 * snapshot's BPMN transform, or Camunda; purely a design-time aid, kept in its own field on
 * {@link Flow} rather than mixed into {@code nodes} so it stays structurally invisible to execution.
 * {@code linkedNodeIds} is the (possibly empty) set of {@link FlowNode} ids it's tied to, drawn as a
 * faint dashed line in the designer. */
public class FlowAnnotation {

    private final String id;
    private final String text;
    private final int positionX;
    private final int positionY;
    private final List<String> linkedNodeIds;

    public FlowAnnotation(String id, String text, int positionX, int positionY, List<String> linkedNodeIds) {
        this.id = id;
        this.text = text;
        this.positionX = positionX;
        this.positionY = positionY;
        this.linkedNodeIds = linkedNodeIds;
    }

    public String getId() {
        return id;
    }

    public String getText() {
        return text;
    }

    public int getPositionX() {
        return positionX;
    }

    public int getPositionY() {
        return positionY;
    }

    public List<String> getLinkedNodeIds() {
        return linkedNodeIds;
    }
}
