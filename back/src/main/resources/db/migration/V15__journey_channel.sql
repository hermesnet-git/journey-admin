-- Jornada passa de 1:1 com Canal para N:N (jornadas multicanais) — join table nova, backfill da
-- linha existente, e product_id promovido a coluna própria de journey (antes só derivado via
-- channel.product_id, agora precisa existir mesmo com múltiplos canais possivelmente heterogêneos
-- na leitura, embora a regra de negócio exija que todos pertençam ao mesmo produto).

CREATE TABLE journey_channel (
    journey_id UUID NOT NULL REFERENCES journey(journey_id),
    channel_id UUID NOT NULL REFERENCES channel(channel_id),
    PRIMARY KEY (journey_id, channel_id)
);
CREATE INDEX idx_journey_channel_channel ON journey_channel(channel_id);

INSERT INTO journey_channel (journey_id, channel_id)
SELECT journey_id, channel_id FROM journey;

ALTER TABLE journey ADD COLUMN product_id UUID;
UPDATE journey j SET product_id = c.product_id FROM channel c WHERE c.channel_id = j.channel_id;
ALTER TABLE journey ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE journey ADD CONSTRAINT fk_journey_product FOREIGN KEY (product_id) REFERENCES product(product_id);
CREATE INDEX idx_journey_product ON journey(product_id);

ALTER TABLE journey DROP CONSTRAINT fk_journey_channel;
ALTER TABLE journey DROP COLUMN channel_id;
