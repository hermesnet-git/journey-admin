package com.jouney.admin.domain.flow;

import java.util.List;

public class FlowValidationException extends RuntimeException {

    private final List<String> violations;

    public FlowValidationException(List<String> violations) {
        super("Flow is structurally invalid: " + String.join("; ", violations));
        this.violations = violations;
    }

    public List<String> getViolations() {
        return violations;
    }
}
