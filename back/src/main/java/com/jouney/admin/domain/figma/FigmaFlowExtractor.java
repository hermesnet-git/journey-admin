package com.jouney.admin.domain.figma;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/**
 * Lê a árvore de um arquivo de design e diz o que ela vira numa jornada. Sem HTTP e sem Spring: a
 * entrada é a árvore já buscada, o que mantém a regra de leitura testável e fora da infraestrutura.
 *
 * <p>O que a leitura procura, e por quê:
 * <ul>
 *   <li><b>Telas</b> — os quadros repetidos na largura mais comum do desenho. A largura não é fixa
 *       no código: cada arquivo tem a sua (um desenho de celular e um de desktop são igualmente
 *       válidos), então ela é deduzida da própria árvore.</li>
 *   <li><b>Decisões</b> — losangos, a forma que o desenho de fluxo usa há décadas para representar
 *       uma escolha. O texto de dentro é a pergunta.</li>
 *   <li><b>Caminhos</b> — as setas entre um e outro, que já dizem o que leva a quê.</li>
 * </ul>
 *
 * <p>Telas repetidas são a regra, não a exceção: o mesmo passo costuma ser desenhado várias vezes
 * para mostrar estados diferentes (vazio, preenchido, com erro). Por isso a contagem distingue
 * quantos quadros existem de quantos passos eles representam, agrupando por título.
 */
public final class FigmaFlowExtractor {

    private static final String TYPE_CANVAS = "CANVAS";
    private static final String TYPE_SECTION = "SECTION";
    private static final String TYPE_FRAME = "FRAME";
    private static final String TYPE_INSTANCE = "INSTANCE";
    private static final String TYPE_TEXT = "TEXT";
    private static final String TYPE_CONNECTOR = "CONNECTOR";
    private static final String TYPE_SHAPE = "SHAPE_WITH_TEXT";
    private static final String SHAPE_DIAMOND = "DIAMOND";

    // Quadro estreito demais é ícone ou etiqueta solta; largo demais é quadro de apresentação.
    private static final int MIN_SCREEN_WIDTH = 200;
    private static final int MAX_SCREEN_WIDTH = 2000;
    // Uma tela é sempre bem mais alta que um cartão ou faixa de mesma largura.
    private static final double MIN_SCREEN_ASPECT = 1.3;
    // Telas do mesmo desenho variam alguns pixels entre si, porque foram criadas em momentos
    // diferentes ou a partir de aparelhos de referência diferentes. Exigir a largura exata da mais
    // comum descartaria dezenas de telas legítimas por uma diferença invisível a olho nu.
    private static final double SCREEN_WIDTH_TOLERANCE = 0.03;
    // Faixa do topo ocupada pela barra do aparelho, que não faz parte do conteúdo da tela.
    private static final double STATUS_BAR_HEIGHT = 60;
    // Faixa do rodapé ocupada pela barra de navegação, igual em todas as telas do aplicativo.
    private static final double BOTTOM_BAR_HEIGHT = 96;

    private FigmaFlowExtractor() {
    }

    // ---------------------------------------------------------------- leitura rasa

    /** Percorre só páginas e o primeiro nível de cada uma. */
    public static FigmaOutline outlineOf(JsonNode file) {
        List<FigmaPage> pages = new ArrayList<>();
        for (JsonNode page : file.path("document").path("children")) {
            if (!TYPE_CANVAS.equals(page.path("type").asText())) {
                continue;
            }
            List<FigmaSectionRef> sections = new ArrayList<>();
            int loose = 0;
            for (JsonNode child : page.path("children")) {
                String type = child.path("type").asText();
                if (TYPE_SECTION.equals(type)) {
                    collectSections(child, "", 0, sections);
                } else if (looksLikeScreen(child)) {
                    loose++;
                }
            }
            if (!sections.isEmpty() || loose > 0) {
                pages.add(new FigmaPage(page.path("id").asText(), cleanName(page.path("name").asText()), sections, loose));
            }
        }
        return new FigmaOutline(file.path("name").asText(), file.path("version").asText(), pages);
    }

