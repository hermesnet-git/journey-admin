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
 * one input and exactly two outputs (MVP scope — see FT-03.11 for evolution items out of scope),
 * exactly one of which is the default (no condition) and the other carrying a non-blank condition.
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
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    // Seção 8 do catálogo SDUI: os 5 namespaces de binding permitidos.
    private static final Set<String> VALID_BINDING_NAMESPACES =
            Set.of("form.", "data.", "session.", "route.", "computed.");
    // Seção 9 do catálogo SDUI: as 6 ações do Action Registry.
    private static final Set<String> VALID_SDUI_ACTIONS = Set.of("action.submit", "action.navigate",
            "action.openUrl", "action.setValue", "action.track", "action.dismiss");
    // equals/notEquals: seção 14.2 do catálogo (único shape exemplificado). in/notIn: extensão
    // pontual pra suportar "visível nestes canais" (lista de valores) sem virar lógica booleana
    // composta — continua uma única regra, só que contra um conjunto de valores em vez de um só.
    private static final Set<String> VALID_VISIBILITY_RULES = Set.of("equals", "notEquals", "in", "notIn");
    private static final Pattern SEMVER = Pattern.compile("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$");
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

    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections,
                                 Map<String, ComponentDefinition> componentRegistry) {
        validate(nodes, connections, componentRegistry, List.of());
    }

    // channelTypes: tipos de canal da jornada sendo publicada — usado só pra checar que nenhuma
    // tela fica sem nenhum componente visível para algum deles (validateChannelVisibilityCoverage).
    // Vazio (ex.: validação de rascunho/preview, antes de a jornada ter canal resolvido) pula essa
    // checagem — o resto da validação estrutural continua idêntico.
    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections,
                                 Map<String, ComponentDefinition> componentRegistry, List<ChannelType> channelTypes) {
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
        // Gateway/connectorConfig/messageText do mesmo jeito que qualquer outra variável.
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
                startVariableNames.add(s);
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
        for (FlowConnection connection : connections) {
            outDegree.merge(connection.getSourceNodeId(), 1, Integer::sum);
            inDegree.merge(connection.getTargetNodeId(), 1, Integer::sum);
            forward.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>())
                    .add(connection.getTargetNodeId());
            backward.computeIfAbsent(connection.getTargetNodeId(), k -> new ArrayList<>())
                    .add(connection.getSourceNodeId());
            outgoingConnections.computeIfAbsent(connection.getSourceNodeId(), k -> new ArrayList<>()).add(connection);
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
                    if (in < 1 || out != 2) {
                        violations.add(new FlowViolation(node.getId(), "A Decisão '" + node.getName()
                                + "' precisa ser alcançada por uma etapa anterior e ter exatamente dois caminhos possíveis"));
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

            if (node.getConnectorConfig() != null) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
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
                }

                // REQ-03.09.014: every {{name}} referenced by this node's connector config must be
                // declared by some ancestor's output mapping (REQ-03.09.010) reachable backwards from it.
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connectorConfig.getConfig(), usedTokens);
                if (!usedTokens.isEmpty()) {
                    Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                    for (String token : usedTokens) {
                        if (!availableVars.contains(token)) {
                            violations.add(new FlowViolation(node.getId(), "'" + node.getName() + "' referencia a variável '{{" + token
                                    + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                        }
                    }
                }
            }

            if (node.getType() == FlowNodeType.USER_TASK) {
                validateEmbeddedScreen(node, componentRegistry, channelTypes, violations);
            }

            // Mirrors REQ-03.09.014 for the display-only message of a formless USER_TASK: any
            // {{name}} it references must also be declared by some reachable ancestor, same rule as
            // a connector field — otherwise the channel would show a literal "{{...}}" at runtime.
            if (node.getType() == FlowNodeType.USER_TASK && node.getMessageText() != null) {
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(node.getMessageText(), usedTokens);
                if (!usedTokens.isEmpty()) {
                    Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                    for (String token : usedTokens) {
                        if (!availableVars.contains(token)) {
                            violations.add(new FlowViolation(node.getId(), "A mensagem exibida por '" + node.getName() + "' referencia a variável '{{"
                                    + token + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                        }
                    }
                }
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
                if (usedTokens.isEmpty()) {
                    continue;
                }
                Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                for (String token : usedTokens) {
                    if (!availableVars.contains(token)) {
                        violations.add(new FlowViolation(node.getId(), "A condição da Decisão '" + node.getName() + "' referencia a variável '{{"
                                + token + "}}', que ainda não existe nesse ponto da jornada" + describeAvailableVars(availableVars)));
                    }
                }
            }
        }

        // REQ-03.09.011: nomes de variável de saída devem ser únicos em toda a jornada
        // (seenOutputNames já carrega os nomes de startVariables do bloco acima). Os nomes de campo
        // de formulário de uma USER_TASK agora compartilham esse mesmo namespace — dois campos
        // alcançáveis com o mesmo nome tornariam um {{token}} que os referencia ambíguo sobre qual
        // dos dois quer dizer. Isso foi cogitado e descartado: colocar um prefixo no token (ex.:
        // formularioA.cpf) só funcionaria se o motor de runtime realmente gravasse o valor
        // submetido sob essa chave prefixada — e a resolução de variáveis em runtime está fora do
        // domínio deste portal (nota do REQ-03.09.012), então não há como confirmar isso daqui.
        // Rejeitar a colisão como erro, igual já acontece pra choque de nome de outputMapping, não
        // depende disso.
        //
        // ponytail: unicidade verificada em todo o fluxo (mesmo escopo que a checagem de
        // outputMapping já usava), não restrita a quais nós realmente conseguem se alcançar — mais
        // simples, e erra pro lado conservador (rejeita algum reuso de nome de campo que nunca
        // colidiria de verdade em nenhum caminho real, ex.: o mesmo formulário reusado em dois
        // ramos que nunca se reconvergem). Revisar se isso se mostrar restritivo demais na
        // prática — restringir por alcançabilidade exigiria o mesmo BFS reverso que as checagens de
        // {{token}} abaixo já fazem, rodado por par de nós em vez de uma vez só para o fluxo todo.
        for (FlowNode node : nodes) {
            if (node.getConnectorConfig() != null) {
                for (Map<String, Object> rule : outputMappingOf(node.getConnectorConfig())) {
                    Object name = rule.get("name");
                    if (name instanceof String s && !s.isBlank() && !seenOutputNames.add(s)) {
                        violations.add(new FlowViolation(node.getId(), "Variável de saída '" + s + "' foi declarada mais de uma vez no fluxo"));
                    }
                }
            }
            if (node.getType() == FlowNodeType.USER_TASK && node.getEmbeddedScreenRoot() != null) {
                for (String variableName : formVariableNames(node.getEmbeddedScreenRoot())) {
                    if (!seenOutputNames.add(variableName)) {
                        violations.add(new FlowViolation(node.getId(), "Variável de saída '" + variableName + "' foi declarada mais de uma vez no fluxo"));
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
                    }
                }
            }
            if (other.getType() == FlowNodeType.USER_TASK && other.getEmbeddedScreenRoot() != null) {
                availableVars.addAll(formVariableNames(other.getEmbeddedScreenRoot()));
            }
        }
        return availableVars;
    }

    // Lista as opções reais em vez de só apontar o erro — sem isso, tanto a IA (que só vê a
    // violação de volta no próximo prompt, sem visão do fluxo inteiro) quanto quem desenha na mão
    // ficam sem saber se o problema é um nome digitado errado (quase sempre) ou um outputMapping
    // que realmente falta declarar.
    private static String describeAvailableVars(Set<String> availableVars) {
        if (availableVars.isEmpty()) {
            return " (nenhuma variável disponível ainda neste ponto do fluxo)";
        }
        return " — variáveis disponíveis aqui: " + String.join(", ", new TreeSet<>(availableVars));
    }

    private static void collectVariableTokens(Object value, Set<String> tokens) {
        if (value instanceof String s) {
            Matcher matcher = VARIABLE_TOKEN.matcher(s);
            while (matcher.find()) {
                tokens.add(matcher.group(1));
            }
        } else if (value instanceof Map<?, ?> map) {
            map.values().forEach(v -> collectVariableTokens(v, tokens));
        } else if (value instanceof List<?> list) {
            list.forEach(v -> collectVariableTokens(v, tokens));
        }
    }

    // Estrutura da árvore SDUI da tela embutida (catálogo corporativo v1): id únicos, type+version
    // existe no Component Registry e não é REMOVED, children só sob nó com allowsChildren=true,
    // namespace de binding válido, ação de evento é uma das 6 do Action Registry. Raiz precisa ser
    // ui.screen (seção 14.1: "root deve conter exatamente um ui.screen").
    private static void validateEmbeddedScreen(FlowNode node, Map<String, ComponentDefinition> componentRegistry,
                                                 List<ChannelType> channelTypes, List<FlowViolation> violations) {
        SduiNode root = node.getEmbeddedScreenRoot();
        if (root == null) {
            return;
        }
        if (!"ui.screen".equals(root.type())) {
            violations.add(new FlowViolation(node.getId(), "A tela do nó '" + node.getName() + "' deve ter raiz do tipo ui.screen (encontrado '"
                    + root.type() + "')"));
        }
        validateSduiNode(node, root, componentRegistry, new HashSet<>(), violations);
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

    // Só avalia uma regra que referencie session.channel — qualquer outro path (form/data/etc.)
    // depende de dado de execução que não existe em tempo de design, então é tratado como sempre
    // visível aqui (permissivo, erra pro lado de não bloquear publicação por falso positivo).
    private static boolean isVisibleForChannel(SduiVisibility visibility, String channelType) {
        if (visibility == null || !"session.channel".equals(visibility.path())) {
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
                                          List<FlowViolation> violations) {
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
            definition.getPropsSchema().stream().filter(p -> p.required() && !props.containsKey(p.name())).forEach(p ->
                    violations.add(new FlowViolation(ownerNode.getId(), "O atributo obrigatório '" + p.name()
                            + "' não foi informado no componente '" + sduiNode.id() + "'")));
            validateCanonicalPropertyValues(ownerNode, sduiNode, props, violations);
            validateReservedFields(ownerNode, sduiNode, definition, violations);
        }

        List<SduiNode> children = sduiNode.children();
        if (children != null && !children.isEmpty() && definition != null && !definition.isAllowsChildren()) {
            violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' (" + sduiNode.type() + ") não aceita filhos, na tela do nó '"
                    + ownerNode.getName() + "'"));
        }

        if (sduiNode.bindings() != null) {
            for (SduiBinding binding : sduiNode.bindings().values()) {
                if (binding.path() == null || VALID_BINDING_NAMESPACES.stream().noneMatch(binding.path()::startsWith)) {
                    violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem um binding com path inválido: '"
                            + binding.path() + "', na tela do nó '" + ownerNode.getName() + "'"));
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
            if (visibility.path() == null || VALID_BINDING_NAMESPACES.stream().noneMatch(visibility.path()::startsWith)) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem uma visibilidade com path inválido: '"
                        + visibility.path() + "', na tela do nó '" + ownerNode.getName() + "'"));
            }
            if (visibility.rule() == null || !VALID_VISIBILITY_RULES.contains(visibility.rule())) {
                violations.add(new FlowViolation(ownerNode.getId(), "O componente '" + sduiNode.id() + "' tem uma visibilidade com regra inválida: '"
                        + visibility.rule() + "', na tela do nó '" + ownerNode.getName() + "'"));
            }
        }
        validateCondition(ownerNode, sduiNode.id(), "estado ativo", sduiNode.active(), violations);

        if (children != null) {
            for (SduiNode child : children) {
                validateSduiNode(ownerNode, child, componentRegistry, seenIds, violations);
            }
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

    private static void validateCondition(FlowNode ownerNode, String componentId, String label,
                                           SduiVisibility condition, List<FlowViolation> violations) {
        if (condition == null) return;
        if (condition.path() == null || VALID_BINDING_NAMESPACES.stream().noneMatch(condition.path()::startsWith)) {
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
            SduiBinding valueBinding = node.bindings().get("value");
            if (valueBinding != null && valueBinding.path() != null && valueBinding.path().startsWith("form.")) {
                names.add(valueBinding.path().substring("form.".length()));
            }
        }
        if (node.children() != null) {
            for (SduiNode child : node.children()) {
                collectFormVariableNames(child, names);
            }
        }
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
