-- Canal deixa de ser uma entidade com CRUD e vira um valor de domínio fixo — só WEB/MOBILE/WHATSAPP
-- (URA/CONTACT_CENTER/OTHER saem: exigiriam um paradigma de renderização diferente, fora de
-- escopo). Produto passa a declarar direto quais tipos suas jornadas podem usar; jornada continua
-- escolhendo um subconjunto não-vazio dos tipos do seu produto, só que agora são tipos, não
-- referências a linhas de uma tabela `channel`.

CREATE TABLE product_channel_type (
    product_id UUID NOT NULL REFERENCES product(product_id),
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('WEB','MOBILE','WHATSAPP')),
    PRIMARY KEY (product_id, channel_type)
);

INSERT INTO product_channel_type (product_id, channel_type)
SELECT DISTINCT product_id, type FROM channel WHERE type IN ('WEB','MOBILE','WHATSAPP');

CREATE TABLE journey_channel_type (
    journey_id UUID NOT NULL REFERENCES journey(journey_id),
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('WEB','MOBILE','WHATSAPP')),
    PRIMARY KEY (journey_id, channel_type)
);

INSERT INTO journey_channel_type (journey_id, channel_type)
SELECT DISTINCT jc.journey_id, c.type
FROM journey_channel jc
JOIN channel c ON c.channel_id = jc.channel_id
WHERE c.type IN ('WEB','MOBILE','WHATSAPP');

DROP TABLE journey_channel;
DROP TABLE channel;
