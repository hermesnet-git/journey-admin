package com.jouney.admin.domain.execution;

/** A instância existe, mas não está `ACTIVE` — já concluiu ou foi encerrada, então não há o que
 * retomar ao vivo na Execução; consultá-la nesse estado é papel do Diagnóstico (FT-15). */
public class InstanceNotResumableException extends RuntimeException {

    public InstanceNotResumableException(String processInstanceId, String state) {
        super("Execução " + processInstanceId + " não está em andamento (estado: " + state
                + "). Consulte-a pelo Diagnóstico.");
    }
}
