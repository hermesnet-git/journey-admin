package com.jouney.admin.domain.form;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Projects a {@link Form} into a hyperscript-style SDUI tree: {@code [tag, props, children]},
 * consumed by external React/Flutter rendering tools. This is a read-only projection generated
 * at publication time (REQ-04.06.002) — the field model (not this tree) remains the editable
 * source of truth in the form builder.
 */
public final class FormSduiSerializer {

    private FormSduiSerializer() {
    }

    public static List<Object> serialize(Form form) {
        List<Object> children = new ArrayList<>();
        for (FormField field : form.getFields()) {
            children.add(serializeField(field));
        }
        return node("ui.form", Map.of(), children);
    }

    private static List<Object> serializeField(FormField field) {
        return switch (field.getType()) {
            case TEXT -> node("ui.text", textProps(field), List.of());
            case INPUT -> node("ui.input", inputProps(field), List.of());
            case SINGLE_SELECT -> node("ui.select", selectProps(field), List.of());
            case MULTI_SELECT -> node("ui.multiselect", selectProps(field), List.of());
            case FILE_UPLOAD -> node("ui.upload", uploadProps(field), List.of());
        };
    }

    private static Map<String, Object> textProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("text", field.getLabel());
        if (field.getHelpText() != null) {
            props.put("helpText", field.getHelpText());
        }
        return props;
    }

    private static Map<String, Object> inputProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("name", field.getName());
        props.put("type", (field.getInputSubtype() != null ? field.getInputSubtype() : InputSubtype.TEXT)
                .name().toLowerCase());
        props.put("label", field.getLabel());
        props.put("required", field.isRequired());
        props.put("defaultValue", field.getDefaultValue());
        if (field.getMinValue() != null) {
            props.put("min", field.getMinValue());
        }
        if (field.getMaxValue() != null) {
            props.put("max", field.getMaxValue());
        }
        if (field.getValidationPattern() != null) {
            props.put("pattern", field.getValidationPattern());
        }
        return props;
    }

    private static Map<String, Object> selectProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("name", field.getName());
        props.put("label", field.getLabel());
        props.put("required", field.isRequired());
        props.put("options", field.getOptions() != null ? field.getOptions() : List.of());
        return props;
    }

    private static Map<String, Object> uploadProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("name", field.getName());
        props.put("label", field.getLabel());
        props.put("required", field.isRequired());
        if (field.getAcceptedExtensions() != null) {
            props.put("acceptedExtensions", field.getAcceptedExtensions());
        }
        if (field.getMaxFileSizeBytes() != null) {
            props.put("maxFileSizeBytes", field.getMaxFileSizeBytes());
        }
        return props;
    }

    private static List<Object> node(String tag, Map<String, Object> props, List<Object> children) {
        List<Object> node = new ArrayList<>(3);
        node.add(tag);
        node.add(props);
        node.add(children);
        return node;
    }
}
