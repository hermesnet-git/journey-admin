package com.jouney.especregistry.domain.journey;

/** Ao iniciar (ou avançar) uma instância, o motor executa as tarefas de forma síncrona, uma atrás da
 * outra, a partir do passo atual — só pausa ao encontrar um ponto de parada real: uma Tarefa de
 * Usuário, ou qualquer tarefa executada de forma assíncrona (Tarefa de Recebimento, ou uma Tarefa de
 * Serviço via mensageria). Se o caminho até um Fim passa só por Tarefas de Serviço via REST (sempre
 * síncronas), o processo tenta terminar dentro da própria transação que o criou/avançou — e o motor
 * não sustenta isso (erro "execution ... doesn't exist", reproduzido). SynchronousChainCheck detecta
 * essa forma de fluxo e lança isto antes de chamar o motor, em vez de deixar crashar. */
public class SynchronousChainUnsupportedException extends RuntimeException {

    public SynchronousChainUnsupportedException(String endNodeName) {
        super("O motor de execução roda as tarefas de forma síncrona a partir daqui, até encontrar um ponto de "
                + "parada — uma Tarefa de Usuário, ou qualquer tarefa executada de forma assíncrona (Tarefa de "
                + "Recebimento, ou uma Tarefa de Serviço via mensageria). O caminho até o Fim '" + endNodeName
                + "' só tem Tarefas de Serviço via REST, sem nenhum ponto de parada, então essa jornada não pode "
                + "ser executada assim — adicione uma Tarefa de Usuário (pode ser sem formulário) antes desse Fim "
                + "e publique a jornada novamente.");
    }
}
