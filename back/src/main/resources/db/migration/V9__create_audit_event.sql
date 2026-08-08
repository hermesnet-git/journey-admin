CREATE TABLE audit_event (
    audit_event_id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED')),
    correlation_id VARCHAR(100),
    previous_value JSONB,
    new_value JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_event_user ON audit_event(user_id);
CREATE INDEX idx_audit_event_resource ON audit_event(resource_type, resource_id);
CREATE INDEX idx_audit_event_occurred_at ON audit_event(occurred_at);
