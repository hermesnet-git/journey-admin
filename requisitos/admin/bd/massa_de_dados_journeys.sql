-- Seed ~50 journeys with 2-5 versions each, reusing "Primeira jornada V2"'s
-- channel/product/form and flow shape (only journey_id/name/status vary).
--
-- Não é uma stored procedure: é um script SQL avulso com um bloco anônimo PL/pgSQL
-- (DO $$ ... $$), que executa uma vez e não fica salvo no banco como objeto (ao
-- contrário de uma function/procedure, que precisaria de CREATE e ficaria disponível
-- para chamadas futuras). Para rodar, basta executar o arquivo inteiro numa ferramenta
-- cliente de PostgreSQL (DBeaver, DataGrip, pgAdmin, psql etc.) conectada ao banco
-- journey_admin — geralmente um botão "Execute Script"/"Run SQL File", ou colar o
-- conteúdo inteiro no editor de query e rodar tudo de uma vez (não linha a linha, por
-- causa do BEGIN/COMMIT e do bloco DO). Via linha de comando: psql -h <host> -U
-- <usuario> -d journey_admin -f seed_journeys.sql.
BEGIN;

DO $$
DECLARE
  v_channel_id uuid := 'ecf61a3d-87ec-4f30-a63d-3d5804acb2e6';
  v_product_id uuid := '0b1b4d87-f7ee-484f-a833-1fa3c3f44166';
  v_channel_name text := 'canal novo';
  v_product_name text := 'Produto novo';
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_nodes jsonb := '[
    {"id": "Node_7adeb321-1e23-409d-b981-c45deff82060", "name": "Início", "type": "START", "formId": null, "positionX": 338, "positionY": 562, "description": "Inicia o fluxo", "connectorConfig": null},
    {"id": "Node_d45c33a7-66f4-46a8-9c96-8596421e23ed", "name": "Tarefa de Usuário", "type": "USER_TASK", "formId": "86380bd1-85fe-4541-b47c-cce049ef9019", "positionX": 698, "positionY": 562, "description": "Coleta dados do usuário", "connectorConfig": null},
    {"id": "Node_ab6e35f7-93ab-4236-bdbc-c4e9463eb6ce", "name": "Fim", "type": "END", "formId": null, "positionX": 1058, "positionY": 562, "description": "Encerra o fluxo", "connectorConfig": null}
  ]'::jsonb;
  v_conns jsonb := '[
    {"id": "Flow_e37c7839-c46b-40fe-8ebd-5ef6de199b10", "sourceNodeId": "Node_7adeb321-1e23-409d-b981-c45deff82060", "targetNodeId": "Node_d45c33a7-66f4-46a8-9c96-8596421e23ed"},
    {"id": "Flow_2b571235-73c0-4778-bd42-cb9e67b3797b", "sourceNodeId": "Node_d45c33a7-66f4-46a8-9c96-8596421e23ed", "targetNodeId": "Node_ab6e35f7-93ab-4236-bdbc-c4e9463eb6ce"}
  ]'::jsonb;
  v_forms jsonb := '[
    {"id": "86380bd1-85fe-4541-b47c-cce049ef9019", "name": "form novo", "fields": [
      {"id": "60c39db6-b0a3-409b-9220-2fa0ac9bac49", "type": "INPUT", "label": "Campo de entrada", "options": null, "helpText": null, "required": false, "defaultValue": null},
      {"id": "4ddffb28-f410-4b97-b63b-b6667cd2b1f5", "type": "SINGLE_SELECT", "label": "Seleção simples", "options": ["Opção 1"], "helpText": null, "required": false, "defaultValue": null},
      {"id": "3a9f22d6-511a-49da-b92c-8b5a7b6e8ae9", "type": "MULTI_SELECT", "label": "Seleção múltipla", "options": ["Opção 1"], "helpText": null, "required": false, "defaultValue": null},
      {"id": "a171f104-e194-4200-b240-9f6ea20df7c5", "type": "FILE_UPLOAD", "label": "Upload de arquivo", "options": null, "helpText": null, "required": false, "defaultValue": null},
      {"id": "83864349-2e52-4731-939a-17ba3b901f5f", "type": "STATIC_CONTENT", "label": "Conteúdo estático", "options": null, "helpText": null, "required": false, "defaultValue": null},
      {"id": "d1fdf7f1-e3c3-42f4-98a8-c2f920532d19", "type": "INPUT", "label": "Campo de entrada", "options": null, "helpText": null, "required": false, "defaultValue": null}
    ], "description": "teste"}
  ]'::jsonb;
  v_themes text[] := ARRAY['Abertura de conta','Troca de plano','Cancelamento de serviço','Portabilidade numérica',
    'Segunda via de fatura','Contratação de plano','Recarga pré-paga','Alteração cadastral','Consulta de saldo',
    'Suporte técnico','Ativação de linha','Migração de plano','Solicitação de bônus','Desbloqueio de linha',
    'Troca de titularidade','Adesão a combo','Cancelamento de assinatura','Consulta de fatura','Alteração de endereço',
    'Reclamação de cobrança'];
  statuses text[] := ARRAY['DRAFT','PUBLISHED','UNPUBLISHED'];
  i int;
  j int;
  v_journey_id uuid;
  v_flow_id text;
  v_journey_name text;
  v_num_versions int;
  v_last_status text;
  v_status text;
  v_created timestamptz;
  v_version_created timestamptz;
  v_published timestamptz;
  v_version_id uuid;
  v_snapshot jsonb;
  v_pub_id uuid;
