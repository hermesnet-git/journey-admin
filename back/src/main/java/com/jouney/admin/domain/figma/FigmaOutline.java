package com.jouney.admin.domain.figma;

import java.util.List;

/** Resultado da leitura rasa: o que o arquivo tem de importável, sem ainda ter contado nada. */
public record FigmaOutline(String fileName, String version, List<FigmaPage> pages) {
}
