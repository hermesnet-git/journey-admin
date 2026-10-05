package com.jouney.admin.infrastructure.ai.spec;

import com.jouney.admin.infrastructure.ai.spec.JourneySpec.BlockSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.BranchSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.OptionSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.RequestSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.ScreenSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.SectionSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.StepSpec;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Preenche o que dá para inferir da descrição escrita pelo modelo, antes de ela ser conferida: modelos
 * leves esquecem um identificador ou uma ligação óbvia, e recusar a descrição inteira por isso só gera
 * tentativas a mais (e, na correção, mais erros). O que continua sendo erro é o que não tem uma leitura
 * segura, como um caminho que aponta para uma etapa que não existe.
 *
 * <ul>
 *   <li>etapa sem {@code key} ganha uma; sem {@code next}, segue para a etapa seguinte da lista, e a
 *       última etapa leva a um END acrescentado aqui;</li>
 *   <li>campo sem {@code field} ganha um nome tirado do enunciado, único na tela;</li>
 *   <li>o bloco {@code QUESTION} vira o campo certo (lista de seleção, texto, data...), com os valores das
 *       opções e as escalas montados aqui;</li>
 *   <li>citações de seções e notas a etapas que não existem são descartadas.</li>
 * </ul>
 */
final class JourneySpecNormalizer {

    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Pattern IDENT = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
    private static final Pattern DIGITS = Pattern.compile("^\\d+$");
    private static final int MAX_NAME_WORDS = 4;

    private JourneySpecNormalizer() {
    }

    static JourneySpec normalize(JourneySpec spec) {
        if (spec == null || spec.steps() == null || spec.steps().isEmpty()) {
            return spec;
        }
        List<StepSpec> source = withoutEmptyDuplicates(spec.steps().stream().filter(s -> s != null).toList());
        Set<String> keys = new HashSet<>();
        for (StepSpec step : source) {
            if (step.key() != null && !step.key().isBlank()) {
                keys.add(step.key());
            }
        }

        List<StepSpec> steps = new ArrayList<>();
        for (int i = 0; i < source.size(); i++) {
            StepSpec step = source.get(i);
            String key = step.key() != null && !step.key().isBlank() ? step.key() : uniqueKey("etapa" + (i + 1), keys);
            String kind = upper(step.kind());
            String following = i + 1 < source.size() ? keyOf(source.get(i + 1), i + 1, keys) : null;
            steps.add(normalizeStep(step, key, kind, following));
        }

        StepSpec last = steps.get(steps.size() - 1);
        boolean needsEnd = !"END".equals(last.kind()) && !"DECISION".equals(last.kind()) && blank(last.next());
        if (needsEnd) {
            String endKey = uniqueKey("fim", allKeys(steps));
            steps.set(steps.size() - 1, withNext(last, endKey));
            steps.add(new StepSpec(endKey, "END", "Fim", null, null, null, null, null, null, null, null));
        }

        Set<String> finalKeys = allKeys(steps);
        List<SectionSpec> sections = new ArrayList<>();
        Set<String> sectioned = new HashSet<>();
        if (spec.sections() != null) {
            for (SectionSpec section : spec.sections()) {
                List<String> members = new ArrayList<>();
                for (String key : section.steps() == null ? List.<String>of() : section.steps()) {
                    if (finalKeys.contains(key) && sectioned.add(key)) {
                        members.add(key);
                    }
                }
                if (!members.isEmpty()) {
                    sections.add(new SectionSpec(blank(section.name()) ? "Seção" : section.name(), members));
                }
            }
        }
        List<JourneySpec.NoteSpec> notes = new ArrayList<>();
        if (spec.notes() != null) {
            for (JourneySpec.NoteSpec note : spec.notes()) {
                if (blank(note.text())) {
                    continue;
                }
                notes.add(new JourneySpec.NoteSpec(note.text(),
                        (note.steps() == null ? List.<String>of() : note.steps()).stream().filter(finalKeys::contains).toList()));
            }
        }
        Set<String> screenFields = new HashSet<>();
        for (StepSpec step : steps) {
            if (step.screen() != null) {
                collectFields(step.screen().blocks(), screenFields);
            }
        }
        List<JourneySpec.VariableSpec> inputs = spec.inputs() == null ? null : spec.inputs().stream()
                .filter(i -> i != null && !screenFields.contains(i.name())).toList();
        steps = resolveCitedFields(steps, screenFields);
        JourneySpec.StartMessageSpec startMessage = spec.startMessage() == null || blank(spec.startMessage().system())
                ? null : spec.startMessage();
        return new JourneySpec(blank(spec.name()) ? "Nova jornada" : spec.name().trim(), inputs, startMessage,
                steps, sections, notes);
    }

