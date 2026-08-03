package com.jouney.admin.domain.form;

import java.util.UUID;

public class FormNotFoundException extends RuntimeException {

    public FormNotFoundException(UUID id) {
        super("Form not found: " + id);
    }
}
