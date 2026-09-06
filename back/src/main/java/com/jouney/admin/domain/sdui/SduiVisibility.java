package com.jouney.admin.domain.sdui;

/** Único shape de regra de visibilidade que o catálogo exemplifica (seção 14.2) — não generalizar
 * pra lógica booleana composta sem um caso real que peça isso. {@code rule}: equals/notEquals
 * (valor único) ou in/notIn (valor = lista) — este último adicionado pra "visível nestes canais"
 * (ex.: {@code path="session.channel", rule="in", value=["WEB","APP"]}), continua uma regra só. */
public record SduiVisibility(String rule, String path, Object value) {
}
