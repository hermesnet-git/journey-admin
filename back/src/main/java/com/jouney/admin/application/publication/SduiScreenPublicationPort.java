package com.jouney.admin.application.publication;

import com.jouney.admin.domain.flow.SduiScreenEnvelope;
import java.util.List;

/** Porta pro ms-espec-registry — a única peça que conhece o Strapi de verdade (decisão de
 * arquitetura: admin/back nunca fala com o Strapi diretamente, pra poder trocar/somar outro
 * backend de spec registry, ex. AEM, sem o admin/back precisar mudar). */
public interface SduiScreenPublicationPort {

    void publish(List<SduiScreenEnvelope> envelopes);
}
