package com.jouney.admin.domain.form;

import java.util.List;

public class FormField {

    private final String id;
    private final FormFieldType type;
    private final String label;
    private final boolean required;
    private final String defaultValue;
    private final String helpText;
    private final List<String> options;

    public FormField(String id, FormFieldType type, String label, boolean required, String defaultValue,
                      String helpText, List<String> options) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.required = required;
        this.defaultValue = defaultValue;
        this.helpText = helpText;
        this.options = options;
    }

    public String getId() {
        return id;
    }

    public FormFieldType getType() {
        return type;
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

    public List<String> getOptions() {
        return options;
    }
}
