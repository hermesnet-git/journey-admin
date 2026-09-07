-- Rastreia o deployment do Camunda gerado por cada publish/republish, pra despublicar uma versão
-- conseguir mirar só o deployment dela (não mais todos os deployments da jornada) — parte da
-- mudança que permite duas versões da mesma jornada ficarem publicadas ao mesmo tempo.
ALTER TABLE journey_version ADD COLUMN runtime_deployment_id VARCHAR(255);
