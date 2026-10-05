package com.jouney.admin.infrastructure.ai.spec;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.PropDescriptor;
import com.jouney.admin.domain.componentregistry.PropKind;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowAnnotation;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.FlowSection;
import com.jouney.admin.domain.sdui.SduiBinding;
import com.jouney.admin.domain.sdui.SduiEvent;
import com.jouney.admin.domain.sdui.SduiNode;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.BlockSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.BranchSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.OutputSpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec.StepSpec;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Transforma a {@link JourneySpec} escrita pelo modelo numa jornada de verdade: gera os ids, as
 * ligações, a árvore de componentes de cada tela (com os padrões do catálogo, lidos do Component
 * Registry) e a grafia de cada variável conforme o lugar onde ela aparece. É aqui, e não no
 * prompt, que a regra de grafia é garantida:
 * <ul>
 *   <li>dentro de uma tela, o vínculo é {@code form.x}/{@code data.x} e o texto leva {@code {{form.x}}};</li>
 *   <li>em conector, mensageria e Decisão, só a forma do motor: {@code {{form_x}}}, {@code {{data_x}}}
 *       e {@code {{channel}}}.</li>
 * </ul>
 * O que depende do ambiente (cluster, tópico e credencial de mensageria, endereço de API não
 * informado) fica em branco e vira uma anotação no canvas, como nos modelos de jornada. As posições
 * ficam em zero: o editor organiza o fluxo depois.
 */
public final class JourneySpecCompiler {

    private static final Pattern IDENT = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Pattern NUMBER = Pattern.compile("^-?\\d+(\\.\\d+)?$");
    private static final Pattern REFERENCE = Pattern.compile(
            "\\[\\[\\s*(?:(field|data)\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*)|(channel))\\s*\\]\\]");
    private static final Set<String> KINDS =
            Set.of("SCREEN", "INTEGRATION", "PUBLISH_MESSAGE", "WAIT_MESSAGE", "DECISION", "END");
    private static final Set<String> INPUT_KINDS = Set.of("INPUT", "TEXTAREA", "DATE", "SELECT", "CHECKBOX");
    private static final Set<String> BLOCK_KINDS =
            Set.of("TEXT", "ALERT", "DIVIDER", "INPUT", "TEXTAREA", "DATE", "SELECT", "CHECKBOX", "CARD", "BUTTON");
    private static final Set<String> VARIABLE_TYPES = Set.of("string", "number", "boolean", "date", "datetime");
    private static final Set<String> OUTPUT_TYPES = Set.of("string", "number", "boolean", "date", "datetime", "list");
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> BODY_METHODS = Set.of("POST", "PUT", "PATCH");
    private static final Set<String> BROKERS = Set.of("KAFKA", "EVENT_HUBS", "SERVICE_BUS");
    private static final Set<String> OPERATORS = Set.of("==", "!=", ">", "<");
    private static final String VERSION = "1.0.0";
    /** Teto de telas de uma jornada gerada por IA — o mesmo limite que o prompt anuncia. */
    static final int MAX_SCREENS = 20;

    /** Resultado da montagem; as posições estão em zero até o editor organizar. */
    public record CompiledJourney(String name, List<FlowNode> nodes, List<FlowConnection> connections,
                                  List<FlowAnnotation> annotations, List<FlowSection> sections) {
    }

    /** Problemas da descrição, escritos em termos dela (chaves de etapa, campos, caminhos). */
    public static class SpecProblemException extends RuntimeException {
        private final List<String> problems;

        public SpecProblemException(List<String> problems) {
            super(String.join("; ", problems));
            this.problems = problems;
        }

        public List<String> problems() {
            return problems;
        }
    }

    private enum Mode { SCREEN, ENGINE }

    private record Ref(String kind, String name) {
    }

    private final Map<String, ComponentDefinition> registry;
    private int seq = 0;

    private JourneySpecCompiler(Map<String, ComponentDefinition> registry) {
        this.registry = registry;
    }

    public static CompiledJourney compile(JourneySpec spec, Map<String, ComponentDefinition> registry) {
        JourneySpec normalized = JourneySpecNormalizer.normalize(spec);
        List<String> problems = check(normalized);
        if (!problems.isEmpty()) {
            throw new SpecProblemException(problems);
        }
        return new JourneySpecCompiler(registry).build(normalized);
    }

    // ---------------------------------------------------------------- conferência da descrição

