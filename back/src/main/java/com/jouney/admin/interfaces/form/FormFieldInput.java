package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record FormFieldInput(
        @NotBlank String name,
        @NotNull FormFieldType type,
        InputSubtype inputSubtype,
        @NotBlank String label,
        boolean required,
        String defaultValue,
        String helpText,
        List<FormFieldOption> options,
        Double minValue,
        Double maxValue,
        String validationPattern,
        List<String> acceptedExtensions,
        Long maxFileSizeBytes) {

    public FormField toDomain() {
        return new FormField(name, type, inputSubtype, label, required, defaultValue, helpText, options, minValue,
                maxValue, validationPattern, acceptedExtensions, maxFileSizeBytes);
    }
}
