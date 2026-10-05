package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.sdui.SduiBinding;
import com.jouney.admin.domain.sdui.SduiEvent;
import com.jouney.admin.domain.sdui.SduiNode;
import com.jouney.admin.domain.sdui.SduiVisibility;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enforces REQ-03.01.004, REQ-03.02.004/005/006 and REQ-03.07.005: exactly
 * one start element (START or MESSAGE_START_EVENT) and one END; the start
 * element has no input and exactly one output; USER_TASK/SERVICE_TASK/
 * RECEIVE_TASK have at least one input and exactly one output; END has at
 * least one input and no outputs; every node sits on a continuous path
 * reachable from the start element and able to reach END. Also enforces
 * REQ-03.08.004 (connector must be enabled), REQ-03.09.007 (REST is not a
 * valid connector for MESSAGE_START_EVENT — it starts the flow from an
 * incoming message, it never calls out) and REQ-03.09.008 (Kafka operation is
 * implied by the node's role: SERVICE_TASK produces, RECEIVE_TASK and
 * MESSAGE_START_EVENT only ever consume). REQ-03.11.001/002/003/006: a GATEWAY node has at least
 * one input and two or more outputs, exactly one of which is the default (no condition) and every
 * other carrying a non-blank condition — evaluated in list order, the first true one wins.
 */
public final class FlowValidator {

