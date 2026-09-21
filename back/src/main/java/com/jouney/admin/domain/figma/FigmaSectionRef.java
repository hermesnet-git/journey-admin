package com.jouney.admin.domain.figma;

/**
 * Um agrupamento de telas — candidato a virar uma jornada.
 *
 * <p>Agrupamentos se aninham: um bloco grande costuma conter os blocos de cada etapa. Todos são
 * importáveis, porque a jornada que se quer montar pode ser o bloco inteiro ou só um pedaço dele.
 * {@code path} mostra onde o agrupamento fica, para distinguir homônimos em lugares diferentes.
 */
public record FigmaSectionRef(String nodeId, String name, String path, int depth) {
}