    private static List<String> check(JourneySpec spec) {
        List<String> problems = new ArrayList<>();
        if (spec == null || spec.steps() == null || spec.steps().isEmpty()) {
            return List.of("A jornada precisa ter ao menos uma etapa em steps");
        }
        if (spec.name() == null || spec.name().isBlank()) {
            problems.add("A jornada precisa de um name");
        }
        if (spec.startMessage() != null && spec.inputs() != null && !spec.inputs().isEmpty()) {
            problems.add("inputs só vale numa jornada iniciada pelo canal; com startMessage, os dados vêm das saídas (outputs) da mensagem");
        }
        if (spec.inputs() != null) {
            for (JourneySpec.VariableSpec input : spec.inputs()) {
                if (input.name() == null || !IDENT.matcher(input.name()).matches()) {
                    problems.add("A entrada '" + input.name() + "' precisa de um nome só com letras, números e sublinhado");
                }
                if (input.type() == null || !VARIABLE_TYPES.contains(input.type())) {
                    problems.add("A entrada '" + input.name() + "' tem um tipo inválido");
                }
            }
        }
        if (spec.startMessage() != null) {
            if (spec.startMessage().system() == null || !BROKERS.contains(spec.startMessage().system())) {
                problems.add("startMessage.system precisa ser KAFKA, EVENT_HUBS ou SERVICE_BUS");
            }
            checkOutputs("startMessage", spec.startMessage().outputs(), problems);
        }

        Set<String> keys = new HashSet<>();
        for (StepSpec step : spec.steps()) {
            if (step.key() == null || !KEY.matcher(step.key()).matches()) {
                problems.add("A etapa '" + step.name() + "' precisa de uma key só com letras, números, hífen e sublinhado");
            } else if (!keys.add(step.key())) {
                problems.add("A key '" + step.key() + "' está repetida; cada etapa precisa de uma key única");
            }
        }
        long screenCount = spec.steps().stream().filter(s -> "SCREEN".equals(s.kind())).count();
        if (screenCount > MAX_SCREENS) {
            problems.add("A jornada tem " + screenCount + " telas; o máximo é " + MAX_SCREENS + ". Reduza juntando perguntas na mesma tela");
        }
        if (spec.steps().stream().noneMatch(s -> "END".equals(s.kind()))) {
            problems.add("A jornada precisa ter ao menos uma etapa do tipo END");
        }
        Map<String, List<JourneySpec.OptionSpec>> optionsByField = optionsByField(spec);
        Set<String> fieldNames = fieldNames(spec);
        for (int i = 0; i < spec.steps().size(); i++) {
            checkStep(spec.steps().get(i), i > 0 ? spec.steps().get(i - 1) : null, keys, optionsByField, fieldNames, problems);
        }
        Set<String> sectioned = new HashSet<>();
        if (spec.sections() != null) {
            for (JourneySpec.SectionSpec section : spec.sections()) {
                for (String key : orEmpty(section.steps())) {
                    if (!keys.contains(key)) {
                        problems.add("A seção '" + section.name() + "' cita a etapa '" + key + "', que não existe");
                    } else if (!sectioned.add(key)) {
                        problems.add("A etapa '" + key + "' está em mais de uma seção");
                    }
                }
            }
        }
        if (spec.notes() != null) {
            for (JourneySpec.NoteSpec note : spec.notes()) {
                for (String key : orEmpty(note.steps())) {
                    if (!keys.contains(key)) {
                        problems.add("Uma nota cita a etapa '" + key + "', que não existe");
                    }
                }
            }
        }
        return problems;
    }

    private static void checkStep(StepSpec step, StepSpec previous, Set<String> keys,
                                  Map<String, List<JourneySpec.OptionSpec>> optionsByField, Set<String> fieldNames,
                                  List<String> problems) {
        String label = "A etapa '" + step.key() + "'";
        if (step.name() == null || step.name().isBlank()) {
            problems.add(label + " precisa de um name");
        }
        if (step.kind() == null || !KINDS.contains(step.kind())) {
            problems.add(label + " tem um kind inválido: " + step.kind());
            return;
        }
        boolean needsNext = !"END".equals(step.kind()) && !"DECISION".equals(step.kind());
        if (needsNext) {
            checkTarget(label + " (next)", step.next(), keys, problems);
        } else if (step.next() != null && !step.next().isBlank()) {
            problems.add(label + " é " + step.kind() + " e não usa next");
        }
        if (step.onFailure() != null && !step.onFailure().isBlank()) {
            if (!"INTEGRATION".equals(step.kind()) && !"PUBLISH_MESSAGE".equals(step.kind())) {
                problems.add(label + " tem onFailure, mas só uma etapa INTEGRATION ou PUBLISH_MESSAGE pode ter um caminho de falha");
            } else {
                checkTarget(label + " (onFailure)", step.onFailure(), keys, problems);
            }
        }
        switch (step.kind()) {
            case "SCREEN" -> checkScreen(step, label, problems);
            case "INTEGRATION" -> {
                JourneySpec.RequestSpec request = step.request();
                if (request == null || request.method() == null || !METHODS.contains(request.method())) {
                    problems.add(label + " é INTEGRATION e precisa de request com um method válido (GET, POST, PUT, PATCH ou DELETE)");
                } else {
                    checkOutputs(label, request.outputs(), problems);
                    if (BODY_METHODS.contains(request.method()) && mergedPairs(request.body(), request.bodyFields()).isEmpty()
                            && !fieldNames.isEmpty()) {
                        problems.add(label + " é um " + request.method() + " sem body: monte o body com os dados que as telas "
                                + "coletaram, ex.: {\"nome\":\"[[field:nome]]\"}; campos disponíveis: " + String.join(", ", fieldNames));
                    }
                }
            }
            case "PUBLISH_MESSAGE", "WAIT_MESSAGE" -> {
                if (step.message() == null || step.message().system() == null || !BROKERS.contains(step.message().system())) {
                    problems.add(label + " precisa de message com system KAFKA, EVENT_HUBS ou SERVICE_BUS");
                } else {
                    checkOutputs(label, step.message().outputs(), problems);
                }
            }
            case "DECISION" -> checkDecision(step, previous, label, keys, optionsByField, fieldNames, problems);
            default -> {
            }
        }
    }

