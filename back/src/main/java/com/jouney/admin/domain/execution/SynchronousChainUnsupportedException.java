package com.jouney.admin.domain.execution;

/** Ao iniciar (ou avançar) uma instância, o motor executa as tarefas de forma síncrona, uma atrás da
 * outra, a partir do passo atual — só pausa ao encontrar um ponto de parada real: uma User Task, ou
 * qualquer tarefa executada de forma assíncrona (Receive Task, ou uma Service Task via mensageria).
 * Se o caminho até um END passa só por Service Tasks via REST (sempre síncronas), o processo tenta
 * terminar dentro da própria transação que o criou/avançou — e o motor não sustenta isso (erro
 * "execution ... doesn't exist"). {@link SynchronousChainCheck} detecta essa forma de fluxo e lança
 * isto antes de chamar o motor, em vez de deixar crashar. */
public class SynchronousChainUnsupportedException extends RuntimeException {

    public SynchronousChainUnsupportedException(String endNodeName) {
        super("O motor de execução roda as tarefas de forma síncrona a partir daqui, até encontrar um ponto de "
                + "parada — uma User Task, ou qualquer tarefa executada de forma assíncrona (Receive Task, ou uma "
                + "Service Task via mensageria). O caminho até o Fim '" + endNodeName
                + "' só tem Service Tasks via REST, sem nenhum ponto de parada, então essa jornada não pode ser "
                + "executada assim — adicione uma User Task (pode ser sem formulário) antes desse Fim e publique a "
                + "jornada novamente.");
    }
}