    /** Modelos leves às vezes mandam a mesma key duas vezes, uma delas vazia (só nome e otherwise): fica a que tem conteúdo. */
    private static List<StepSpec> withoutEmptyDuplicates(List<StepSpec> steps) {
        Set<String> keysWithContent = new HashSet<>();
        for (StepSpec step : steps) {
            if (!blank(step.key()) && hasContent(step)) {
                keysWithContent.add(step.key());
            }
        }
        List<StepSpec> kept = new ArrayList<>();
        for (StepSpec step : steps) {
            String key = step.key();
            boolean duplicateOfFull = !blank(key) && keysWithContent.contains(key) && !hasContent(step);
            if (duplicateOfFull) {
                continue;
            }
            kept.add(step);
        }
        return kept;
    }

    private static boolean hasContent(StepSpec step) {
        String kind = upper(step.kind());
        if ("DECISION".equals(kind)) {
            return step.branches() != null && !step.branches().isEmpty();
        }
        if ("SCREEN".equals(kind)) {
            return step.screen() != null && step.screen().blocks() != null && !step.screen().blocks().isEmpty();
        }
        if ("INTEGRATION".equals(kind)) {
            return step.request() != null;
        }
        return true;
    }

    // ---------------------------------------------------------------- campos citados que não existem

    private static final Pattern FIELD_REF = Pattern.compile("\\[\\[\\s*field\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\]\\]");
    private static final int MIN_SHARED = 5;

    /**
     * Um texto ou uma Decisão que cita um campo que nenhuma tela define (ex.: nomeCliente, quando o campo é
     * nomeCompleto) é um escorregão comum do modelo leve, que ele erra de novo a cada correção. Quando um
     * único campo existente compartilha ao menos {@code MIN_SHARED} letras seguidas com o citado, passa a
     * valer esse campo; sem um candidato claro, a citação fica como está e o erro volta ao modelo.
     */
    private static List<StepSpec> resolveCitedFields(List<StepSpec> steps, Set<String> definedFields) {
        if (definedFields.isEmpty()) {
            return steps;
        }
        java.util.function.UnaryOperator<String> name = (cited) -> definedFields.contains(cited) ? cited : closest(cited, definedFields);
        java.util.function.UnaryOperator<String> text = (value) -> {
            if (value == null) {
                return null;
            }
            java.util.regex.Matcher m = FIELD_REF.matcher(value);
            StringBuilder out = new StringBuilder();
            while (m.find()) {
                m.appendReplacement(out, java.util.regex.Matcher.quoteReplacement("[[field:" + name.apply(m.group(1)) + "]]"));
            }
            m.appendTail(out);
            return out.toString();
        };
        java.util.function.UnaryOperator<String> ref = (value) -> {
            if (value == null || !value.trim().startsWith("field:")) {
                return value;
            }
            return "field:" + name.apply(value.trim().substring("field:".length()).trim());
        };
        List<StepSpec> result = new ArrayList<>();
        for (StepSpec step : steps) {
            ScreenSpec screen = step.screen() == null ? null
                    : new ScreenSpec(text.apply(step.screen().title()), rewriteBlocks(step.screen().blocks(), text));
            RequestSpec request = step.request() == null ? null : new RequestSpec(step.request().method(), text.apply(step.request().url()),
                    step.request().headers(), step.request().body(), rewritePairs(step.request().bodyFields(), text), step.request().outputs(),
                    step.request().readTimeoutMs(), step.request().retries(), step.request().background());
            JourneySpec.MessageSpec message = step.message() == null ? null : new JourneySpec.MessageSpec(step.message().system(),
                    step.message().payload(), rewritePairs(step.message().payloadFields(), text), step.message().outputs(),
                    step.message().waitTimeoutSeconds());
            List<BranchSpec> branches = step.branches() == null ? null : step.branches().stream()
                    .map(b -> new BranchSpec(ref.apply(b.ref()), b.op(), b.value(), b.valueType(), ref.apply(b.valueRef()), b.label(), b.to()))
                    .toList();
            result.add(new StepSpec(step.key(), step.kind(), step.name(), step.description(), screen, request, message, step.next(),
                    step.onFailure(), branches, step.otherwise()));
        }
        return result;
    }

