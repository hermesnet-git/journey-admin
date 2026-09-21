package com.jouney.admin.infrastructure.figma;

// Espelha AiGenerationException/EspecRegistrySduiException: uma chamada externa da qual este portal
// depende falhou (token sem permissão, arquivo inacessível, resposta ilegível). Não é problema de
// validação do fluxo — esse continua sendo FlowValidationException, com seu próprio 422.
public class FigmaReadException extends RuntimeException {

    public FigmaReadException(String message) {
        super(message);
    }

    public FigmaReadException(String message, Throwable cause) {
        super(message, cause);
    }
}
