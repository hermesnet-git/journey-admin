package com.jouney.admin.domain.form;

public class InvalidFormFieldException extends RuntimeException {

    public InvalidFormFieldException(String message) {
        super(message);
    }
}
