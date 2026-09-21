package com.jouney.admin.application.figma;

import com.jouney.admin.domain.figma.FigmaFlowExtractor;
import com.jouney.admin.domain.figma.FigmaScopeAnalysis;
import com.jouney.admin.infrastructure.figma.FigmaApiClient;
import com.jouney.admin.infrastructure.figma.FigmaReadException;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/** Conta o que um trecho escolhido vira, para o usuário decidir antes de importar. */
@Service
public class AnalyzeFigmaScope {

    private final FigmaApiClient client;

    public AnalyzeFigmaScope(FigmaApiClient client) {
        this.client = client;
    }

    public FigmaScopeAnalysis execute(String fileKey, String token, String nodeId, String fallbackName) {
        return FigmaFlowExtractor.analyze(readNode(fileKey, token, nodeId), nodeId, fallbackName);
    }

    /** A mesma árvore serve para contar e para montar o fluxo, então a busca fica aqui, num lugar só. */
    public JsonNode readNode(String fileKey, String token, String nodeId) {
        JsonNode response = client.readNode(fileKey, token, nodeId);
        // A resposta vem indexada pelo id pedido, mas o Figma normaliza a forma do id na chave — em
        // vez de reconstruí-la, pega o único nó devolvido.
        JsonNode nodes = response.path("nodes");
        if (!nodes.properties().iterator().hasNext()) {
            throw new FigmaReadException("Este trecho não existe mais no arquivo. Leia o arquivo de novo.");
        }
        return nodes.properties().iterator().next().getValue().path("document");
    }
}
