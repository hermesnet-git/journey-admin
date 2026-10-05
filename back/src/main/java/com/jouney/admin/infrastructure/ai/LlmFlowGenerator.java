package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.execution.SynchronousChainCheck;
import com.jouney.admin.domain.execution.SynchronousChainUnsupportedException;
import com.jouney.admin.domain.flow.AiFlowGenerator;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.FlowValidationException;
import com.jouney.admin.domain.flow.FlowValidator;
import com.jouney.admin.domain.flow.FlowViolation;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import com.jouney.admin.domain.sdui.SduiNode;
import com.jouney.admin.infrastructure.ai.spec.JourneySpec;
import com.jouney.admin.infrastructure.ai.spec.JourneySpecCompiler;
import com.jouney.admin.infrastructure.ai.spec.JourneySpecSchema;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Gerador de jornada por prompt (aba "IA" de "Nova jornada"), independente de provedor: quem fala com
 * o modelo é o {@link AiModelClient} escolhido pelo {@link AiModelSelector} (Gemini por padrão). O
 * modelo escreve só uma descrição compacta ({@link JourneySpec}); o {@link JourneySpecCompiler} monta
 * a jornada real, e este laço valida o resultado com as mesmas regras do editor (estrutura e telas) e
 * devolve ao modelo o que deu errado, até {@code MAX_ATTEMPTS} vezes. O que depende do ambiente (cluster,
 * tópico, credencial, endereço de API) não é erro: vira anotação no canvas, para o autor completar.
 */
@Component
public class LlmFlowGenerator implements AiFlowGenerator {

    private static final Logger log = LoggerFactory.getLogger(LlmFlowGenerator.class);
    private static final int MAX_ATTEMPTS = 5;
    // O pedido só fala de mensageria se citar uma destas palavras; fora isso, um início por mensagem é
    // invenção do modelo (modelos leves preenchem objetos opcionais do esquema só porque existem).
    // Entradas da jornada (dados que o canal já envia ao iniciar) só se o pedido disser isso; senão o modelo
    // as inventa (ex.: um cpf que a própria jornada pede numa tela) e a execução exige um dado que ninguém envia.
    private static final java.util.regex.Pattern INPUT_WORDS = java.util.regex.Pattern.compile(
            "(?i)entrada|par[aâ]metro|recebe|receb|enviad[oa] pelo canal|vem do canal|j[aá] informad|autenticad|logad|identificad");
    private static final java.util.regex.Pattern MESSAGING_WORDS = java.util.regex.Pattern.compile(
            "(?i)mensag|kafka|evento|event ?hubs?|service ?bus|fila|mensageria|webhook|publica|assina");
    private static final AiModelClient.ToolSpec GENERATE_TOOL = new AiModelClient.ToolSpec(
            JourneyGenerationPrompt.TOOL_NAME, JourneyGenerationPrompt.TOOL_DESCRIPTION, JourneySpecSchema.schema());
    private static final AiModelClient.ToolSpec DECLINE_TOOL = new AiModelClient.ToolSpec(
            JourneyGenerationPrompt.DECLINE_TOOL_NAME, JourneyGenerationPrompt.DECLINE_TOOL_DESCRIPTION,
            JourneySpecSchema.declineSchema());
    private static final AiModelClient.ToolSpec ASK_TOOL = new AiModelClient.ToolSpec(
            JourneyGenerationPrompt.ASK_TOOL_NAME, JourneyGenerationPrompt.ASK_TOOL_DESCRIPTION, JourneySpecSchema.askSchema());
    // A IA pode perguntar quantas vezes precisar, até um limite de segurança de rodadas; no limite, só gera ou recusa.
    private static final List<AiModelClient.ToolSpec> TOOLS_WITH_QUESTIONS = List.of(GENERATE_TOOL, DECLINE_TOOL, ASK_TOOL);
    private static final List<AiModelClient.ToolSpec> TOOLS_NO_QUESTIONS = List.of(GENERATE_TOOL, DECLINE_TOOL);

