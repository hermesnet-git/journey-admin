package com.jouney.admin.infrastructure.ai.spec;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

/**
 * Descrição compacta de uma jornada, o que o modelo de IA escreve: só o "o quê" (etapas, campos de
 * cada tela, decisões, integrações e as ligações pelo nome). Ids, posições, árvore de componentes e a
 * grafia das variáveis ficam por conta do {@link JourneySpecCompiler}. Referências a dados vão como
 * {@code [[field:cpf]]} (campo de uma tela), {@code [[data:pedidoId]]} (dado de uma integração ou
 * entrada da jornada) e {@code [[channel]]}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JourneySpec(String name, List<VariableSpec> inputs, StartMessageSpec startMessage,
                          List<StepSpec> steps, List<SectionSpec> sections, List<NoteSpec> notes) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VariableSpec(String name, String type) {
    }

    /** Jornada iniciada por mensagem recebida (Início por Mensagem) em vez de pelo canal. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StartMessageSpec(String system, List<OutputSpec> outputs) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OutputSpec(String name, String path, String type) {
    }

    /**
     * Uma etapa. {@code kind}: SCREEN, INTEGRATION, PUBLISH_MESSAGE, WAIT_MESSAGE, DECISION ou END.
     * A primeira etapa da lista é a que vem logo depois do início.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StepSpec(String key, String kind, String name, String description, ScreenSpec screen,
                           RequestSpec request, MessageSpec message, String next, String onFailure,
                           List<BranchSpec> branches, String otherwise) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ScreenSpec(String title, List<BlockSpec> blocks) {
    }

    /**
     * Bloco de uma tela. {@code kind}: TEXT, ALERT, DIVIDER, INPUT, TEXTAREA, DATE, SELECT, CHECKBOX,
     * CARD, BUTTON ou QUESTION; cada um usa só os campos que fazem sentido para ele. QUESTION é a forma
     * simples de perguntar: o enunciado em {@code label}, o tipo de resposta em {@code answer} (CHOICE,
     * SCALE_5, SCALE_10, YES_NO, SHORT_TEXT, LONG_TEXT, DATE ou CHECK) e, em CHOICE, as escolhas em
     * {@code choices}; o normalizador monta o campo, os valores e as escalas.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BlockSpec(String kind, String text, String style, String field, String label, String placeholder,
                            String inputType, Boolean required, List<OptionSpec> options, String optionsFrom,
                            String severity, String title, String message, ChoiceSpec choice, String variant,
                            List<BlockSpec> blocks, String answer, List<String> choices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OptionSpec(String label, String value) {
    }

    /** Botão que, ao ser acionado, grava {@code value} no campo {@code field} antes de seguir. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChoiceSpec(String field, String value) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RequestSpec(String method, String url, Map<String, String> headers, Map<String, Object> body,
                              List<PairSpec> bodyFields, List<OutputSpec> outputs, Integer readTimeoutMs, Integer retries,
                              Boolean background) {
    }

    /** Par nome/valor do corpo de uma chamada ou do payload de uma mensagem: um objeto sem propriedades
     * declaradas sai sempre vazio nos esquemas de ferramenta dos modelos, então o corpo é uma lista de pares. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PairSpec(String name, String value) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MessageSpec(String system, Map<String, Object> payload, List<PairSpec> payloadFields,
                              List<OutputSpec> outputs, Long waitTimeoutSeconds) {
    }

    /** Um caminho de uma Decisão: vale quando {@code ref op value} (ou {@code valueRef}) for verdadeiro. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BranchSpec(String ref, String op, String value, String valueType, String valueRef, String label,
                             String to) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SectionSpec(String name, List<String> steps) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NoteSpec(String text, List<String> steps) {
    }
}