    /**
     * Lê um arquivo inteiro já em mãos: além de listar os trechos, conta cada um. Só vale para o
     * arquivo enviado — pelo Figma, baixar a árvore inteira para contar tudo é justamente o que
     * esgota o limite de leituras da conta.
     */
    public static FigmaUploadResult readUpload(JsonNode file) {
        FigmaOutline outline = outlineOf(file);
        Map<String, JsonNode> byId = new HashMap<>();
        indexById(file.path("document"), byId);

        List<FigmaScopeAnalysis> scopes = new ArrayList<>();
        List<FigmaPage> pages = new ArrayList<>();
        for (FigmaPage page : outline.pages()) {
            if (page.sections().isEmpty()) {
                // Página sem agrupamento nenhum é importável inteira — é o trecho, nesse caso.
                JsonNode node = byId.get(page.pageId());
                if (node != null) {
                    scopes.add(analyze(node, page.pageId(), page.name()));
                }
                pages.add(page);
                continue;
            }
            // Agrupamento sem nenhuma tela dentro só organiza o desenho (legendas, anotações,
            // rascunhos). Listá-lo como importável só atrapalha quem procura o trecho certo.
            List<FigmaSectionRef> withScreens = new ArrayList<>();
            for (FigmaSectionRef section : page.sections()) {
                JsonNode node = byId.get(section.nodeId());
                if (node == null) {
                    continue;
                }
                FigmaScopeAnalysis analysis = analyze(node, section.nodeId(), section.name());
                if (analysis.screens() > 0) {
                    scopes.add(analysis);
                    withScreens.add(section);
                }
            }
            if (!withScreens.isEmpty() || page.looseScreens() > 0) {
                pages.add(new FigmaPage(page.pageId(), page.name(), withScreens, page.looseScreens()));
            }
        }
        return new FigmaUploadResult(new FigmaOutline(outline.fileName(), outline.version(), pages), scopes);
    }

    /**
     * Desce por todos os agrupamentos, não só os de cima. Um desenho organiza o trabalho em blocos
     * dentro de blocos, e quase nunca é o bloco de cima que vira uma jornada — ele costuma reunir
     * várias. Listar só o primeiro nível obriga a importar tudo junto para depois apagar o que
     * sobrou.
     */
    private static void collectSections(JsonNode section, String parentPath, int depth, List<FigmaSectionRef> out) {
        String name = cleanName(section.path("name").asText());
        out.add(new FigmaSectionRef(section.path("id").asText(), name, parentPath, depth));
        String path = parentPath.isEmpty() ? name : parentPath + " › " + name;
        for (JsonNode child : section.path("children")) {
            if (TYPE_SECTION.equals(child.path("type").asText())) {
                collectSections(child, path, depth + 1, out);
            }
        }
    }

    private static void indexById(JsonNode node, Map<String, JsonNode> byId) {
        String id = node.path("id").asText();
        if (id != null && !id.isBlank()) {
            byId.put(id, node);
        }
        for (JsonNode child : node.path("children")) {
            indexById(child, byId);
        }
    }

    /**
     * Páginas e seções costumam ser nomeadas com símbolos na frente para se organizarem visualmente
     * no arquivo. Eles não significam nada fora dele.
     */
    public static String cleanName(String name) {
        if (name == null) {
            return "";
        }
        String cleaned = name.replaceAll("^[^\\p{L}\\p{N}]+", "").trim();
        return cleaned.isEmpty() ? name.trim() : cleaned;
    }

    // ---------------------------------------------------------------- leitura profunda

