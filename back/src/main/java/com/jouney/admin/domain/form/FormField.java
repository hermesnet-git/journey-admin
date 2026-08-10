package com.jouney.admin.domain.form;

import java.util.List;

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

    public FormField(String name, FormFieldType type, InputSubtype inputSubtype, String label, boolean required,
                      String defaultValue, String helpText, List<FormFieldOption> options, Double minValue,
                      Double maxValue, String validationPattern, List<String> acceptedExtensions,
                      Long maxFileSizeBytes) {
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
}
