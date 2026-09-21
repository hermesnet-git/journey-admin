package com.jouney.admin.domain.figma;

import java.util.List;

/** Uma página do arquivo. {@code looseScreens} conta as telas que estão direto nela, fora de
 * qualquer agrupamento — uma página assim também pode ser importada inteira. */
public record FigmaPage(String pageId, String name, List<FigmaSectionRef> sections, int looseScreens) {
}