    /** Uma tela individual, para escolher exatamente uma — sem reunir por título, ao contrário da
     * contagem de passos: aqui o usuário está escolhendo um quadro específico do desenho. */
    /** {@code path} é a trilha de seções até a tela ("Instalação › Apresentação") — para agrupar a
     * lista visualmente e ajudar a achar uma tela específica num arquivo com muitas. */
    public record ScreenRef(String nodeId, String title, String path, JsonNode screen) {
    }

    /**
     * Lista as telas de um trecho uma a uma. Ao contrário de {@link #analyze}, não agrupa telas de
     * mesmo título: ali o objetivo é contar quantos passos existem, aqui é apontar para uma tela
     * exata entre as variantes ("vazia", "preenchida", "com erro") que o desenho repete.
     *
     * <p>Desce pela árvore em profundidade, e não varre tudo para só depois ordenar por posição —
     * assim, telas da mesma seção saem juntas na lista, o que é o que sustenta o agrupamento visual.
     */
    public static List<ScreenRef> listScreens(JsonNode root) {
        int screenWidth = detectScreenWidth(root);
        List<ScreenRef> raw = new ArrayList<>();
        collectScreensWithPath(root, screenWidth, "", raw);

        Map<String, Integer> seen = new HashMap<>();
        List<ScreenRef> out = new ArrayList<>();
        for (ScreenRef ref : raw) {
            String base = ref.title().isBlank() ? "Tela" : ref.title();
            int count = seen.merge(ref.path() + " " + base, 1, Integer::sum);
            // Duas telas com o mesmo título na mesma seção são estados diferentes do mesmo passo — o
            // número deixa claro que são variantes distintas, não a mesma tela repetida à toa.
            String label = count == 1 ? base : base + " (" + count + ")";
            out.add(new ScreenRef(ref.nodeId(), label, ref.path(), ref.screen()));
        }
        return out;
    }

    private static void collectScreensWithPath(JsonNode node, int screenWidth, String path, List<ScreenRef> out) {
        if (screenWidth > 0 && matchesScreenWidth(node, screenWidth) && looksLikeScreen(node)) {
            out.add(new ScreenRef(node.path("id").asText(), titleOf(node), path, node));
            return;
        }
        String nextPath = TYPE_SECTION.equals(node.path("type").asText())
                ? (path.isEmpty() ? cleanName(node.path("name").asText()) : path + " › " + cleanName(node.path("name").asText()))
                : path;
        for (JsonNode child : node.path("children")) {
            collectScreensWithPath(child, screenWidth, nextPath, out);
        }
    }

    /** Conta o que o trecho vira: passos, decisões e quais delas ficam pendentes. */
    public static FigmaScopeAnalysis analyze(JsonNode root, String nodeId, String fallbackName) {
        int screenWidth = detectScreenWidth(root);
        List<JsonNode> screens = collectScreens(root, screenWidth);

        Set<String> titles = new HashSet<>();
        for (JsonNode screen : screens) {
            String title = titleOf(screen);
            titles.add(title.isEmpty() ? screen.path("id").asText() : title);
        }

        List<JsonNode> diamonds = new ArrayList<>();
        Map<String, Integer> outDegree = new HashMap<>();
        collectDecisionsAndPaths(root, diamonds, outDegree);

        int incomplete = 0;
        for (JsonNode diamond : diamonds) {
            // O fluxo só aceita decisão com exatamente dois caminhos; qualquer outro número tem de
            // ser resolvido por quem revisa, e é isso que a tela precisa avisar antes de importar.
            if (outDegree.getOrDefault(diamond.path("id").asText(), 0) != 2) {
                incomplete++;
            }
        }

        String name = cleanName(root.path("name").asText());
        return new FigmaScopeAnalysis(nodeId, name.isEmpty() ? fallbackName : name, screens.size(), titles.size(),
                diamonds.size(), incomplete, screenWidth);
    }

