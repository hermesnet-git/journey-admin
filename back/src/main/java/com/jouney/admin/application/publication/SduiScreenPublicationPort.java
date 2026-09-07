package com.jouney.admin.application.publication;

import com.jouney.admin.domain.flow.SduiScreenEnvelope;
import java.util.List;

/** Porta pro ms-espec-registry — a única peça que conhece o Strapi de verdade (decisão de
 * arquitetura: admin/back nunca fala com o Strapi diretamente, pra poder trocar/somar outro
 * backend de spec registry, ex. AEM, sem o admin/back precisar mudar). */
public interface SduiScreenPublicationPort {

    void publish(List<SduiScreenEnvelope> envelopes);

    /** Checagem rápida (bem mais curta que o timeout de publish) de que o backend de specs SDUI
     * está disponível — chamada antes de publicar de verdade, pra falhar rápido com uma mensagem
     * clara em vez de só descobrir lá na frente, depois de já ter feito o deploy no runtime. */
    boolean isAvailable();
}
