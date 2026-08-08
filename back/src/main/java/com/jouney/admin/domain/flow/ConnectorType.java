package com.jouney.admin.domain.flow;

/**
 * Connector catalog for FT-03.08: REST and KAFKA are enabled for use in
 * flows; SOAP is registered as a disabled placeholder proving the catalog
 * supports future connectors without allowing their use yet (REQ-03.08.004).
 */
public enum ConnectorType {
    REST(true),
    KAFKA(true),
    SOAP(false);

    private final boolean enabled;

    ConnectorType(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
