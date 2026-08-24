package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.form.FormField;
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

    private FlowValidator() {
    }

    public static void validate(List<FlowNode> nodes, List<FlowConnection> connections) {
        List<String> violations = new ArrayList<>();

        List<FlowNode> starts = nodes.stream().filter(n -> START_TYPES.contains(n.getType())).toList();
        // REQ-03.11.001: a GATEWAY's two branches may each run to their own END instead of
        // reconverging first, so — unlike the single start element — the flow may have more than
        // one END node; it must just have at least one.
        List<FlowNode> ends = nodes.stream().filter(n -> n.getType() == FlowNodeType.END).toList();
        if (starts.size() != 1) {
            violations.add("O fluxo deve conter exatamente um elemento inicial, START ou MESSAGE_START_EVENT (encontrado(s) "
                    + starts.size() + ")");
        }
        if (ends.isEmpty()) {
            violations.add("O fluxo deve conter ao menos um nó END");
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
        Set<String> startVariableNames = new HashSet<>();
        for (FlowNode node : nodes) {
            List<Map<String, Object>> declared = node.getStartVariables();
            if (declared == null || declared.isEmpty()) {
                continue;
            }
            if (node.getType() != FlowNodeType.START) {
                violations.add("Nó '" + node.getName() + "' declara startVariables mas não é o nó START");
                continue;
            }
            for (Map<String, Object> declaration : declared) {
                Object name = declaration.get("name");
                Object type = declaration.get("type");
                if (!(name instanceof String s) || s.isBlank()) {
                    violations.add("Nó START '" + node.getName() + "' tem uma entrada de startVariables sem um nome válido");
                    continue;
                }
                if (!(type instanceof String t) || !VALID_VARIABLE_TYPES.contains(t)) {
                    violations.add("Nó START '" + node.getName() + "' declara a variável '" + s + "' com um tipo inválido");
                    continue;
                }
                if (!seenOutputNames.add(s)) {
                    violations.add("Variável de saída '" + s + "' foi declarada mais de uma vez no fluxo");
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
                        violations.add("Nó " + node.getType() + " '" + node.getName()
                                + "' deve ter nenhuma entrada e exatamente uma saída");
                    }
                }
                case USER_TASK, SERVICE_TASK, RECEIVE_TASK -> {
                    if (in < 1 || out != 1) {
                        // Dica só quando a causa provável é tentar ramificar direto daqui (out > 1) —
                        // é o erro mais comum tanto de quem desenha na mão quanto da geração por IA
                        // (ver FlowGenerationPrompt): a intenção é uma decisão, mas falta o GATEWAY.
                        String hint = out > 1
                                ? " (para ramificar a partir daqui, insira um GATEWAY logo depois — este tipo de nó nunca tem mais de uma saída)"
                                : "";
                        violations.add("Nó " + node.getType() + " '" + node.getName()
                                + "' deve ter ao menos uma entrada e exatamente uma saída" + hint);
                    }
                }
                case END -> {
                    if (in < 1 || out != 0) {
                        violations.add("Nó END '" + node.getName()
                                + "' deve ter ao menos uma entrada e nenhuma saída");
                    }
                }
                case GATEWAY -> {
                    if (in < 1 || out != 2) {
                        violations.add("Nó GATEWAY '" + node.getName()
                                + "' deve ter ao menos uma entrada e exatamente duas saídas (escopo do MVP)");
                    } else {
                        List<FlowConnection> outgoing = outgoingConnections.getOrDefault(node.getId(), List.of());
                        long defaultCount = outgoing.stream().filter(FlowConnection::isDefault).count();
                        if (defaultCount != 1) {
                            violations.add("Nó GATEWAY '" + node.getName()
                                    + "' deve ter exatamente uma saída padrão (encontrada(s) " + defaultCount + ")");
                        }
                        for (FlowConnection connection : outgoing) {
                            if (!connection.isDefault() && (connection.getCondition() == null || connection.getCondition().isBlank())) {
                                violations.add("Nó GATEWAY '" + node.getName()
                                        + "' tem uma saída não padrão sem condição");
                            }
                        }
                    }
                }
            }

            if (node.getConnectorConfig() != null) {
                ConnectorConfig connectorConfig = node.getConnectorConfig();
                if (!connectorConfig.getConnectorType().isEnabled()) {
                    violations.add("Nó '" + node.getName() + "' referencia um conector desabilitado ("
                            + connectorConfig.getConnectorType() + ")");
                }
                if (node.getType() == FlowNodeType.MESSAGE_START_EVENT
                        && !connectorConfig.getConnectorType().isMessageBroker()) {
                    violations.add("Nó MESSAGE_START_EVENT '" + node.getName()
                            + "' não pode usar um conector " + connectorConfig.getConnectorType()
                            + "; só um conector de mensageria (Kafka, Event Hubs ou Service Bus, em modo de consumo) inicia um fluxo a partir de uma mensagem recebida");
                }
                if (connectorConfig.getConnectorType().isMessageBroker()) {
                    String expectedOperation = BROKER_OPERATION_BY_TYPE.get(node.getType());
                    Object operation = connectorConfig.getConfig() != null ? connectorConfig.getConfig().get("operation") : null;
                    if (expectedOperation != null && operation != null && !expectedOperation.equals(operation)) {
                        violations.add("Nó '" + node.getName() + "': a operação de mensageria deve ser " + expectedOperation
                                + " para " + node.getType());
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
                            violations.add("Nó '" + node.getName() + "' referencia variável não declarada '{{" + token
                                    + "}}'" + describeAvailableVars(availableVars));
                        }
                    }
                }
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
                            violations.add("A mensagem do nó '" + node.getName() + "' referencia variável não declarada '{{"
                                    + token + "}}'" + describeAvailableVars(availableVars));
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
                    violations.add("A condição do nó GATEWAY '" + node.getName()
                            + "' contém aspas escapadas com barra invertida (\\\" ou \\'), inválidas em JUEL — use aspas"
                            + " diretas, sem escapar, ex.: {{campo}} == \"valor\".");
                }
                Set<String> usedTokens = new HashSet<>();
                collectVariableTokens(connection.getCondition(), usedTokens);
                if (usedTokens.isEmpty()) {
                    continue;
                }
                Set<String> availableVars = availableVarsFor(node, nodes, backward, startVariableNames);
                for (String token : usedTokens) {
                    if (!availableVars.contains(token)) {
                        violations.add("A condição do nó GATEWAY '" + node.getName() + "' referencia variável não declarada '{{"
                                + token + "}}'" + describeAvailableVars(availableVars));
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
                        violations.add("Variável de saída '" + s + "' foi declarada mais de uma vez no fluxo");
                    }
                }
            }
            if (node.getType() == FlowNodeType.USER_TASK && node.getEmbeddedScreen() != null) {
                for (FormField field : node.getEmbeddedScreen()) {
                    if (field.getType().collectsValue() && !seenOutputNames.add(field.getName())) {
                        violations.add("Variável de saída '" + field.getName() + "' foi declarada mais de uma vez no fluxo");
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
                    violations.add("Nó '" + node.getName() + "' não está em um caminho contínuo entre START e END");
                }
            }
        }

        // A chain of REST SERVICE_TASKs (Camunda's native http-connector, running synchronously
        // inside the engine — see attachHttpConnector in ms-transform-publication) running straight to
        // END with no checkpoint since START crashes the runtime engine: several connector executions
        // completing the process instance in the very transaction that started it trips a Camunda
        // engine bug ("execution ... doesn't exist", reproduced live against FT-05 execution).
        // USER_TASK, RECEIVE_TASK and a non-REST SERVICE_TASK (Kafka, or no connector — always the
        // external-task pattern, camunda:type="external") all pause the engine waiting on something
        // external, same effect as a USER_TASK for this purpose; only a REST SERVICE_TASK runs inline.
        // Requiring one of those checkpoints before such an END — a formless USER_TASK is enough,
        // REQ-04.01.005 — avoids the crash structurally, at design time instead of at runtime.
        Map<String, FlowNode> byId = new HashMap<>();
        nodes.forEach(n -> byId.put(n.getId(), n));
        for (FlowNode end : ends) {
            if (reachesEndWithoutCheckpoint(end, backward, byId)) {
                violations.add("Fim '" + end.getName()
                        + "' é alcançado por um trecho do fluxo só com tarefas automáticas via conector REST, sem "
                        + "nenhum checkpoint (User Task, Receive Task ou tarefa Kafka) antes — adicione uma User Task "
                        + "(pode ser sem formulário) antes desse Fim");
            }
        }

        if (!violations.isEmpty()) {
            throw new FlowValidationException(violations);
        }
    }

    private static boolean reachesEndWithoutCheckpoint(FlowNode end, Map<String, List<String>> backward,
                                                         Map<String, FlowNode> byId) {
        Set<String> seen = new HashSet<>();
        Queue<String> queue = new ArrayDeque<>();
        seen.add(end.getId());
        queue.add(end.getId());
        while (!queue.isEmpty()) {
            String current = queue.poll();
            FlowNode node = byId.get(current);
            if (node == null) {
                continue;
            }
            if (isSynchronousRestTask(node)) {
                return true;
            }
            if (isCheckpoint(node)) {
                continue; // engine pauses here (User Task, or an external-task node awaiting a worker) — don't look further back through it
            }
            for (String prev : backward.getOrDefault(current, List.of())) {
                if (seen.add(prev)) {
                    queue.add(prev);
                }
            }
        }
        return false;
    }

    private static boolean isSynchronousRestTask(FlowNode node) {
        return node.getType() == FlowNodeType.SERVICE_TASK && node.getConnectorConfig() != null
                && node.getConnectorConfig().getConnectorType() == ConnectorType.REST;
    }

    private static boolean isCheckpoint(FlowNode node) {
        if (node.getType() == FlowNodeType.USER_TASK || node.getType() == FlowNodeType.RECEIVE_TASK) {
            return true;
        }
        // A SERVICE_TASK not using the native REST connector goes through the external-task pattern
        // (Kafka, or no connector at all) — Camunda pauses there waiting for a worker, same as RECEIVE_TASK.
        return node.getType() == FlowNodeType.SERVICE_TASK && !isSynchronousRestTask(node);
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
            if (other.getType() == FlowNodeType.USER_TASK && other.getEmbeddedScreen() != null) {
                for (FormField field : other.getEmbeddedScreen()) {
                    if (field.getType().collectsValue()) {
                        availableVars.add(field.getName());
                    }
                }
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
