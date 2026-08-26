package com.jouney.admin.domain.form;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.EnumSet;
import java.util.Set;

public enum FormFieldType {
    TEXT,
    INPUT,
    SINGLE_SELECT,
    MULTI_SELECT,
    FILE_UPLOAD,
    SECTION,
    // Campos de entrada adicionais (config específica em FormField.config, estilo ConnectorConfig —
    // sem coluna tipada nova por tipo).
    RADIO,
    SWITCH,
    SLIDER,
    RATING,
    STEPPER,
    AUTOCOMPLETE,
    // Conteúdo (só exibição, não coleta valor) — mesmo espírito de TEXT.
    TITLE,
    IMAGE,
    DIVIDER,
    CARD,
    CALLOUT,
    // Ampliação do catálogo com componentes Mística que existem tanto em web quanto em apps
    // nativos/mobile (design system cross-platform) — só-de-apresentação (não coletam valor),
    // mesmo espírito de TEXT/TITLE/IMAGE/CARD/CALLOUT.
    BUTTON,
    AVATAR,
    BADGE,
    TAG,
    METER,
    TABS,
    CAROUSEL,
    TABLE;

    /**
     * Tolerates the pre-refino EP-04 {@code STATIC_CONTENT} value when reading old, already
     * -published snapshots — publications/versions are immutable once written, so legacy JSON
     * must remain readable forever, even after the type was collapsed into TEXT.
     */
    @JsonCreator
    public static FormFieldType fromJson(String value) {
        if ("STATIC_CONTENT".equals(value)) {
            return TEXT;
        }
        return FormFieldType.valueOf(value);
    }

    // Só-de-apresentação — não coletam valor de usuário, então nunca viram {{variavel}} de processo
    // nem podem ser referenciados por um visibleIf de outro campo. Único ponto de verdade — Form,
    // FlowValidator, GenerateFlow e UpdateFlow chamam isto em vez de duplicar a lista de exclusão.
    private static final Set<FormFieldType> NON_COLLECTING =
            EnumSet.of(SECTION, TEXT, FILE_UPLOAD, TITLE, IMAGE, DIVIDER, CARD, CALLOUT,
                    BUTTON, AVATAR, BADGE, TAG, METER, TABS, CAROUSEL, TABLE);

    public boolean collectsValue() {
        return !NON_COLLECTING.contains(this);
    }
}
