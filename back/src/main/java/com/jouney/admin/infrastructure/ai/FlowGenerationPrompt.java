package com.jouney.admin.infrastructure.ai;

import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import com.jouney.admin.domain.form.DuplicateFieldNameException;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.FormRepository;
import com.jouney.admin.domain.form.InputSubtype;
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

// Conteúdo usado pelo adapter de LLM (GeminiFlowGenerator): as regras de negócio, o schema da tool
// e o mapeamento da saída pro domínio, separados da casca da chamada HTTP (autenticação, formato de
// tool_choice, forma da resposta) — só existiu mais de um adapter (Anthropic, removido) por um tempo.
final class FlowGenerationPrompt {

    static final String TOOL_NAME = "generate_flow";
    static final String TOOL_DESCRIPTION =
            "Gera a estrutura completa (nós, conexões e, se necessário, formulários novos) do fluxo de uma jornada.";
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
            - USER_TASK, SERVICE_TASK e RECEIVE_TASK têm ao menos uma entrada e exatamente uma saída — \
            NUNCA mais de uma, mesmo quando a etapa representa uma escolha do usuário (ex.: forma de \
            pagamento, sim/não, tipo de solicitação). Toda decisão que leve a caminhos diferentes exige \
            um GATEWAY logo depois: a USER_TASK só coleta a resposta (num campo do formulário), e é o \
            GATEWAY seguinte, com uma condição sobre esse campo (ex.: {{forma_pagamento}} == "cartao"), \
            quem de fato ramifica — nunca conecte a mesma USER_TASK/SERVICE_TASK/RECEIVE_TASK a mais de \
            um nó seguinte.
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
            nenhum servir), ou um newFormId apontando pra um item de newForms, ou nenhum dos três.
            - connectorType só pode ser um dos conectores habilitados informados no catálogo.
            - Use ids locais simples e únicos por nó (ex.: "start", "n1", "end") — eles são remapeados \
            depois, não precisam seguir nenhum formato.
            Sobre formulários: prefira SEMPRE reaproveitar um formulário existente do catálogo (via \
            formId) quando ele já cobrir o que a etapa precisa coletar, mesmo que os nomes dos campos \
            não batam perfeitamente. Só inclua um item novo em newForms quando genuinamente não existir \
            nada parecido no catálogo. Nunca tente alterar um formulário existente — generate_flow não \
            tem esse poder, só criar um novo (em newForms) ou referenciar um existente sem tocar nele. \
            Dê nomes de campo (name) em snake_case ou camelCase simples, sem espaço — eles viram \
            variáveis de processo referenciáveis como {{nome_do_campo}} por nós seguintes. \
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

    // JSON Schema puro (sem o envelope específico do provedor — GeminiFlowGenerator empacota isto
    // sob "parameters" ao montar a tool).
    static Map<String, Object> schema() {
        Map<String, Object> nodeProps = new LinkedHashMap<>();
        nodeProps.put("id", Map.of("type", "string", "description", "Identificador local único dentro deste fluxo"));
        nodeProps.put("type", Map.of("type", "string", "enum",
                List.of("START", "USER_TASK", "END", "SERVICE_TASK", "RECEIVE_TASK", "MESSAGE_START_EVENT", "GATEWAY")));
        nodeProps.put("name", Map.of("type", "string"));
        nodeProps.put("description", Map.of("type", "string"));
        nodeProps.put("formId", Map.of("type", "string", "description", "UUID de um formulário do catálogo (só USER_TASK) — use isto OU newFormId, nunca os dois"));
        nodeProps.put("newFormId", Map.of("type", "string", "description", "Id local de um item de newForms (só USER_TASK) — use isto OU formId, nunca os dois"));
        nodeProps.put("messageText", Map.of("type", "string", "description", "Mensagem exibida quando USER_TASK não tem formId nem newFormId"));
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
        properties.put("newForms", Map.of("type", "array",
                "description", "Formulários novos a criar — só quando nada do catálogo servir (ver regras no system prompt)",
                "items", Map.of("type", "object", "properties", newFormProps(), "required", List.of("id", "name", "fields"))));

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

    private static Map<String, Object> newFormProps() {
        Map<String, Object> fieldProps = new LinkedHashMap<>();
        fieldProps.put("name", Map.of("type", "string", "description", "snake_case ou camelCase, sem espaço — vira {{name}}"));
        fieldProps.put("type", Map.of("type", "string",
                "enum", List.of("TEXT", "INPUT", "SINGLE_SELECT", "MULTI_SELECT", "FILE_UPLOAD")));
        fieldProps.put("inputSubtype", Map.of("type", "string", "enum", List.of("TEXT", "NUMBER", "EMAIL", "DATE"),
                "description", "Só quando type=INPUT"));
        fieldProps.put("label", Map.of("type", "string", "description", "Rótulo exibido ao usuário"));
        fieldProps.put("required", Map.of("type", "boolean"));
        fieldProps.put("helpText", Map.of("type", "string", "description", "Opcional"));
        fieldProps.put("options", Map.of("type", "array", "description", "Só quando type=SINGLE_SELECT ou MULTI_SELECT",
                "items", Map.of("type", "object", "properties", Map.of(
                        "label", Map.of("type", "string"), "value", Map.of("type", "string")),
                        "required", List.of("label", "value"))));

        return Map.of(
                "id", Map.of("type", "string", "description", "Identificador local único — referenciado por newFormId nos nós"),
                "name", Map.of("type", "string"),
                "description", Map.of("type", "string"),
                "fields", Map.of("type", "array", "items", Map.of(
                        "type", "object", "properties", fieldProps, "required", List.of("name", "type", "label"))));
    }

    static Map<String, Object> declineSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of("reason", Map.of("type", "string",
                        "description", "Explicação curta, em pt-BR, de por que esse pedido não é sobre gerar um fluxo de jornada.")),
                "required", List.of("reason"));
    }

    // Cria os newForms do LLM pelo mesmo caminho de domínio que a criação manual usa (Form.create +
    // FormRepository.save — o mesmo que CreateForm faz, sem nenhuma orquestração extra) — herda
    // DuplicateFieldNameException e qualquer regra futura de Form automaticamente, sem duplicar nada.
    // generate_flow nunca expõe uma forma de EDITAR um formulário existente — só isto (criar novo) ou
    // referenciar um existente pelo formId do catálogo, então "nunca alterar um formulário já
    // associado a uma jornada" vale por construção, não por uma checagem em tempo de execução.
    static Map<String, UUID> createNewForms(FormRepository formRepository, List<LlmNewForm> newForms) {
        Map<String, UUID> idsByLocalId = new LinkedHashMap<>();
        for (LlmNewForm newForm : newForms) {
            List<FormField> fields = newForm.fields().stream().map(FlowGenerationPrompt::toFormField).toList();
            try {
                Form saved = formRepository.save(Form.create(newForm.name(), newForm.description(), fields));
                idsByLocalId.put(newForm.id(), saved.getId());
            } catch (DuplicateFieldNameException ex) {
                throw new AiGenerationException("Formulário '" + newForm.name() + "' inválido: " + ex.getMessage());
            }
        }
        return idsByLocalId;
    }

    // Mesmo filtro que GenerateFlow/UpdateFlow aplicam aos formulários existentes: TEXT (só exibe,
    // não coleta) e FILE_UPLOAD (referência a arquivo) não viram variável de processo.
    static List<String> variableFieldNames(LlmNewForm form) {
        return form.fields().stream()
                .filter(f -> !"TEXT".equals(f.type()) && !"FILE_UPLOAD".equals(f.type()))
                .map(LlmFormField::name)
                .toList();
    }

    private static FormField toFormField(LlmFormField f) {
        InputSubtype inputSubtype = f.inputSubtype() != null && !f.inputSubtype().isBlank()
                ? InputSubtype.valueOf(f.inputSubtype()) : null;
        List<FormFieldOption> options = f.options() == null ? List.of()
                : f.options().stream().map(o -> new FormFieldOption(o.label(), o.value())).toList();
        return new FormField(f.name(), parseEnumOrThrow(FormFieldType.class, f.type()), inputSubtype, f.label(),
                Boolean.TRUE.equals(f.required()), null, f.helpText(), options, null, null, null, null, null);
    }

    static GeneratedFlow toDomain(LlmFlowOutput output, Map<String, UUID> newFormIdsByLocalId) {
        Map<String, String> idsByLocalId = new HashMap<>();
        for (LlmNode node : output.nodes()) {
            idsByLocalId.put(node.id(), FlowIds.newNodeId());
        }

        List<FlowNode> nodes = new ArrayList<>();
        int i = 0;
        for (LlmNode node : output.nodes()) {
            ConnectorConfig connectorConfig = toConnectorConfigOrNull(node.connectorConfig());
            UUID formId = node.newFormId() != null && newFormIdsByLocalId.containsKey(node.newFormId())
                    ? newFormIdsByLocalId.get(node.newFormId())
                    : parseUuidOrNull(node.formId());
            nodes.add(new FlowNode(idsByLocalId.get(node.id()), parseEnumOrThrow(FlowNodeType.class, node.type()),
                    node.name(), node.description(), (i % 6) * 40, (i / 6) * 40, formId,
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

    record LlmFlowOutput(String name, List<LlmNode> nodes, List<LlmConnection> connections, List<LlmNewForm> newForms) {
        // newForms é opcional na saída do modelo — Jackson deixa null se ele não incluir o campo.
        LlmFlowOutput {
            newForms = newForms != null ? newForms : List.of();
        }
    }

    record LlmNode(String id, String type, String name, String description, String formId, String newFormId,
                    String messageText, LlmConnectorConfig connectorConfig, List<Map<String, Object>> startVariables) {
    }

    record LlmConnectorConfig(String connectorType, Map<String, Object> config) {
    }

    record LlmConnection(String sourceId, String targetId, String condition, Boolean isDefault) {
    }

    record LlmNewForm(String id, String name, String description, List<LlmFormField> fields) {
    }

    record LlmFormField(String name, String type, String inputSubtype, String label, Boolean required,
                         String helpText, List<LlmFormFieldOption> options) {
    }

    record LlmFormFieldOption(String label, String value) {
    }
}
