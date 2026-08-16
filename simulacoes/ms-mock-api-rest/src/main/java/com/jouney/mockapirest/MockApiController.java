package com.jouney.mockapirest;

import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Duplo estático das integrações reais que a massa de dados de teste (telecom) referencia nos
 * conectores REST de SERVICE_TASK — o Camunda HTTP Connector chama estas rotas de verdade e de
 * forma síncrona ao completar a User Task anterior, então cada uma aqui devolve exatamente os
 * campos que o outputMapping do nó correspondente espera (ver massa_de_dados_journeys.sql).
 * Valores que alimentam uma condição de gateway são sorteados a cada chamada, para que os dois
 * caminhos apareçam naturalmente ao longo de várias simulações.
 */
@RestController
public class MockApiController {

    @PostMapping("/v1/elegibilidade")
    public Map<String, Object> elegibilidade(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of(
                "elegivel", ThreadLocalRandom.current().nextBoolean(),
                "protocolo", "PROTO-" + ThreadLocalRandom.current().nextInt(100000, 999999));
    }

    @GetMapping("/v1/portabilidade/consulta")
    public Map<String, Object> portabilidadeConsulta() {
        return Map.of("prazoEstimadoDias", ThreadLocalRandom.current().nextInt(1, 11));
    }

    @GetMapping("/v1/retencao/score")
    public Map<String, Object> retencaoScore() {
        return Map.of("score", ThreadLocalRandom.current().nextInt(0, 101));
    }

    @PostMapping("/v1/retencao/oferta")
    public Map<String, Object> retencaoOferta(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("status", "aplicado");
    }

    @PostMapping("/v1/cancelamento")
    public Map<String, Object> cancelamento(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("status", "cancelado");
    }

    @PostMapping("/v1/suporte/chamados")
    public Map<String, Object> suporteChamados(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("numeroChamado", "CHAMADO-" + ThreadLocalRandom.current().nextInt(100000, 999999));
    }

    @GetMapping("/v1/planos/elegibilidade-upgrade")
    public Map<String, Object> planosElegibilidadeUpgrade() {
        return Map.of("elegivel", ThreadLocalRandom.current().nextBoolean());
    }

    @PostMapping("/v1/planos/trocar")
    public Map<String, Object> planosTrocar(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("status", "trocado");
    }

    @PostMapping("/v1/linhas/ativar")
    public Map<String, Object> linhasAtivar(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("status", "ATIVA");
    }

    @PostMapping("/v1/iot/provisionar")
    public Map<String, Object> iotProvisionar(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of("quantidadeProvisionada", ThreadLocalRandom.current().nextInt(0, 51));
    }
}
