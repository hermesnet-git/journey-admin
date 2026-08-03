package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record FormFieldInput(
        @NotBlank String id,
        @NotNull FormFieldType type,
        @NotBlank String label,
        boolean required,
        String defaultValue,
        String helpText,
        List<String> options) {

    public FormField toDomain() {
        return new FormField(id, type, label, required, defaultValue, helpText, options);
    }
}
