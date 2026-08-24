package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

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
        Long maxFileSizeBytes,
        Integer columns,
        String visibleIf,
        DataSourceInput dataSource,
        Map<String, Object> config) {

    public FormField toDomain() {
        return new FormField(name, type, inputSubtype, label, required, defaultValue, helpText, options, minValue,
                maxValue, validationPattern, acceptedExtensions, maxFileSizeBytes, columns, visibleIf,
                dataSource == null ? null : dataSource.toDomain(), config);
    }

    // Sempre REST (forms não têm o conceito de outros tipos de conector) — mesmo shape do
    // ConnectorConfigInput do flow (method/url/headers/params/body dentro de config).
    public record DataSourceInput(Map<String, Object> config, String credentialRef) {

        public ConnectorConfig toDomain() {
            return new ConnectorConfig(ConnectorType.REST, config, credentialRef);
        }
    }
}
