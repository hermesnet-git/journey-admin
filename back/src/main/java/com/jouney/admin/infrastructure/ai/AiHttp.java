package com.jouney.admin.infrastructure.ai;

import java.time.Duration;
import java.util.function.Supplier;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Cliente HTTP comum aos provedores de IA. */
final class AiHttp {

    private AiHttp() {
    }

    private static final long[] RETRY_WAITS_MS = {1500, 4000};

    /**
     * Repete a chamada em erro passageiro do provedor (429 e 5xx, como o 503 "alta demanda" do Gemini) e em falha
     * de conexão, até duas vezes, com espera crescente. Erro de chave, de modelo ou de pedido (4xx) não repete.
     */
    static <T> T withRetry(Supplier<T> call) {
        for (int attempt = 0; ; attempt++) {
            try {
                return call.get();
            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();
                boolean transientFailure = status == 429 || (status >= 500 && status <= 504);
                if (!transientFailure || attempt >= RETRY_WAITS_MS.length) {
                    throw ex;
                }
            } catch (ResourceAccessException ex) {
                if (attempt >= 1) {
                    throw ex;
                }
            }
            try {
                Thread.sleep(RETRY_WAITS_MS[attempt]);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new AiGenerationException("A geração foi interrompida.");
            }
        }
    }

    /** Mensagem para o usuário quando o provedor responde com erro: chave recusada e limite de uso ganham texto próprio. */
    static String failureMessage(String provider, RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        if (status == 401 || status == 403) {
            return "A chave de API " + provider + " foi recusada (" + status + "). Confira a credencial em Integrações > Credencial de IA.";
        }
        if (status == 404) {
            return "O modelo configurado para " + provider + " não foi encontrado (404). Confira o nome do modelo em Integrações > Credencial de IA.";
        }
        if (status == 429) {
            return "O provedor " + provider + " recusou por excesso de uso (429). Tente de novo em instantes.";
        }
        String body = ex.getResponseBodyAsString();
        return "Falha ao chamar a API " + provider + " (" + ex.getStatusCode() + ")" + (body.isBlank() ? "" : ": " + body);
    }

    // RestClient sem timeout configurado nunca falha rápido numa chamada travada — pode prender a
    // virtual thread indefinidamente. 20s pra conectar, 90s pra ler a resposta (o suficiente até pra
    // uma jornada complexa, mas ainda finito) — combinado com o timeout de 600s do SseEmitter, garante
    // que as tentativas malsucedidas terminem numa resposta de erro em vez de a conexão SSE fechar
    // sozinha antes do resultado chegar.
    static RestClient.Builder timeoutedRestClientBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(20));
        factory.setReadTimeout(Duration.ofSeconds(90));
        return RestClient.builder().requestFactory(factory);
    }
}
