CREATE TABLE messaging_cluster (
    cluster_id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL CHECK (
        type IN ('KAFKA', 'EVENT_HUBS', 'SERVICE_BUS')
    ),
    connection_address VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credential_reference (
    credential_id UUID PRIMARY KEY,
    reference_name VARCHAR(150) NOT NULL UNIQUE,
    cluster_id UUID NOT NULL,
    key_vault_uri VARCHAR(300) NOT NULL,
    secret_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_credential_reference_cluster
        FOREIGN KEY (cluster_id) REFERENCES messaging_cluster(cluster_id)
);

CREATE INDEX idx_messaging_cluster_type ON messaging_cluster(type);
CREATE INDEX idx_messaging_cluster_status ON messaging_cluster(status);
CREATE INDEX idx_credential_reference_cluster ON credential_reference(cluster_id);
CREATE INDEX idx_credential_reference_status ON credential_reference(status);
