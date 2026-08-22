package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// Conteúdo compartilhado entre os adapters de LLM (AnthropicFlowGenerator, GeminiFlowGenerator): as
// mesmas regras de negócio, o mesmo schema da tool e o mesmo mapeamento da saída pro domínio — só a
// casca da chamada HTTP (autenticação, formato de tool_choice, forma da resposta) muda por provedor.
final class FlowGenerationPrompt {

    static final String TOOL_NAME = "generate_flow";
    static final String TOOL_DESCRIPTION = "Gera a estrutura completa (nós e conexões) do fluxo de uma jornada.";
    // Segunda ferramenta, tão obrigatória de declarar quanto generate_flow: como tool_choice força o
    // modelo a chamar ALGUMA ferramenta, sem uma saída de recusa ele "obedece" qualquer pedido — até
    // um sem nenhuma relação com desenho de jornada — e inventa um fluxo sem sentido pra caber nele.
    static final String DECLINE_TOOL_NAME = "decline_request";
    static final String DECLINE_TOOL_DESCRIPTION =
            "Chame isto em vez de generate_flow quando o pedido do usuário não for sobre desenhar/gerar o fluxo "
                    + "de uma jornada digital (ex.: perguntas genéricas, assuntos sem nenhuma relação com o "
                    + "produto/canal/formulários da jornada).";
    static final String SYSTEM_PROMPT = """
            Você projeta o fluxo de uma jornada digital (similar a um diagrama BPMN simplificado) a partir \
            de um pedido em linguagem natural. Se o pedido do usuário for realmente sobre isso, chame a \
            ferramenta generate_flow com o fluxo completo. Se o pedido não tiver nenhuma relação com desenhar \
            um fluxo de jornada (ex.: uma pergunta genérica, um assunto qualquer sem ligação com o produto, \
            canal ou formulários informados), chame decline_request explicando o motivo — nunca invente um \
            fluxo só para caber num pedido que não pediu isso. \
            Regras estruturais obrigatórias (quando o pedido for válido e você chamar generate_flow):
            - Exatamente um nó inicial, tipo START ou MESSAGE_START_EVENT, sem entradas e com exatamente uma saída.
            - Ao menos um nó END, cada um com ao menos uma entrada e nenhuma saída.
            - USER_TASK, SERVICE_TASK e RECEIVE_TASK têm ao menos uma entrada e exatamente uma saída.
            - GATEWAY tem ao menos uma entrada e exatamente duas saídas: uma marcada isDefault=true e \
            sem condição, a outra com uma condição não vazia.
            - Toda referência {{variavel}} (em connectorConfig.config, messageText ou condição de \
            GATEWAY) só pode citar uma variável já declarada antes dela no fluxo: as startVariables do \
            START, o outputMapping de um conector ancestral, ou os campos de um formulário de um \
            USER_TASK ancestral (ver catálogo de formulários abaixo).
            - Todo nó precisa estar em um caminho contínuo entre o início e algum END.
            - Antes de um END alcançado só por SERVICE_TASK REST em sequência (sem nenhuma User Task, \
            Receive Task ou tarefa Kafka no caminho), inclua uma USER_TASK de checkpoint (pode ser sem \
            formulário, só com messageText) — sem isso o motor de execução trava.
            - USER_TASK referencia um formId do catálogo (fica sem formulário, com messageText, se \
            nenhum servir) ou nenhum dos dois.
            - connectorType só pode ser um dos conectores habilitados informados no catálogo.
            - Use ids locais simples e únicos por nó (ex.: "start", "n1", "end") — eles são remapeados \
            depois, não precisam seguir nenhum formato.
            """;

    private FlowGenerationPrompt() {
    }

