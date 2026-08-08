-- REQ-06.05.002: existing journeys must receive an initial version during model migration.
-- version 1 = PUBLISHED (snapshot copied from the existing journey_publication row, same shape
-- as journey_version.version_snapshot) for journeys with a publication; DRAFT with a minimal
-- snapshot (assembled from current journey/channel/product data, empty flow/forms) otherwise.
-- created_by uses the fixed mock admin user (real authorship isn't tracked pre-EP-07/EP-06).
INSERT INTO journey_version (version_id, journey_id, version_number, version_status, version_snapshot,
                              created_by, created_at, published_at)
SELECT gen_random_uuid(), jp.journey_id, 1, 'PUBLISHED', jp.snapshot,
       '00000000-0000-0000-0000-000000000001', jp.published_at, jp.published_at
FROM journey_publication jp;

INSERT INTO journey_version (version_id, journey_id, version_number, version_status, version_snapshot,
                              created_by, created_at, published_at)
SELECT gen_random_uuid(), j.journey_id, 1, 'DRAFT',
       jsonb_build_object(
           'journeyId', j.journey_id,
           'journeyName', j.name,
           'journeyDescription', j.description,
           'productId', p.product_id,
           'productName', p.name,
           'channelId', c.channel_id,
           'channelName', c.name,
           'channelType', c.type,
           'flowNodes', '[]'::jsonb,
           'flowConnections', '[]'::jsonb,
           'forms', '[]'::jsonb
       ),
       '00000000-0000-0000-0000-000000000001', j.created_at, NULL
FROM journey j
JOIN channel c ON c.channel_id = j.channel_id
JOIN product p ON p.product_id = c.product_id
WHERE NOT EXISTS (SELECT 1 FROM journey_publication jp WHERE jp.journey_id = j.journey_id);

ALTER TABLE journey_publication ADD COLUMN version_id UUID REFERENCES journey_version(version_id);

UPDATE journey_publication jp
SET version_id = jv.version_id
FROM journey_version jv
WHERE jv.journey_id = jp.journey_id AND jv.version_number = 1;
