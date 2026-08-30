package com.jouney.mockapirest;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MsMockApiRestApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsMockApiRestApplication.class, args);
    }

    /**
     * Popula o valor padrão de cada endpoint que ainda não existe no H2 (checagem por linha, não
     * pela tabela inteira — assim um endpoint novo é semeado mesmo numa base já populada). Uma
     * vez presente, o valor só muda se alguém editar via H2 console — o seeder nunca sobrescreve.
     */
    @Bean
    CommandLineRunner seedMockResponses(MockEndpointConfigRepository repo) {
        return args -> java.util.List.of(
                new MockEndpointConfig("/v1/elegibilidade", "{\"elegivel\": true, \"protocolo\": \"PROTO-100000\"}"),
                new MockEndpointConfig("/v1/portabilidade/consulta", "{\"prazoEstimadoDias\": 5}"),
                new MockEndpointConfig("/v1/retencao/score", "{\"score\": 50}"),
                new MockEndpointConfig("/v1/retencao/oferta", "{\"status\": \"aplicado\"}"),
                new MockEndpointConfig("/v1/cancelamento", "{\"status\": \"cancelado\"}"),
                new MockEndpointConfig("/v1/suporte/chamados", "{\"numeroChamado\": \"CHAMADO-100000\"}"),
                new MockEndpointConfig("/v1/planos/elegibilidade-upgrade", "{\"elegivel\": true}"),
                new MockEndpointConfig("/v1/planos/trocar", "{\"status\": \"trocado\"}"),
                new MockEndpointConfig("/v1/linhas/ativar", "{\"status\": \"ATIVA\"}"),
                new MockEndpointConfig("/v1/iot/provisionar", "{\"quantidadeProvisionada\": 10}"))
                // /v1/consultarbd, /v1/consultarpendencia e /v1/consultarmassiva não usam mais o
                // H2 — viraram lógica condicional por CNPJ (ver MockApiController), sem valor fixo
                // pra semear aqui.
                .forEach(config -> {
                    if (!repo.existsById(config.getEndpoint())) {
                        repo.save(config);
                    }
                });
    }
}
