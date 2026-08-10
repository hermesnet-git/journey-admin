package com.jouney.admin.domain.form;

public class DuplicateFieldNameException extends RuntimeException {

    public DuplicateFieldNameException(String name) {
        super("Duplicate form field name: " + name);
    }
}
