package com.jouney.admin.domain.componentregistry;

public class UnknownRenderTargetException extends RuntimeException {

    public UnknownRenderTargetException(String target) {
        super("Alvo de renderização desconhecido: \"" + target + "\". Esperado um de " + RenderTarget.ALL + ".");
    }
}
