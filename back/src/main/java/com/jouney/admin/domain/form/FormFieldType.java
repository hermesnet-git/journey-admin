package com.jouney.admin.domain.form;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum FormFieldType {
    TEXT,
    INPUT,
    SINGLE_SELECT,
    MULTI_SELECT,
    FILE_UPLOAD;

    /**
     * Tolerates the pre-refino EP-04 {@code STATIC_CONTENT} value when reading old, already
     * -published snapshots — publications/versions are immutable once written, so legacy JSON
     * must remain readable forever, even after the type was collapsed into TEXT.
     */
    @JsonCreator
    public static FormFieldType fromJson(String value) {
        if ("STATIC_CONTENT".equals(value)) {
            return TEXT;
        }
        return FormFieldType.valueOf(value);
    }
}
