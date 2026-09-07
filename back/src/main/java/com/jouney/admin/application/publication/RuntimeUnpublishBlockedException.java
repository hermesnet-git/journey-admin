package com.jouney.admin.application.publication;

/** Lançada quando o runtime recusa despublicar (409) porque existe instância de processo ativa
 * pra essa jornada — despublicar cascateia a remoção do deployment no Camunda, o que mataria
 * qualquer instância em execução se fosse permitido. Distinta de
 * {@link com.jouney.admin.infrastructure.publication.RuntimePublicationException}
 * (infra/disponibilidade) porque aqui o runtime respondeu normalmente, só recusou a ação. */
public class RuntimeUnpublishBlockedException extends RuntimeException {

    public RuntimeUnpublishBlockedException(String message) {
        super(message);
    }
}
