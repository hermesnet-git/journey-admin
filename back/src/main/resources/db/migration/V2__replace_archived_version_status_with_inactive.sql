-- ARCHIVED is retired: no application flow has produced it since publish/republish switched to
-- marking the superseded version UNPUBLISHED. Any existing ARCHIVED row is legacy/seed data that
-- represents exactly that "superseded, journey still alive" case, so it's converted to UNPUBLISHED
-- here to match what the current code would have produced.
--
-- INACTIVE is introduced to replace it going forward, but with a different meaning: it marks every
-- version of a journey that has been soft-deleted (DeleteJourney, REQ-02.01.005/006) because it was
-- once published and can't be removed physically.
UPDATE journey_version SET version_status = 'UNPUBLISHED' WHERE version_status = 'ARCHIVED';

ALTER TABLE journey_version DROP CONSTRAINT journey_version_version_status_check;
ALTER TABLE journey_version ADD CONSTRAINT journey_version_version_status_check
    CHECK (version_status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'INACTIVE'));
