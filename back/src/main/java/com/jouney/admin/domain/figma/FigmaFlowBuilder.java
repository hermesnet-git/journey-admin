package com.jouney.admin.domain.figma;

import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowIds;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.sdui.SduiEvent;
import com.jouney.admin.domain.sdui.SduiNode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

/**
 * Transforma um trecho de desenho no fluxo de uma jornada.
 *
 * <p>Princípio: monta o que o desenho afirma e deixa visível o que ele não diz. As setas dizem o
 * que leva a quê e os losangos dizem onde há escolha — isso vira estrutura. O resto não é
 * adivinhado: uma decisão desenhada com um caminho só vira uma Decisão com uma saída em branco, e
 * uma tela que nenhuma seta toca entra no fluxo desligada, onde dá para ver e ligar.
 *
 * <p>Isso é possível porque rascunho pode ser salvo incompleto: é mais fácil corrigir um desenho
 * quase pronto do que montar um do zero, e um palpite errado custa mais caro que um buraco visível.
 */
public final class FigmaFlowBuilder {

    private static final String TYPE_SECTION = "SECTION";
    private static final String TYPE_CONNECTOR = "CONNECTOR";
    private static final String TYPE_SHAPE = "SHAPE_WITH_TEXT";
    private static final String SHAPE_DIAMOND = "DIAMOND";

    // O desenho se espalha por dezenas de milhares de pixels; o canvas do editor trabalha noutra
    // escala. Encolher mantendo as posições relativas preserva a leitura que o desenho já tem.
    private static final double CANVAS_SCALE = 0.35;
    private static final int STEP_FALLBACK_SPACING = 320;
    // Distância entre os dois caminhos de uma Decisão, para não nascerem um por cima do outro.
    private static final int GATEWAY_BRANCH_OFFSET = 120;

    private FigmaFlowBuilder() {
    }

    /** Um passo do fluxo: a tela que o representa e todas as telas que foram reunidas nele. */
    private record Step(String flowNodeId, String title, JsonNode screen, Set<String> figmaIds) {
    }

    /**
     * Monta o fluxo de vários trechos de uma vez. Não é o mesmo que importar cada um em separado: as
     * setas que saem de um trecho e chegam noutro — a emenda entre uma fase e a seguinte — só
     * fecham quando os dois estão presentes. Importando em pedaços, cada jornada nasce cortada
     * exatamente onde a fase seguinte começava.
     */
    public static FigmaBuiltFlow build(List<JsonNode> roots, String flowName, boolean mergeRepeated,
                                        boolean includeScreens) {
        return build(mergeRoots(discardContained(roots)), flowName, mergeRepeated, includeScreens);
    }

    /**
     * Um trecho dentro de outro já vem junto com ele; mantê-lo na lista faria cada tela entrar duas
     * vezes, como se fossem passos diferentes.
     */
    private static List<JsonNode> discardContained(List<JsonNode> roots) {
        List<JsonNode> kept = new ArrayList<>();
        for (JsonNode candidate : roots) {
            String id = candidate.path("id").asText();
            boolean insideAnother = roots.stream()
                    .anyMatch(other -> other != candidate && contains(other, id));
            if (!insideAnother) {
                kept.add(candidate);
            }
        }
        return kept.isEmpty() ? roots : kept;
    }

    private static boolean contains(JsonNode node, String id) {
        if (id.equals(node.path("id").asText())) {
            return true;
        }
        for (JsonNode child : node.path("children")) {
            if (contains(child, id)) {
                return true;
            }
        }
        return false;
    }

    /** Os trechos passam a ser filhos de uma raiz só, e toda a leitura segue valendo sem mudança. */
    private static JsonNode mergeRoots(List<JsonNode> roots) {
        if (roots.size() == 1) {
            return roots.get(0);
        }
        ObjectNode merged = JsonNodeFactory.instance.objectNode();
        merged.put("id", "merged");
        merged.put("type", "CANVAS");
        merged.put("name", "");
        ArrayNode children = merged.putArray("children");
        roots.forEach(children::add);
        return merged;
    }