    private static void checkTarget(String where, String target, Set<String> keys, List<String> problems) {
        if (target == null || target.isBlank()) {
            problems.add(where + " está vazio; indique a key da etapa seguinte");
        } else if (!keys.contains(target)) {
            problems.add(where + " aponta para '" + target + "', que não existe");
        }
    }

    private static void checkOutputs(String label, List<OutputSpec> outputs, List<String> problems) {
        for (OutputSpec output : orEmpty(outputs)) {
            if (output.name() == null || !IDENT.matcher(output.name()).matches()) {
                problems.add(label + ": a saída '" + output.name() + "' precisa de um nome só com letras, números e sublinhado");
            }
            if (output.path() == null || output.path().isBlank()) {
                problems.add(label + ": a saída '" + output.name() + "' precisa de path (ex.: $.campo ou $httpStatus)");
            }
            if (output.type() != null && !OUTPUT_TYPES.contains(output.type())) {
                problems.add(label + ": a saída '" + output.name() + "' tem um tipo inválido");
            }
        }
    }

    private static void checkScreen(StepSpec step, String label, List<String> problems) {
        if (step.screen() == null) {
            problems.add(label + " é SCREEN e precisa de screen");
            return;
        }
        checkBlocks(label, orEmpty(step.screen().blocks()), new HashSet<>(), problems);
        if (!hasContent(orEmpty(step.screen().blocks()))) {
            problems.add(label + " é uma tela sem conteúdo: coloque em screen.blocks o que o usuário vê e responde "
                    + "(textos, perguntas com INPUT, SELECT, TEXTAREA, CHECKBOX ou DATE, avisos), não só o título");
        }
    }

    // Botão e divisor sozinhos não fazem uma tela: precisa de texto, aviso ou campo.
    private static boolean hasContent(List<BlockSpec> blocks) {
        return blocks.stream().anyMatch(b -> b.kind() != null && switch (b.kind()) {
            case "BUTTON", "DIVIDER" -> false;
            case "CARD" -> hasContent(orEmpty(b.blocks()));
            default -> true;
        });
    }

    private static void checkBlocks(String label, List<BlockSpec> blocks, Set<String> fields, List<String> problems) {
        for (BlockSpec block : blocks) {
            if (block.kind() == null || !BLOCK_KINDS.contains(block.kind())) {
                problems.add(label + ": bloco com kind inválido: " + block.kind());
                continue;
            }
            if (INPUT_KINDS.contains(block.kind())) {
                if (block.field() == null || !IDENT.matcher(block.field()).matches()) {
                    problems.add(label + ": o campo '" + block.label() + "' precisa de um field só com letras, números e sublinhado");
                } else if (!fields.add(block.field())) {
                    problems.add(label + ": o field '" + block.field() + "' aparece mais de uma vez na mesma tela");
                }
            }
            if ("SELECT".equals(block.kind()) && block.optionsFrom() == null && orEmpty(block.options()).isEmpty()) {
                problems.add(label + ": o campo '" + block.field() + "' (SELECT) precisa de options ou de optionsFrom");
            }
            if ("SELECT".equals(block.kind()) && block.optionsFrom() != null) {
                Ref ref = parseRef(block.optionsFrom().replace("[[", "").replace("]]", "").trim());
                if (ref == null || !"data".equals(ref.kind())) {
                    problems.add(label + ": optionsFrom do campo '" + block.field() + "' precisa ser [[data:lista]]");
                }
            }
            if ("BUTTON".equals(block.kind())) {
                if (block.label() == null || block.label().isBlank()) {
                    problems.add(label + ": um botão precisa de label");
                }
                if (block.choice() != null && (block.choice().field() == null || !IDENT.matcher(block.choice().field()).matches()
                        || block.choice().value() == null || block.choice().value().isBlank())) {
                    problems.add(label + ": o botão '" + block.label() + "' tem choice sem field ou sem value");
                }
            }
            if ("CARD".equals(block.kind())) {
                checkBlocks(label, orEmpty(block.blocks()), fields, problems);
            }
        }
    }

