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
    VALIDATION_LIST,
    // Texto de item de lista (ui.selectList): aceita {{item.campo}} além de form/data — o prefixo
    // item só vale em propriedade deste tipo.
    ITEM_TEMPLATE,
    // Ações sobre o item selecionado (ui.selectList): [{id, label, variant, enabledWhen}].
    ACTION_LIST
}