    public static FigmaBuiltFlow build(JsonNode root, String flowName, boolean mergeRepeated, boolean includeScreens) {
        int screenWidth = FigmaFlowExtractor.detectScreenWidth(root);
        List<JsonNode> screens = FigmaFlowExtractor.collectScreens(root, screenWidth);
        screens.sort(Comparator.comparingDouble(FigmaFlowBuilder::xOf));

        // Telas com o mesmo título são estados do mesmo passo (vazio, preenchido, com erro). Todas
        // apontam para o mesmo nó, senão uma seta que chega no estado de erro criaria um passo
        // paralelo que nunca existiu.
        Map<String, Step> stepsByKey = new LinkedHashMap<>();
        Map<String, String> flowNodeByFigmaId = new HashMap<>();
        for (JsonNode screen : screens) {
            String title = FigmaFlowExtractor.titleOf(screen);
            String figmaId = screen.path("id").asText();
            String key = mergeRepeated && !title.isBlank() ? title : figmaId;
            Step step = stepsByKey.get(key);
            if (step == null) {
                step = new Step(FlowIds.newNodeId(), title.isBlank() ? "Etapa" : title, screen, new LinkedHashSet<>());
                stepsByKey.put(key, step);
            }
            step.figmaIds().add(figmaId);
            flowNodeByFigmaId.put(figmaId, step.flowNodeId());
        }

        Map<String, JsonNode> diamonds = new LinkedHashMap<>();
        List<JsonNode> connectors = new ArrayList<>();
        Map<String, JsonNode> sections = new LinkedHashMap<>();
        collect(root, diamonds, connectors, sections);

        Map<String, String> flowNodeByDiamond = new LinkedHashMap<>();
        for (String diamondId : diamonds.keySet()) {
            String nodeId = FlowIds.newNodeId();
            flowNodeByDiamond.put(diamondId, nodeId);
            flowNodeByFigmaId.put(diamondId, nodeId);
        }

        // Uma seta que aponta para um agrupamento inteiro está dizendo "vai para aquele bloco".
        // O começo do bloco é a tela mais à esquerda dentro dele.
        for (Map.Entry<String, JsonNode> section : sections.entrySet()) {
            List<JsonNode> inside = FigmaFlowExtractor.collectScreens(section.getValue(), screenWidth);
            inside.stream().min(Comparator.comparingDouble(FigmaFlowBuilder::xOf))
                    .map(first -> flowNodeByFigmaId.get(first.path("id").asText()))
                    .ifPresent(target -> flowNodeByFigmaId.put(section.getKey(), target));
        }

        Map<String, JsonNode> byId = new HashMap<>();
        indexById(root, byId);
        Map<String, String> parentOf = new HashMap<>();
        indexParents(root, null, parentOf);

        List<Edge> edges = new ArrayList<>();
        for (JsonNode connector : connectors) {
            String from = resolve(connector.path("connectorStart").path("endpointNodeId").asText(), flowNodeByFigmaId, parentOf);
            String to = resolve(connector.path("connectorEnd").path("endpointNodeId").asText(), flowNodeByFigmaId, parentOf);
            if (from == null || to == null || from.equals(to)) {
                continue;
            }
            edges.add(new Edge(from, to, label(connector)));
        }

        List<FlowNode> nodes = new ArrayList<>();
        List<FlowConnection> connections = new ArrayList<>();
        Bounds bounds = boundsOf(screens, diamonds.values());

        Map<String, String> nameByFlowNode = new LinkedHashMap<>();
        for (Step step : stepsByKey.values()) {
            FlowNode node = userTask(step, bounds, includeScreens);
            nodes.add(node);
            nameByFlowNode.put(node.getId(), node.getName());
        }
        for (Map.Entry<String, JsonNode> diamond : diamonds.entrySet()) {
            nodes.add(gateway(flowNodeByDiamond.get(diamond.getKey()), diamond.getValue(), bounds));
        }

        Set<String> gatewayIds = new LinkedHashSet<>(flowNodeByDiamond.values());
        edges = splitBranchingSteps(edges, gatewayIds, nameByFlowNode, nodes);
        edges = dropUnreachedGateways(edges, gatewayIds, nodes);
        connections.addAll(linkEdges(edges, gatewayIds));

        Set<String> withIncoming = new LinkedHashSet<>();
        Set<String> withOutgoing = new LinkedHashSet<>();
        for (FlowConnection connection : connections) {
            withIncoming.add(connection.getTargetNodeId());
            withOutgoing.add(connection.getSourceNodeId());
        }

        List<String> linked = nodes.stream().map(FlowNode::getId)
                .filter(id -> withIncoming.contains(id) || withOutgoing.contains(id)).toList();
        List<String> unlinked = nodes.stream().map(FlowNode::getId).filter(id -> !linked.contains(id)).toList();

        String startId = FlowIds.newNodeId();
        nodes.add(0, new FlowNode(startId, FlowNodeType.START, "Início", null,
                -STEP_FALLBACK_SPACING, 0, null, List.of(), null, null));

        // O desenho não diz por onde a jornada começa, então o começo é deduzido: entre os passos
        // que ninguém alcança, o que leva a mais lugares. Pegar simplesmente o primeiro sem entrada
        // costuma cair num canto do desenho que termina em três telas, deixando todo o resto fora
        // do caminho que sai do Início.
        pickEntryPoint(linked, connections, nodes).ifPresent(first ->
                connections.add(new FlowConnection(FlowIds.newConnectionId(), startId, first, null, false)));

        closeOpenPaths(linked, gatewayIds, nodes, connections);
        return new FigmaBuiltFlow(flowName, nodes, connections, unlinked.size());
    }

