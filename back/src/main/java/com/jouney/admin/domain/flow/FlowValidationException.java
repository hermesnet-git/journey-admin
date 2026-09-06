package com.jouney.admin.domain.flow;

import java.util.List;

public class FlowValidationException extends RuntimeException {

    private final List<FlowViolation> violations;

    public FlowValidationException(List<FlowViolation> violations) {
        super("Fluxo estruturalmente inválido: "
                + String.join("; ", violations.stream().map(FlowViolation::message).toList()));
        this.violations = violations;
    }

    public List<FlowViolation> getViolations() {
        return violations;
    }
}
