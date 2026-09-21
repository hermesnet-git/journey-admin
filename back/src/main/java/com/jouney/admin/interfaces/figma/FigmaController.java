package com.jouney.admin.interfaces.figma;

import com.jouney.admin.application.figma.AnalyzeFigmaScope;
import com.jouney.admin.application.figma.ListFigmaScreens;
import com.jouney.admin.application.figma.ReadFigmaOutline;
import com.jouney.admin.domain.figma.FigmaOutline;
import com.jouney.admin.domain.figma.FigmaBuiltFlow;
import com.jouney.admin.domain.figma.FigmaFlowBuilder;
import com.jouney.admin.domain.figma.FigmaFlowExtractor;
import com.jouney.admin.domain.figma.FigmaScopeAnalysis;
import com.jouney.admin.domain.figma.FigmaScreenOption;
import com.jouney.admin.domain.figma.FigmaUploadResult;
import com.jouney.admin.infrastructure.figma.FigmaReadException;
import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Leitura de um arquivo de design para montar uma jornada a partir dele.
 *
 * <p>Os dois endpoints são leitura, mas usam POST de propósito: o token é do usuário e viajaria na
 * URL num GET, acabando em log de acesso e em histórico de proxy. No corpo, não acaba.
 *
 * <p>O token nunca é guardado. Ele chega, é usado naquela chamada e termina ali — cada importação
 * enxerga exatamente o que a pessoa que a fez enxerga no Figma.
 */
@RestController
@RequestMapping("/api/v1/figma")
public class FigmaController {

    private static final String PLUGIN_FOLDER = "elastic-journey-figma-plugin";
    private static final List<String> PLUGIN_FILES = List.of("manifest.json", "code.js", "ui.html", "LEIA-ME.txt");

    private final ReadFigmaOutline readFigmaOutline;
    private final AnalyzeFigmaScope analyzeFigmaScope;
    private final ListFigmaScreens listFigmaScreens;

    public FigmaController(ReadFigmaOutline readFigmaOutline, AnalyzeFigmaScope analyzeFigmaScope,
                            ListFigmaScreens listFigmaScreens) {
        this.readFigmaOutline = readFigmaOutline;
        this.analyzeFigmaScope = analyzeFigmaScope;
        this.listFigmaScreens = listFigmaScreens;
    }

    public record OutlineInput(@NotBlank String fileKey, @NotBlank String token) {
    }

    public record ScopeInput(@NotBlank String fileKey, @NotBlank String token, @NotBlank String nodeId, String name) {
    }

    /** {@code nodeId} é opcional só quando {@code file} vem preenchido: sem ele, lista as telas do
     * arquivo inteiro, porque a árvore inteira já está em mãos e não custa nada a mais varrer tudo.
     * Pela API ele é obrigatório — descer em cada seção do arquivo pra achar toda tela custaria
     * muitas chamadas, ou uma leitura funda do tamanho da que já esgotou a cota da conta uma vez. */
    public record ScreensInput(String nodeId, JsonNode file, String fileKey, String token) {
    }

    /** {@code file} vem preenchido quando o desenho foi enviado; senão, {@code fileKey}+{@code token}
     * dizem onde buscá-lo no Figma. */
    public record BuildInput(@NotEmpty List<String> nodeIds, @NotBlank String name, boolean mergeRepeated,
                              boolean includeScreens, JsonNode file, String fileKey, String token) {
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/outline")
    public FigmaOutline outline(@Valid @RequestBody OutlineInput input) {
        return readFigmaOutline.execute(input.fileKey(), input.token());
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/scope")
    public FigmaScopeAnalysis scope(@Valid @RequestBody ScopeInput input) {
        return analyzeFigmaScope.execute(input.fileKey(), input.token(), input.nodeId(),
                input.name() == null ? "" : input.name());
    }

    /**
     * Lista as telas de um trecho, cada uma já com a árvore SDUI pronta — usado pelo editor de tela
     * pra importar uma User Task de cada vez, sem montar um fluxo inteiro.
     */
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/screens")
    public List<FigmaScreenOption> screens(@Valid @RequestBody ScreensInput input) {
        boolean hasNodeId = input.nodeId() != null && !input.nodeId().isBlank();
        JsonNode scope;
        if (input.file() != null) {
            scope = hasNodeId ? locate(input.file(), input.nodeId()) : input.file().path("document");
        } else {
            if (!hasNodeId) {
                throw new FigmaReadException("Escolha uma página ou seção antes de listar as telas.");
            }
            scope = analyzeFigmaScope.readNode(input.fileKey(), input.token(), input.nodeId());
        }
        return listFigmaScreens.execute(scope);
    }

    // O arquivo chega como corpo da requisição, e não como anexo de formulário: já é JSON, e
    // embrulhá-lo em multipart só somaria um formato a mais no caminho.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/upload")
    public FigmaUploadResult upload(@RequestBody JsonNode file) {
        if (!file.path("document").path("children").isArray()) {
            throw new FigmaReadException("Este arquivo não parece uma exportação de desenho. "
                    + "Use o plugin \"Exportar para o Elastic Journey\" no Figma para gerá-lo.");
        }
        return FigmaFlowExtractor.readUpload(file);
    }

    /**
     * Monta o fluxo do trecho escolhido. A árvore vem no corpo (arquivo enviado) ou é buscada no
     * Figma — de resto é a mesma leitura. Nada é gravado aqui: o resultado volta para o editor como
     * uma edição não salva, que o usuário revisa e salva como qualquer outra.
     */
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/build")
    public FigmaBuildResponse build(@Valid @RequestBody BuildInput input) {
        List<JsonNode> scopes = input.nodeIds().stream()
                .map(nodeId -> input.file() != null
                        ? locate(input.file(), nodeId)
                        : analyzeFigmaScope.readNode(input.fileKey(), input.token(), nodeId))
                .toList();
        FigmaBuiltFlow built = FigmaFlowBuilder.build(scopes, input.name(), input.mergeRepeated(),
                input.includeScreens());
        return FigmaBuildResponse.from(built);
    }

    private JsonNode locate(JsonNode file, String nodeId) {
        JsonNode found = find(file.path("document"), nodeId);
        if (found == null) {
            throw new FigmaReadException("Este trecho não está no arquivo enviado. Envie o arquivo de novo.");
        }
        return found;
    }

    private JsonNode find(JsonNode node, String nodeId) {
        if (nodeId.equals(node.path("id").asText())) {
            return node;
        }
        for (JsonNode child : node.path("children")) {
            JsonNode found = find(child, nodeId);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    // O plugin é montado a partir dos próprios arquivos-fonte, e não de um .zip versionado junto:
    // assim o que se baixa é sempre o que está no repositório, sem alguém ter de lembrar de gerar
    // o pacote de novo a cada correção.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @GetMapping("/plugin")
    public ResponseEntity<byte[]> plugin() {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (String file : PLUGIN_FILES) {
                zip.putNextEntry(new ZipEntry(PLUGIN_FOLDER + "/" + file));
                zip.write(new ClassPathResource("figma-plugin/" + file).getContentAsByteArray());
                zip.closeEntry();
            }
        } catch (IOException e) {
            throw new FigmaReadException("Não foi possível montar o pacote do plugin.", e);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + PLUGIN_FOLDER + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes.toByteArray());
    }
}