    private final ObjectMapper objectMapper;
    private final AiModelSelector modelSelector;
    private final ComponentDefinitionRepository componentDefinitionRepository;

    public LlmFlowGenerator(ObjectMapper objectMapper, AiModelSelector modelSelector,
                            ComponentDefinitionRepository componentDefinitionRepository) {
        this.objectMapper = objectMapper;
        this.modelSelector = modelSelector;
        this.componentDefinitionRepository = componentDefinitionRepository;
    }

    @Override
    public GeneratedFlow generate(GenerationContext context, Consumer<String> onProgress) {
        AiModelSelector.Selection selection = modelSelector.select();

        String basePrompt = JourneyGenerationPrompt.buildUserPrompt(context);
        String currentPrompt = basePrompt;
        Map<String, ComponentDefinition> componentRegistry = componentDefinitionRepository.findAll().stream()
                .collect(Collectors.toMap(ComponentDefinition::key, d -> d));

        String lastProblems = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            onProgress.accept("Tentativa " + attempt + "/" + MAX_ATTEMPTS + ": chamando " + selection.provider()
                    + " (" + selection.model() + ")...");
            long start = System.currentTimeMillis();
            AiModelClient.ToolCall call = selection.client().call(selection.apiKey(), selection.model(),
                    JourneyGenerationPrompt.SYSTEM_PROMPT, currentPrompt,
                    context.rounds() < JourneyGenerationPrompt.MAX_QUESTION_ROUNDS ? TOOLS_WITH_QUESTIONS : TOOLS_NO_QUESTIONS);
            onProgress.accept("Tentativa " + attempt + ": resposta recebida em "
                    + String.format("%.1fs", (System.currentTimeMillis() - start) / 1000.0) + ".");
            if (JourneyGenerationPrompt.ASK_TOOL_NAME.equals(call.name())) {
                throw clarificationFrom(call.args());
            }
            if (JourneyGenerationPrompt.DECLINE_TOOL_NAME.equals(call.name())) {
                throw new AiRequestDeclinedException(call.args().path("reason").asText());
            }

            List<String> problems;
            try {
                JourneySpec spec = objectMapper.treeToValue(call.args(), JourneySpec.class);
                if (spec.inputs() != null && !INPUT_WORDS.matcher(context.prompt() + " " + context.journeyDescription()).find()) {
                    spec = new JourneySpec(spec.name(), null, spec.startMessage(), spec.steps(), spec.sections(), spec.notes());
                }
                if (context.rounds() < JourneyGenerationPrompt.MAX_QUESTION_ROUNDS) {
                    AiClarificationNeededException missing = missingApiData(spec, context.prompt());
                    if (missing != null) {
                        throw missing;
                    }
                }
                spec = withoutInventedApiData(spec, context.prompt());
                if (spec.startMessage() != null && !MESSAGING_WORDS.matcher(context.prompt() + " " + context.journeyDescription()).find()) {
                    spec = new JourneySpec(spec.name(), spec.inputs(), null, spec.steps(), spec.sections(), spec.notes());
                }
                onProgress.accept("Tentativa " + attempt + ": montando a jornada e validando...");
                JourneySpecCompiler.CompiledJourney journey = JourneySpecCompiler.compile(spec, componentRegistry);
                FlowValidator.validate(journey.nodes(), journey.connections(), componentRegistry);
                SynchronousChainCheck.verify(journey.nodes(), journey.connections());
                log.info("Geração por IA, tentativa {} aceita — descrição recebida: {}", attempt, call.args());
                onProgress.accept("Tentativa " + attempt + ": jornada válida — " + describe(journey) + ".");
                return new GeneratedFlow(journey.name(), journey.nodes(), journey.connections(), journey.annotations(),
                        journey.sections());
            } catch (JourneySpecCompiler.SpecProblemException ex) {
                problems = ex.problems();
            } catch (FlowValidationException ex) {
                problems = ex.getViolations().stream().map(FlowViolation::message).toList();
            } catch (SynchronousChainUnsupportedException ex) {
                problems = List.of("Um caminho chega a um END só por INTEGRATION em sequência, sem nenhuma SCREEN, "
                        + "WAIT_MESSAGE ou mensagem antes; coloque uma SCREEN que mostra o resultado antes desse END");
            } catch (RuntimeException ex) {
                if (ex instanceof AiGenerationException generation) {
                    throw generation;
                }
                if (ex instanceof AiClarificationNeededException clarification) {
                    throw clarification;
                }
                problems = List.of("A descrição não está no formato esperado: " + ex.getMessage());
            }

            String raw = call.args().toString();
            log.info("Geração por IA, tentativa {} com problemas {} — descrição recebida: {}", attempt, problems,
                    raw.length() > 6000 ? raw.substring(0, 6000) + "…" : raw);
            List<String> grouped = group(problems);
            lastProblems = String.join("; ", grouped);
            if (attempt == MAX_ATTEMPTS) {
                break;
            }
            for (String problem : grouped) {
                onProgress.accept("Tentativa " + attempt + ": " + problem);
            }
            onProgress.accept("Pedindo correção pro modelo...");
            // Conversa nova por tentativa (não um replay do turno anterior).
            currentPrompt = JourneyGenerationPrompt.buildRepairPrompt(basePrompt, call.args().toString(), lastProblems);
        }
        throw new AiGenerationException("A IA não montou uma jornada válida em " + MAX_ATTEMPTS + " tentativas. "
                + "Tente de novo descrevendo com menos detalhes, escolha um modelo mais capaz em Integrações > "
                + "Credencial de IA, ou crie a jornada em branco. Último problema apontado: " + firstOf(lastProblems));
    }

    /**
     * Dado decisivo que falta numa integração, conferido pelo sistema para não depender de o modelo leve lembrar de
     * perguntar: o endereço da API (a etapa saiu sem url) e os dados da resposta (a IA mapeou campos que nem o pedido
     * nem as decisões do usuário citam). Cada pergunta só é feita uma vez: se o texto dela já está no pedido, o
     * usuário já respondeu (inclusive "deixar para completar no editor").
     */
    private static AiClarificationNeededException missingApiData(JourneySpec spec, String prompt) {
        String lowerPrompt = prompt.toLowerCase(java.util.Locale.ROOT);
        List<String> noUrl = new java.util.ArrayList<>();
        List<String> guessedOutputs = new java.util.ArrayList<>();
        for (JourneySpec.StepSpec step : spec.steps() == null ? List.<JourneySpec.StepSpec>of() : spec.steps()) {
            if (step == null || !"INTEGRATION".equalsIgnoreCase(step.kind()) || step.request() == null) {
                continue;
            }
            String name = step.name() == null || step.name().isBlank() ? String.valueOf(step.key()) : step.name();
            if (!urlGiven(step.request().url(), lowerPrompt)) {
                noUrl.add(name);
            }
            boolean guessed = (step.request().outputs() == null ? List.<JourneySpec.OutputSpec>of() : step.request().outputs()).stream()
                    .anyMatch(o -> o != null && o.path() != null && !o.path().trim().startsWith("$httpStatus") && !mentioned(lowerPrompt, o));
            if (guessed) {
                guessedOutputs.add(name);
            }
        }
        // As decisões já respondidas contam por assunto, não pelo texto da pergunta: quem perguntou foi o modelo ou o
        // sistema, com palavras diferentes, e o usuário não pode ser perguntado duas vezes a mesma coisa.
        int answeredUrl = answeredDecisions(prompt, ADDRESS_WORDS);
        int answeredData = answeredDecisions(prompt, RESPONSE_WORDS);
        List<AiClarificationNeededException.Question> questions = new java.util.ArrayList<>();
        for (String name : noUrl.stream().skip(answeredUrl).toList()) {
            questions.add(new AiClarificationNeededException.Question("Qual é o endereço da API da etapa «" + name + "»?",
                    "Endereço da API", List.of(new AiClarificationNeededException.Option("Deixar para completar no editor",
                            "A etapa fica sem endereço e uma anotação avisa para preenchê-lo"))));
        }
        for (String name : guessedOutputs.stream().skip(answeredData).toList()) {
            questions.add(new AiClarificationNeededException.Question("Quais dados a resposta da API da etapa «" + name + "» devolve?",
                    "Resposta da API", List.of(new AiClarificationNeededException.Option("Só o código HTTP; completar o mapeamento no editor",
                            "A jornada usa só se a chamada deu certo; os campos da resposta você mapeia depois com \"Testar API\""))));
        }
        return questions.isEmpty() ? null : new AiClarificationNeededException(questions.stream().limit(3).toList());
    }

    private static final java.util.regex.Pattern HOST = java.util.regex.Pattern.compile("^\\w+://([^/?#{]+)");

    /** O endereço existe e o pedido o informou (o servidor dele aparece no pedido ou nas decisões)? */
    private static boolean urlGiven(String url, String lowerPrompt) {
        if (url == null || url.isBlank()) {
            return false;
        }
        java.util.regex.Matcher host = HOST.matcher(url.trim());
        return host.find() && lowerPrompt.contains(host.group(1).toLowerCase(java.util.Locale.ROOT));
    }

    /**
     * Modelos leves inventam endereço e campos de resposta (ex.: api.exemplo.com, $.plano) mesmo quando o prompt
     * proíbe. O que o pedido e as decisões do usuário não informam sai da jornada: a etapa fica sem endereço e só com
     * o código HTTP, e o montador anota o que o autor precisa completar no editor.
     */
    private static JourneySpec withoutInventedApiData(JourneySpec spec, String prompt) {
        if (spec.steps() == null) {
            return spec;
        }
        String lowerPrompt = prompt.toLowerCase(java.util.Locale.ROOT);
        List<JourneySpec.StepSpec> steps = spec.steps().stream().map(step -> {
            if (step == null || !"INTEGRATION".equalsIgnoreCase(step.kind()) || step.request() == null) {
                return step;
            }
            JourneySpec.RequestSpec r = step.request();
            List<JourneySpec.OutputSpec> outputs = r.outputs() == null ? null : r.outputs().stream()
                    .filter(o -> o != null && o.path() != null && (o.path().trim().startsWith("$httpStatus") || mentioned(lowerPrompt, o)))
                    .toList();
            return new JourneySpec.StepSpec(step.key(), step.kind(), step.name(), step.description(), step.screen(),
                    new JourneySpec.RequestSpec(r.method(), urlGiven(r.url(), lowerPrompt) ? r.url() : null, r.headers(), r.body(),
                            r.bodyFields(), outputs, r.readTimeoutMs(), r.retries(), r.background()),
                    step.message(), step.next(), step.onFailure(), step.branches(), step.otherwise());
        }).toList();
        return new JourneySpec(spec.name(), spec.inputs(), spec.startMessage(), steps, spec.sections(), spec.notes());
    }

    private static final java.util.regex.Pattern ADDRESS_WORDS =
            java.util.regex.Pattern.compile("endereço|\\burl\\b", java.util.regex.Pattern.CASE_INSENSITIVE);
    private static final java.util.regex.Pattern RESPONSE_WORDS =
            java.util.regex.Pattern.compile("dados da resposta|resposta da api|devolve|campos da resposta", java.util.regex.Pattern.CASE_INSENSITIVE);

    /** Quantas das "Decisões do usuário" do pedido tratam do assunto (a pergunta e a resposta juntas). */
    private static int answeredDecisions(String prompt, java.util.regex.Pattern topic) {
        int start = prompt.indexOf("Decisões do usuário:");
        if (start < 0) {
            return 0;
        }
        return (int) prompt.substring(start).lines().filter(l -> l.startsWith("- ") && topic.matcher(l).find()).count();
    }

    /** O pedido cita o nome da saída ou o último trecho do caminho dela (ex.: "valor" em $.fatura.valor)? */
    private static boolean mentioned(String lowerPrompt, JourneySpec.OutputSpec output) {
        String path = output.path().trim();
        String last = path.substring(Math.max(path.lastIndexOf('.'), path.lastIndexOf('$')) + 1).replaceAll("\\[\\d+\\]", "");
        return (output.name() != null && output.name().length() >= 3 && lowerPrompt.contains(output.name().toLowerCase(java.util.Locale.ROOT)))
                || (last.length() >= 3 && lowerPrompt.contains(last.toLowerCase(java.util.Locale.ROOT)));
    }

    /** Perguntas da IA já limpas: até 3, cada uma com 2 a 4 respostas; o que vier fora disso é descartado. */
    private static AiClarificationNeededException clarificationFrom(tools.jackson.databind.JsonNode args) {
        List<AiClarificationNeededException.Question> questions = new java.util.ArrayList<>();
        for (tools.jackson.databind.JsonNode q : args.path("questions")) {
            String text = q.path("question").asText("").trim();
            List<AiClarificationNeededException.Option> options = new java.util.ArrayList<>();
            for (tools.jackson.databind.JsonNode o : q.path("options")) {
                String label = o.path("label").asText("").trim();
                if (!label.isEmpty() && options.size() < 4) {
                    String description = o.path("description").asText("").trim();
                    options.add(new AiClarificationNeededException.Option(label, description.isEmpty() ? null : description));
                }
            }
            if (!text.isEmpty() && options.size() >= 2 && questions.size() < 3) {
                String header = q.path("header").asText("").trim();
                questions.add(new AiClarificationNeededException.Question(text, header.isEmpty() ? null : header, options));
            }
        }
        if (questions.isEmpty()) {
            throw new AiGenerationException("A IA precisou de mais informações, mas não conseguiu formular as perguntas. "
                    + "Descreva a jornada com mais detalhes (qual o objetivo e para quem é).");
        }
        return new AiClarificationNeededException(questions);
    }

    // Erros do mesmo tipo (ex.: dez campos sem identificador) viram uma linha só, com a contagem.
    private static List<String> group(List<String> problems) {
        Map<String, List<String>> byShape = new java.util.LinkedHashMap<>();
        for (String problem : problems) {
            byShape.computeIfAbsent(problem.replaceAll("'[^']*'", "'…'"), k -> new java.util.ArrayList<>()).add(problem);
        }
        List<String> grouped = new java.util.ArrayList<>();
        for (List<String> same : byShape.values()) {
            grouped.add(same.size() == 1 ? same.get(0) : same.get(0) + " (e mais " + (same.size() - 1) + " iguais)");
        }
        return grouped;
    }

    private static String firstOf(String problems) {
        int cut = problems == null ? -1 : problems.indexOf("; ");
        return problems == null ? "" : cut < 0 ? problems : problems.substring(0, cut);
    }

    private static String describe(JourneySpecCompiler.CompiledJourney journey) {
        long screens = journey.nodes().stream().filter(n -> n.getType() == FlowNodeType.USER_TASK).count();
        long fields = journey.nodes().stream().mapToLong(n -> countFields(n.getEmbeddedScreenRoot())).sum();
        return journey.nodes().size() + " etapas, " + screens + " telas, " + fields + " campos, "
                + journey.annotations().size() + " anotações";
    }

    private static long countFields(SduiNode node) {
        if (node == null) {
            return 0;
        }
        long own = node.bindings() != null && node.bindings().containsKey("value") ? 1 : 0;
        return own + (node.children() == null ? 0 : node.children().stream().mapToLong(LlmFlowGenerator::countFields).sum());
    }
}