    private static void checkDecision(StepSpec step, StepSpec previous, String label, Set<String> keys,
                                      Map<String, List<JourneySpec.OptionSpec>> optionsByField, Set<String> fieldNames,
                                      List<String> problems) {
        if (orEmpty(step.branches()).isEmpty()) {
            problems.add(label + " é DECISION e precisa de ao menos um caminho em branches, além do otherwise: coloque em "
                    + "branches o caminho da resposta que segue por um destino e em otherwise o do outro caso"
                    + previousFieldsHint(previous));
        }
        checkTarget(label + " (otherwise)", step.otherwise(), keys, problems);
        for (BranchSpec branch : orEmpty(step.branches())) {
            Ref cited = parseRef(branch.ref());
            if (cited != null && "field".equals(cited.kind()) && !fieldNames.contains(cited.name())) {
                problems.add(label + ": compara o campo '" + cited.name() + "', que nenhuma tela define"
                        + (fieldNames.isEmpty() ? "" : "; os campos definidos são: " + String.join(", ", fieldNames)));
            }
            if (parseRef(branch.ref()) == null) {
                problems.add(label + ": ref '" + branch.ref() + "' inválido; use field:nome (campo de tela), data:nome (saída de uma INTEGRATION anterior; $httpStatus é o path de uma saída, não um ref) ou channel");
            }
            if (branch.op() == null || !OPERATORS.contains(branch.op())) {
                problems.add(label + ": op '" + branch.op() + "' inválido; use ==, !=, > ou <");
            }
            if (branch.valueRef() != null && !branch.valueRef().isBlank()) {
                if (parseRef(branch.valueRef()) == null) {
                    problems.add(label + ": valueRef '" + branch.valueRef() + "' inválido; use field:nome, data:nome ou channel");
                }
            } else if (branch.value() == null || branch.value().isBlank()) {
                problems.add(label + ": cada caminho precisa de value ou de valueRef");
            } else if (branch.value().contains("'") || branch.value().contains("\"") || branch.value().contains("\\")) {
                problems.add(label + ": o value '" + branch.value() + "' não pode conter aspas nem barra invertida");
            } else if ("number".equals(branch.valueType()) && !NUMBER.matcher(branch.value().trim()).matches()) {
                problems.add(label + ": o value '" + branch.value() + "' não é um número");
            } else if ("boolean".equals(branch.valueType()) && !Set.of("true", "false").contains(branch.value().trim())) {
                problems.add(label + ": o value '" + branch.value() + "' precisa ser true ou false");
            }
            checkChoice(label, branch, optionsByField, problems);
            checkTarget(label + " (caminho '" + branch.ref() + "')", branch.to(), keys, problems);
        }
    }

    // Numa pergunta de escolha, o valor comparado precisa ser uma das escolhas: o texto como aparece para o
    // usuário ou o valor interno. Sem isso a Decisão nunca casaria e cairia sempre no caminho padrão.
    private static void checkChoice(String label, BranchSpec branch, Map<String, List<JourneySpec.OptionSpec>> optionsByField,
                                    List<String> problems) {
        Ref ref = parseRef(branch.ref());
        if (ref == null || !"field".equals(ref.kind()) || !blank(branch.valueRef()) || blank(branch.value())) {
            return;
        }
        List<JourneySpec.OptionSpec> options = optionsByField.get(ref.name());
        if (options == null || options.isEmpty() || matchOption(options, branch.value()) != null) {
            return;
        }
        problems.add(label + ": o campo '" + ref.name() + "' é uma pergunta de escolha e '" + branch.value()
                + "' não é nenhuma das escolhas (" + options.stream().map(JourneySpec.OptionSpec::label)
                .collect(java.util.stream.Collectors.joining(", ")) + "); compare com o texto de uma delas");
    }

    private static String previousFieldsHint(StepSpec previous) {
        if (previous == null || previous.screen() == null) {
            return "";
        }
        Set<String> names = new java.util.LinkedHashSet<>();
        collectFieldNames(orEmpty(previous.screen().blocks()), names);
        return names.isEmpty() ? "" : " (a tela anterior '" + previous.key() + "' define os campos: " + String.join(", ", names) + ")";
    }

    /** Nomes de todos os campos de entrada de todas as telas. */
    private static Set<String> fieldNames(JourneySpec spec) {
        Set<String> names = new java.util.LinkedHashSet<>();
        for (StepSpec step : spec.steps()) {
            if (step.screen() != null) {
                collectFieldNames(orEmpty(step.screen().blocks()), names);
            }
        }
        return names;
    }

    private static void collectFieldNames(List<BlockSpec> blocks, Set<String> names) {
        for (BlockSpec block : blocks) {
            if (INPUT_KINDS.contains(block.kind()) && !blank(block.field())) {
                names.add(block.field());
            } else if ("BUTTON".equals(block.kind()) && block.choice() != null && !blank(block.choice().field())) {
                names.add(block.choice().field());
            } else if ("CARD".equals(block.kind())) {
                collectFieldNames(orEmpty(block.blocks()), names);
            }
        }
    }