BEGIN
  FOR i IN 1..50 LOOP
    v_journey_id := gen_random_uuid();
    v_flow_id := 'Process_' || gen_random_uuid();
    v_journey_name := v_themes[1 + ((i - 1) % array_length(v_themes, 1))] || ' ' || i;
    v_created := now() - (floor(random() * 60) || ' days')::interval;
    v_num_versions := 2 + floor(random() * 4)::int; -- 2..5
    v_last_status := statuses[1 + floor(random() * 3)::int];

    INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at)
    VALUES (v_journey_id, v_channel_id, v_journey_name, 'Jornada gerada para testes', v_last_status, v_created, v_created);

    INSERT INTO flow (flow_id, journey_id, name, nodes, connections, created_at, updated_at)
    VALUES (v_flow_id, v_journey_id, 'Fluxo principal', v_nodes, v_conns, v_created, v_created);

    FOR j IN 1..v_num_versions LOOP
      v_version_id := gen_random_uuid();
      v_status := CASE WHEN j < v_num_versions THEN 'UNPUBLISHED' ELSE v_last_status END;
      v_version_created := v_created + (j || ' hours')::interval;
      v_published := CASE WHEN v_status = 'DRAFT' THEN NULL ELSE v_version_created END;

      v_snapshot := jsonb_build_object(
        'forms', v_forms,
        'channelId', v_channel_id,
        'flowNodes', v_nodes,
        'journeyId', v_journey_id,
        'productId', v_product_id,
        'channelName', v_channel_name,
        'channelType', 'WEB',
        'journeyName', v_journey_name,
        'productName', v_product_name,
        'flowConnections', v_conns,
        'journeyDescription', 'Jornada gerada para testes'
      );

      INSERT INTO journey_version (version_id, journey_id, version_number, version_status, version_snapshot,
                                    description, created_by, created_at, published_at)
      VALUES (v_version_id, v_journey_id, j, v_status, v_snapshot, NULL, v_user_id, v_version_created, v_published);

      IF v_status = 'PUBLISHED' THEN
        v_pub_id := gen_random_uuid();
        INSERT INTO journey_publication (publication_id, journey_id, snapshot, version_id, published_at, created_at, updated_at)
        VALUES (v_pub_id, v_journey_id, v_snapshot, v_version_id, v_published, v_published, v_published);
      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
