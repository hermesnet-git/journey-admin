package com.jouney.admin.domain.sdui;

import java.util.Map;

/** {@code action} é um dos 6 tipos do Action Registry (seção 9 do catálogo) — validado por
 * {@link com.jouney.admin.domain.flow.FlowValidator}, não aqui (record sem comportamento). */
public record SduiEvent(String action, Map<String, Object> params) {
}