    private static List<BlockSpec> rewriteBlocks(List<BlockSpec> blocks, java.util.function.UnaryOperator<String> text) {
        if (blocks == null) {
            return null;
        }
        return blocks.stream().map(b -> new BlockSpec(b.kind(), text.apply(b.text()), b.style(), b.field(), text.apply(b.label()),
                text.apply(b.placeholder()), b.inputType(), b.required(), b.options(), b.optionsFrom(), b.severity(), text.apply(b.title()),
                text.apply(b.message()), b.choice(), b.variant(), rewriteBlocks(b.blocks(), text), b.answer(), b.choices())).toList();
    }

    private static List<JourneySpec.PairSpec> rewritePairs(List<JourneySpec.PairSpec> pairs, java.util.function.UnaryOperator<String> text) {
        return pairs == null ? null : pairs.stream().map(p -> new JourneySpec.PairSpec(p.name(), text.apply(p.value()))).toList();
    }

    /** O campo existente que mais se parece com {@code cited}, só se for um candidato claro (único e com letras seguidas em comum). */
    private static String closest(String cited, Set<String> defined) {
        String best = null;
        int bestScore = 0;
        boolean tie = false;
        for (String candidate : defined) {
            int score = longestCommonRun(cited.toLowerCase(Locale.ROOT), candidate.toLowerCase(Locale.ROOT));
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
                tie = false;
            } else if (score == bestScore && score > 0) {
                tie = true;
            }
        }
        return best != null && bestScore >= MIN_SHARED && !tie ? best : cited;
    }

    private static int longestCommonRun(String a, String b) {
        int best = 0;
        int[] previous = new int[b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            int[] current = new int[b.length() + 1];
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    current[j] = previous[j - 1] + 1;
                    best = Math.max(best, current[j]);
                }
            }
            previous = current;
        }
        return best;
    }

    private static void collectFields(List<BlockSpec> blocks, Set<String> fields) {
        if (blocks == null) {
            return;
        }
        for (BlockSpec block : blocks) {
            if (!blank(block.field())) {
                fields.add(block.field());
            }
            collectFields(block.blocks(), fields);
        }
    }

    private static StepSpec normalizeStep(StepSpec step, String key, String kind, String following) {
        String name = !blank(step.name()) ? step.name()
                : step.screen() != null && !blank(step.screen().title()) ? step.screen().title() : key;
        String next = step.next();
        String otherwise = step.otherwise();
        if ("END".equals(kind)) {
            next = null;
        } else if ("DECISION".equals(kind)) {
            next = null;
            if (blank(otherwise)) {
                otherwise = following;
            }
        } else if (blank(next)) {
            next = following;
        }
        String onFailure = "INTEGRATION".equals(kind) || "PUBLISH_MESSAGE".equals(kind) || "WAIT_MESSAGE".equals(kind) ? step.onFailure() : null;
        // Modelos leves preenchem objetos que não são do tipo da etapa (ex.: um request numa DECISION): ignora.
        ScreenSpec screen = step.screen() == null || !"SCREEN".equals(kind) ? null
                : new ScreenSpec(step.screen().title(), normalizeBlocks(step.screen().blocks(), new HashSet<>()));
        RequestSpec request = step.request() == null || !"INTEGRATION".equals(kind) ? null : new RequestSpec(upper(step.request().method()), step.request().url(),
                step.request().headers(), step.request().body(), step.request().bodyFields(), step.request().outputs(),
                step.request().readTimeoutMs(),
                step.request().retries(), step.request().background());
        List<BranchSpec> branches = step.branches() == null || !"DECISION".equals(kind) ? null
                : step.branches().stream().map(JourneySpecNormalizer::normalizeBranch).toList();
        JourneySpec.MessageSpec message = "PUBLISH_MESSAGE".equals(kind) || "WAIT_MESSAGE".equals(kind) ? step.message() : null;
        return new StepSpec(key, kind, name, step.description(), screen, request, message, next, onFailure,
                branches, otherwise);
    }

    private static BranchSpec normalizeBranch(BranchSpec branch) {
        String op = branch.op() == null ? null : switch (branch.op().trim().toLowerCase(Locale.ROOT)) {
            case "=", "eq", "equals" -> "==";
            case "<>", "ne", "notequals" -> "!=";
            case "gt" -> ">";
            case "lt" -> "<";
            default -> branch.op().trim();
        };
        String valueType = branch.valueType();
        if (blank(valueType) && branch.value() != null && branch.value().trim().matches("^-?\\d+(\\.\\d+)?$")
                && (">".equals(op) || "<".equals(op))) {
            valueType = "number";
        }
        String value = branch.value();
        String valueRef = branch.valueRef();
        if (!blank(valueRef) && !valueRef.trim().matches("^(field|data):.+|^channel$")) {
            // Modelos leves põem o valor literal em valueRef: se não é uma referência, é o valor.
            if (blank(value)) {
                value = valueRef.trim();
            }
            valueRef = null;
        }
        return new BranchSpec(branch.ref(), op, value, valueType, valueRef, branch.label(), branch.to());
    }

    // ---------------------------------------------------------------- blocos

    private static List<BlockSpec> normalizeBlocks(List<BlockSpec> blocks, Set<String> fields) {
        if (blocks == null) {
            return List.of();
        }
        List<BlockSpec> present = blocks.stream().filter(b -> b != null).toList();
        // Nomes escritos pelo modelo entram primeiro: os derivados nunca colidem com eles.
        for (BlockSpec block : present) {
            if (!blank(block.field()) && IDENT.matcher(block.field()).matches()) {
                fields.add(block.field());
            }
        }
        List<BlockSpec> result = new ArrayList<>();
        for (BlockSpec block : present) {
            result.add(normalizeBlock(block, fields));
        }
        return result;
    }

    private static BlockSpec normalizeBlock(BlockSpec block, Set<String> fields) {
        String kind = upper(block.kind());
        if ("QUESTION".equals(kind)) {
            return question(block, fields);
        }
        if ("CARD".equals(kind)) {
            return copy(block, kind, block.field(), block.label(), block.options(), normalizeBlocks(block.blocks(), fields));
        }
        if ("BUTTON".equals(kind)) {
            return copy(block, kind, block.field(), blank(block.label()) ? "Continuar" : block.label(), block.options(), block.blocks());
        }
        boolean input = Set.of("INPUT", "TEXTAREA", "DATE", "SELECT", "CHECKBOX").contains(kind);
        if (!input) {
            return copy(block, kind, block.field(), block.label(), block.options(), block.blocks());
        }
        // Modelos leves escrevem o enunciado em text (ou title) em vez de label.
        String label = !blank(block.label()) ? block.label() : !blank(block.text()) ? block.text()
                : !blank(block.title()) ? block.title() : !blank(block.field()) ? block.field() : null;
        String field = !blank(block.field()) && IDENT.matcher(block.field()).matches() ? block.field() : deriveField(label, fields);
        if (label == null) {
            label = field;
        }
        return copy(block, kind, field, label, normalizeOptions(block.options()), block.blocks());
    }

    /** O bloco "pergunta": o modelo diz só o enunciado, o tipo de resposta e as escolhas. */
    private static BlockSpec question(BlockSpec block, Set<String> fields) {
        String label = !blank(block.label()) ? block.label()
                : !blank(block.text()) ? block.text() : !blank(block.title()) ? block.title() : block.message();
        String answer = block.answer() == null ? null : block.answer().trim().toUpperCase(Locale.ROOT);
        List<String> choices = block.choices() == null ? List.of() : block.choices().stream().filter(c -> !blank(c)).toList();
        if (blank(answer)) {
            answer = choices.isEmpty() && (block.options() == null || block.options().isEmpty()) ? "SHORT_TEXT" : "CHOICE";
        }
        String field = !blank(block.field()) && IDENT.matcher(block.field()).matches() ? block.field() : deriveField(label, fields);
        String kind;
        List<OptionSpec> options = null;
        switch (answer) {
            case "LONG_TEXT" -> kind = "TEXTAREA";
            case "DATE" -> kind = "DATE";
            case "CHECK" -> kind = "CHECKBOX";
            case "YES_NO" -> {
                kind = "SELECT";
                options = List.of(new OptionSpec("Sim", "sim"), new OptionSpec("Não", "nao"));
            }
            case "SCALE_5" -> {
                kind = "SELECT";
                options = scale(1, 5, choices);
            }
            case "SCALE_10" -> {
                kind = "SELECT";
                options = scale(0, 10, choices);
            }
            case "CHOICE" -> {
                kind = "SELECT";
                options = !choices.isEmpty() ? optionsFromLabels(choices) : normalizeOptions(block.options());
            }
            default -> kind = "INPUT";
        }
        return new BlockSpec(kind, null, null, field, label, block.placeholder(), block.inputType(), block.required(), options,
                block.optionsFrom(), null, null, null, null, null, null, null, null);
    }

    /** Escala numérica; com um texto por ponto (ex.: "Ruim" a "Ótimo"), ele vira o rótulo e o número, o valor. */
    private static List<OptionSpec> scale(int from, int to, List<String> labels) {
        List<OptionSpec> options = new ArrayList<>();
        int count = to - from + 1;
        for (int n = from; n <= to; n++) {
            String label = labels.size() == count ? labels.get(n - from) : String.valueOf(n);
            options.add(new OptionSpec(label, String.valueOf(n)));
        }
        return options;
    }

    private static List<OptionSpec> optionsFromLabels(List<String> labels) {
        List<OptionSpec> options = new ArrayList<>();
        Set<String> values = new HashSet<>();
        for (String label : labels) {
            options.add(new OptionSpec(label, uniqueKey(optionValue(label), values)));
        }
        return options;
    }

    private static List<OptionSpec> normalizeOptions(List<OptionSpec> options) {
        if (options == null) {
            return null;
        }
        List<OptionSpec> result = new ArrayList<>();
        Set<String> values = new HashSet<>();
        for (OptionSpec option : options) {
            if (option == null || blank(option.label())) {
                continue;
            }
            String value = !blank(option.value()) ? option.value() : optionValue(option.label());
            result.add(new OptionSpec(option.label(), values.add(value) ? value : uniqueKey(value, values)));
        }
        return result;
    }

    private static String optionValue(String label) {
        String trimmed = label.trim();
        if (DIGITS.matcher(trimmed).matches()) {
            return trimmed;
        }
        String slug = slug(label);
        return slug == null ? "opcao" : slug;
    }

    private static BlockSpec copy(BlockSpec b, String kind, String field, String label, List<OptionSpec> options,
                                  List<BlockSpec> blocks) {
        return new BlockSpec(kind, b.text(), b.style(), field, label, b.placeholder(), b.inputType(), b.required(), options,
                b.optionsFrom(), b.severity(), b.title(), b.message(), b.choice(), b.variant(), blocks, b.answer(), b.choices());
    }

    // ---------------------------------------------------------------- nomes

    private static String deriveField(String label, Set<String> fields) {
        String base = slug(label);
        return uniqueKey(base == null ? "campo" : base, fields);
    }

    /** camelCase sem acento, com até {@code MAX_NAME_WORDS} palavras: "Como você avalia o atendimento?" vira comoVoceAvaliaO. */
    static String slug(String text) {
        if (blank(text)) {
            return null;
        }
        String folded = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        String[] words = folded.split("[^A-Za-z0-9]+");
        StringBuilder out = new StringBuilder();
        int used = 0;
        for (String word : words) {
            if (word.isEmpty() || used >= MAX_NAME_WORDS) {
                continue;
            }
            String lower = word.toLowerCase(Locale.ROOT);
            out.append(used == 0 ? lower : Character.toUpperCase(lower.charAt(0)) + lower.substring(1));
            used++;
        }
        if (out.length() == 0) {
            return null;
        }
        if (Character.isDigit(out.charAt(0))) {
            out.insert(0, 'q');
        }
        return out.length() > 40 ? out.substring(0, 40) : out.toString();
    }

    private static String uniqueKey(String base, Set<String> used) {
        String candidate = base;
        int n = 2;
        while (!used.add(candidate)) {
            candidate = base + n++;
        }
        return candidate;
    }

    private static Set<String> allKeys(List<StepSpec> steps) {
        Set<String> keys = new HashSet<>();
        steps.forEach(s -> keys.add(s.key()));
        return keys;
    }

    private static String keyOf(StepSpec step, int index, Set<String> keys) {
        if (step.key() != null && !step.key().isBlank()) {
            return step.key();
        }
        // A chave dessa etapa ainda não foi gerada (ela vem depois na lista): reproduz a mesma regra.
        return "etapa" + (index + 1);
    }

    private static StepSpec withNext(StepSpec s, String next) {
        return new StepSpec(s.key(), s.kind(), s.name(), s.description(), s.screen(), s.request(), s.message(), next,
                s.onFailure(), s.branches(), s.otherwise());
    }

    private static String upper(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