    private record Edge(String from, String to, String label) {
    }

    /**
     * Uma etapa comum leva a exatamente um lugar; quem ramifica é a Decisão. No desenho isso não
     * aparece: as setas de escolha saem direto dos botões da tela, e a tela acaba com dois ou mais
     * caminhos. Onde isso acontece, a escolha ganha a Decisão que o desenho deixou implícita, com o
     * mesmo nome da tela — que quase sempre já é a pergunta ("Encontrou cliente?").
     */
    private static List<Edge> splitBranchingSteps(List<Edge> edges, Set<String> gatewayIds,
                                                   Map<String, String> nameByFlowNode, List<FlowNode> nodes) {
        Map<String, List<Edge>> bySource = new LinkedHashMap<>();
        for (Edge edge : edges) {
            bySource.computeIfAbsent(edge.from(), key -> new ArrayList<>()).add(edge);
        }

        List<Edge> rewritten = new ArrayList<>();
        Map<String, FlowNode> nodeById = new LinkedHashMap<>();
        nodes.forEach(node -> nodeById.put(node.getId(), node));

        for (Map.Entry<String, List<Edge>> entry : bySource.entrySet()) {
            List<Edge> outgoing = entry.getValue();
            if (gatewayIds.contains(entry.getKey()) || outgoing.size() < 2) {
                rewritten.addAll(outgoing);
                continue;
            }
            FlowNode origin = nodeById.get(entry.getKey());
            String gatewayId = FlowIds.newNodeId();
            String label = nameByFlowNode.getOrDefault(entry.getKey(), "Decisão");
            nodes.add(new FlowNode(gatewayId, FlowNodeType.GATEWAY, label, null,
                    origin == null ? 0 : origin.getPositionX() + STEP_FALLBACK_SPACING,
                    origin == null ? 0 : origin.getPositionY(), null, List.of(), null, null));
            gatewayIds.add(gatewayId);
            rewritten.add(new Edge(entry.getKey(), gatewayId, ""));
            for (Edge edge : outgoing) {
                rewritten.add(new Edge(gatewayId, edge.to(), edge.label()));
            }
        }
        return rewritten;
    }

    /**
     * Um caminho de decisão carrega a condição no rótulo da seta ("sim", "não"). O fluxo exige que
     * uma das duas saídas seja a padrão, então a rotulada vira a condição e a outra fica de padrão;
     * a condição em si entra em branco, porque o desenho diz que existe uma escolha, não sobre qual
     * variável ela é feita.
     */
    private static List<FlowConnection> linkEdges(List<Edge> edges, java.util.Collection<String> gatewayIds) {
        List<FlowConnection> out = new ArrayList<>();
        Map<String, Integer> perGateway = new HashMap<>();
        for (Edge edge : edges) {
            boolean fromGateway = gatewayIds.contains(edge.from());
            if (!fromGateway) {
                out.add(new FlowConnection(FlowIds.newConnectionId(), edge.from(), edge.to(), null, false));
                continue;
            }
            int taken = perGateway.merge(edge.from(), 1, Integer::sum);
            if (taken > 2) {
                // Decisão desenhada com mais de dois caminhos: o fluxo só comporta dois, e escolher
                // quais manter seria palpite. Os excedentes ficam de fora, para serem refeitos à mão.
                continue;
            }
            boolean isDefault = taken == 2;
            out.add(new FlowConnection(FlowIds.newConnectionId(), edge.from(), edge.to(),
                    isDefault ? null : "", isDefault));
        }
        return out;
    }

