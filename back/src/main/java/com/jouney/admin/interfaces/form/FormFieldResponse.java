package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import java.util.List;

public record FormFieldResponse(String name, FormFieldType type, InputSubtype inputSubtype, String label,
                                 boolean required, String defaultValue, String helpText,
                                 List<FormFieldOption> options, Double minValue, Double maxValue,
                                 String validationPattern, List<String> acceptedExtensions, Long maxFileSizeBytes) {

    public static FormFieldResponse from(FormField field) {
        return new FormFieldResponse(field.getName(), field.getType(), field.getInputSubtype(), field.getLabel(),
                field.isRequired(), field.getDefaultValue(), field.getHelpText(), field.getOptions(),
                field.getMinValue(), field.getMaxValue(), field.getValidationPattern(),
                field.getAcceptedExtensions(), field.getMaxFileSizeBytes());
    }
}
