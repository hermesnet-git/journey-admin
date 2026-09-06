package com.jouney.admin.domain.componentregistry;

/** Tipo de valor de uma propriedade do componente (seção 7 do catálogo) — o suficiente pro Form
 * Builder montar o painel de propriedades certo (texto, número, toggle, combo, token semântico,
 * lista de opções ou lista de regras de validação), sem um motor de JSON Schema genérico. */
public enum PropKind {
    TEXT,
    NUMBER,
    BOOLEAN,
    ENUM,
    TOKEN,
    OPTIONS_LIST,
    VALIDATION_LIST
}
