CREATE TABLE journey_version (
    version_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    version_status VARCHAR(20) NOT NULL CHECK (version_status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    version_snapshot JSONB NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    UNIQUE (journey_id, version_number),
    FOREIGN KEY (journey_id) REFERENCES journey(journey_id)
);

CREATE INDEX idx_journey_version_journey ON journey_version(journey_id, version_number);
CREATE INDEX idx_journey_version_status ON journey_version(version_status);
