package com.jouney.especregistry.domain.sdui;

import com.jouney.especregistry.domain.engine.EngineVariable;
import java.util.Map;

/**
 * Resolve um path de binding ({@code namespace.resto}, seção 8 do catálogo) contra as variáveis de
 * processo do Camunda. Só existem dois namespaces: {@code form} (valores editáveis da jornada) e
 * {@code data} (dados somente leitura); qualquer outro não resolve.
 *
 * Convenção deste projeto (variáveis de processo são flat, sem objeto aninhado): TUDO depois do
 * primeiro ponto é o nome da variável, mesmo que contenha outro ponto — não há resolução de
 * caminho aninhado tipo {@code data.customer.name}, mesma simplificação já assumida em
 * FlowValidator.java (admin/back).
 *
 * `form` e `data` deixaram de compartilhar a mesma variável crua do motor: a variável real do
 * Camunda carrega o namespace no próprio nome ({@code form_nome}, {@code data_pedido} — underscore,
 * não ponto, porque a condição de Gateway vira uma expressão JUEL literal (BpmnTransformer.
 * resolveCondition) e JUEL interpreta ponto como acesso a propriedade). O canal é a única exceção:
 * é simplesmente {@code channel}, sem namespace nem prefixo, na tela e no motor — injetado por
 * StartExecution/ms-journey antes de qualquer conversão, nunca passa por esta convenção.
 */
public final class BindingResolver {

    /** Variável do motor que carrega o canal da execução, sem o prefixo de namespace. */
    public static final String CHANNEL_VARIABLE = "channel";

    private BindingResolver() {
    }

    public static Object resolve(String path, Map<String, EngineVariable> processVariables) {
        String name = engineVariableName(path);
        if (name == null) {
            return null;
        }
        EngineVariable variable = processVariables.get(name);
        return variable != null ? variable.value() : null;
    }

    /** Nome real, no motor, da variável que um caminho de tela ({@code form.nome}, {@code data.pedido})
     * referencia, ou {@code null} quando o caminho não é de um dos dois namespaces. */
    public static String engineVariableName(String path) {
        if (path == null) {
            return null;
        }
        if (CHANNEL_VARIABLE.equals(path)) {
            return CHANNEL_VARIABLE;
        }
        int dot = path.indexOf('.');
        if (dot < 0) {
            return null;
        }
        String namespace = path.substring(0, dot);
        String rest = path.substring(dot + 1);
        if (rest.isBlank() || (!"form".equals(namespace) && !"data".equals(namespace))) {
            return null;
        }
        return namespace + "_" + rest;
    }

    /** Nome real, no motor, da variável que um placeholder de texto ({@code {{form.nome}}} ou
     * {@code {{form_nome}}}) referencia, ou {@code null} quando o token não é de nenhuma das duas formas. */
    public static String engineVariableNameOfPlaceholder(String token) {
        if (token == null) {
            return null;
        }
        if (CHANNEL_VARIABLE.equals(token)) {
            return CHANNEL_VARIABLE;
        }
        if (token.indexOf('.') >= 0) {
            return engineVariableName(token);
        }
        boolean engineForm = (token.startsWith("form_") || token.startsWith("data_")) && token.length() > "form_".length();
        return engineForm ? token : null;
    }
}