    /**
     * Tira do fluxo as Decisões que nada alcança. Uma escolha sem etapa anterior não decide coisa
     * alguma: só aparece no meio do canvas sem explicar de onde veio. Os caminhos que saíam dela
     * saem junto, porque também não teriam como ser percorridos.
     *
     * <p>Acontece quando o losango está desenhado mas a seta que chegaria nele não foi traçada, ou
     * quando ela vem de um trecho que ficou fora do que se escolheu importar.
     */
    private static List<Edge> dropUnreachedGateways(List<Edge> edges, Set<String> gatewayIds, List<FlowNode> nodes) {
        Set<String> reached = edges.stream().map(Edge::to).collect(java.util.stream.Collectors.toSet());
        Set<String> orphans = gatewayIds.stream().filter(id -> !reached.contains(id))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (orphans.isEmpty()) {
            return edges;
        }
        gatewayIds.removeAll(orphans);
        nodes.removeIf(node -> orphans.contains(node.getId()));
        return edges.stream().filter(edge -> !orphans.contains(edge.from()) && !orphans.contains(edge.to())).toList();
    }

    /**
     * Fecha cada caminho aberto com um Fim próprio, em vez de levar todos a um Fim único.
     *
     * <p>Com um só, cada ponta que termina precisa atravessar o canvas inteiro até ele, e o
     * emaranhado de linhas cruzadas esconde justamente a sequência que se quer ler. Um Fim por ponta
     * mantém cada caminho legível de ponta a ponta — e o fluxo aceita quantos Fins forem precisos.
     *
     * <p>Uma Decisão desenhada com um caminho só ganha o Fim no outro: é o "e se não" que o desenho
     * deixou implícito, e sem ele a Decisão nasceria incompleta.
     */
    private static void closeOpenPaths(List<String> linked, Set<String> gatewayIds, List<FlowNode> nodes,
                                        List<FlowConnection> connections) {
        Map<String, Integer> outDegree = new HashMap<>();
        connections.forEach(connection -> outDegree.merge(connection.getSourceNodeId(), 1, Integer::sum));
        Map<String, FlowNode> nodeById = new LinkedHashMap<>();
        nodes.forEach(node -> nodeById.put(node.getId(), node));

        for (String id : linked) {
            int taken = outDegree.getOrDefault(id, 0);
            boolean isGateway = gatewayIds.contains(id);
            int missing = isGateway ? Math.max(0, 2 - taken) : (taken == 0 ? 1 : 0);
            FlowNode origin = nodeById.get(id);
            for (int i = 0; i < missing; i++) {
                String endId = FlowIds.newNodeId();
                nodes.add(new FlowNode(endId, FlowNodeType.END, "Fim", null,
                        origin == null ? 0 : origin.getPositionX() + STEP_FALLBACK_SPACING,
                        origin == null ? 0 : origin.getPositionY() + i * GATEWAY_BRANCH_OFFSET,
                        null, List.of(), null, null));
                // Numa Decisão, o caminho que falta é o padrão quando o outro já tem condição.
                boolean isDefault = isGateway && taken + i == 1;
                connections.add(new FlowConnection(FlowIds.newConnectionId(), id, endId,
                        isGateway && !isDefault ? "" : null, isDefault));
            }
        }
    }

    /**
     * O começo é o passo mais à esquerda entre os que levam a uma parte relevante do fluxo. Um
     * desenho se lê da esquerda para a direita, e é ali que quem desenhou colocou a abertura.
     *
     * <p>Não vale exigir que nada aponte para ele: voltar a uma tela anterior é comum — "tentar de
     * novo", "corrigir o dado" — e num desenho com esses retornos quase todo passo tem seta
     * chegando. Exigindo isso, a única opção que sobra costuma ser um canto solto do desenho, e a
     * jornada abre no lugar errado.
     *
     * <p>Também não vale escolher só pelo alcance: isso elege o maior emaranhado, ignorando onde o
     * desenho diz que a jornada começa. O alcance serve para descartar cantos que terminam em duas
     * telas; entre os que restam, quem manda é a posição.
     */
    private static java.util.Optional<String> pickEntryPoint(List<String> linked, List<FlowConnection> connections,
                                                              List<FlowNode> nodes) {
        if (linked.isEmpty()) {
            return java.util.Optional.empty();
        }
        Map<String, List<String>> outgoing = new HashMap<>();
        for (FlowConnection connection : connections) {
            outgoing.computeIfAbsent(connection.getSourceNodeId(), key -> new ArrayList<>())
                    .add(connection.getTargetNodeId());
        }
        Map<String, Integer> reach = new HashMap<>();
        linked.forEach(id -> reach.put(id, reachableFrom(id, outgoing)));
        int best = reach.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        Map<String, Integer> xById = new HashMap<>();
        nodes.forEach(node -> xById.put(node.getId(), node.getPositionX()));
        return linked.stream()
                .filter(id -> reach.getOrDefault(id, 0) * 2 >= best)
                .min(Comparator.comparingInt(id -> xById.getOrDefault(id, Integer.MAX_VALUE)));
    }

