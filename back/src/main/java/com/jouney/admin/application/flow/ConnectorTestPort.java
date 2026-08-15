package com.jouney.admin.application.flow;

/** Executes a REST connector test call (REQ-03.10.001). Implemented by an infrastructure adapter
 * so the use case stays free of HTTP/network details (SSRF guard, timeouts). */
public interface ConnectorTestPort {

    ConnectorTestResult test(ConnectorTestCommand command);
}