    // RestClient sem timeout configurado nunca falha rápido numa chamada travada — pode prender a
    // virtual thread indefinidamente. 20s pra conectar, 90s pra ler a resposta (o suficiente até pra
    // um fluxo complexo, mas ainda finito) — combinado com o timeout de 300s do SseEmitter, garante
    // que 3 tentativas malsucedidas terminem numa resposta de erro em vez de a conexão SSE fechar
    // sozinha antes do resultado chegar.
    static RestClient.Builder timeoutedRestClientBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(20));
        factory.setReadTimeout(Duration.ofSeconds(90));
        return RestClient.builder().requestFactory(factory);
    }

    // Nomes dos nós recebidos, não só a contagem — dá pra acompanhar o que a IA realmente montou em
    // vez de só um número, sem esperar o resultado final aparecer no canvas.
    static String describeFlow(GeneratedFlow flow) {
        String names = flow.nodes().stream().map(FlowNode::getName).collect(Collectors.joining(", "));
        return flow.nodes().size() + " nó(s), " + flow.connections().size() + " conexão(ões): " + names;
    }

    // Uma linha por violação (não tudo junto separado por ";") — mais fácil de acompanhar o que
    // exatamente vai ser pedido de correção pro modelo.
    static void reportViolations(Consumer<String> onProgress, int attempt, List<String> violations) {
        onProgress.accept("Tentativa " + attempt + ": fluxo inválido, " + violations.size() + " problema(s) encontrado(s):");
        for (String violation : violations) {
            onProgress.accept("  • " + violation);
        }
    }

    static String buildUserPrompt(GenerationContext context) {
        StringBuilder sb = new StringBuilder();
        sb.append("Jornada: ").append(context.journeyName());
        if (context.journeyDescription() != null && !context.journeyDescription().isBlank()) {
            sb.append(" — ").append(context.journeyDescription());
        }
        sb.append("\nProduto: ").append(context.productName());
        sb.append("\nCanal: ").append(context.channelName()).append(" (").append(context.channelType()).append(")");
        sb.append("\nConectores habilitados: ").append(context.enabledConnectors());
        sb.append("\nFormulários disponíveis (formId | nome | campos):");
        if (context.forms().isEmpty()) {
            sb.append(" nenhum cadastrado.");
        } else {
            for (var form : context.forms()) {
                sb.append("\n- ").append(form.id()).append(" | ").append(form.name())
                        .append(" | campos: ").append(form.fieldNames());
            }
        }
        sb.append("\n\nPedido do usuário: ").append(context.prompt());
        return sb.toString();
    }

    // JSON Schema puro (sem o envelope específico de cada provedor — Anthropic usa "input_schema",
    // Gemini usa "parameters" — cada adapter empacota isto do seu próprio jeito).
    static Map<String, Object> schema() {
        Map<String, Object> nodeProps = new LinkedHashMap<>();
        nodeProps.put("id", Map.of("type", "string", "description", "Identificador local único dentro deste fluxo"));
        nodeProps.put("type", Map.of("type", "string", "enum",
                List.of("START", "USER_TASK", "END", "SERVICE_TASK", "RECEIVE_TASK", "MESSAGE_START_EVENT", "GATEWAY")));
        nodeProps.put("name", Map.of("type", "string"));
        nodeProps.put("description", Map.of("type", "string"));
        nodeProps.put("formId", Map.of("type", "string", "description", "UUID de um formulário do catálogo (só USER_TASK)"));
        nodeProps.put("messageText", Map.of("type", "string", "description", "Mensagem exibida quando USER_TASK não tem formId"));
        nodeProps.put("connectorConfig", Map.of("type", "object", "properties", Map.of(
                "connectorType", Map.of("type", "string", "enum", List.of("REST", "KAFKA", "EVENT_HUBS", "SERVICE_BUS")),
                "config", Map.of("type", "object", "description",
                        "Campos do conector: method/url/headers/body/outputMapping (REST) ou topic/operation/outputMapping (Kafka/Event Hubs/Service Bus)"))));
        nodeProps.put("startVariables", Map.of("type", "array", "description", "Só no nó START", "items", Map.of(
                "type", "object", "properties", Map.of(
                        "name", Map.of("type", "string"),
                        "type", Map.of("type", "string", "enum", List.of("string", "number", "boolean", "date", "datetime"))))));

        Map<String, Object> connectionProps = Map.of(
                "sourceId", Map.of("type", "string"),
                "targetId", Map.of("type", "string"),
                "condition", Map.of("type", "string", "description", "Só na saída não padrão de um GATEWAY"),
                "isDefault", Map.of("type", "boolean", "description", "true na saída padrão de um GATEWAY"));

        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "name", Map.of("type", "string", "description", "Nome curto do fluxo"),
                        "nodes", Map.of("type", "array", "items", Map.of(
                                "type", "object", "properties", nodeProps, "required", List.of("id", "type", "name"))),
                        "connections", Map.of("type", "array", "items", Map.of(
                                "type", "object", "properties", connectionProps, "required", List.of("sourceId", "targetId")))),
                "required", List.of("name", "nodes", "connections"));
    }

    static Map<String, Object> declineSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of("reason", Map.of("type", "string",
                        "description", "Explicação curta, em pt-BR, de por que esse pedido não é sobre gerar um fluxo de jornada.")),
                "required", List.of("reason"));
    }

    static GeneratedFlow toDomain(LlmFlowOutput output) {
        Map<String, String> idsByLocalId = new HashMap<>();
        for (LlmNode node : output.nodes()) {
            idsByLocalId.put(node.id(), FlowIds.newNodeId());
        }

        List<FlowNode> nodes = new ArrayList<>();
        int i = 0;
        for (LlmNode node : output.nodes()) {
            ConnectorConfig connectorConfig = toConnectorConfigOrNull(node.connectorConfig());
            nodes.add(new FlowNode(idsByLocalId.get(node.id()), parseEnumOrThrow(FlowNodeType.class, node.type()),
                    node.name(), node.description(), (i % 6) * 40, (i / 6) * 40, parseUuidOrNull(node.formId()),
                    connectorConfig, node.startVariables(), node.messageText()));
            i++;
        }

        // condition/isDefault só fazem sentido numa saída de GATEWAY (mesma regra do FlowValidator) —
        // a IA às vezes marca isDefault=true em conexões de outros tipos de nó mesmo assim, o que faz
        // o canvas rotular a linha como "padrão" sem nenhum gateway envolvido. Descartado aqui pra
        // qualquer conexão cuja origem não seja GATEWAY, igual ao tratamento de connectorConfig acima.
        Set<String> gatewayLocalIds = output.nodes().stream()
                .filter(n -> "GATEWAY".equals(n.type()))
                .map(LlmNode::id)
                .collect(Collectors.toSet());
        List<FlowConnection> connections = output.connections().stream()
                .map(c -> {
                    boolean fromGateway = gatewayLocalIds.contains(c.sourceId());
                    return new FlowConnection(FlowIds.newConnectionId(), idsByLocalId.get(c.sourceId()),
                            idsByLocalId.get(c.targetId()), fromGateway ? c.condition() : null,
                            fromGateway && Boolean.TRUE.equals(c.isDefault()));
                })
                .toList();

        return new GeneratedFlow(output.name(), nodes, connections);
    }

    // connectorConfig é sempre opcional no domínio (FlowNode aceita null pra qualquer tipo de nó) —
    // um connectorType ausente/inválido é tratado como "sem conector" em vez de erro fatal, já que a
    // IA às vezes devolve um connectorConfig incompleto pra nós que não precisavam de um de verdade.
    private static ConnectorConfig toConnectorConfigOrNull(LlmConnectorConfig config) {
        if (config == null || config.connectorType() == null || config.connectorType().isBlank()) {
            return null;
        }
        try {
            return new ConnectorConfig(ConnectorType.valueOf(config.connectorType()), config.config(), null);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static <E extends Enum<E>> E parseEnumOrThrow(Class<E> type, String value) {
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new AiGenerationException("Valor inválido retornado pela IA para " + type.getSimpleName() + ": " + value);
        }
    }

    private static UUID parseUuidOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    record LlmFlowOutput(String name, List<LlmNode> nodes, List<LlmConnection> connections) {
    }

    record LlmNode(String id, String type, String name, String description, String formId, String messageText,
                    LlmConnectorConfig connectorConfig, List<Map<String, Object>> startVariables) {
    }

    record LlmConnectorConfig(String connectorType, Map<String, Object> config) {
    }

    record LlmConnection(String sourceId, String targetId, String condition, Boolean isDefault) {
    }
}
