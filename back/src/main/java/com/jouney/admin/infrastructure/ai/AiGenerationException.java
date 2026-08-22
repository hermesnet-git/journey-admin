package com.jouney.admin.infrastructure.ai;

// Espelha RuntimePublicationException/MessagingConnectionTestException: uma chamada externa da qual
// este portal depende falhou (chave ausente, erro HTTP, resposta ilegível) — não é um problema de
// validação do fluxo em si, esse caso continua sendo FlowValidationException, com seu próprio 422.
public class AiGenerationException extends RuntimeException {

    public AiGenerationException(String message) {
        super(message);
    }

    public AiGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
