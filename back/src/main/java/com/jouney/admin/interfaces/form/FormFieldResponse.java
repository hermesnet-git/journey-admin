package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldType;
import java.util.List;

public record FormFieldResponse(String id, FormFieldType type, String label, boolean required, String defaultValue,
                                 String helpText, List<String> options) {

    public static FormFieldResponse from(FormField field) {
        return new FormFieldResponse(field.getId(), field.getType(), field.getLabel(), field.isRequired(),
                field.getDefaultValue(), field.getHelpText(), field.getOptions());
    }
}
