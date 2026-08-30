package com.jouney.especregistry.simulation;

/** Thrown by {@code SimulationController.start()} when starting a journey fails because a
 * synchronous REST connector's outputMapping jsonPath doesn't match the real response
 * (SpinJsonPathException) — carries the {@link StartFailureDiagnostic} replay result alongside the
 * message, so GlobalExceptionHandler can point the front straight at the failing node (highlighted
 * in the flow preview) in the same response, without a second round trip. */
public class StartFailureDiagnosedException extends RuntimeException {

    private final DiagnosisResult diagnosis;

    public StartFailureDiagnosedException(String message, DiagnosisResult diagnosis) {
        super(message);
        this.diagnosis = diagnosis;
    }

    public DiagnosisResult diagnosis() {
        return diagnosis;
    }
}
