package com.jouney.especregistry.sdui;

import java.util.List;

public class SduiActionValidationException extends RuntimeException {

    private final List<String> violations;

    public SduiActionValidationException(List<String> violations) {
        super("Tela SDUI referencia ação(ões) fora do Action Registry: " + violations);
        this.violations = violations;
    }

    public List<String> violations() {
        return violations;
    }
}