    private static final Set<FlowNodeType> START_TYPES = Set.of(FlowNodeType.START, FlowNodeType.MESSAGE_START_EVENT);
    private static final Map<FlowNodeType, String> BROKER_OPERATION_BY_TYPE = Map.of(
            FlowNodeType.SERVICE_TASK, "PRODUCE",
            FlowNodeType.RECEIVE_TASK, "CONSUME",
            FlowNodeType.MESSAGE_START_EVENT, "CONSUME");
    // REQ-03.12.001: same type vocabulary as an outputMapping rule's "type".
    private static final Set<String> VALID_VARIABLE_TYPES = Set.of("string", "number", "boolean", "date", "datetime");
    // REQ-03.09.012: {{name}} references in connectorConfig fields (url, headers, body/payload).
    // Hífen incluído — nome de outputMapping vem de um campo de resposta REST real, que pode ser
    // kebab-case (ex.: user-id); mesmo padrão de VariableTemplate.java, que resolve isso em
    // runtime — sem os dois casarem, um nome assim nunca era detectado aqui (nem violação, nem
    // reconhecido) e nunca resolvia lá.
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_-]*)\\s*\\}\\}");
    // {{form.cpf}}/{{data.pedido}} é a grafia do contrato de TELA. Em conector, mensageria e Decisão o
    // token é o nome da variável no motor ({{form_cpf}}, {{data_pedido}}; o canal é {{channel}}).
    // VARIABLE_TOKEN não casa token com ponto — sem este padrão ele passaria em silêncio e iria
    // literal pro destino (URL, payload, condição).
    private static final Pattern DOTTED_TOKEN = Pattern.compile("\\{\\{\\s*((?:form|data)\\.[A-Za-z0-9_.-]+)\\s*\\}\\}");

    // Seção 8 do catálogo SDUI: os 2 namespaces de binding permitidos — form (valores editáveis da
    // jornada) e data (dados somente leitura).
    private static final Set<String> VALID_BINDING_NAMESPACES =
            Set.of("form.", "data.");
    // Seção 9 do catálogo SDUI: as ações do Action Registry. action.retry ("Tentar novamente") refaz a
    // montagem da tela — usado quando uma fonte de dados obrigatória falha (ADR-002).
    private static final Set<String> VALID_SDUI_ACTIONS = Set.of("action.submit", "action.navigate",
            "action.openUrl", "action.setValue", "action.track", "action.dismiss", "action.retry");
    // Lista de seleção (ADR-002): nome de apelido de fonte de dados e id de ação; a regra "liberada
    // quando" de uma ação é uma comparação simples contra um campo do item.
    private static final Pattern ALIAS = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
    private static final Pattern ACTION_ID = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Pattern ENABLED_WHEN = Pattern.compile(
            "^\\s*\\{\\{\\s*item\\.([A-Za-z_][\\w-]*)\\s*\\}\\}\\s*(==|!=)\\s*(true|false|-?\\d+(?:\\.\\d+)?|\"[^\"]*\")\\s*$");
    private static final Set<String> VALID_ACTION_VARIANTS = Set.of("primary", "secondary", "danger");
    // Limites do WhatsApp (botões de resposta) — só valem quando a jornada tem esse canal.
    private static final int WHATSAPP_MAX_ACTIONS = 3;
    private static final int WHATSAPP_MAX_ACTION_LABEL = 20;
    // equals/notEquals: seção 14.2 do catálogo (único shape exemplificado). in/notIn: extensão
    // pontual pra suportar "visível nestes canais" (lista de valores) sem virar lógica booleana
    // composta — continua uma única regra, só que contra um conjunto de valores em vez de um só.
    private static final Set<String> VALID_VISIBILITY_RULES = Set.of("equals", "notEquals", "in", "notIn");
    private static final Pattern SEMVER = Pattern.compile("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$");
    // Placeholder dentro de uma tela desenhada carrega o namespace: {{form.nome}} / {{data.pedido}}
    // (contrato) ou {{form_nome}} / {{data_pedido}} (o nome da variável no motor) — padrão próprio,
    // com ponto, sublinhado e hífen, idêntico a TemplateResolver.PLACEHOLDER (ms-espec-registry, quem
    // de fato resolve em runtime). VARIABLE_TOKEN acima vale pro token de conector/Gateway, onde não
    // existe ponto.
    private static final Pattern SCREEN_PLACEHOLDER = Pattern.compile("\\{\\{\\s*([A-Za-z_][\\w.-]*)\\s*\\}\\}");
    private static final Set<String> INPUT_COMPONENTS = Set.of("ui.textInput", "ui.textArea", "ui.select",
            "ui.checkbox", "ui.datePicker");
    private static final Set<String> VALID_DATE_PICKER_MODES = Set.of("date", "time", "dateTime");
    // Nome de variável de processo reservado: injetado pelo ms-espec-registry a partir do canal
    // declarado ao iniciar a instância (?channel=...) — nunca declarado pelo usuário no nó START.
    private static final String CHANNEL_VARIABLE = "channel";

    // Nome amigável de cada tipo de etapa, igual ao que a tela já mostra (NODE_META no front) — as
    // mensagens de violação abaixo usam este vocabulário em vez do nome técnico do enum (GATEWAY,
    // USER_TASK...), que não significa nada pra quem não conhece a implementação.
    private static final Map<FlowNodeType, String> FRIENDLY_TYPE_NAME = Map.of(
            FlowNodeType.START, "Início",
            FlowNodeType.MESSAGE_START_EVENT, "Início por Mensagem",
            FlowNodeType.END, "Fim",
            FlowNodeType.GATEWAY, "Decisão",
            FlowNodeType.USER_TASK, "Tarefa de Usuário",
            FlowNodeType.SERVICE_TASK, "Tarefa de Serviço",
            FlowNodeType.RECEIVE_TASK, "Tarefa de Recebimento");

    private static final Map<ChannelType, String> FRIENDLY_CHANNEL_NAME = Map.of(
            ChannelType.WEB, "Web",
            ChannelType.MOBILE, "Mobile",
            ChannelType.WHATSAPP, "WhatsApp");

    private static String friendlyType(FlowNodeType type) {
        return FRIENDLY_TYPE_NAME.getOrDefault(type, type.toString());
    }

    private FlowValidator() {
    }

    // Só o desenho: usado pela geração por IA, que deixa cluster/tópico/credencial de mensageria de
    // fora de propósito (dependem do ambiente) — quem escolhe é o autor, no editor.
    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections,
                                 Map<String, ComponentDefinition> componentRegistry) {
        validate(nodes, connections, componentRegistry, List.of(), false);
    }

    // channelTypes: tipos de canal da jornada sendo publicada — usado só pra checar que nenhuma
    // tela fica sem nenhum componente visível para algum deles (validateChannelVisibilityCoverage).
    // Vazio (ex.: validação de rascunho/preview, antes de a jornada ter canal resolvido) pula essa
    // checagem — o resto da validação estrutural continua idêntico. Também cobra o que depende do
    // ambiente (mensageria sem cluster/tópico/credencial), como os templates deixam de propósito.
    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections,
                                 Map<String, ComponentDefinition> componentRegistry, List<ChannelType> channelTypes) {
        validate(nodes, connections, componentRegistry, channelTypes, true);
    }

    private static void validate(List<FlowNode> nodes, List<FlowConnection> connections,
                                  Map<String, ComponentDefinition> componentRegistry, List<ChannelType> channelTypes,
                                  boolean requireEnvironmentSetup) {
        List<FlowViolation> violations = new ArrayList<>();

        List<FlowNode> starts = nodes.stream().filter(n -> START_TYPES.contains(n.getType())).toList();
        // REQ-03.11.001: a GATEWAY's two branches may each run to their own END instead of
        // reconverging first, so — unlike the single start element — the flow may have more than
        // one END node; it must just have at least one.
        List<FlowNode> ends = nodes.stream().filter(n -> n.getType() == FlowNodeType.END).toList();
        if (starts.size() != 1) {
            violations.add(new FlowViolation("A jornada precisa ter exatamente um passo inicial — Início ou Início por Mensagem"
                    + " (foram encontrados " + starts.size() + ")"));
        }
        if (ends.isEmpty()) {
            violations.add(new FlowViolation("A jornada precisa ter ao menos uma etapa de Fim"));
        }

        // REQ-03.09.011/REQ-03.12.002: output variable names and START's declared startVariables
        // names share one uniqueness namespace across the whole journey. Declared here (not down by
        // the outputMapping loop that also feeds it) so the startVariables block below can check
        // against it too.
        Set<String> seenOutputNames = new HashSet<>();

        // REQ-03.12.001/003: {name, type} declarations, valid only on the START node — the
        // variables the caller (canal digital/BFF) must supply when starting an instance. Computed
        // once, up front, since START is trivially an ancestor of every other node in a valid flow —
        // no need to recompute per-node like outputMapping's ancestor scan below.
        // "channel" sempre disponível, mesmo sem nenhum startVariables declarado — o
        // ms-espec-registry injeta o canal que iniciou a instância como variável de processo real
        // (ver REQ da jornada multicanal), então {{channel}} pode ser referenciado em condição de
        // Gateway/connectorConfig do mesmo jeito que qualquer outra variável.
        Set<String> startVariableNames = new HashSet<>(Set.of(CHANNEL_VARIABLE));
        for (FlowNode node : nodes) {
            List<Map<String, Object>> declared = node.getStartVariables();
            if (declared == null || declared.isEmpty()) {
                continue;
            }
            if (node.getType() != FlowNodeType.START) {
                violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                        + "' declara variáveis de entrada da jornada, mas isso só é permitido no Início"));
                continue;
            }
            for (Map<String, Object> declaration : declared) {
                Object name = declaration.get("name");
                Object type = declaration.get("type");
                if (!(name instanceof String s) || s.isBlank()) {
                    violations.add(new FlowViolation(node.getId(), "O Início '" + node.getName() + "' tem uma variável de entrada sem um nome válido"));
                    continue;
                }
                if (CHANNEL_VARIABLE.equals(s)) {
                    violations.add(new FlowViolation(node.getId(), "O Início '" + node.getName()
                            + "' não pode declarar a variável 'channel' — é um nome reservado; o canal usado para iniciar a jornada já preenche essa variável automaticamente"));
                    continue;
                }
                if (!(type instanceof String t) || !VALID_VARIABLE_TYPES.contains(t)) {
                    violations.add(new FlowViolation(node.getId(), "O Início '" + node.getName() + "' declara a variável '" + s + "' com um tipo inválido"));
                    continue;
                }
                if (!seenOutputNames.add(s)) {
                    violations.add(new FlowViolation(node.getId(), "Variável de saída '" + s + "' foi declarada mais de uma vez no fluxo"));
                    continue;
                }
                // Aceita tanto o nome declarado quanto o nome real da variável no motor (data_<nome>
                // — mesmo namespace de outputMapping, ver VariableConversion.fromDeclaredVariables no
                // ms-espec-registry): o assistente de configuração de conector (front) já insere o
                // token com esse prefixo (engineVariableToken), então {{nome}} (uso legado/geração por
                // IA) e {{data_nome}} (o que o assistente produz hoje) precisam validar os dois.
                startVariableNames.add(s);
                startVariableNames.add("data_" + s);
            }
        }

        Map<String, Integer> inDegree = new HashMap<>();
        Map<String, Integer> outDegree = new HashMap<>();
        Map<String, List<String>> forward = new HashMap<>();
        Map<String, List<String>> backward = new HashMap<>();
        Map<String, List<FlowConnection>> outgoingConnections = new HashMap<>();
        for (FlowNode node : nodes) {
            inDegree.put(node.getId(), 0);
            outDegree.put(node.getId(), 0);
            forward.put(node.getId(), new ArrayList<>());
            backward.put(node.getId(), new ArrayList<>());
            outgoingConnections.put(node.getId(), new ArrayList<>());
        }
        // A saída "Se falhar" não conta no grau de saída nem nas regras de Decisão: é um caminho a mais,
        // só da integração REST, conferido à parte (errorOutgoing). Pra alcançabilidade e variáveis
        // disponíveis ela vale como qualquer ligação.
        Map<String, List<FlowConnection>> errorOutgoing = new HashMap<>();
        for (FlowConnection connection : connections) {
            if (connection.isOnError()) {
                errorOutgoing.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>()).add(connection);
            } else {
                outDegree.merge(connection.getSourceNodeId(), 1, Integer::sum);
                outgoingConnections.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>()).add(connection);
            }
            inDegree.merge(connection.getTargetNodeId(), 1, Integer::sum);
            forward.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>())
                    .add(connection.getTargetNodeId());
            backward.computeIfAbsent(connection.getTargetNodeId(), k -> new ArrayList<>())
                    .add(connection.getSourceNodeId());
        }

        for (FlowNode node : nodes) {
            int in = inDegree.getOrDefault(node.getId(), 0);
            int out = outDegree.getOrDefault(node.getId(), 0);
            switch (node.getType()) {
                case START, MESSAGE_START_EVENT -> {
                    if (in != 0 || out != 1) {
                        violations.add(new FlowViolation(node.getId(), "O " + friendlyType(node.getType()) + " '" + node.getName()
                                + "' não pode vir depois de outra etapa e deve levar a exatamente uma próxima etapa"));
                    }
                }
                case USER_TASK, SERVICE_TASK, RECEIVE_TASK -> {
                    if (in < 1 || out != 1) {
                        // Dica só quando a causa provável é tentar ramificar direto daqui (out > 1) —
                        // é o erro mais comum tanto de quem desenha na mão quanto da geração por IA
                        // (ver FlowGenerationPrompt): a intenção é uma decisão, mas falta o GATEWAY.
                        String hint = out > 1
                                ? " (para ramificar a partir daqui, insira uma Decisão logo depois — este tipo de etapa nunca tem mais de um caminho de saída)"
                                : "";
                        violations.add(new FlowViolation(node.getId(), "A " + friendlyType(node.getType()) + " '" + node.getName()
                                + "' precisa ser alcançada por uma etapa anterior e levar a exatamente uma próxima etapa" + hint));
                    }
                }
                case END -> {
                    if (in < 1 || out != 0) {
                        violations.add(new FlowViolation(node.getId(), "O Fim '" + node.getName()
                                + "' precisa ser alcançado por uma etapa anterior e não pode levar a nenhuma outra"));
                    }
                }
                case GATEWAY -> {
                    if (in < 1 || out < 2) {
                        violations.add(new FlowViolation(node.getId(), "A Decisão '" + node.getName()
                                + "' precisa ser alcançada por uma etapa anterior e ter pelo menos dois caminhos possíveis"));
                    } else {
                        List<FlowConnection> outgoing = outgoingConnections.getOrDefault(node.getId(), List.of());
                        long defaultCount = outgoing.stream().filter(FlowConnection::isDefault).count();
                        if (defaultCount != 1) {
                            violations.add(new FlowViolation(node.getId(), "A Decisão '" + node.getName()
                                    + "' precisa ter exatamente um caminho marcado como padrão (foram encontrados " + defaultCount + ")"));
                        }
                        for (FlowConnection connection : outgoing) {
                            if (!connection.isDefault() && (connection.getCondition() == null || connection.getCondition().isBlank())) {
                                violations.add(new FlowViolation(node.getId(), "A Decisão '" + node.getName()
                                        + "' tem um caminho que não é o padrão, mas está sem uma condição definida"));
                            }
                        }
                    }
                }
            }

            List<FlowConnection> errorPaths = errorOutgoing.getOrDefault(node.getId(), List.of());
            if (!errorPaths.isEmpty()) {
                // O caminho "Se falhar" vale para a integração REST e para a publicação de mensagem (Tarefa de Serviço
                // com conector de mensageria); receber mensagem não publica, então não tem esse caminho.
                boolean failableTask = (node.getType() == FlowNodeType.SERVICE_TASK && node.getConnectorConfig() != null
                        && (node.getConnectorConfig().getConnectorType() == ConnectorType.REST
                        || node.getConnectorConfig().getConnectorType().isMessageBroker()))
                        || isMessageWait(node);
                if (!failableTask) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                            + "' tem um caminho \"Se falhar\", mas só uma Tarefa de Serviço com integração REST ou com publicação de mensagem, ou uma espera por mensagem, pode ter esse caminho"));
                } else if (errorPaths.size() > 1) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' tem mais de um caminho \"Se falhar\""));
                }
                if (errorPaths.stream().anyMatch(c -> c.isDefault() || (c.getCondition() != null && !c.getCondition().isBlank()))) {
                    violations.add(new FlowViolation(node.getId(), "O caminho \"Se falhar\" de '" + node.getName()
                            + "' não pode ter condição nem ser o caminho padrão"));
                }
            }

            // Espera por mensagem: o tempo limite e o caminho "Se falhar" andam juntos. Sem o caminho o limite não teria
            // para onde ir; sem o limite o caminho nunca seria usado.
            if (isMessageWait(node)) {
                boolean hasLimit = node.getConnectorConfig().getConfig() != null
                        && node.getConnectorConfig().getConfig().get("waitTimeoutMs") != null;
                if (hasLimit && errorPaths.isEmpty()) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                            + "' tem um tempo limite de espera, mas nenhum caminho \"Se falhar\" para onde seguir quando ele esgotar"));
                }
                if (!hasLimit && !errorPaths.isEmpty()) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                            + "' tem um caminho \"Se falhar\", mas nenhum tempo limite de espera para dispará-lo"));
                }
            }

            if (node.getConnectorConfig() != null) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (isMessageWait(node)) {
                    validateResilience(node, connectorConfig.getConfig(), WAIT_LIMITS, violations);
                }
                if (connectorConfig.getConnectorType() == ConnectorType.REST) {
                    validateResilience(node, connectorConfig.getConfig(), RESILIENCE_LIMITS, violations);
                } else if (connectorConfig.getConnectorType().isMessageBroker() && node.getType() == FlowNodeType.SERVICE_TASK) {
                    validateResilience(node, connectorConfig.getConfig(), MESSAGING_RESILIENCE_LIMITS, violations);
                }
                if (!connectorConfig.getConnectorType().isEnabled()) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' usa um conector desabilitado ("
                            + connectorConfig.getConnectorType() + ")"));
                }
                if (node.getType() == FlowNodeType.MESSAGE_START_EVENT
                        && !connectorConfig.getConnectorType().isMessageBroker()) {
                    violations.add(new FlowViolation(node.getId(), "O Início por Mensagem '" + node.getName()
                            + "' não pode usar um conector " + connectorConfig.getConnectorType()
                            + "; só um conector de mensageria (Kafka, Event Hubs ou Service Bus) pode iniciar a jornada a partir de uma mensagem recebida"));
                }
                if (connectorConfig.getConnectorType().isMessageBroker()) {
                    String expectedOperation = BROKER_OPERATION_BY_TYPE.get(node.getType());
                    Object operation = connectorConfig.getConfig() != null ? connectorConfig.getConfig().get("operation") : null;
                    if (expectedOperation != null && operation != null && !expectedOperation.equals(operation)) {
                        String friendlyOperation = "PRODUCE".equals(expectedOperation) ? "publicar" : "consumir";
                        violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' (" + friendlyType(node.getType())
                                + "): a operação de mensageria deveria ser '" + friendlyOperation + "'"));
                    }
                    if (requireEnvironmentSetup && !connectorConfig.hasMessagingDestination()) {
                        violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                                + "' ainda não tem cluster, tópico e credencial de mensageria escolhidos — configure a integração"));
                    }
                }

                // REQ-03.09.014: every {{name}} referenced by this node's connector config must be
                // declared by some ancestor's output mapping (REQ-03.09.010) reachable backwards from it.
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connectorConfig.getConfig(), usedTokens);
                reportDottedTokens(node, "'" + node.getName() + "' usa", connectorConfig.getConfig(), violations);
                if (!usedTokens.isEmpty()) {
                    Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                    for (String token : usedTokens) {
                        if (!isEngineToken(token)) {
                            violations.add(rawTokenViolation(node, "'" + node.getName() + "' usa", token));
                        } else if (!availableVars.contains(token)) {
                            violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' referencia a variável '{{" + token
                                    + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                        }
                    }
                }
            }

            if (node.getType() == FlowNodeType.USER_TASK) {
                validateEmbeddedScreen(node, componentRegistry, channelTypes,
                        availableVarsFor(node, nodes, backward, startVariableNames),
                        listVariablesFor(node, nodes, backward), violations);
            } else if (node.getScreenDataSources() != null && !node.getScreenDataSources().isEmpty()) {
                violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                        + "' declara fontes de dados, mas só a tela de uma Tarefa de Usuário usa fonte de dados"));
            }
        }

        // REQ-03.11.004/006: {{name}} referenced in a gateway's condition must be declared by some
        // ancestor Service/Receive Task's output mapping, or User Task form field, reachable
        // backwards from the gateway.
        for (FlowNode node : nodes) {
            if (node.getType() != FlowNodeType.GATEWAY) {
                continue;
            }
            for (FlowConnection connection : outgoingConnections.getOrDefault(node.getId(), List.of())) {
                // Uma condição gerada com aspas escapadas por barra invertida (\" ou \') nunca é
                // válida em JUEL — o parser do Camunda rejeita o processo inteiro no deploy
                // ("lexical error ... encountered invalid character '\'"), só perceptível como um
                // 502 opaco na publicação. Modelos de IA às vezes produzem isso ao tentar escapar
                // aspas dentro de um valor de condição (ex.: {{campo}} == \"valor\" em vez de
                // {{campo}} == "valor") — pegar aqui barra o salvamento/candidato de IA cedo, com
                // mensagem acionável, em vez de deixar estourar só na publicação.
                if (connection.getCondition() != null
                        && (connection.getCondition().contains("\\\"") || connection.getCondition().contains("\\'"))) {
                    violations.add(new FlowViolation(node.getId(), "A condição da Decisão '" + node.getName()
                            + "' usa aspas escapadas com barra invertida (\\\" ou \\'), que não são aceitas — use aspas"
                            + " diretas, sem escapar, ex.: {{campo}} == \"valor\"."));
                }
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connection.getCondition(), usedTokens);
                reportDottedTokens(node, "A condição da Decisão '" + node.getName() + "' usa", connection.getCondition(), violations);
                if (usedTokens.isEmpty()) {
                    continue;
                }
                Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                for (String token : usedTokens) {
                    if (!isEngineToken(token)) {
                        violations.add(rawTokenViolation(node, "A condição da Decisão '" + node.getName() + "' usa", token));
                    } else if (!availableVars.contains(token)) {
                        violations.add(new FlowViolation(node.getId(), "A condição da Decisão '" + node.getName() + "' referencia a variável '{{"
                                + token + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                    }
                }
            }
        }

        // REQ-03.09.011: nomes de variável de saída de integração (outputMapping) e de entrada
        // (startVariables, já em seenOutputNames pelo bloco acima) precisam ser únicos entre si em
        // toda a jornada — colidir aqui seria quase sempre um erro de digitação, nunca intencional
        // (duas integrações diferentes gravando na mesma variável "data_x").
        //
        // Nome de campo de tela (USER_TASK) não entra mais nessa checagem: desde que a variável real
        // do motor passou a carregar o namespace no nome (form_<nome> vs. data_<nome> — ver
        // BindingResolver/VariableConversion no ms-espec-registry e AnswerConversion aqui), um campo
        // de tela nunca mais colide com uma saída de integração/entrada, mesmo com o mesmo nome
        // técnico — são literalmente variáveis diferentes no motor. Campo de tela PODE (e deve poder)
        // se repetir entre telas diferentes: o catálogo SDUI v1 (seção 8.1) já prevê essa releitura
        // no vínculo de leitura-e-escrita — uma etapa seguinte reaproveitando o nome está só editando
        // o valor já coletado, sem ambiguidade em tempo de execução (gateway desta versão é sempre
        // exclusivo, REQ-03.11.001: nunca dois caminhos da jornada rodam ao mesmo tempo).
        for (FlowNode node : nodes) {
            if (node.getConnectorConfig() != null) {
                for (Map<String, Object> rule : outputMappingOf(node.getConnectorConfig())) {
                    Object name = rule.get("name");
                    if (name instanceof String s && !s.isBlank() && !seenOutputNames.add(s)) {
                        violations.add(new FlowViolation(node.getId(), "Variável de saída '" + s + "' foi declarada mais de uma vez no fluxo"));
                    }
                }
            }
        }

        if (starts.size() == 1 && !ends.isEmpty()) {
            Set<String> reachableFromStart = bfs(starts.get(0).getId(), forward);
            // A node only needs to reach *some* END, not a specific one — each GATEWAY branch may
            // lead to its own.
            Set<String> reachingEnd = new HashSet<>();
            for (FlowNode end : ends) {
                reachingEnd.addAll(bfs(end.getId(), backward));
            }
            for (FlowNode node : nodes) {
                if (!reachableFromStart.contains(node.getId()) || !reachingEnd.contains(node.getId())) {
                    violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' não está conectada num caminho contínuo entre o Início e o Fim da jornada"));
                }
            }
        }

        if (!violations.isEmpty()) {
            throw new FlowValidationException(violations);
        }
    }

    // Passo "Resiliência" da integração REST: valores em milissegundos (tempo limite e intervalo) e
    // número de novas tentativas. Ausente = padrão do conector no motor (2 s, 10 s, 0, 1 s).
    private static final List<ResilienceLimit> RESILIENCE_LIMITS = List.of(
            new ResilienceLimit("connectTimeoutMs", 100, 10_000, "o tempo para conectar precisa ficar entre 0,1 e 10 segundos"),
            new ResilienceLimit("readTimeoutMs", 100, 30_000, "o tempo para responder precisa ficar entre 0,1 e 30 segundos"),
            new ResilienceLimit("retries", 0, 2, "as novas tentativas precisam ficar entre 0 e 2"),
            new ResilienceLimit("retryIntervalMs", 0, 5_000, "o intervalo entre tentativas precisa ficar entre 0 e 5 segundos"));

    // Passo "Resiliência" da publicação de mensagem: tempo limite do envio, novas tentativas e intervalo. Ausente =
    // padrão do worker no motor (5 s, 2 novas tentativas, 2 s).
    private static final List<ResilienceLimit> MESSAGING_RESILIENCE_LIMITS = List.of(
            new ResilienceLimit("sendTimeoutMs", 1_000, 10_000, "o tempo limite do envio precisa ficar entre 1 e 10 segundos"),
            new ResilienceLimit("retries", 0, 2, "as novas tentativas precisam ficar entre 0 e 2"),
            new ResilienceLimit("retryIntervalMs", 0, 5_000, "o intervalo entre tentativas precisa ficar entre 0 e 5 segundos"));

    // Tempo limite da espera por mensagem, em milissegundos: de 10 segundos a 30 dias.
    private static final List<ResilienceLimit> WAIT_LIMITS = List.of(
            new ResilienceLimit("waitTimeoutMs", 10_000, 2_592_000_000L, "o tempo limite da espera precisa ficar entre 10 segundos e 30 dias"));

    /** Receber mensagem (Tarefa de Recebimento com conector de mensageria): o único tipo de etapa que espera por algo de fora. */
    private static boolean isMessageWait(FlowNode node) {
        return node.getType() == FlowNodeType.RECEIVE_TASK && node.getConnectorConfig() != null
                && node.getConnectorConfig().getConnectorType().isMessageBroker();
    }

    private record ResilienceLimit(String key, long min, long max, String message) {
    }

    private static void validateResilience(FlowNode node, Map<String, Object> config, List<ResilienceLimit> limits,
                                           List<FlowViolation> violations) {
        if (config == null) {
            return;
        }
        for (ResilienceLimit limit : limits) {
            Object value = config.get(limit.key());
            if (value == null) {
                continue;
            }
            if (!(value instanceof Number number) || number.doubleValue() != Math.floor(number.doubleValue())
                    || number.longValue() < limit.min() || number.longValue() > limit.max()) {
                violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "': " + limit.message()));
            }
        }
        Object background = config.get("background");
        if (background != null && !(background instanceof Boolean)) {
            violations.add(new FlowViolation(node.getId(), "'" + node.getName()
                    + "': a opção \"Executar em segundo plano\" precisa ser sim ou não"));
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> outputMappingOf(ConnectorConfig connectorConfig) {
        if (connectorConfig.getConfig() == null) {
            return List.of();
        }
        Object raw = connectorConfig.getConfig().get("outputMapping");
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add((Map<String, Object>) map);
            }
        }
        return result;
    }

    // Shared by every {{name}} check (connector config, gateway condition, USER_TASK message): the
    // variables visible at `node` are the journey's startVariables, every output-mapping name
    // declared by an ancestor reachable backwards from it (REQ-03.09.013), and every field name of
    // an ancestor USER_TASK's own tela desenhada — what the end user actually fills in becomes a
    // process variable the same way a connector's outputMapping does.
    //
    // Cada nome entra duas vezes: o nome declarado (uso legado, e o que FlowGenerationPrompt ainda
    // ensina a IA a gerar) e o nome real da variável no motor com o prefixo de namespace
    // (data_<nome> pra outputMapping, form_<nome> pra campo de tela — mesma regra de
    // engineVariableToken no front e VariableConversion/BindingResolver no ms-espec-registry). O
    // assistente de configuração de conector (ConnectorWizard/VariablePickerButton) só insere a
    // forma com prefixo, então sem isso {{form_nome}}/{{data_nome}} nunca validava, mesmo sendo
    // exatamente o valor que o próprio editor acabou de inserir.
    private static Set<String> availableVarsFor(FlowNode node, List<FlowNode> nodes, Map<String, List<String>> backward,
                                                  Set<String> startVariableNames) {
        Set<String> ancestorIds = bfs(node.getId(), backward);
        Set<String> availableVars = new HashSet<>(startVariableNames);
        for (FlowNode other : nodes) {
            if (other.getId().equals(node.getId()) || !ancestorIds.contains(other.getId())) {
                continue;
            }
            if (other.getConnectorConfig() != null) {
                for (Map<String, Object> rule : outputMappingOf(other.getConnectorConfig())) {
                    Object name = rule.get("name");
                    if (name instanceof String s && !s.isBlank()) {
                        availableVars.add(s);
                        availableVars.add("data_" + s);
                    }
                }
            }
            if (other.getType() == FlowNodeType.USER_TASK && other.getEmbeddedScreenRoot() != null) {
                for (String fieldName : formVariableNames(other.getEmbeddedScreenRoot())) {
                    availableVars.add(fieldName);
                    availableVars.add("form_" + fieldName);
                }
            }
        }
        return availableVars;
    }

    // Variáveis do tipo lista (outputMapping com type "list") de ancestrais — as únicas que uma lista
    // de seleção ou as opções de um select podem usar. Guarda o nome do motor (data_<nome>).
    private static Set<String> listVariablesFor(FlowNode node, List<FlowNode> nodes, Map<String, List<String>> backward) {
        Set<String> ancestorIds = bfs(node.getId(), backward);
        Set<String> lists = new HashSet<>();
        for (FlowNode other : nodes) {
            if (other.getId().equals(node.getId()) || !ancestorIds.contains(other.getId()) || other.getConnectorConfig() == null) {
                continue;
            }
            for (Map<String, Object> rule : outputMappingOf(other.getConnectorConfig())) {
                if (rule.get("name") instanceof String s && !s.isBlank() && "list".equals(rule.get("type"))) {
                    lists.add(s.startsWith("data_") ? s : "data_" + s);
                }
            }
        }
        return lists;
    }

    // Fontes de dados de referência da tela (ADR-002): apelido válido e único, fonte informada,
    // parâmetros só com variáveis do motor já disponíveis aqui, e o apelido não pode repetir o nome
    // de uma variável da instância (data.<apelido> ficaria ambíguo). Devolve os apelidos válidos —
    // cada um vira data.<apelido>, do tipo lista, dentro desta tela. A existência da fonte no catálogo
    // é conferida na publicação, quando a configuração dela é congelada no envelope.
    private static List<String> validateScreenDataSources(FlowNode node, Set<String> availableVars,
                                                          List<FlowViolation> violations) {
        List<String> aliases = new ArrayList<>();
        if (node.getScreenDataSources() == null) {
            return aliases;
        }
        for (Map<String, Object> declaration : node.getScreenDataSources()) {
            Object alias = declaration.get("alias");
            String subject = "A fonte de dados '" + alias + "' da tela de '" + node.getName() + "'";
            if (!(alias instanceof String a) || !ALIAS.matcher(a).matches()) {
                violations.add(new FlowViolation(node.getId(), "A tela de '" + node.getName()
                        + "' tem uma fonte de dados sem um apelido válido (letras, números e _, começando por letra)"));
                continue;
            }
            if (aliases.contains(a)) {
                violations.add(new FlowViolation(node.getId(), subject + " foi declarada mais de uma vez"));
                continue;
            }
            if (availableVars.contains("data_" + a)) {
                violations.add(new FlowViolation(node.getId(), subject + " usa o mesmo nome da variável 'data." + a
                        + "' da jornada — escolha outro apelido"));
                continue;
            }
            // Sem fonte escolhida o apelido continua valendo na tela: senão cada componente ligado a
            // data.<apelido> repetiria o mesmo problema como "variável que não existe".
            if (!(declaration.get("source") instanceof String source) || source.isBlank()) {
                violations.add(new FlowViolation(node.getId(), subject + " não indica qual fonte do catálogo usar"));
            }
            Set<String> tokens = new HashSet<>();
            collectVariableTokens(declaration.get("params"), tokens);
            reportDottedTokens(node, subject + " usa", declaration.get("params"), violations);
            for (String token : tokens) {
                if (!isEngineToken(token)) {
                    violations.add(rawTokenViolation(node, subject + " usa", token));
                } else if (!availableVars.contains(token)) {
                    violations.add(new FlowViolation(node.getId(), subject + " referencia a variável '{{" + token
                            + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                }
            }
            aliases.add(a);
        }
        return aliases;
    }

    // Lista as opções reais em vez de só apontar o erro — sem isso, tanto a IA (que só vê a
    // violação de volta no próximo prompt, sem visão do fluxo inteiro) quanto quem desenha na mão
    // ficam sem saber se o problema é um nome digitado errado (quase sempre) ou um outputMapping
    // que realmente falta declarar.
    private static String describeAvailableVars(Set<String> availableVars) {
        Set<String> engineVars = new TreeSet<>();
        availableVars.stream().filter(FlowValidator::isEngineToken).forEach(engineVars::add);
        if (engineVars.isEmpty()) {
            return " (nenhuma variável disponível ainda neste ponto do fluxo)";
        }
        return " — variáveis disponíveis aqui: " + String.join(", ", engineVars);
    }

    private static void collectVariableTokens(Object value, Set<String> tokens) {
        collectTokens(value, VARIABLE_TOKEN, tokens);
    }

    private static void collectTokens(Object value, Pattern pattern, Set<String> tokens) {
        if (value instanceof String s) {
            Matcher matcher = pattern.matcher(s);
            while (matcher.find()) {
                tokens.add(matcher.group(1));
            }
        } else if (value instanceof Map<?, ?> map) {
            map.values().forEach(v -> collectTokens(v, pattern, tokens));
        } else if (value instanceof List<?> list) {
            list.forEach(v -> collectTokens(v, pattern, tokens));
        }
    }

    // Em conector, mensageria e Decisão o token é o nome da variável no motor: form_x, data_x ou o
    // canal (`channel`). Qualquer outra forma (token cru, como {{pedidoId}}) não existe no motor.
    private static boolean isEngineToken(String token) {
        return CHANNEL_VARIABLE.equals(token)
                || ((token.startsWith("form_") || token.startsWith("data_")) && token.length() > "form_".length());
    }

    private static FlowViolation rawTokenViolation(FlowNode node, String subject, String token) {
        return new FlowViolation(node.getId(), subject + " {{" + token + "}}, que não é o nome de uma variável no motor — use {{form_" + token
                + "}} (campo de tela) ou {{data_" + token + "}} (dado de uma integração ou de entrada da jornada)");
    }

    // Caminho de tela válido: form.x ou data.x; o canal é a única exceção, sem namespace (`channel`).
    private static boolean isKnownDataPath(String path) {
        return path != null
                && (CHANNEL_VARIABLE.equals(path) || VALID_BINDING_NAMESPACES.stream().anyMatch(path::startsWith));
    }

    // Recusa {{form.x}}/{{data.x}} onde o token deve ser o nome da variável no motor (conector,
    // mensageria, Decisão) e indica a forma certa. Nada é especial aqui: {{data.channel}} é só a variável
    // `channel` do namespace data (no motor, data_channel), distinta do canal reservado `channel`.
    private static void reportDottedTokens(FlowNode node, String subject, Object value, List<FlowViolation> violations) {
        Set<String> dotted = new java.util.LinkedHashSet<>();
        collectTokens(value, DOTTED_TOKEN, dotted);
        for (String token : dotted) {
            String engineName = token.substring(0, token.indexOf('.')) + "_" + token.substring(token.indexOf('.') + 1);
            violations.add(new FlowViolation(node.getId(), subject + " {{" + token + "}}, que não vale aqui — use o nome da variável no motor, {{"
                    + engineName + "}}"));
        }
    }

    // Estrutura da árvore SDUI da tela embutida (catálogo corporativo v1): id únicos, type+version
    // existe no Component Registry e não é REMOVED, children só sob nó com allowsChildren=true,
    // namespace de binding válido, ação de evento é uma das 6 do Action Registry. Raiz precisa ser
    // ui.screen (seção 14.1: "root deve conter exatamente um ui.screen").
    private static void validateEmbeddedScreen(FlowNode node, Map<String, ComponentDefinition> componentRegistry,
                                                 List<ChannelType> channelTypes, Set<String> availableVars,
                                                 Set<String> listVariables, List<FlowViolation> violations) {
        SduiNode root = node.getEmbeddedScreenRoot();
        if (root == null) {
            violations.add(new FlowViolation(node.getId(), "A Tarefa de Usuário '" + node.getName()
                    + "' precisa ter uma tela configurada"));
            return;
        }
        if (!"ui.screen".equals(root.type())) {
            violations.add(new FlowViolation(node.getId(), "A tela do nó '" + node.getName() + "' deve ter raiz do tipo ui.screen (encontrado '"
                    + root.type() + "')"));
        }
        // Um campo desta mesma tela também é uma referência válida, em qualquer ordem: quem preenche
        // `form.x` é o componente de entrada da própria tela, não um passo anterior do fluxo.
        Set<String> flowVariables = new HashSet<>(availableVars);
        Set<String> screenLists = new HashSet<>(listVariables);
        for (String alias : validateScreenDataSources(node, availableVars, violations)) {
            flowVariables.add("data_" + alias);
            screenLists.add("data_" + alias);
        }
        DataScope scope = new DataScope(flowVariables, formVariableNames(root), screenLists,
                channelTypes.contains(ChannelType.WHATSAPP));
        validateSduiNode(node, root, componentRegistry, new HashSet<>(), scope, violations);
        if (!channelTypes.isEmpty()) {
            validateChannelVisibilityCoverage(node, root, componentRegistry, channelTypes, violations);
        }
    }

    // Garante que, para cada canal da jornada, sobre pelo menos um componente de conteúdo real
    // (folha, não contêiner vazio) visível na tela — evita publicar uma tela que na prática fica em
    // branco pra algum canal por causa de uma combinação de regras de visibilidade mal configurada.
    private static void validateChannelVisibilityCoverage(FlowNode ownerNode, SduiNode root,
                                                            Map<String, ComponentDefinition> componentRegistry,
                                                            List<ChannelType> channelTypes, List<FlowViolation> violations) {
        for (ChannelType channelType : channelTypes) {
            if (!hasVisibleLeafContent(root, componentRegistry, channelType.name())) {
                violations.add(new FlowViolation(ownerNode.getId(), "A tela de '" + ownerNode.getName()
                        + "' fica sem nenhum componente visível no canal " + FRIENDLY_CHANNEL_NAME.get(channelType)));
            }
        }
    }

    // Poda qualquer nó (e a subárvore inteira dele) cuja visibility exclua o canal; só conta como
    // conteúdo real um nó folha (sem allowsChildren) que sobreviva à poda — um contêiner vazio não
    // conta como "tela com conteúdo".
    private static boolean hasVisibleLeafContent(SduiNode node, Map<String, ComponentDefinition> componentRegistry,
                                                  String channelType) {
        if (!isVisibleForChannel(node.visibility(), channelType)) {
            return false;
        }
        ComponentDefinition definition = componentRegistry.get(node.type() + "@" + node.version());
        boolean isContainer = definition != null && definition.isAllowsChildren();
        if (!isContainer) {
            return true;
        }
        if (node.children() == null) {
            return false;
        }
        return node.children().stream().anyMatch(child -> hasVisibleLeafContent(child, componentRegistry, channelType));
    }

    // Só avalia uma regra que referencie o canal (channel) — qualquer outro path (form/data/etc.)
    // depende de dado de execução que não existe em tempo de design, então é tratado como sempre
    // visível aqui (permissivo, erra pro lado de não bloquear publicação por falso positivo).
    private static boolean isVisibleForChannel(SduiVisibility visibility, String channelType) {
        if (visibility == null || !CHANNEL_VARIABLE.equals(visibility.path())) {
            return true;
        }
        Object value = visibility.value();
        return switch (visibility.rule()) {
            case "equals" -> channelType.equals(value);
            case "notEquals" -> !channelType.equals(value);
            case "in" -> value instanceof List<?> list && list.contains(channelType);
            case "notIn" -> !(value instanceof List<?> list && list.contains(channelType));
            default -> true;
        };
    }

    private static void validateSduiNode(FlowNode ownerNode, SduiNode sduiNode,
                                          Map<String, ComponentDefinition> componentRegistry, Set<String> seenIds,
                                          DataScope scope, List<FlowViolation> violations) {
        if (sduiNode.id() == null || sduiNode.id().isBlank()) {
            violations.add(new FlowViolation(ownerNode.getId(), "A tela do nó '" + ownerNode.getName() + "' tem um componente sem id"));
        } else if (!seenIds.add(sduiNode.id())) {
            violations.add(new FlowViolation(ownerNode.getId(), "A tela do nó '" + ownerNode.getName() + "' tem o id '" + sduiNode.id() + "' duplicado"));
        }

        ComponentDefinition definition = componentRegistry.get(sduiNode.type() + "@" + sduiNode.version());
        if (sduiNode.version() == null || !SEMVER.matcher(sduiNode.version()).matches()) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id()
                    + "' deve usar versão SemVer completa, por exemplo 1.0.0"));
        }
        if (definition == null) {
            violations.add(new FlowViolation(ownerNode.getId(), "A tela do nó '" + ownerNode.getName() + "' usa o tipo '" + sduiNode.type() + "@"
                    + sduiNode.version() + "', não encontrado no Component Registry"));
        } else if (definition.getStatus() == ComponentStatus.REMOVED) {
            violations.add(new FlowViolation(ownerNode.getId(), "A tela do nó '" + ownerNode.getName() + "' usa o componente '" + sduiNode.type()
                    + "', removido do catálogo"));
        }

        if (definition != null) {
            Map<String, Object> props = sduiNode.props() != null ? sduiNode.props() : Map.of();
            Set<String> allowedProps = definition.getPropsSchema().stream().map(p -> p.name()).collect(java.util.stream.Collectors.toSet());
            props.keySet().stream().filter(name -> !allowedProps.contains(name)).forEach(name ->
                    violations.add(new FlowViolation(ownerNode.getId(), "O atributo '" + name + "' não pertence ao componente '"
                            + sduiNode.id() + "'")));
            // Vinculada a um dado da jornada, a propriedade é preenchida em tempo de execução —
            // cobrar também um valor literal aqui pediria a mesma coisa duas vezes (mesmo raciocínio
            // do painel de pendências do Form Builder, front). O literal continua aceito como
            // fallback (ver TemplateResolver, ms-espec-registry), só deixa de ser obrigatório.
            Map<String, SduiBinding> bindings = sduiNode.bindings() != null ? sduiNode.bindings() : Map.of();
            definition.getPropsSchema().stream()
                    .filter(p -> p.required() && !props.containsKey(p.name()) && !bindings.containsKey(p.name()))
                    .forEach(p ->
                    violations.add(new FlowViolation(ownerNode.getId(), "O atributo obrigatório '" + p.name()
                            + "' não foi informado no componente '" + sduiNode.id() + "'")));
            validateCanonicalPropertyValues(ownerNode, sduiNode, props, violations);
            validateReservedFields(ownerNode, sduiNode, definition, violations);
        }

        // Placeholder {{form.x}}/{{data.x}} em qualquer propriedade textual — o mesmo conjunto que
        // o runtime interpola (TemplateResolver resolve todo atributo textual que não começa com
        // "$"), não só as cinco que a seção 7.2 do catálogo homologa. Fora do bloco acima porque a
        // interpolação não depende de o componente existir no catálogo.
        // Propriedade ITEM_TEMPLATE (texto de item da lista de seleção) também aceita {{item.campo}}.
        Set<String> itemTemplateProps = definition == null ? Set.of() : definition.getPropsSchema().stream()
                .filter(p -> p.kind() == com.jouney.admin.domain.componentregistry.PropKind.ITEM_TEMPLATE)
                .map(p -> p.name()).collect(java.util.stream.Collectors.toSet());
        if (sduiNode.props() != null) {
            sduiNode.props().forEach((propName, value) -> {
                if (value instanceof String text) {
                    Matcher matcher = SCREEN_PLACEHOLDER.matcher(text);
                    while (matcher.find()) {
                        String token = matcher.group(1);
                        if (itemTemplateProps.contains(propName) && token.startsWith("item.")) {
                            if (token.length() == "item.".length()) {
                                violations.add(new FlowViolation(ownerNode.getId(), "No componente '" + sduiNode.id()
                                        + "', o atributo '" + propName + "' usa {{item.}} sem o nome do campo"));
                            }
                            continue;
                        }
                        validatePlaceholder(ownerNode, sduiNode.id(), propName, token, scope, violations);
                    }
                }
            });
        }
        if ("ui.selectList".equals(sduiNode.type())) {
            validateSelectList(ownerNode, sduiNode, scope, violations);
        }
        if ("ui.select".equals(sduiNode.type()) && sduiNode.bindings() != null && sduiNode.bindings().containsKey("options")) {
            SduiBinding options = sduiNode.bindings().get("options");
            if (!"oneWay".equals(options.mode()) || !scope.isList(options.path())) {
                violations.add(new FlowViolation(ownerNode.getId(), "No componente '" + sduiNode.id()
                        + "', as opções vinculadas precisam apontar, em modo leitura, para uma lista (data.*) — saída de integração do tipo lista ou fonte de dados da tela"));
            }
        }

        List<SduiNode> children = sduiNode.children();
        if (children != null && !children.isEmpty() && definition != null && !definition.isAllowsChildren()) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' (" + sduiNode.type() + ") não aceita filhos, na tela do nó '"
                    + ownerNode.getName() + "'"));
        }

        if (sduiNode.bindings() != null) {
            for (Map.Entry<String, SduiBinding> entry : sduiNode.bindings().entrySet()) {
                SduiBinding binding = entry.getValue();
                if (!isKnownDataPath(binding.path())) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem um binding com path inválido: '"
                            + binding.path() + "', na tela do nó '" + ownerNode.getName() + "'"));
                } else if ("oneWay".equals(binding.mode())) {
                    // Só a leitura confere existência: twoWay é quem CRIA a variável (form.x é o
                    // próprio campo), então exigir que ela já exista acusaria todo campo novo.
                    validateDataReference(ownerNode, sduiNode.id(), "o atributo '" + entry.getKey() + "'",
                            binding.path(), scope, violations);
                }
            }
        }
        if (sduiNode.events() != null) {
            for (Map.Entry<String, SduiEvent> entry : sduiNode.events().entrySet()) {
                if (definition != null && !definition.getEvents().contains(entry.getKey())) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O evento '" + entry.getKey()
                            + "' não pertence ao componente '" + sduiNode.id() + "'"));
                }
                SduiEvent event = entry.getValue();
                if (event.action() == null || !VALID_SDUI_ACTIONS.contains(event.action())) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' referencia uma ação inválida: '"
                            + event.action() + "', na tela do nó '" + ownerNode.getName() + "'"));
                }
                if ("action.submit".equals(event.action()) && !isBlankSubmitChoice(event)
                        && submitChoiceVariable(event) == null) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id()
                            + "' grava um valor ao concluir a etapa: informe o caminho (form.nome) e o valor, na tela do nó '"
                            + ownerNode.getName() + "'"));
                }
            }
        }
        if (children != null && definition != null && definition.isAllowsChildren()) {
            for (SduiNode child : children) {
                boolean nestedScreen = "ui.screen".equals(child.type());
                boolean restricted = !definition.getAllowedChildTypes().isEmpty()
                        && !definition.getAllowedChildTypes().contains(child.type());
                if (nestedScreen || restricted) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + child.id() + "' ("
                            + child.type() + ") não pode ser adicionado dentro de '" + sduiNode.id() + "' ("
                            + sduiNode.type() + ")"));
                }
            }
        }
        if (INPUT_COMPONENTS.contains(sduiNode.type())) {
            SduiBinding value = sduiNode.bindings() != null ? sduiNode.bindings().get("value") : null;
            if (value == null || value.path() == null || !value.path().startsWith("form.")
                    || !"twoWay".equals(value.mode())) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente de entrada '" + sduiNode.id()
                        + "' exige bindings.value em modo twoWay e path form.*"));
            }
            if (sduiNode.events() != null && !sduiNode.events().isEmpty()) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente de entrada '" + sduiNode.id()
                        + "' não aceita eventos"));
            }
        }
        if (("ui.button".equals(sduiNode.type()) || "ui.link".equals(sduiNode.type()))
                && (sduiNode.events() == null || !sduiNode.events().containsKey("onPress"))) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente de ação '" + sduiNode.id()
                    + "' exige o evento onPress"));
        }
        SduiVisibility visibility = sduiNode.visibility();
        if (visibility != null) {
            if (!isKnownDataPath(visibility.path())) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem uma visibilidade com path inválido: '"
                        + visibility.path() + "', na tela do nó '" + ownerNode.getName() + "'"));
            }
            if (visibility.rule() == null || !VALID_VISIBILITY_RULES.contains(visibility.rule())) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem uma visibilidade com regra inválida: '"
                        + visibility.rule() + "', na tela do nó '" + ownerNode.getName() + "'"));
            }
            validateDataReference(ownerNode, sduiNode.id(), "a visibilidade", visibility.path(), scope, violations);
        }
        validateCondition(ownerNode, sduiNode.id(), "estado ativo", sduiNode.active(), violations);
        if (sduiNode.active() != null) {
            validateDataReference(ownerNode, sduiNode.id(), "o estado ativo", sduiNode.active().path(), scope, violations);
        }

        if (children != null) {
            for (SduiNode child : children) {
                validateSduiNode(ownerNode, child, componentRegistry, seenIds, scope, violations);
            }
        }
    }

    /** O que uma tela pode referenciar como {@code form.x}/{@code data.x}: o que passos anteriores
     * do fluxo já produziram ({@code flowVariables}, o mesmo conjunto que mensagem, conector e
     * Decisão já conferem) mais os campos que a própria tela coleta ({@code screenFields}). */
    private record DataScope(Set<String> flowVariables, Set<String> screenFields, Set<String> listVariables,
                             boolean whatsapp) {

        boolean isList(String path) {
            return path != null && path.startsWith("data.") && listVariables.contains("data_" + path.substring("data.".length()));
        }

        // Confere pelo nome COM prefixo (form_x/data_x), nunca pelo nome cru: é o prefixo que
        // distingue os dois namespaces no motor, então é ele que denuncia um data.nome apontando pra
        // um campo de tela que só existe como form.nome — que resolveria vazio em execução.
        boolean knows(String namespace, String name) {
            return flowVariables.contains(namespace + "_" + name)
                    || ("form".equals(namespace) && screenFields.contains(name));
        }

        // Variável referenciada direto pelo nome do motor ({{form_x}} / {{data_x}}) — mesma conferência,
        // sem passar pelo caminho com ponto.
        boolean knowsEngineName(String engineName) {
            return flowVariables.contains(engineName)
                    || (engineName.startsWith("form_") && screenFields.contains(engineName.substring("form_".length())));
        }

        // Lista no formato que o autor digita (form.x/data.x), não no do motor (form_x/data_x), e
        // sem os nomes crus legados que availableVarsFor também guarda — ruído numa mensagem sobre tela.
        String describe() {
            Set<String> paths = new TreeSet<>();
            flowVariables.forEach(v -> {
                if (v.startsWith("form_")) paths.add("form." + v.substring("form_".length()));
                else if (v.startsWith("data_")) paths.add("data." + v.substring("data_".length()));
            });
            screenFields.forEach(f -> paths.add("form." + f));
            return paths.isEmpty()
                    ? " (nenhuma variável disponível ainda neste ponto do fluxo)"
                    : " — variáveis disponíveis aqui: " + String.join(", ", paths);
        }
    }

    /** Placeholder de texto de tela: {{form.x}}/{{data.x}} (contrato) ou {{form_x}}/{{data_x}} (nome da
     * variável no motor). Qualquer outra forma — sem prefixo ou de outro namespace — resolveria vazio em
     * execução, então é recusada aqui, dizendo a forma certa. */
    private static void validatePlaceholder(FlowNode ownerNode, String componentId, String propName, String token,
                                             DataScope scope, List<FlowViolation> violations) {
        if (CHANNEL_VARIABLE.equals(token)) {
            return; // o canal está sempre disponível, sem namespace
        }
        String where = "No componente '" + componentId + "', o atributo '" + propName + "'";
        int dot = token.indexOf('.');
        if (dot >= 0) {
            String namespace = token.substring(0, dot);
            if (!"form".equals(namespace) && !"data".equals(namespace)) {
                violations.add(new FlowViolation(ownerNode.getId(), where + " usa {{" + token + "}}, cujo namespace '"
                        + namespace + "' não existe — só form e data são reconhecidos"));
                return;
            }
            validateDataReference(ownerNode, componentId, "o atributo '" + propName + "'", token, scope, violations);
            return;
        }
        boolean engineForm = (token.startsWith("form_") || token.startsWith("data_")) && token.length() > "form_".length();
        if (!engineForm) {
            violations.add(new FlowViolation(ownerNode.getId(), where + " usa {{" + token + "}} sem indicar a origem da variável — use {{form."
                    + token + "}} ou {{form_" + token + "}} (campo de uma tela), ou {{data." + token + "}} ou {{data_" + token
                    + "}} (dado de uma integração)"));
            return;
        }
        if (!scope.knowsEngineName(token)) {
            violations.add(new FlowViolation(ownerNode.getId(), where + " usa a variável '" + token
                    + "', que ainda não existe nesse ponto da jornada" + scope.describe()));
        }
    }

    /** Referência de tela a um dado da jornada (seção 8 do catálogo): só existem os namespaces
     * {@code form} e {@code data}, ambos conferíveis contra o que o fluxo produz. */
    private static void validateDataReference(FlowNode ownerNode, String componentId, String what, String path,
                                               DataScope scope, List<FlowViolation> violations) {
        if (path == null) {
            return;
        }
        int dot = path.indexOf('.');
        if (dot < 0) {
            return;
        }
        String namespace = path.substring(0, dot);
        String name = path.substring(dot + 1);
        if (!"form".equals(namespace) && !"data".equals(namespace)) {
            return;
        }
        if (name.isBlank()) {
            violations.add(new FlowViolation(ownerNode.getId(), "No componente '" + componentId + "', " + what
                    + " ficou com o caminho incompleto (só o namespace '" + namespace + "')"));
            return;
        }
        if (!scope.knows(namespace, name)) {
            violations.add(new FlowViolation(ownerNode.getId(), "No componente '" + componentId + "', " + what
                    + " usa a variável '" + path + "', que ainda não existe nesse ponto da jornada" + scope.describe()));
        }
    }

    // Algumas propriedades possuem restrições de domínio que não cabem apenas no tipo genérico
    // registrado em propsSchema. Validá-las aqui impede que uma UI Spec incompatível seja publicada.
    private static void validateCanonicalPropertyValues(FlowNode ownerNode, SduiNode node,
                                                          Map<String, Object> props,
                                                          List<FlowViolation> violations) {
        if ("ui.datePicker".equals(node.type())) {
            Object mode = props.get("mode");
            if (!(mode instanceof String text) || !VALID_DATE_PICKER_MODES.contains(text)) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + node.id()
                        + "' deve usar mode igual a date, time ou dateTime"));
            }
        }

        if ("ui.progress".equals(node.type())) {
            Object value = props.get("value");
            if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())
                    || number.doubleValue() < 0 || number.doubleValue() > 1) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + node.id()
                        + "' deve usar value numérico entre 0 e 1"));
            }
        }
    }

    // Lista de seleção (ADR-002): lê uma lista (items oneWay → data.* do tipo lista), grava o item
    // escolhido (value twoWay → form.*) e, havendo ações, a ação escolhida (action twoWay → form.*),
    // concluindo a etapa pelo evento onAction com action.submit. Limites do WhatsApp nas ações.
    @SuppressWarnings("unchecked")
    private static void validateSelectList(FlowNode ownerNode, SduiNode node, DataScope scope,
                                           List<FlowViolation> violations) {
        String where = "Na lista de seleção '" + node.id() + "'";
        Map<String, SduiBinding> bindings = node.bindings() != null ? node.bindings() : Map.of();
        SduiBinding items = bindings.get("items");
        if (items == null || !"oneWay".equals(items.mode()) || !scope.isList(items.path())) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", os itens precisam vir, em modo leitura, de uma lista (data.*)"
                    + " — a saída de uma integração do tipo lista ou uma fonte de dados da tela"));
        }
        SduiBinding value = bindings.get("value");
        if (value == null || value.path() == null || !value.path().startsWith("form.") || !"twoWay".equals(value.mode())) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", o item escolhido precisa ser gravado num campo do formulário (form.*)"));
        }
        Object maxItems = node.props() != null ? node.props().get("maxItems") : null;
        if (maxItems != null && (!(maxItems instanceof Number n) || n.intValue() < 1)) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", o máximo de itens precisa ser um número a partir de 1"));
        }
        Object rawActions = node.props() != null ? node.props().get("actions") : null;
        List<Object> actions = rawActions instanceof List<?> list ? (List<Object>) list : List.of();
        if (rawActions != null && !(rawActions instanceof List<?>)) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", as ações precisam ser uma lista"));
        }
        Set<String> ids = new HashSet<>();
        for (Object raw : actions) {
            if (!(raw instanceof Map<?, ?> action)) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", há uma ação em formato inválido"));
                continue;
            }
            Object id = action.get("id");
            Object label = action.get("label");
            if (!(id instanceof String s) || !ACTION_ID.matcher(s).matches() || !ids.add(s)) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", a ação '" + id
                        + "' precisa de um identificador único (letras, números, _ ou -)"));
            }
            if (!(label instanceof String l) || l.isBlank()) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", a ação '" + id + "' está sem rótulo"));
            } else if (scope.whatsapp() && l.length() > WHATSAPP_MAX_ACTION_LABEL) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", o rótulo da ação '" + l + "' tem mais de "
                        + WHATSAPP_MAX_ACTION_LABEL + " caracteres, o limite de um botão no WhatsApp"));
            }
            Object variant = action.get("variant");
            if (variant != null && !VALID_ACTION_VARIANTS.contains(variant)) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", a ação '" + id
                        + "' usa um estilo inválido — use primary, secondary ou danger"));
            }
            Object enabledWhen = action.get("enabledWhen");
            if (enabledWhen != null && !(enabledWhen instanceof String e && (e.isBlank() || ENABLED_WHEN.matcher(e).matches()))) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", a regra \"liberada quando\" da ação '" + id
                        + "' precisa comparar um campo do item, por exemplo {{item.podeCancelar}} == true"));
            }
        }
        if (scope.whatsapp() && actions.size() > WHATSAPP_MAX_ACTIONS) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", há " + actions.size() + " ações — o WhatsApp mostra no máximo "
                    + WHATSAPP_MAX_ACTIONS + " botões"));
        }
        if (!actions.isEmpty()) {
            SduiBinding action = bindings.get("action");
            if (action == null || action.path() == null || !action.path().startsWith("form.") || !"twoWay".equals(action.mode())) {
                violations.add(new FlowViolation(ownerNode.getId(), where + ", a ação escolhida precisa ser gravada num campo do formulário (form.*)"));
            }
        }
        SduiEvent onAction = node.events() != null ? node.events().get("onAction") : null;
        if (onAction == null || !"action.submit".equals(onAction.action())) {
            violations.add(new FlowViolation(ownerNode.getId(), where + ", o evento onAction precisa concluir a etapa (action.submit)"));
        }
    }

    private static void validateCondition(FlowNode ownerNode, String componentId, String label,
                                           SduiVisibility condition, List<FlowViolation> violations) {
        if (condition == null) return;
        if (!isKnownDataPath(condition.path())) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + componentId + "' tem "
                    + label + " com path inválido: '" + condition.path() + "'"));
        }
        if (condition.rule() == null || !VALID_VISIBILITY_RULES.contains(condition.rule())) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + componentId + "' tem "
                    + label + " com regra inválida: '" + condition.rule() + "'"));
        }
    }

    private static void validateReservedFields(FlowNode ownerNode, SduiNode node,
                                                ComponentDefinition definition,
                                                List<FlowViolation> violations) {
        Set<String> allowed = Set.copyOf(definition.getAllowedReservedFields());
        if (node.bindings() != null && !node.bindings().isEmpty() && !allowed.contains("$bindings")) {
            addReservedFieldViolation(ownerNode, node, "$bindings", violations);
        }
        if (node.events() != null && !node.events().isEmpty() && !allowed.contains("$events")) {
            addReservedFieldViolation(ownerNode, node, "$events", violations);
        }
        if (node.visibility() != null && !allowed.contains("$visibility")) {
            addReservedFieldViolation(ownerNode, node, "$visibility", violations);
        }
        if (node.active() != null && !allowed.contains("$active")) {
            addReservedFieldViolation(ownerNode, node, "$active", violations);
        }
    }

    private static void addReservedFieldViolation(FlowNode ownerNode, SduiNode node, String field,
                                                   List<FlowViolation> violations) {
        violations.add(new FlowViolation(ownerNode.getId(), "O campo '" + field
                + "' não é permitido no componente '" + node.id() + "'"));
    }

    // Nome de variável de processo de um campo de tela SDUI: parte final de um binding
    // value.path = "form.<nome>" (mesma convenção que o ms-espec-registry usa em runtime pra
    // resolver respostas de formulário em CamundaVariable) — equivalente ao antigo
    // FormFieldType.collectsValue() + FormField.getName().
    private static Set<String> formVariableNames(SduiNode root) {
        Set<String> names = new HashSet<>();
        collectFormVariableNames(root, names);
        return names;
    }

    private static void collectFormVariableNames(SduiNode node, Set<String> names) {
        if (node == null) {
            return;
        }
        if (node.bindings() != null) {
            // "action" é o segundo campo que a lista de seleção grava (a ação escolhida).
            for (String key : List.of("value", "action")) {
                SduiBinding binding = node.bindings().get(key);
                if (binding != null && binding.path() != null && binding.path().startsWith("form.")) {
                    names.add(binding.path().substring("form.".length()));
                }
            }
        }
        // Botão que grava um valor ao concluir a etapa (action.submit com path/value): a variável
        // gravada é tão do formulário quanto a de um campo.
        if (node.events() != null) {
            for (SduiEvent event : node.events().values()) {
                if (event != null && "action.submit".equals(event.action()) && submitChoiceVariable(event) != null) {
                    names.add(submitChoiceVariable(event));
                }
            }
        }
        if (node.children() != null) {
            for (SduiNode child : node.children()) {
                collectFormVariableNames(child, names);
            }
        }
    }

    // action.submit pode gravar um valor junto: params { path: "form.<nome>", value }. Devolve o nome
    // da variável, ou null quando o par não está completo e válido.
    private static String submitChoiceVariable(SduiEvent event) {
        Map<String, Object> params = event.params();
        if (params == null || !(params.get("path") instanceof String path)
                || !path.matches("form\\.[A-Za-z_][A-Za-z0-9_]*")) {
            return null;
        }
        Object value = params.get("value");
        return value == null || value.toString().isBlank() ? null : path.substring("form.".length());
    }

    // O editor grava params com os campos em branco quando o autor não quer gravar valor nenhum.
    private static boolean isBlankSubmitChoice(SduiEvent event) {
        Map<String, Object> params = event.params();
        return params == null || params.values().stream().allMatch(v -> v == null || v.toString().isBlank());
    }

    private static Set<String> bfs(String startId, Map<String, List<String>> graph) {
        Set<String> seen = new HashSet<>();
        seen.add(startId);
        Queue<String> queue = new ArrayDeque<>();
        queue.add(startId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (String next : graph.getOrDefault(current, List.of())) {
                if (seen.add(next)) {
                    queue.add(next);
                }
            }
        }
        return seen;
    }
}