    /** Escolhas de cada campo SELECT com opções fixas, em todas as telas (o mesmo campo pode repetir). */
    private static Map<String, List<JourneySpec.OptionSpec>> optionsByField(JourneySpec spec) {
        Map<String, List<JourneySpec.OptionSpec>> map = new HashMap<>();
        for (StepSpec step : spec.steps()) {
            if (step.screen() != null) {
                collectOptions(orEmpty(step.screen().blocks()), map);
            }
        }
        return map;
    }

    private static void collectOptions(List<BlockSpec> blocks, Map<String, List<JourneySpec.OptionSpec>> map) {
        for (BlockSpec block : blocks) {
            if ("SELECT".equals(block.kind()) && block.field() != null && !orEmpty(block.options()).isEmpty()) {
                map.computeIfAbsent(block.field(), k -> new ArrayList<>()).addAll(block.options());
            } else if ("CARD".equals(block.kind())) {
                collectOptions(orEmpty(block.blocks()), map);
            }
        }
    }

    /** O valor interno da escolha a que {@code value} se refere: pelo valor ou pelo texto, sem diferenciar
     * maiúsculas, acentos nem espaços sobrando. */
    private static String matchOption(List<JourneySpec.OptionSpec> options, String value) {
        String wanted = fold(value);
        for (JourneySpec.OptionSpec option : options) {
            if (fold(option.value()).equals(wanted)) {
                return option.value();
            }
        }
        for (JourneySpec.OptionSpec option : options) {
            if (fold(option.label()).equals(wanted)) {
                return option.value();
            }
        }
        return null;
    }

