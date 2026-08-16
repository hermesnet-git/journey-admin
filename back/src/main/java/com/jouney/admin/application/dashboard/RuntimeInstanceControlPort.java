package com.jouney.admin.application.dashboard;

/** Ações que alteram o estado de uma instância em execução no motor de runtime — separado de
 * {@link RuntimeMonitoringPort} (que é só leitura) porque isso é um comando, não uma consulta. */
public interface RuntimeInstanceControlPort {

    /** Encerra (cancela) uma instância em execução. Não é uma "conclusão" de verdade — a instância
     * não passa pelo fim do fluxo, só é interrompida onde estiver. É o mecanismo do próprio motor
     * para descartar instâncias abandonadas. */
    void terminate(String processInstanceId);
}