    private static int reachableFrom(String start, Map<String, List<String>> outgoing) {
        Set<String> seen = new LinkedHashSet<>();
        java.util.Deque<String> queue = new java.util.ArrayDeque<>(List.of(start));
        while (!queue.isEmpty()) {
            for (String next : outgoing.getOrDefault(queue.pop(), List.of())) {
                if (seen.add(next)) {
                    queue.push(next);
                }
            }
        }
        return seen.size();
    }

    private static FlowNode userTask(Step step, Bounds bounds, boolean includeScreens) {
        JsonNode box = step.screen().path("absoluteBoundingBox");
        SduiNode screen = includeScreens ? screenOf(step) : null;
        return new FlowNode(step.flowNodeId(), FlowNodeType.USER_TASK, step.title(), null,
                scaleX(box.path("x").asDouble(0), bounds), scaleY(box.path("y").asDouble(0), bounds),
                null, List.of(), null, screen);
    }

    private static FlowNode gateway(String nodeId, JsonNode diamond, Bounds bounds) {
        String question = diamond.path("characters").asText("").replaceAll("\\s+", " ").trim();
        JsonNode box = diamond.path("absoluteBoundingBox");
        return new FlowNode(nodeId, FlowNodeType.GATEWAY, question.isBlank() ? "Decisão" : question, null,
                scaleX(box.path("x").asDouble(0), bounds), scaleY(box.path("y").asDouble(0), bounds),
                null, List.of(), null, null);
    }

    /**
     * A tela com o texto que o desenho já traz, de cima para baixo: o que a etapa pergunta, o que
     * ela explica e as opções escritas. O botão de seguir usa o rótulo que está desenhado nele.
     *
     * <p>O título não se repete no corpo: ele já nomeia a tela, e vê-lo duas vezes seguidas é ruído.
     */
    // ponytail: todo texto do corpo vira ui.text. Campos, listas e seleções continuam como texto até
    // existir o de/para entre os componentes do design system e o catálogo.
    private static SduiNode screenOf(Step step) {
        return buildScreenNode(step.flowNodeId(), step.title(), step.screen());
    }

    /**
     * Monta a tela SDUI de uma única tela do Figma — usado tanto ao montar um fluxo inteiro quanto
     * ao importar uma tela avulsa dentro do editor (uma tela por vez, escolhida pelo usuário).
     */
    public static SduiNode buildScreenNode(String idPrefix, String title, JsonNode screen) {
        List<FigmaFlowExtractor.ScreenText> texts = FigmaFlowExtractor.textsOf(screen);
        double titleSize = texts.stream().mapToDouble(FigmaFlowExtractor.ScreenText::fontSize).max().orElse(0);

        // A ação principal é a mais larga do rodapé da tela — é assim que ela é desenhada, ocupando
        // a linha inteira embaixo. Buscar simplesmente "a última larga" pega qualquer opção da
        // lista que por acaso estivesse mais abaixo.
        JsonNode box = screen.path("absoluteBoundingBox");
        double screenWidth = box.path("width").asDouble(0);
        double lowerThird = box.path("y").asDouble(0) + box.path("height").asDouble(0) * 0.6;
        String buttonLabel = texts.stream()
                .filter(text -> text.y() >= lowerThird && text.width() >= screenWidth * 0.5)
                .max(Comparator.comparingDouble(FigmaFlowExtractor.ScreenText::width))
                .map(FigmaFlowExtractor.ScreenText::text)
                .orElse("Continuar");

        List<SduiNode> children = new ArrayList<>();
        int index = 0;
        for (FigmaFlowExtractor.ScreenText text : texts) {
            boolean isTitle = text.fontSize() == titleSize && text.text().equals(title);
            if (isTitle || text.text().equals(buttonLabel)) {
                continue;
            }
            children.add(new SduiNode(idPrefix + "-text-" + index++, "ui.text", "1.0.0",
                    Map.of("text", text.text()), null, null, null, null, null));
        }
        children.add(new SduiNode(idPrefix + "-submit", "ui.button", "1.0.0",
                Map.of("label", buttonLabel, "variant", "primary", "fullWidth", true), null,
                Map.of("onPress", new SduiEvent("action.submit", null)), null, null, null));

        SduiNode stack = new SduiNode(idPrefix + "-stack", "ui.stack", "1.0.0",
                Map.of(), null, null, null, null, children);
        return new SduiNode(idPrefix + "-screen", "ui.screen", "1.0.0",
                Map.of("title", title), null, null, null, null, List.of(stack));
    }

