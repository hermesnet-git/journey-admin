CREATE TABLE published_screen (
    screen_id UUID PRIMARY KEY,
    journey_id UUID NOT NULL,
    journey_version INTEGER NOT NULL,
    ui_step_id VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('published', 'deprecated')),
    integrity_hash VARCHAR(64) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    envelope JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uma única revisão publicada por tela de uma versão da jornada; as anteriores ficam 'deprecated'.
CREATE UNIQUE INDEX ux_published_screen_published
    ON published_screen (journey_id, journey_version, ui_step_id)
    WHERE status = 'published';
