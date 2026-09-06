package com.jouney.especregistry.simulation;

import com.jouney.especregistry.sdui.SduiBinding;
import com.jouney.especregistry.sdui.SduiNode;
import java.util.ArrayList;
import java.util.List;

/** Lê os campos de entrada de uma árvore SDUI objeto pelo binding `value` — o nome técnico é a
 * parte final do path (`form.<nome>`, mesma convenção de FlowValidator.java no admin/back), não
 * mais um `props.name` posicional da tupla antiga. */
public final class SduiForm {

    private SduiForm() {
    }

    public record FieldSpec(String name, String type, String inputMode) {
    }

    public static List<FieldSpec> fields(SduiNode root) {
        List<FieldSpec> result = new ArrayList<>();
        collect(root, result);
        return result;
    }

    private static void collect(SduiNode node, List<FieldSpec> acc) {
        SduiBinding valueBinding = node.bindings() != null ? node.bindings().get("value") : null;
        if (valueBinding != null && valueBinding.path() != null && valueBinding.path().startsWith("form.")) {
            String name = valueBinding.path().substring("form.".length());
            String inputMode = node.props() != null && node.props().get("inputMode") instanceof String s ? s : null;
            acc.add(new FieldSpec(name, node.type(), inputMode));
        }
        if (node.children() != null) {
            node.children().forEach(child -> collect(child, acc));
        }
    }
}
