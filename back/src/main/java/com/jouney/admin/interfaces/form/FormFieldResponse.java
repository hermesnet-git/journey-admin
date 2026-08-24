package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import java.util.List;
import java.util.Map;

public record FormFieldResponse(String name, FormFieldType type, InputSubtype inputSubtype, String label,
                                 boolean required, String defaultValue, String helpText,
                                 List<FormFieldOption> options, Double minValue, Double maxValue,
                                 String validationPattern, List<String> acceptedExtensions, Long maxFileSizeBytes,
                                 Integer columns, String visibleIf, DataSourceResponse dataSource,
                                 Map<String, Object> config) {

    public static FormFieldResponse from(FormField field) {
        return new FormFieldResponse(field.getName(), field.getType(), field.getInputSubtype(), field.getLabel(),
                field.isRequired(), field.getDefaultValue(), field.getHelpText(), field.getOptions(),
                field.getMinValue(), field.getMaxValue(), field.getValidationPattern(),
                field.getAcceptedExtensions(), field.getMaxFileSizeBytes(), field.getColumns(), field.getVisibleIf(),
                field.getDataSource() == null ? null : DataSourceResponse.from(field.getDataSource()),
                field.getConfig());
    }

    public record DataSourceResponse(Map<String, Object> config, String credentialRef) {

        public static DataSourceResponse from(ConnectorConfig dataSource) {
            return new DataSourceResponse(dataSource.getConfig(), dataSource.getCredentialRef());
        }
    }
}
