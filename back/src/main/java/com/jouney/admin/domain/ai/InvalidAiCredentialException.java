package com.jouney.admin.domain.ai;

/** O pedido de salvar a credencial de IA não se sustenta (ex.: ativar um provedor sem chave). */
public class InvalidAiCredentialException extends RuntimeException {

    public InvalidAiCredentialException(String message) {
        super(message);
    }
}
