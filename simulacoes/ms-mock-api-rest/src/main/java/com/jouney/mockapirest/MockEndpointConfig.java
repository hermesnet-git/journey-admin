package com.jouney.mockapirest;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

/**
 * Resposta mockada de um endpoint, persistida no H2. Substitui os valores antes sorteados
 * em memória: agora cada endpoint sempre devolve o JSON configurado aqui, editável direto no
 * H2 console (/h2-console) para simular cenários específicos (ex.: forçar elegivel=false).
 */
@Entity
public class MockEndpointConfig {

    @Id
    private String endpoint;

    @Lob
    @Column(name = "response_json", nullable = false)
    private String responseJson;

    protected MockEndpointConfig() {
    }

    public MockEndpointConfig(String endpoint, String responseJson) {
        this.endpoint = endpoint;
        this.responseJson = responseJson;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getResponseJson() {
        return responseJson;
    }
}
