package com.jouney.admin.domain.flow;

import java.util.List;

/** Seção do canvas: uma moldura com nome, posição e tamanho próprios, que agrupa as etapas que estão
 * dentro dela e que o editor pode recolher. {@code nodeIds} é gravado a partir do que está dentro da
 * moldura no momento de salvar; {@code x}, {@code y}, {@code width} e {@code height} ficam nulos numa
 * seção gravada antes de ela ter moldura própria — o editor calcula a moldura a partir das etapas. Só
 * apresentação: como as anotações, nunca chega à validação, à publicação nem ao motor. */
public record FlowSection(String id, String name, List<String> nodeIds, Integer x, Integer y, Integer width,
                          Integer height) {
}
