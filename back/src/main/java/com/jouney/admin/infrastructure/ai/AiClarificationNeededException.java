package com.jouney.admin.infrastructure.ai;

import java.util.List;

/**
 * A IA achou o pedido vago demais para montar uma jornada e devolve perguntas ao usuário, cada uma com
 * respostas prontas — a primeira é a que ela recomenda. Não é um erro: o controller entrega as perguntas
 * ao front, que depois chama a geração de novo com as respostas junto do pedido (e sem poder perguntar
 * outra vez, para a conversa ter uma rodada só).
 */
public class AiClarificationNeededException extends RuntimeException {

    private final List<Question> questions;

    public AiClarificationNeededException(List<Question> questions) {
        super("A IA precisa de mais informações para criar a jornada.");
        this.questions = questions;
    }

    public List<Question> questions() {
        return questions;
    }

    public record Option(String label, String description) {
    }

    public record Question(String question, String header, List<Option> options) {
    }
}
