package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import com.jouney.admin.domain.form.FormField;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// Conteúdo usado pelo adapter de LLM (GeminiFlowGenerator): as regras de negócio, o schema da tool
// e o mapeamento da saída pro domínio, separados da casca da chamada HTTP (autenticação, formato de
// tool_choice, forma da resposta) — só existiu mais de um adapter (Anthropic, removido) por um tempo.
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
                    + "produto/canal da jornada).";
    static final String SYSTEM_PROMPT = """
            Você projeta o fluxo de uma jornada digital (similar a um diagrama BPMN simplificado) a partir \
            de um pedido em linguagem natural. Se o pedido do usuário for realmente sobre isso, chame a \
            ferramenta generate_flow com o fluxo completo. Se o pedido não tiver nenhuma relação com desenhar \
            um fluxo de jornada (ex.: uma pergunta genérica, um assunto qualquer sem ligação com o produto ou \
            canal informados), chame decline_request explicando o motivo — nunca invente um fluxo só para \
            caber num pedido que não pediu isso. \
            Regras estruturais obrigatórias (quando o pedido for válido e você chamar generate_flow):
            - Exatamente um nó inicial, tipo START ou MESSAGE_START_EVENT, sem entradas e com exatamente uma saída.
            - Ao menos um nó END, cada um com ao menos uma entrada e nenhuma saída.
            - USER_TASK, SERVICE_TASK e RECEIVE_TASK têm ao menos uma entrada e exatamente uma saída — \
            NUNCA mais de uma, mesmo quando a etapa representa uma escolha do usuário (ex.: forma de \
            pagamento, sim/não, tipo de solicitação). Toda decisão que leve a caminhos diferentes exige \
            um GATEWAY logo depois: a USER_TASK só coleta a resposta, e é o GATEWAY seguinte, com uma \
            condição sobre essa resposta (ex.: {{forma_pagamento}} == "cartao"), quem de fato ramifica — \
            nunca conecte a mesma USER_TASK/SERVICE_TASK/RECEIVE_TASK a mais de um nó seguinte.
            - GATEWAY tem ao menos uma entrada e exatamente duas saídas: uma marcada isDefault=true e \
            sem condição, a outra com uma condição não vazia.
            - Toda referência {{variavel}} (em connectorConfig.config, messageText ou condição de \
            GATEWAY) só pode citar uma variável já declarada antes dela no fluxo: as startVariables do \
            START, ou o outputMapping de um conector ancestral — generate_flow não cria nem edita a tela \
            de uma User Task, então não há variável vinda de formulário nesta geração.
            - Todo nó precisa estar em um caminho contínuo entre o início e algum END.
            - Antes de um END alcançado só por SERVICE_TASK REST em sequência (sem nenhuma User Task, \
            Receive Task ou tarefa Kafka no caminho), inclua uma USER_TASK de checkpoint com messageText \
            — sem isso o motor de execução trava.
            - USER_TASK só tem messageText (mensagem exibida ao usuário) — generate_flow nunca cria ou \
            edita a tela embutida (embeddedScreen) de uma User Task, só o editor manual faz isso.
            - connectorType só pode ser um dos conectores habilitados informados no catálogo.
            - Use ids locais simples e únicos por nó (ex.: "start", "n1", "end") pra um nó genuinamente \
            novo — eles são remapeados depois, não precisam seguir nenhum formato. Para um nó que já \
            existe no "Fluxo atual" informado abaixo, USE O MESMO id que ele já tem lá (não invente um \
            novo) — é assim que o sistema sabe que é o mesmo nó, e não uma recriação.
            Sobre o "Fluxo atual" (quando o pedido do usuário não pedir claramente pra recomeçar do \
            zero): trate-o como o ponto de partida, não como referência a ignorar. Um pedido aditivo ou \
            pontual (ex.: "adicione uma tarefa para X", "mude a mensagem da tarefa Y") NUNCA remove ou \
            recria o que já existe e não tem relação com o pedido — reproduza cada nó/conexão não afetado \
            exatamente como está (mesmo id, nome, descrição, messageText, connectorConfig, startVariables) \
            e só adicione/altere o que o pedido pede especificamente: reusar o id de um nó que já tem uma \
            tela desenhada preserva essa tela automaticamente. Só redesenhe tudo do zero quando o pedido \
            pedir isso de forma explícita (ex.: "refaça esse fluxo", "comece de novo", "descarte o que existe").
            Sobre conectores REST: preencha method/url/headers/body (só em POST/PUT/PATCH)/outputMapping \
            dentro de connectorConfig.config. Sobre conectores de mensageria (Kafka/Event Hubs/Service \
            Bus): preencha topic/payload (só em SERVICE_TASK, que produz — RECEIVE_TASK e \
            MESSAGE_START_EVENT só consomem, não têm payload)/outputMapping; deixe clusterId de fora \
            (não há catálogo de clusters disponível aqui — o usuário completa isso depois no canvas).
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
        sb.append(describeCurrentFlow(context));
        sb.append("\n\nPedido do usuário: ").append(context.prompt());
        return sb.toString();
    }

    // O fluxo já desenhado antes deste pedido — o id de cada nó/conexão aqui é o id REAL (não um
    // placeholder), reaproveitado como "id local" pra este turno: a IA repete o mesmo id quando quer
    // manter/ajustar um nó (ver instrução no system prompt), e só inventa um id novo pra algo que
    // está genuinamente criando. Sem isto a IA nunca via o que já existia, e todo pedido — mesmo
    // aditivo — parecia "desenhe do zero" pra ela.
    private static String describeCurrentFlow(GenerationContext context) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n\nFluxo atual desta jornada (ponto de partida deste pedido):");
        if (context.currentFlowNodes().isEmpty()) {
            sb.append(" vazio, nenhum nó desenhado ainda.");
            return sb.toString();
        }
        for (FlowNode node : context.currentFlowNodes()) {
            sb.append("\n- id=").append(node.getId()).append(" | tipo=").append(node.getType())
                    .append(" | nome=\"").append(node.getName()).append('"');
            if (node.getDescription() != null && !node.getDescription().isBlank()) {
                sb.append(" | descrição=\"").append(node.getDescription()).append('"');
            }
            if (node.getMessageText() != null && !node.getMessageText().isBlank()) {
                sb.append(" | messageText=\"").append(node.getMessageText()).append('"');
            }
            if (node.getConnectorConfig() != null) {
                sb.append(" | connectorConfig={type=").append(node.getConnectorConfig().getConnectorType())
                        .append(", config=").append(node.getConnectorConfig().getConfig()).append('}');
            }
            if (node.getStartVariables() != null && !node.getStartVariables().isEmpty()) {
                sb.append(" | startVariables=").append(node.getStartVariables());
            }
            if (node.getEmbeddedScreen() != null && !node.getEmbeddedScreen().isEmpty()) {
                sb.append(" | já tem tela desenhada com os campos: ")
                        .append(node.getEmbeddedScreen().stream().map(FormField::getName).toList())
                        .append(" (preservada automaticamente se você reusar o id)");
            }
        }
        sb.append("\nConexões atuais (sourceId -> targetId):");
        if (context.currentFlowConnections().isEmpty()) {
            sb.append(" nenhuma.");
        } else {
            for (FlowConnection c : context.currentFlowConnections()) {
                sb.append("\n- ").append(c.getSourceNodeId()).append(" -> ").append(c.getTargetNodeId());
                if (c.getCondition() != null && !c.getCondition().isBlank()) {
                    sb.append(" [condição: ").append(c.getCondition()).append(']');
                }
                if (c.isDefault()) {
                    sb.append(" [padrão]");
                }
            }
        }
        return sb.toString();
    }

    // JSON Schema puro (sem o envelope específico do provedor — GeminiFlowGenerator empacota isto
    // sob "parameters" ao montar a tool).
    static Map<String, Object> schema() {
        Map<String, Object> nodeProps = new LinkedHashMap<>();
        nodeProps.put("id", Map.of("type", "string", "description", "Identificador local único dentro deste fluxo"));
        nodeProps.put("type", Map.of("type", "string", "enum",
                List.of("START", "USER_TASK", "END", "SERVICE_TASK", "RECEIVE_TASK", "MESSAGE_START_EVENT", "GATEWAY")));
        nodeProps.put("name", Map.of("type", "string"));
        nodeProps.put("description", Map.of("type", "string"));
        nodeProps.put("messageText", Map.of("type", "string", "description", "Mensagem exibida quando USER_TASK não tem tela desenhada"));
        nodeProps.put("connectorConfig", Map.of("type", "object", "properties", connectorConfigProps()));
        nodeProps.put("startVariables", Map.of("type", "array", "description", "Só no nó START", "items", Map.of(
                "type", "object", "properties", Map.of(
                        "name", Map.of("type", "string"),
                        "type", Map.of("type", "string", "enum", List.of("string", "number", "boolean", "date", "datetime"))))));

        Map<String, Object> connectionProps = Map.of(
                "sourceId", Map.of("type", "string"),
                "targetId", Map.of("type", "string"),
                "condition", Map.of("type", "string", "description", "Só na saída não padrão de um GATEWAY"),
                "isDefault", Map.of("type", "boolean", "description", "true na saída padrão de um GATEWAY"));

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("name", Map.of("type", "string", "description", "Nome curto do fluxo"));
        properties.put("nodes", Map.of("type", "array", "items", Map.of(
                "type", "object", "properties", nodeProps, "required", List.of("id", "type", "name"))));
        properties.put("connections", Map.of("type", "array", "items", Map.of(
                "type", "object", "properties", connectionProps, "required", List.of("sourceId", "targetId"))));

        return Map.of("type", "object", "properties", properties, "required", List.of("name", "nodes", "connections"));
    }

    private static Map<String, Object> connectorConfigProps() {
        Map<String, Object> outputMappingItem = Map.of("type", "object", "properties", Map.of(
                "name", Map.of("type", "string"),
                "jsonPath", Map.of("type", "string", "description", "Ex.: $.campo, $.lista[0].id"),
                "type", Map.of("type", "string", "enum", List.of("string", "number", "boolean", "date", "datetime"))),
                "required", List.of("name", "jsonPath"));

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("method", Map.of("type", "string", "enum", List.of("GET", "POST", "PUT", "PATCH", "DELETE"), "description", "Só REST"));
        config.put("url", Map.of("type", "string", "description", "Só REST — pode referenciar {{variavel}}"));
        config.put("headers", Map.of("type", "object", "description", "Só REST, opcional"));
        config.put("body", Map.of("type", "object", "description", "Só REST em POST/PUT/PATCH"));
        config.put("topic", Map.of("type", "string", "description", "Só Kafka/Event Hubs/Service Bus — nome do tópico/fila/Event Hub"));
        config.put("payload", Map.of("type", "object", "description", "Só Kafka/Event Hubs/Service Bus em SERVICE_TASK (produz) — pode referenciar {{variavel}}"));
        config.put("outputMapping", Map.of("type", "array", "description",
                "Variáveis extraídas da resposta/mensagem, disponíveis como {{name}} pra nós seguintes", "items", outputMappingItem));

        return Map.of(
                "connectorType", Map.of("type", "string", "enum", List.of("REST", "KAFKA", "EVENT_HUBS", "SERVICE_BUS")),
                "config", Map.of("type", "object", "properties", config));
    }

    static Map<String, Object> declineSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of("reason", Map.of("type", "string",
                        "description", "Explicação curta, em pt-BR, de por que esse pedido não é sobre gerar um fluxo de jornada.")),
                "required", List.of("reason"));
    }

    // existingNodesById: o fluxo atual (mesmo que descreveCurrentFlow mostrou à IA), chaveado pelo id
    // real — quando a IA reusa esse id pra um nó da resposta, o id/posição/tela desenhada desse nó
    // são preservados em vez de recriados do zero (ver idsByLocalId/resolveEmbeddedScreen abaixo).
    static GeneratedFlow toDomain(LlmFlowOutput output, Map<String, FlowNode> existingNodesById) {
        Map<String, String> idsByLocalId = new HashMap<>();
        for (LlmNode node : output.nodes()) {
            idsByLocalId.put(node.id(), existingNodesById.containsKey(node.id()) ? node.id() : FlowIds.newNodeId());
        }

        List<FlowNode> nodes = new ArrayList<>();
        int i = 0;
        for (LlmNode node : output.nodes()) {
            ConnectorConfig connectorConfig = toConnectorConfigOrNull(node.connectorConfig());
            List<FormField> embeddedScreen = resolveEmbeddedScreen(node, existingNodesById);
            // Nó reaproveitado (mesmo id do fluxo atual) mantém a posição de onde já estava no canvas —
            // só um nó genuinamente novo recebe a posição em grade calculada pelo índice.
            FlowNode existing = existingNodesById.get(node.id());
            int positionX = existing != null ? existing.getPositionX() : (i % 6) * 40;
            int positionY = existing != null ? existing.getPositionY() : (i / 6) * 40;
            nodes.add(new FlowNode(idsByLocalId.get(node.id()), parseEnumOrThrow(FlowNodeType.class, node.type()),
                    node.name(), node.description(), positionX, positionY,
                    connectorConfig, node.startVariables(), node.messageText(), embeddedScreen, null));
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

    // generate_flow nunca cria/edita a tela embutida de uma User Task — reusando o id de um nó
    // existente, a tela que ele já tinha desenhada à mão é preservada; um nó genuinamente novo nasce
    // sem tela (só messageText).
    private static List<FormField> resolveEmbeddedScreen(LlmNode node, Map<String, FlowNode> existingNodesById) {
        FlowNode existingNode = existingNodesById.get(node.id());
        return existingNode != null && existingNode.getEmbeddedScreen() != null ? existingNode.getEmbeddedScreen() : List.of();
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

    record LlmFlowOutput(String name, List<LlmNode> nodes, List<LlmConnection> connections) {
    }

    record LlmNode(String id, String type, String name, String description, String messageText,
                    LlmConnectorConfig connectorConfig, List<Map<String, Object>> startVariables) {
    }

    record LlmConnectorConfig(String connectorType, Map<String, Object> config) {
    }

    record LlmConnection(String sourceId, String targetId, String condition, Boolean isDefault) {
    }
}
