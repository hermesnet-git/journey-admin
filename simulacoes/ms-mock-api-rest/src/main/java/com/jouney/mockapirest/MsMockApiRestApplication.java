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
     * Popula o valor padrão de cada endpoint na primeira subida (banco H2 vazio). Depois disso
     * os valores só mudam se alguém editar via H2 console — o seeder nunca sobrescreve.
     */
    @Bean
    CommandLineRunner seedMockResponses(MockEndpointConfigRepository repo) {
        return args -> {
            if (repo.count() > 0) {
                return;
            }
            repo.saveAll(java.util.List.of(
                    new MockEndpointConfig("/v1/elegibilidade", "{\"elegivel\": true, \"protocolo\": \"PROTO-100000\"}"),
                    new MockEndpointConfig("/v1/portabilidade/consulta", "{\"prazoEstimadoDias\": 5}"),
                    new MockEndpointConfig("/v1/retencao/score", "{\"score\": 50}"),
                    new MockEndpointConfig("/v1/retencao/oferta", "{\"status\": \"aplicado\"}"),
                    new MockEndpointConfig("/v1/cancelamento", "{\"status\": \"cancelado\"}"),
                    new MockEndpointConfig("/v1/suporte/chamados", "{\"numeroChamado\": \"CHAMADO-100000\"}"),
                    new MockEndpointConfig("/v1/planos/elegibilidade-upgrade", "{\"elegivel\": true}"),
                    new MockEndpointConfig("/v1/planos/trocar", "{\"status\": \"trocado\"}"),
                    new MockEndpointConfig("/v1/linhas/ativar", "{\"status\": \"ATIVA\"}"),
                    new MockEndpointConfig("/v1/iot/provisionar", "{\"quantidadeProvisionada\": 10}")));
        };
    }
}
