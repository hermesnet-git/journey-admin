package com.jouney.especregistry.simulation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Lê o tipo de cada campo diretamente da árvore SDUI ([tag, props, children]) do formulário —
 * a mesma árvore que o simulador renderiza, sem precisar buscar o FormField "cru" separado. */
public final class SduiForm {

    private SduiForm() {
    }

    public record FieldSpec(String name, String tag, String inputType) {
    }

    public static List<FieldSpec> fields(List<Object> sdui) {
        if (sdui == null || sdui.size() < 3 || !(sdui.get(2) instanceof List<?> children)) {
            return List.of();
        }
        List<FieldSpec> result = new ArrayList<>();
        for (Object child : children) {
            if (!(child instanceof List<?> node) || node.size() < 2 || !(node.get(1) instanceof Map<?, ?> props)) {
                continue;
            }
            Object name = props.get("name");
            if (name == null) {
                continue; // ui.text é só informativo, não tem "name"
            }
            String inputType = props.get("type") instanceof String s ? s : null;
            result.add(new FieldSpec(String.valueOf(name), String.valueOf(node.get(0)), inputType));
        }
        return result;
    }
}
