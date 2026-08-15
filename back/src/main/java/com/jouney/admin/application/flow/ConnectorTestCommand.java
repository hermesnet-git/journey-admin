package com.jouney.admin.application.flow;

import java.util.Map;

/**
 * Values as currently configured in the editor (REQ-03.10.001), not the saved flow.
 * {@code sampleVariables} supplies example values for {@code {{name}}} references present in
 * method/url/headers/body, since there is no real journey execution to resolve them from
 * (REQ-03.09.012, REQ-03.10.005).
 */
public record ConnectorTestCommand(String method, String url, Map<String, String> headers, Map<String, Object> body,
                                    Map<String, String> sampleVariables) {
}
