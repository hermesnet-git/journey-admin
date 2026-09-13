package com.jouney.admin.domain.execution;

/** Nenhuma instância encontrada no motor, nem por ID nem por business key — usado pela retomada de
 * execução (busca por ID/business key na própria tela de Execução). */
public class InstanceNotFoundException extends RuntimeException {

    public InstanceNotFoundException(String idOrBusinessKey) {
        super("Nenhuma execução encontrada para \"" + idOrBusinessKey + "\".");
    }
}
