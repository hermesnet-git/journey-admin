package com.jouney.admin.domain.componentregistry;

/** Regra de compatibilidade 1 do catálogo SDUI v1: só vira STABLE quando homologado nos 4 alvos de
 * renderização (react.web, react.mobile, flutter.web, flutter.mobile). */
public enum ComponentStatus {
    EXPERIMENTAL,
    STABLE,
    DEPRECATED,
    REMOVED
}