    // ---------------------------------------------------------------- varredura

    private static void collect(JsonNode node, Map<String, JsonNode> diamonds, List<JsonNode> connectors,
                                 Map<String, JsonNode> sections) {
        String type = node.path("type").asText();
        if (TYPE_SHAPE.equals(type) && SHAPE_DIAMOND.equals(node.path("shapeType").asText())) {
            diamonds.put(node.path("id").asText(), node);
        } else if (TYPE_CONNECTOR.equals(type)) {
            connectors.add(node);
        } else if (TYPE_SECTION.equals(type)) {
            sections.put(node.path("id").asText(), node);
        }
        for (JsonNode child : node.path("children")) {
            collect(child, diamonds, connectors, sections);
        }
    }

    private static void indexById(JsonNode node, Map<String, JsonNode> byId) {
        byId.put(node.path("id").asText(), node);
        for (JsonNode child : node.path("children")) {
            indexById(child, byId);
        }
    }

    private static void indexParents(JsonNode node, String parentId, Map<String, String> parentOf) {
        String id = node.path("id").asText();
        if (parentId != null) {
            parentOf.put(id, parentId);
        }
        for (JsonNode child : node.path("children")) {
            indexParents(child, id, parentOf);
        }
    }

    /**
     * Uma seta se prende ao elemento exato onde foi encostada — muitas vezes um botão dentro da
     * tela, não a tela. Subir pelos pais até achar algo que virou etapa é o que liga a seta ao passo
     * a que ela se refere.
     */
    private static String resolve(String endpointId, Map<String, String> flowNodeByFigmaId, Map<String, String> parentOf) {
        String current = endpointId;
        while (current != null && !current.isBlank()) {
            String flowNodeId = flowNodeByFigmaId.get(current);
            if (flowNodeId != null) {
                return flowNodeId;
            }
            current = parentOf.get(current);
        }
        return null;
    }

    private static String label(JsonNode connector) {
        String text = connector.path("characters").asText("");
        return text.isBlank() ? connector.path("name").asText("") : text;
    }

    // ---------------------------------------------------------------- posição

    private record Bounds(double minX, double minY, double maxX) {
    }

    private static Bounds boundsOf(List<JsonNode> screens, java.util.Collection<JsonNode> diamonds) {
        double minX = Double.MAX_VALUE;
        double minY = Double.MAX_VALUE;
        double maxX = -Double.MAX_VALUE;
        List<JsonNode> all = new ArrayList<>(screens);
        all.addAll(diamonds);
        for (JsonNode node : all) {
            JsonNode box = node.path("absoluteBoundingBox");
            minX = Math.min(minX, box.path("x").asDouble(0));
            minY = Math.min(minY, box.path("y").asDouble(0));
            maxX = Math.max(maxX, box.path("x").asDouble(0));
        }
        return all.isEmpty() ? new Bounds(0, 0, 0) : new Bounds(minX, minY, maxX);
    }

    private static int scaleX(double x, Bounds bounds) {
        return (int) Math.round((x - bounds.minX()) * CANVAS_SCALE);
    }

    private static int scaleY(double y, Bounds bounds) {
        return (int) Math.round((y - bounds.minY()) * CANVAS_SCALE);
    }

    private static double xOf(JsonNode node) {
        return node.path("absoluteBoundingBox").path("x").asDouble(0);
    }
}
