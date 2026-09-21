package com.jouney.admin.infrastructure.figma;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;

/**
 * Acesso de leitura à API do Figma. Só busca e devolve a árvore crua — quem a interpreta é
 * {@link com.jouney.admin.domain.figma.FigmaFlowExtractor}, que não depende de HTTP nenhum.
 *
 * <p>O token é do usuário e chega em cada chamada: nunca é guardado aqui nem em lugar nenhum, é
 * sempre a credencial de quem está importando, com o acesso que essa pessoa tem no Figma.
 */
@Component
public class FigmaApiClient {

    private static final String BASE_URL = "https://api.figma.com";
    // Um arquivo grande estoura o limite de resposta da própria API quando pedido inteiro, então a
    // leitura é sempre em dois tempos: rasa no arquivo todo, funda só no trecho escolhido.
    private static final int OUTLINE_DEPTH = 2;

    private final RestClient restClient;

    public FigmaApiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(20));
        factory.setReadTimeout(Duration.ofSeconds(120));
        this.restClient = RestClient.builder().requestFactory(factory).baseUrl(BASE_URL).build();
    }

    /** Páginas e o primeiro nível de cada uma — barato o bastante pra rodar no arquivo inteiro. */
    public JsonNode readOutline(String fileKey, String token) {
        return get("/v1/files/" + fileKey + "?depth=" + OUTLINE_DEPTH, token);
    }

    /** A árvore completa de um nó — é o que permite contar telas, decisões e caminhos. */
    public JsonNode readNode(String fileKey, String token, String nodeId) {
        return get("/v1/files/" + fileKey + "/nodes?ids=" + nodeId, token);
    }

    private JsonNode get(String path, String token) {
        try {
            return restClient.get().uri(path).header("X-Figma-Token", token).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw new FigmaReadException(messageFor(e), e);
        } catch (ResourceAccessException e) {
            throw new FigmaReadException("O Figma demorou demais para responder. Tente de novo em instantes.", e);
        }
    }

    // O Figma responde 404 tanto para arquivo inexistente quanto para arquivo ao qual a conta do
    // token não tem acesso — o texto precisa cobrir os dois, senão manda procurar erro de digitação
    // quando na verdade falta permissão.
    private String messageFor(RestClientResponseException e) {
        return switch (e.getStatusCode().value()) {
            case 403 -> "O token não tem permissão para ler o conteúdo deste arquivo. "
                    + "Gere um token com a permissão de leitura de conteúdo.";
            case 404 -> "Arquivo não encontrado, ou a conta do token não tem acesso a ele. "
                    + "Acesso por link compartilhado não vale para leitura automática.";
            case 429 -> "A conta do Figma atingiu o limite de leituras do período e só volta a "
                    + "responder " + waitHint(e) + ". Ler um arquivo grande consome boa parte desse "
                    + "limite de uma vez, e contas gratuitas têm a menor cota.";
            default -> "O Figma recusou a leitura deste arquivo (erro " + e.getStatusCode().value() + ").";
        };
    }

    /**
     * O Figma devolve a espera em {@code Retry-After}, e ela pode ser de dias — não de instantes.
     * Dizer "tente de novo em breve" sem olhar esse valor faz a pessoa insistir num botão que não
     * vai funcionar durante o resto da semana.
     */
    private String waitHint(RestClientResponseException e) {
        String header = e.getResponseHeaders() == null ? null : e.getResponseHeaders().getFirst("Retry-After");
        long seconds;
        try {
            seconds = header == null ? 0 : Long.parseLong(header.trim());
        } catch (NumberFormatException ignored) {
            seconds = 0;
        }
        if (seconds <= 0) {
            return "mais tarde";
        }
        if (seconds < 3600) {
            return "em cerca de " + Math.max(1, seconds / 60) + " min";
        }
        if (seconds < 86400) {
            return "em cerca de " + (seconds / 3600) + "h";
        }
        return "em cerca de " + (seconds / 86400) + " dia(s)";
    }
}
