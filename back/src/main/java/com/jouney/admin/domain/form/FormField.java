package com.jouney.admin.domain.form;

import com.jouney.admin.domain.flow.ConnectorConfig;
import java.util.List;
import java.util.Map;

public class FormField {

    private final String name;
    private final FormFieldType type;
    private final InputSubtype inputSubtype;
    private final String label;
    private final boolean required;
    private final String defaultValue;
    private final String helpText;
    private final List<FormFieldOption> options;
    private final Double minValue;
    private final Double maxValue;
    private final String validationPattern;
    private final List<String> acceptedExtensions;
    private final Long maxFileSizeBytes;
    private final Integer columns;
    private final String visibleIf;
    private final ConnectorConfig dataSource;
    private final Map<String, Object> config;
    private final Integer positionX;
    private final Integer positionY;
    private final Integer width;
    private final Integer height;

    public FormField(String name, FormFieldType type, InputSubtype inputSubtype, String label, boolean required,
                      String defaultValue, String helpText, List<FormFieldOption> options, Double minValue,
                      Double maxValue, String validationPattern, List<String> acceptedExtensions,
                      Long maxFileSizeBytes, Integer columns, String visibleIf, ConnectorConfig dataSource,
                      Map<String, Object> config, Integer positionX, Integer positionY, Integer width,
                      Integer height) {
        this.name = name;
        this.type = type;
        this.inputSubtype = inputSubtype;
        this.label = label;
        this.required = required;
        this.defaultValue = defaultValue;
        this.helpText = helpText;
        this.options = options;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.validationPattern = validationPattern;
        this.acceptedExtensions = acceptedExtensions;
        this.maxFileSizeBytes = maxFileSizeBytes;
        this.columns = columns;
        this.visibleIf = visibleIf;
        this.dataSource = dataSource;
        this.config = config;
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = width;
        this.height = height;
    }

    public String getName() {
        return name;
    }

    public FormFieldType getType() {
        return type;
    }

    public InputSubtype getInputSubtype() {
        return inputSubtype;
    }

    public String getLabel() {
        return label;
    }

    public boolean isRequired() {
        return required;
    }

    public String getDefaultValue() {
        return defaultValue;
    }

    public String getHelpText() {
        return helpText;
    }

    public List<FormFieldOption> getOptions() {
        return options;
    }

    public Double getMinValue() {
        return minValue;
    }

    public Double getMaxValue() {
        return maxValue;
    }

    public String getValidationPattern() {
        return validationPattern;
    }

    public List<String> getAcceptedExtensions() {
        return acceptedExtensions;
    }

    public Long getMaxFileSizeBytes() {
        return maxFileSizeBytes;
    }

    /** Só relevante para {@link FormFieldType#SECTION} — número de colunas do grid da seção. */
    public Integer getColumns() {
        return columns;
    }

    /** Expressão {@code {{campo}} OP valor}, mesma sintaxe da condição de saída do Gateway (US-03.11). */
    public String getVisibleIf() {
        return visibleIf;
    }

    /**
     * Só relevante para SINGLE_SELECT/MULTI_SELECT — reaproveita a mesma {@link ConnectorConfig}
     * do conector REST de Service Task (method/url/headers/params/body/credencial), mutuamente
     * exclusiva com {@link #options} estático.
     */
    public ConnectorConfig getDataSource() {
        return dataSource;
    }

    /**
     * Config declarativa livre dos componentes que não têm coluna tipada própria (slider
     * min/max/step, imagem url/alt, callout variant/title/description etc.) — mesmo princípio do
     * {@link ConnectorConfig#getConfig()}: extensível sem migração/DTO novo por tipo de componente.
     */
    public Map<String, Object> getConfig() {
        return config;
    }

    /**
     * Posição livre (x/y) e tamanho (largura/altura) do componente numa tela do canal WEB —
     * {@code null} pra qualquer outro canal, que continua com o layout linear/seções de sempre.
     * {@code height} nulo significa altura automática pelo conteúdo (não fixada).
     */
    public Integer getPositionX() {
        return positionX;
    }

    public Integer getPositionY() {
        return positionY;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }
}
