package com.jouney.transformpublication.camunda;

/**
 * Camunda never answered at all — connection refused, timeout, DNS failure. Distinct from
 * {@link CamundaDeploymentException}, which means Camunda DID answer and rejected the deploy
 * (e.g. an invalid BPMN/JUEL expression in the journey itself); conflating the two under one
 * "unavailable" label used to hide a content problem behind what looked like an infra outage.
 */
public class CamundaUnavailableException extends RuntimeException {

    public CamundaUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
