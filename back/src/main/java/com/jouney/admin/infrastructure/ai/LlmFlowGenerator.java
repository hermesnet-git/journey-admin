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
    private static final int MAX_ATTEMPTS = 3;
    // O pedido só fala de mensageria se citar uma destas palavras; fora isso, um início por mensagem é
    // invenção do modelo (modelos leves preenchem objetos opcionais do esquema só porque existem).
    // Entradas da jornada (dados que o canal já envia ao iniciar) só se o pedido disser isso; senão o modelo
    // as inventa (ex.: um cpf que a própria jornada pede numa tela) e a execução exige um dado que ninguém envia.
    private static final java.util.regex.Pattern INPUT_WORDS = java.util.regex.Pattern.compile(
            "(?i)entrada|par[aâ]metro|recebe|receb|enviad[oa] pelo canal|vem do canal|j[aá] informad|autenticad|logad|identificad");
    private static final java.util.regex.Pattern MESSAGING_WORDS = java.util.regex.Pattern.compile(
            "(?i)mensag|kafka|evento|event ?hubs?|service ?bus|fila|mensageria|webhook|publica|assina");
    private static final List<AiModelClient.ToolSpec> TOOLS = List.of(
            new AiModelClient.ToolSpec(JourneyGenerationPrompt.TOOL_NAME, JourneyGenerationPrompt.TOOL_DESCRIPTION,
                    JourneySpecSchema.schema()),
            new AiModelClient.ToolSpec(JourneyGenerationPrompt.DECLINE_TOOL_NAME, JourneyGenerationPrompt.DECLINE_TOOL_DESCRIPTION,
                    JourneySpecSchema.declineSchema()));

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
                    JourneyGenerationPrompt.SYSTEM_PROMPT, currentPrompt, TOOLS);
            onProgress.accept("Tentativa " + attempt + ": resposta recebida em "
                    + String.format("%.1fs", (System.currentTimeMillis() - start) / 1000.0) + ".");
            if (JourneyGenerationPrompt.DECLINE_TOOL_NAME.equals(call.name())) {
                throw new AiRequestDeclinedException(call.args().path("reason").asText());
            }

            List<String> problems;
            try {
                JourneySpec spec = objectMapper.treeToValue(call.args(), JourneySpec.class);
                if (spec.inputs() != null && !INPUT_WORDS.matcher(context.prompt() + " " + context.journeyDescription()).find()) {
                    spec = new JourneySpec(spec.name(), null, spec.startMessage(), spec.steps(), spec.sections(), spec.notes());
                }
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
