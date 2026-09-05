package com.jouney.admin.domain.form;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.ConnectorConfig;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Projects a list of {@link FormField} (a User Task's embedded screen) into a hyperscript-style
 * SDUI tree: {@code [tag, props, children]}, consumed by external React/Flutter rendering tools.
 * This is a read-only projection generated at publication time (REQ-04.06.002) — the field model
 * (not this tree) remains the editable source of truth in the screen editor.
 */
public final class FormSduiSerializer {

    private FormSduiSerializer() {
    }

    // WEB tem uma árvore bem diferente (lista achatada com posição livre, sem aninhar por SECTION)
    // — os demais canais seguem exatamente o layout linear/seções de sempre.
    public static List<Object> serialize(List<FormField> fields, ChannelType channelType) {
        if (channelType == ChannelType.WEB) {
            return serializeWeb(fields);
        }
        List<Object> topLevel = new ArrayList<>();
        List<Object> currentSectionChildren = null;
        for (FormField field : fields) {
            if (field.getType() == FormFieldType.SECTION) {
                currentSectionChildren = new ArrayList<>();
                topLevel.add(node("ui.section", sectionProps(field), currentSectionChildren));
                continue;
            }
            List<Object> fieldNode = serializeField(field);
            (currentSectionChildren != null ? currentSectionChildren : topLevel).add(fieldNode);
        }
        return node("ui.form", Map.of(), topLevel);
    }

    // SECTION não existe mais na paleta de telas WEB (o agrupamento em grid de colunas não faz
    // sentido com posição livre) — se ainda restar um marcador de uma tela criada antes desta
    // mudança, é só ignorado aqui, sem quebrar a serialização.
    private static List<Object> serializeWeb(List<FormField> fields) {
        List<Object> topLevel = new ArrayList<>();
        int index = 0;
        for (FormField field : fields) {
            if (field.getType() == FormFieldType.SECTION) {
                continue;
            }
            List<Object> fieldNode = serializeField(field);
            withPosition(fieldNode, field, index);
            topLevel.add(fieldNode);
            index++;
        }
        return node("ui.form", Map.of(), topLevel);
    }

    // Cascata de fallback determinística pra campos sem posição salva (telas WEB desenhadas antes
    // desta mudança) — MESMA fórmula usada no front (formScreenModel.ts/FALLBACK_ROW_HEIGHT), pra
    // o editor e a execução real nunca divergirem em como posicionam um campo legado. 96, não 72:
    // o preview do editor desenha a pergunta completa acima do campo (igual a execução real), então
    // precisa da mesma folga vertical extra.
    private static final int FALLBACK_ROW_HEIGHT = 96;

    @SuppressWarnings("unchecked")
    private static void withPosition(List<Object> fieldNode, FormField field, int index) {
        Map<String, Object> props = (Map<String, Object>) fieldNode.get(1);
        props.put("x", field.getPositionX() != null ? field.getPositionX() : 40);
        props.put("y", field.getPositionY() != null ? field.getPositionY() : 40 + index * FALLBACK_ROW_HEIGHT);
        props.put("width", field.getWidth() != null ? field.getWidth() : 320);
        // height nulo = automática pelo conteúdo (não fixada) — só entra na árvore quando o usuário
        // redimensionou explicitamente.
        if (field.getHeight() != null) {
            props.put("height", field.getHeight());
        }
    }

    private static Map<String, Object> sectionProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("label", field.getLabel());
        props.put("columns", field.getColumns() != null ? field.getColumns() : 1);
        if (field.getVisibleIf() != null) {
            props.put("visibleIf", field.getVisibleIf());
        }
        return props;
    }

    private static List<Object> serializeField(FormField field) {
        // As tags dos 5 tipos originais (ui.select, ui.multiselect, ui.upload) já são consumidas por
        // fora (SduiFormRenderer.tsx, ms-espec-registry) — mantidas literais, não geradas por
        // convenção, pra não arriscar mudar um contrato já publicado sem querer.
        String tag = switch (field.getType()) {
            case TEXT -> "ui.text";
            case INPUT -> "ui.input";
            case SINGLE_SELECT -> "ui.select";
            case MULTI_SELECT -> "ui.multiselect";
            case FILE_UPLOAD -> "ui.upload";
            case RADIO -> "ui.radio";
            case SWITCH -> "ui.switch";
            case SLIDER -> "ui.slider";
            case RATING -> "ui.rating";
            case STEPPER -> "ui.stepper";
            case AUTOCOMPLETE -> "ui.autocomplete";
            case TITLE -> "ui.title";
            case IMAGE -> "ui.image";
            case DIVIDER -> "ui.divider";
            case CARD -> "ui.card";
            case CALLOUT -> "ui.callout";
            case BUTTON -> "ui.button";
            case AVATAR -> "ui.avatar";
            case BADGE -> "ui.badge";
            case TAG -> "ui.tag";
            case METER -> "ui.meter";
            case TABS -> "ui.tabs";
            case CAROUSEL -> "ui.carousel";
            case TABLE -> "ui.table";
            case SECTION -> throw new IllegalStateException("SECTION is handled by serialize(), not serializeField()");
        };
        Map<String, Object> props = switch (field.getType()) {
            case TEXT -> textProps(field);
            case INPUT -> inputProps(field);
            case SINGLE_SELECT, MULTI_SELECT, RADIO, AUTOCOMPLETE -> selectProps(field);
            case FILE_UPLOAD -> uploadProps(field);
            case DIVIDER -> withConfig(new LinkedHashMap<>(), field);
            case TITLE, IMAGE, CARD, CALLOUT, BUTTON, AVATAR, BADGE, TAG, METER, TABS, CAROUSEL, TABLE ->
                    contentProps(field);
            case SWITCH -> nameProps(field);
            case SLIDER, RATING, STEPPER -> withConfig(nameProps(field), field);
            case SECTION -> throw new IllegalStateException("SECTION is handled by serialize(), not serializeField()");
        };
        if (field.getVisibleIf() != null) {
            props.put("visibleIf", field.getVisibleIf());
        }
        return node(tag, props, List.of());
    }

    // name/label/required — a base comum aos campos de entrada mais simples (sem opções nem
    // config extra), reaproveitada por SWITCH e como ponto de partida de SLIDER/RATING/STEPPER.
    private static Map<String, Object> nameProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("name", field.getName());
        props.put("label", field.getLabel());
        props.put("required", field.isRequired());
        return props;
    }

    // TITLE/IMAGE/CARD/CALLOUT são só-de-apresentação (não coletam valor, sem "name") — o rótulo
    // vira o texto padrão, e a config específica de cada um (variant, url, etc.) vem de field.config.
    private static Map<String, Object> contentProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("label", field.getLabel());
        return withConfig(props, field);
    }

    // Repassa a config declarativa do componente tal como o form builder a montou — o backend não
    // conhece o shape interno de cada tipo (min/max/step do slider, variant/title/description do
    // callout etc.), mesmo princípio já usado pro config do dataSource/ConnectorConfig.
    private static Map<String, Object> withConfig(Map<String, Object> props, FormField field) {
        if (field.getConfig() != null) {
            props.putAll(field.getConfig());
        }
        return props;
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
        // labelPosition/maxLength/repeatable (campos "avançados" do form builder) vivem em
        // field.config, mesmo princípio de withConfig — sem coluna tipada nova só pra isso.
        return withConfig(props, field);
    }

    private static Map<String, Object> selectProps(FormField field) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("name", field.getName());
        props.put("label", field.getLabel());
        props.put("required", field.isRequired());
        if (field.getDataSource() != null) {
            props.put("dataSource", dataSourceProps(field.getDataSource()));
        } else {
            props.put("options", field.getOptions() != null ? field.getOptions() : List.of());
        }
        return props;
    }

    // Config declarativa repassada tal como está (method/url/headers/params/body + as convenções
    // de extração de opções/paginação) — o canal/serviço que resolve isso em tempo de execução é
    // quem interpreta essas chaves, igual o outputMapping do conector REST já é só repassado hoje.
    private static Map<String, Object> dataSourceProps(ConnectorConfig dataSource) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("config", dataSource.getConfig());
        props.put("credentialRef", dataSource.getCredentialRef());
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
