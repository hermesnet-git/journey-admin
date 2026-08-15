package com.jouney.admin.application.flow;

import org.springframework.stereotype.Service;

@Service
public class TestConnector {

    private final ConnectorTestPort port;

    public TestConnector(ConnectorTestPort port) {
        this.port = port;
    }

    public ConnectorTestResult execute(ConnectorTestCommand command) {
        return port.test(command);
    }
}