    /**
     * A largura de tela é a mais repetida entre os quadros que estão logo dentro de um agrupamento —
     * é onde as telas ficam. Componentes internos repetem muito mais, então procurar a largura mais
     * comum da árvore inteira elegeria um botão, não uma tela.
     */
    public static int detectScreenWidth(JsonNode root) {
        Map<Integer, Integer> tally = new HashMap<>();
        tallyCandidateWidths(root, null, tally);
        return tally.entrySet().stream()
                .max(Map.Entry.<Integer, Integer>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(Map.Entry::getKey)
                .orElse(0);
    }

    private static void tallyCandidateWidths(JsonNode node, String parentType, Map<Integer, Integer> tally) {
        String type = node.path("type").asText();
        boolean insideGrouping = TYPE_SECTION.equals(parentType) || TYPE_CANVAS.equals(parentType);
        if (insideGrouping && isFrameLike(type) && looksLikeScreen(node)) {
            tally.merge(widthOf(node), 1, Integer::sum);
            return;
        }
        for (JsonNode child : node.path("children")) {
            tallyCandidateWidths(child, type, tally);
        }
    }

    /** Uma vez que um quadro é reconhecido como tela, o que está dentro dele é conteúdo da tela. */
    public static List<JsonNode> collectScreens(JsonNode root, int screenWidth) {
        List<JsonNode> screens = new ArrayList<>();
        collectScreens(root, screenWidth, screens);
        return screens;
    }

    private static void collectScreens(JsonNode node, int screenWidth, List<JsonNode> out) {
        if (screenWidth > 0 && matchesScreenWidth(node, screenWidth) && looksLikeScreen(node)) {
            out.add(node);
            return;
        }
        for (JsonNode child : node.path("children")) {
            collectScreens(child, screenWidth, out);
        }
    }

    private static boolean matchesScreenWidth(JsonNode node, int screenWidth) {
        return isFrameLike(node.path("type").asText())
                && Math.abs(widthOf(node) - screenWidth) <= screenWidth * SCREEN_WIDTH_TOLERANCE;
    }

    /** O título é o maior texto da tela — é assim que o desenho já hierarquiza o que ela pergunta. */
    public static String titleOf(JsonNode screen) {
        String[] found = {""};
        double[] bestSize = {-1};
        double screenTop = screen.path("absoluteBoundingBox").path("y").asDouble(0);
        walkText(screen, screenTop, found, bestSize);
        return found[0];
    }

    private static void walkText(JsonNode node, double screenTop, String[] found, double[] bestSize) {
        if (TYPE_TEXT.equals(node.path("type").asText())) {
            String characters = node.path("characters").asText();
            if (characters != null && !characters.isBlank() && isTitleCandidate(node, screenTop, characters)) {
                double size = node.path("style").path("fontSize").asDouble(0);
                if (size > bestSize[0]) {
                    bestSize[0] = size;
                    found[0] = characters.replaceAll("\\s+", " ").trim();
                }
            }
        }
        for (JsonNode child : node.path("children")) {
            walkText(child, screenTop, found, bestSize);
        }
    }

    /** Um texto da tela, com o que basta para saber o papel dele: tamanho, altura e largura. */
    public record ScreenText(String text, double fontSize, double y, double width) {
    }

    /**
     * Os textos que formam o conteúdo da tela, de cima para baixo.
     *
     * <p>Ficam de fora as duas faixas que pertencem ao aparelho e não à etapa: a barra de status no
     * topo (relógio, sinal, bateria) e a barra de navegação no rodapé, que se repete igual em todas
     * as telas e não diz nada sobre o passo.
     */
    public static List<ScreenText> textsOf(JsonNode screen) {
        JsonNode box = screen.path("absoluteBoundingBox");
        double top = box.path("y").asDouble(0);
        double bottom = top + box.path("height").asDouble(0);
        List<ScreenText> found = new ArrayList<>();
        collectTexts(screen, top, bottom, found);
        found.sort(java.util.Comparator.comparingDouble(ScreenText::y));
        return found;
    }

    /**
     * Componente do design system que ficou sem preencher, ou peça interna dele. O que está escrito
     * aí é instrução para quem desenha ("REPLACE ME!", "This is a Slot zone"), não conteúdo da
     * etapa, e copiar isso para a tela do canal seria copiar o andaime junto com a obra.
     */
    private static boolean isDesignSystemScaffolding(JsonNode node) {
        String name = node.path("name").asText("");
        return name.startsWith("REPLACE ME") || name.startsWith(".") || name.contains("Slot")
                || name.startsWith("_") || name.startsWith("resources/") || name.startsWith("Zone ");
    }

    private static void collectTexts(JsonNode node, double top, double bottom, List<ScreenText> out) {
        if (isDesignSystemScaffolding(node)) {
            return;
        }
        if (TYPE_TEXT.equals(node.path("type").asText())) {
            String characters = node.path("characters").asText();
            JsonNode box = node.path("absoluteBoundingBox");
            double y = box.path("y").asDouble(Double.MAX_VALUE);
            boolean inBody = y != Double.MAX_VALUE && y - top >= STATUS_BAR_HEIGHT && y <= bottom - BOTTOM_BAR_HEIGHT;
            if (characters != null && !characters.isBlank() && inBody
                    && characters.codePoints().anyMatch(Character::isLetter)) {
                out.add(new ScreenText(characters.replaceAll("\\s+", " ").trim(),
                        node.path("style").path("fontSize").asDouble(0), y, box.path("width").asDouble(0)));
            }
        }
        for (JsonNode child : node.path("children")) {
            collectTexts(child, top, bottom, out);
        }
    }

    /**
     * Nem todo texto grande é o título. O topo da tela é ocupado pela barra do aparelho — relógio,
     * sinal, bateria — que costuma ter fonte tão grande quanto a do título e viraria o nome da
     * etapa. Pelo mesmo motivo, um texto sem nenhuma letra ("9:41") nunca nomeia um passo.
     */
    private static boolean isTitleCandidate(JsonNode text, double screenTop, String characters) {
        double y = text.path("absoluteBoundingBox").path("y").asDouble(Double.MAX_VALUE);
        if (y != Double.MAX_VALUE && y - screenTop < STATUS_BAR_HEIGHT) {
            return false;
        }
        return characters.codePoints().anyMatch(Character::isLetter);
    }

    private static void collectDecisionsAndPaths(JsonNode node, List<JsonNode> diamonds, Map<String, Integer> outDegree) {
        String type = node.path("type").asText();
        if (TYPE_SHAPE.equals(type) && SHAPE_DIAMOND.equals(node.path("shapeType").asText())) {
            diamonds.add(node);
        } else if (TYPE_CONNECTOR.equals(type)) {
            String from = node.path("connectorStart").path("endpointNodeId").asText();
            if (from != null && !from.isBlank()) {
                outDegree.merge(from, 1, Integer::sum);
            }
        }
        for (JsonNode child : node.path("children")) {
            collectDecisionsAndPaths(child, diamonds, outDegree);
        }
    }

    // ---------------------------------------------------------------- forma dos nós

    private static boolean isFrameLike(String type) {
        return TYPE_FRAME.equals(type) || TYPE_INSTANCE.equals(type);
    }

    private static boolean looksLikeScreen(JsonNode node) {
        if (!isFrameLike(node.path("type").asText())) {
            return false;
        }
        JsonNode box = node.path("absoluteBoundingBox");
        if (box.isMissingNode() || box.isNull()) {
            return false;
        }
        int width = widthOf(node);
        double height = box.path("height").asDouble(0);
        return width >= MIN_SCREEN_WIDTH && width <= MAX_SCREEN_WIDTH && height >= width * MIN_SCREEN_ASPECT;
    }

    private static int widthOf(JsonNode node) {
        return (int) Math.round(node.path("absoluteBoundingBox").path("width").asDouble(0));
    }
}