    private static String fold(String text) {
        return text == null ? "" : Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static Ref parseRef(String ref) {
        if (ref == null) {
            return null;
        }
        String text = ref.trim();
        if ("channel".equals(text)) {
            return new Ref("channel", "channel");
        }
        int colon = text.indexOf(':');
        if (colon < 0) {
            return null;
        }
        String kind = text.substring(0, colon).trim();
        String name = text.substring(colon + 1).trim();
        if (!("field".equals(kind) || "data".equals(kind)) || !IDENT.matcher(name).matches()) {
            return null;
        }
        return new Ref(kind, name);
    }

    // ---------------------------------------------------------------- montagem

    private CompiledJourney build(JourneySpec spec) {
        List<FlowNode> nodes = new ArrayList<>();
        List<FlowConnection> connections = new ArrayList<>();
        List<FlowAnnotation> annotations = new ArrayList<>();
        Map<String, String> nodeIdByKey = new HashMap<>();
        Map<String, List<JourneySpec.OptionSpec>> optionsByField = optionsByField(spec);
        for (StepSpec step : spec.steps()) {
            nodeIdByKey.put(step.key(), FlowIds.newNodeId());
        }

        String startId = FlowIds.newNodeId();
        if (spec.startMessage() != null) {
            ConnectorType system = ConnectorType.valueOf(spec.startMessage().system());
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("operation", "CONSUME");
            config.put("outputMapping", outputMapping(spec.startMessage().outputs()));
            nodes.add(new FlowNode(startId, FlowNodeType.MESSAGE_START_EVENT, "Início por mensagem",
                    "Começa quando chega uma mensagem.", 0, 0, new ConnectorConfig(system, config, null), null, null));
            annotations.add(pending(startId, "Falta escolher o cluster, o tópico e a credencial de mensageria do início da jornada."));
        } else {
            List<Map<String, Object>> startVariables = new ArrayList<>();
            for (JourneySpec.VariableSpec input : orEmpty(spec.inputs())) {
                startVariables.add(Map.of("name", input.name(), "type", input.type()));
            }
            nodes.add(new FlowNode(startId, FlowNodeType.START, "Início", "Início da jornada", 0, 0, null,
                    startVariables.isEmpty() ? null : startVariables, null));
        }
        connections.add(new FlowConnection(FlowIds.newConnectionId(), startId, nodeIdByKey.get(spec.steps().get(0).key()), null, false));

        for (StepSpec step : spec.steps()) {
            String id = nodeIdByKey.get(step.key());
            String description = step.description() != null && !step.description().isBlank() ? step.description() : step.name();
            switch (step.kind()) {
                case "SCREEN" -> nodes.add(new FlowNode(id, FlowNodeType.USER_TASK, step.name(), description, 0, 0, null, null,
                        screen(step)));
                case "INTEGRATION" -> {
                    nodes.add(new FlowNode(id, FlowNodeType.SERVICE_TASK, step.name(), description, 0, 0,
                            new ConnectorConfig(ConnectorType.REST, restConfig(step.request()), null), null, null));
                    if (step.request().url() == null || step.request().url().isBlank()) {
                        annotations.add(pending(id, "Falta informar o endereço (URL) da API desta etapa."));
                    }
                    List<String> assumed = orEmpty(step.request().outputs()).stream().map(OutputSpec::path)
                            .filter(path -> path != null && !path.trim().startsWith("$httpStatus")).toList();
                    if (!assumed.isEmpty()) {
                        // A IA não conhece a resposta real da API: o caminho de cada dado é suposição dela.
                        annotations.add(pending(id, "Confira o mapeamento da resposta desta API (" + String.join(", ", assumed)
                                + "): foi suposto pela IA e precisa existir na resposta real. Use \"Testar API\" no painel da etapa."));
                    }
                }
                case "PUBLISH_MESSAGE", "WAIT_MESSAGE" -> {
                    boolean publish = "PUBLISH_MESSAGE".equals(step.kind());
                    Map<String, Object> config = new LinkedHashMap<>();
                    config.put("operation", publish ? "PRODUCE" : "CONSUME");
                    Map<String, Object> payload = mergedPairs(step.message().payload(), step.message().payloadFields());
                    if (publish && !payload.isEmpty()) {
                        config.put("payload", translateDeep(payload, Mode.ENGINE));
                    }
                    config.put("outputMapping", outputMapping(step.message().outputs()));
                    nodes.add(new FlowNode(id, publish ? FlowNodeType.SERVICE_TASK : FlowNodeType.RECEIVE_TASK, step.name(),
                            description, 0, 0,
                            new ConnectorConfig(ConnectorType.valueOf(step.message().system()), config, null), null, null));
                    annotations.add(pending(id, "Falta escolher o cluster, o tópico e a credencial de mensageria desta etapa."));
                }
                case "DECISION" -> nodes.add(new FlowNode(id, FlowNodeType.GATEWAY, step.name(), description, 0, 0, null, null, null));
                default -> nodes.add(new FlowNode(id, FlowNodeType.END, step.name(), description, 0, 0, null, null, null));
            }

            if ("DECISION".equals(step.kind())) {
                for (BranchSpec branch : step.branches()) {
                    connections.add(new FlowConnection(FlowIds.newConnectionId(), id, nodeIdByKey.get(branch.to()),
                            condition(branch, optionsByField), false, false, blankToNull(branch.label())));
                }
                connections.add(new FlowConnection(FlowIds.newConnectionId(), id, nodeIdByKey.get(step.otherwise()), null, true));
            } else if (!"END".equals(step.kind())) {
                connections.add(new FlowConnection(FlowIds.newConnectionId(), id, nodeIdByKey.get(step.next()), null, false));
                if (step.onFailure() != null && !step.onFailure().isBlank()) {
                    connections.add(new FlowConnection(FlowIds.newConnectionId(), id, nodeIdByKey.get(step.onFailure()), null, false, true));
                }
            }
        }

        int sectionCount = 0;
        List<FlowSection> sections = new ArrayList<>();
        for (JourneySpec.SectionSpec section : orEmpty(spec.sections())) {
            List<String> ids = orEmpty(section.steps()).stream().map(nodeIdByKey::get).toList();
            sections.add(new FlowSection("Section_" + (++sectionCount), section.name(), ids, null, null, null, null));
        }
        for (JourneySpec.NoteSpec note : orEmpty(spec.notes())) {
            List<String> linked = orEmpty(note.steps()).stream().map(nodeIdByKey::get).toList();
            annotations.add(new FlowAnnotation("Annotation_" + (annotations.size() + 1), note.text(), 0, 0, linked));
        }
        return new CompiledJourney(spec.name(), nodes, connections, annotations, sections);
    }

    private FlowAnnotation pending(String nodeId, String text) {
        return new FlowAnnotation("Annotation_" + (++seq), text, 0, 0, List.of(nodeId));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    // ---------------------------------------------------------------- conectores e decisões

    /** Corpo/payload como um mapa: o objeto livre (se o provedor o aceitou) mais a lista de pares nome/valor. */
    private static Map<String, Object> mergedPairs(Map<String, Object> free, List<JourneySpec.PairSpec> pairs) {
        Map<String, Object> merged = new LinkedHashMap<>();
        if (free != null) {
            merged.putAll(free);
        }
        for (JourneySpec.PairSpec pair : orEmpty(pairs)) {
            if (pair != null && !blank(pair.name())) {
                merged.put(pair.name().trim(), pair.value() == null ? "" : pair.value());
            }
        }
        return merged;
    }

    private static Map<String, Object> restConfig(JourneySpec.RequestSpec request) {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("method", request.method());
        config.put("url", request.url() == null ? "" : translate(request.url().trim(), Mode.ENGINE));
        boolean hasBody = BODY_METHODS.contains(request.method());
        if (request.headers() != null && !request.headers().isEmpty()) {
            config.put("headers", translateDeep(request.headers(), Mode.ENGINE));
        } else if (hasBody) {
            config.put("headers", Map.of("Content-Type", "application/json"));
        }
        Map<String, Object> body = mergedPairs(request.body(), request.bodyFields());
        if (hasBody && !body.isEmpty()) {
            config.put("body", translateDeep(body, Mode.ENGINE));
        }
        config.put("outputMapping", outputMapping(request.outputs()));
        if (request.readTimeoutMs() != null) {
            config.put("readTimeoutMs", request.readTimeoutMs());
        }
        if (request.retries() != null) {
            config.put("retries", request.retries());
        }
        if (Boolean.TRUE.equals(request.background())) {
            config.put("background", true);
        }
        return config;
    }

    private static List<Map<String, Object>> outputMapping(List<OutputSpec> outputs) {
        List<Map<String, Object>> mapping = new ArrayList<>();
        for (OutputSpec output : orEmpty(outputs)) {
            Map<String, Object> rule = new LinkedHashMap<>();
            rule.put("name", output.name());
            rule.put("jsonPath", output.path().trim());
            rule.put("type", output.type() == null ? "string" : output.type());
            mapping.add(rule);
        }
        return mapping;
    }

    private static String condition(BranchSpec branch, Map<String, List<JourneySpec.OptionSpec>> optionsByField) {
        Ref ref = parseRef(branch.ref());
        String left = engineToken(ref);
        String right;
        List<JourneySpec.OptionSpec> options = "field".equals(ref.kind()) ? optionsByField.get(ref.name()) : null;
        String choice = options == null || options.isEmpty() || !blank(branch.valueRef()) ? null : matchOption(options, branch.value());
        if (choice != null) {
            // Pergunta de escolha: o campo guarda o valor interno da escolha. Em > e <, com um valor numérico
            // (notas de 0 a 10), a comparação é numérica — como texto, "10" ficaria menor que "7".
            boolean ordered = ">".equals(branch.op()) || "<".equals(branch.op());
            right = ordered && NUMBER.matcher(choice.trim()).matches() ? choice.trim() : "'" + choice + "'";
        } else if (branch.valueRef() != null && !branch.valueRef().isBlank()) {
            right = engineToken(parseRef(branch.valueRef()));
        } else if ("number".equals(branch.valueType()) || "boolean".equals(branch.valueType())) {
            right = branch.value().trim();
        } else {
            right = "'" + branch.value() + "'";
        }
        return left + " " + branch.op() + " " + right;
    }

    private static String engineToken(Ref ref) {
        return "{{" + switch (ref.kind()) {
            case "field" -> "form_" + ref.name();
            case "data" -> "data_" + ref.name();
            default -> "channel";
        } + "}}";
    }

    private static String screenToken(Ref ref) {
        return "{{" + switch (ref.kind()) {
            case "field" -> "form." + ref.name();
            case "data" -> "data." + ref.name();
            default -> "channel";
        } + "}}";
    }

    private static String translate(String text, Mode mode) {
        if (text == null) {
            return null;
        }
        Matcher matcher = REFERENCE.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            Ref ref = matcher.group(3) != null ? new Ref("channel", "channel") : new Ref(matcher.group(1), matcher.group(2));
            matcher.appendReplacement(out, Matcher.quoteReplacement(mode == Mode.SCREEN ? screenToken(ref) : engineToken(ref)));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static Object translateDeep(Object value, Mode mode) {
        if (value instanceof String text) {
            return translate(text, mode);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> copy = new LinkedHashMap<>();
            map.forEach((k, v) -> copy.put(String.valueOf(k), translateDeep(v, mode)));
            return copy;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(item -> translateDeep(item, mode)).toList();
        }
        return value;
    }

    // ---------------------------------------------------------------- telas

    private SduiNode screen(StepSpec step) {
        List<BlockSpec> blocks = new ArrayList<>(orEmpty(step.screen().blocks()));
        if (!hasButton(blocks)) {
            blocks.add(new BlockSpec("BUTTON", null, null, null, "Continuar", null, null, null, null, null, null, null,
                    null, null, null, null, null, null));
        }
        List<SduiNode> children = blocks.stream().map(this::block).toList();
        SduiNode stack = component("ui.stack", Map.of("direction", "vertical", "spacingToken", "spacing.md", "alignment", "stretch"),
                Map.of(), Map.of(), children);
        String title = step.screen().title() != null && !step.screen().title().isBlank() ? step.screen().title() : step.name();
        return component("ui.screen", Map.of("title", translate(title, Mode.SCREEN)), Map.of(), Map.of(), List.of(stack));
    }

    private static boolean hasButton(List<BlockSpec> blocks) {
        return blocks.stream().anyMatch(b -> "BUTTON".equals(b.kind()) || ("CARD".equals(b.kind()) && hasButton(orEmpty(b.blocks()))));
    }

    private SduiNode block(BlockSpec block) {
        Map<String, Object> props = new LinkedHashMap<>();
        Map<String, SduiBinding> bindings = new LinkedHashMap<>();
        Map<String, SduiEvent> events = new LinkedHashMap<>();
        switch (block.kind()) {
            case "TEXT" -> {
                props.put("text", translate(block.text() == null ? "" : block.text(), Mode.SCREEN));
                props.put("variant", block.style() == null ? "body" : block.style());
                props.put("align", "start");
                return component("ui.text", props, bindings, events, null);
            }
            case "ALERT" -> {
                props.put("severity", block.severity() == null ? "informative" : block.severity());
                if (block.title() != null) {
                    props.put("title", translate(block.title(), Mode.SCREEN));
                }
                props.put("message", translate(block.message() == null ? "" : block.message(), Mode.SCREEN));
                return component("ui.alert", props, bindings, events, null);
            }
            case "DIVIDER" -> {
                return component("ui.divider", props, bindings, events, null);
            }
            case "INPUT", "TEXTAREA", "DATE", "CHECKBOX" -> {
                props.put("label", translate(block.label() == null ? block.field() : block.label(), Mode.SCREEN));
                if (block.placeholder() != null) {
                    props.put("placeholder", translate(block.placeholder(), Mode.SCREEN));
                }
                if (block.required() != null) {
                    props.put("required", block.required());
                }
                if ("INPUT".equals(block.kind()) && block.inputType() != null) {
                    props.put("inputMode", block.inputType());
                }
                bindings.put("value", new SduiBinding("form." + block.field(), "twoWay"));
                String type = switch (block.kind()) {
                    case "INPUT" -> "ui.textInput";
                    case "TEXTAREA" -> "ui.textArea";
                    case "DATE" -> "ui.datePicker";
                    default -> "ui.checkbox";
                };
                return component(type, props, bindings, events, null);
            }
            case "SELECT" -> {
                props.put("label", translate(block.label() == null ? block.field() : block.label(), Mode.SCREEN));
                props.put("placeholder", "Selecione");
                if (block.required() != null) {
                    props.put("required", block.required());
                }
                if (block.optionsFrom() != null) {
                    Ref list = parseRef(block.optionsFrom().replace("[[", "").replace("]]", "").trim());
                    bindings.put("options", new SduiBinding("data." + list.name(), "oneWay"));
                } else {
                    List<Map<String, Object>> options = new ArrayList<>();
                    for (JourneySpec.OptionSpec option : block.options()) {
                        options.add(Map.of("label", option.label(), "value", option.value()));
                    }
                    props.put("options", options);
                }
                bindings.put("value", new SduiBinding("form." + block.field(), "twoWay"));
                return component("ui.select", props, bindings, events, null);
            }
            case "CARD" -> {
                List<SduiNode> inner = orEmpty(block.blocks()).stream().map(this::block).toList();
                SduiNode stack = component("ui.stack", Map.of("direction", "vertical", "spacingToken", "spacing.sm", "alignment", "stretch"),
                        bindings, events, inner);
                return component("ui.card", props, bindings, events, List.of(stack));
            }
            default -> {
                props.put("label", translate(block.label(), Mode.SCREEN));
                props.put("variant", block.variant() == null ? "primary" : block.variant());
                props.put("fullWidth", true);
                Map<String, Object> params = new LinkedHashMap<>();
                if (block.choice() != null) {
                    params.put("path", "form." + block.choice().field());
                    params.put("value", block.choice().value());
                }
                events.put("onPress", new SduiEvent("action.submit", params));
                return component("ui.button", props, bindings, events, null);
            }
        }
    }

    /** Monta o nó com os padrões do catálogo e por cima só o que o bloco pediu: propriedade que o
     * catálogo não conhece, ou valor fora das opções permitidas, é descartada em vez de gerar uma
     * tela inválida. */
    private SduiNode component(String type, Map<String, Object> overrides, Map<String, SduiBinding> bindings,
                               Map<String, SduiEvent> events, List<SduiNode> children) {
        ComponentDefinition definition = registry.get(type + "@" + VERSION);
        if (definition == null) {
            throw new SpecProblemException(List.of("O catálogo de componentes não tem " + type + " na versão " + VERSION));
        }
        Map<String, Object> props = new LinkedHashMap<>();
        for (PropDescriptor prop : definition.getPropsSchema()) {
            if (prop.defaultValue() != null) {
                props.put(prop.name(), prop.defaultValue());
            }
        }
        overrides.forEach((name, value) -> {
            PropDescriptor prop = definition.getPropsSchema().stream().filter(p -> p.name().equals(name)).findFirst().orElse(null);
            if (prop == null || value == null) {
                return;
            }
            if (prop.kind() == PropKind.ENUM && prop.enumValues() != null && !prop.enumValues().contains(value)) {
                return;
            }
            props.put(name, value);
        });
        String id = type.substring("ui.".length()) + "_" + (++seq);
        return new SduiNode(id, type, VERSION, props, bindings.isEmpty() ? null : bindings,
                events.isEmpty() ? null : events, null, null, children == null || children.isEmpty() ? null : children);
    }
}
