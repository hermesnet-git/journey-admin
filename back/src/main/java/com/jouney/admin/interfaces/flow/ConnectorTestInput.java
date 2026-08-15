package com.jouney.admin.interfaces.flow;

import com.jouney.admin.application.flow.ConnectorTestCommand;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record ConnectorTestInput(@NotBlank String method, @NotBlank String url, Map<String, String> headers,
                                  Map<String, Object> body, Map<String, String> sampleVariables) {

    public ConnectorTestCommand toCommand() {
        return new ConnectorTestCommand(method, url, headers, body, sampleVariables);
    }
}
