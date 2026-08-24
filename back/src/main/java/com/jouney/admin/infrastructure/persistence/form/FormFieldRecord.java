package com.jouney.admin.infrastructure.persistence.form;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import java.util.List;
import java.util.Map;

public record FormFieldRecord(String name, FormFieldType type, InputSubtype inputSubtype, String label,
                               boolean required, String defaultValue, String helpText,
                               List<FormFieldOption> options, Double minValue, Double maxValue,
                               String validationPattern, List<String> acceptedExtensions, Long maxFileSizeBytes,
                               Integer columns, String visibleIf, DataSourceRecord dataSource,
                               Map<String, Object> config) {

    // Mesmo par from/toDomain que ConnectorConfigRecord já usa — reaproveitado por quem precisa
    // serializar List<FormField> fora do Form do catálogo (ex.: FlowNode.embeddedScreen).
    public static FormFieldRecord from(FormField f) {
        return new FormFieldRecord(f.getName(), f.getType(), f.getInputSubtype(), f.getLabel(), f.isRequired(),
                f.getDefaultValue(), f.getHelpText(), f.getOptions(), f.getMinValue(), f.getMaxValue(),
                f.getValidationPattern(), f.getAcceptedExtensions(), f.getMaxFileSizeBytes(), f.getColumns(),
                f.getVisibleIf(), DataSourceRecord.from(f.getDataSource()), f.getConfig());
    }

    public FormField toDomain() {
        return new FormField(name, type, inputSubtype, label, required, defaultValue, helpText, options, minValue,
                maxValue, validationPattern, acceptedExtensions, maxFileSizeBytes, columns, visibleIf,
                dataSource != null ? dataSource.toDomain() : null, config);
    }

    // Mesmo formato do FlowNodeRecord.ConnectorConfigRecord — dataSource reaproveita o
    // ConnectorConfig do domínio, sempre REST (sem coluna connectorType: formulário só chama REST).
    public record DataSourceRecord(Map<String, Object> config, String credentialRef) {

        public static DataSourceRecord from(ConnectorConfig dataSource) {
            return dataSource == null ? null : new DataSourceRecord(dataSource.getConfig(), dataSource.getCredentialRef());
        }

        public ConnectorConfig toDomain() {
            return new ConnectorConfig(ConnectorType.REST, config, credentialRef);
        }
    }
}
