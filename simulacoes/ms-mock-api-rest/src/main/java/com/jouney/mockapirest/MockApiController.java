package com.jouney.mockapirest;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Duplo estático das integrações reais que a massa de dados de teste (telecom) referencia nos
 * conectores REST de SERVICE_TASK — o Camunda HTTP Connector chama estas rotas de verdade e de
 * forma síncrona ao completar a User Task anterior, então cada uma aqui devolve exatamente os
 * campos que o outputMapping do nó correspondente espera (ver massa_de_dados_journeys.sql).
 * Cada resposta vem do H2 ({@link MockEndpointConfig}), editável via /h2-console para simular
 * cenários específicos nas jornadas (ex.: forçar o caminho de reprovação de um gateway).
 */
@RestController
@CrossOrigin(origins = "*")
public class MockApiController {

    private final MockEndpointConfigRepository configs;
    private final ObjectMapper mapper;

    public MockApiController(MockEndpointConfigRepository configs, ObjectMapper mapper) {
        this.configs = configs;
        this.mapper = mapper;
    }

    @PostMapping("/v1/elegibilidade")
    public Map<String, Object> elegibilidade(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/elegibilidade");
    }

    @GetMapping("/v1/portabilidade/consulta")
    public Map<String, Object> portabilidadeConsulta() {
        return respond("/v1/portabilidade/consulta");
    }

    @GetMapping("/v1/retencao/score")
    public Map<String, Object> retencaoScore() {
        return respond("/v1/retencao/score");
    }

    @PostMapping("/v1/retencao/oferta")
    public Map<String, Object> retencaoOferta(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/retencao/oferta");
    }

    @PostMapping("/v1/cancelamento")
    public Map<String, Object> cancelamento(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/cancelamento");
    }

    @PostMapping("/v1/suporte/chamados")
    public Map<String, Object> suporteChamados(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/suporte/chamados");
    }

    @GetMapping("/v1/planos/elegibilidade-upgrade")
    public Map<String, Object> planosElegibilidadeUpgrade() {
        return respond("/v1/planos/elegibilidade-upgrade");
    }

    @PostMapping("/v1/planos/trocar")
    public Map<String, Object> planosTrocar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/planos/trocar");
    }

    @PostMapping("/v1/linhas/ativar")
    public Map<String, Object> linhasAtivar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/linhas/ativar");
    }

    @PostMapping("/v1/iot/provisionar")
    public Map<String, Object> iotProvisionar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/iot/provisionar");
    }

    @PostMapping("/v1/consultarbd")
    public Map<String, Object> consultarBd(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/consultarbd");
    }

    @PostMapping("/v1/consultarpendencia")
    public Map<String, Object> consultarPendencia(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/consultarpendencia");
    }

    @PostMapping("/v1/consultarmassiva")
    public Map<String, Object> consultarMassiva(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/consultarmassiva");
    }

    /**
     * Fonte de dados de teste para datasource SDUI (REQ fora do escopo v1.0.0, mas útil para
     * prototipar campos SINGLE_SELECT/MULTI_SELECT com muitas opções). Formato {label, value}
     * espelha {@link com.jouney.admin.domain.form.FormFieldOption} do admin. Gerada uma única vez
     * com seed fixa (não no H2, como as demais rotas) para a lista ficar estável entre restarts.
     * Paginada por cursor opaco (offset em Base64) — este mock representa o sistema externo real,
     * então é ele quem deve dono da paginação; quem chamar apenas repassa o cursor recebido.
     */
    @GetMapping("/v1/testdatasource/lista")
    public Map<String, Object> listaTestDataSource(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {
        int offset = Math.min(decodeCursor(cursor), TEST_DATASOURCE_OPTIONS.size());
        int pageSize = Math.max(1, Math.min(limit, 100));
        int end = Math.min(offset + pageSize, TEST_DATASOURCE_OPTIONS.size());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", TEST_DATASOURCE_OPTIONS.subList(offset, end));
        response.put("nextCursor", end < TEST_DATASOURCE_OPTIONS.size() ? encodeCursor(end) : null);
        return response;
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cursor invalido");
        }
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }

    private static final List<Map<String, Object>> TEST_DATASOURCE_OPTIONS = buildTestDataSourceOptions();

    private static List<Map<String, Object>> buildTestDataSourceOptions() {
        String[] words = {"Azul", "Verde", "Rapido", "Nordeste", "Plano", "Sinal", "Torre", "Fibra",
                "Roteador", "Chip", "Sudeste", "Prime", "Turbo", "Smart", "Cloud", "Base", "Linha", "Pacote",
                "App", "Dados"};
        Random random = new Random(42);
        List<Map<String, Object>> options = new ArrayList<>(100);
        for (int i = 1; i <= 100; i++) {
            String label = words[random.nextInt(words.length)] + " " + words[random.nextInt(words.length)] + " " + i;
            options.add(Map.of("label", label, "value", "OPT-" + i));
        }
        return options;
    }

    private Map<String, Object> respond(String endpoint) {
        String json = configs.findById(endpoint)
                .orElseThrow(() -> new IllegalStateException("Sem mock configurado para " + endpoint))
                .getResponseJson();
        return mapper.readValue(json, new TypeReference<Map<String, Object>>() {
        });
    }
}
