package com.jouney.especregistry.simulation;

/** A journey whose flow reaches an END via only automatic REST-connector SERVICE_TASKs, with no
 * checkpoint (USER_TASK, RECEIVE_TASK, or a Kafka/external-task SERVICE_TASK) in between, can't run:
 * Camunda's native http-connector executes inline, and several of them completing the process
 * instance in the same transaction that triggered it trips an engine bug ("execution ... doesn't
 * exist", reproduced live). FlowValidator (admin/back) rejects this flow shape for anything saved
 * from now on — this exception catches a journey published before that rule existed, proactively
 * (SynchronousChainCheck), before ever calling the engine. */
public class SynchronousChainUnsupportedException extends RuntimeException {

    public SynchronousChainUnsupportedException(String endNodeName) {
        super("Esta jornada tenta executar um trecho inteiro do fluxo (uma ou mais integrações REST) sem "
                + "nenhum checkpoint (User Task, Receive Task ou tarefa Kafka) antes do Fim '" + endNodeName
                + "' — o motor não suporta terminar o processo numa cadeia totalmente síncrona. Adicione uma "
                + "User Task (pode ser sem formulário) antes desse Fim e publique a jornada novamente.");
    }
}
