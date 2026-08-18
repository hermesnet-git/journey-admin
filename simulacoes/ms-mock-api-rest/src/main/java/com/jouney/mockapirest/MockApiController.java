package com.jouney.mockapirest;

import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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

    private Map<String, Object> respond(String endpoint) {
        String json = configs.findById(endpoint)
                .orElseThrow(() -> new IllegalStateException("Sem mock configurado para " + endpoint))
                .getResponseJson();
        return mapper.readValue(json, new TypeReference<Map<String, Object>>() {
        });
    }
}
