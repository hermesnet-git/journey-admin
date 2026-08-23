package com.jouney.admin.infrastructure.publication;

/**
 * The runtime publication API answered — it's up — and rejected this specific publish (e.g. an
 * invalid JUEL expression in a gateway condition, caught by ms-transform-publication's own Camunda
 * deploy step). Distinct from {@link RuntimePublicationException}, which means the call to the
 * runtime API itself failed (unreachable, timeout, or an unexpected error) — conflating the two
 * under one "unavailable" label used to hide a content problem in the journey behind what looked
 * like an infra outage.
 */
public class RuntimePublicationRejectedException extends RuntimeException {

    public RuntimePublicationRejectedException(String message, Throwable cause) {
        super(message, cause);
    }
}
