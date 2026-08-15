-- Massa de dados de uma operadora de telecom fictícia: produtos, canais (somente
-- WEB e MOBILE/app), formulários e jornadas (básicas e complexas), no formato
-- atual do schema (EP-04 refinado: FormField.name técnico, options {label,value},
-- sem STATIC_CONTENT; EP-03.07/03.08/03.09/03.11: SERVICE_TASK/RECEIVE_TASK/
-- MESSAGE_START_EVENT/GATEWAY, conectores REST/KAFKA, outputMapping, condição de
-- gateway).
--
-- O que este script NÃO faz: não publica nenhuma jornada (não insere em
-- journey_version/journey_publication). Todas as jornadas nascem em DRAFT.
-- Publicar de verdade (para que o motor de runtime gere as versões/publicações
-- corretas) é feito depois, chamando a API real (POST /api/v1/journeys/{id}/publish)
-- para cada jornada — é isso que aciona o ms-transform-publication/Camunda.
--
-- Como rodar: script SQL avulso (BEGIN/COMMIT + um bloco anônimo DO $$...$$ para
-- as jornadas/fluxos), não uma stored procedure — não fica salvo no banco como
-- objeto. Executar o arquivo inteiro de uma vez numa ferramenta cliente de
-- PostgreSQL (DBeaver, DataGrip, pgAdmin, psql etc.) conectada ao banco
-- journey_admin. Via linha de comando: psql -h <host> -U <usuario> -d
-- journey_admin -f massa_de_dados_journeys.sql
BEGIN;

TRUNCATE TABLE journey_publication, journey_version, flow, journey, channel, product, form, audit_event;

-- ============================================================================
-- Produtos (operadora de telecom fictícia)
-- ============================================================================
INSERT INTO product (product_id, name, description, status, created_at, updated_at)
SELECT gen_random_uuid(), name, description, 'ACTIVE', now(), now()
FROM (VALUES
    ('Plano Pós-pago Família', 'Plano pós-pago com compartilhamento de franquia entre até 5 linhas.'),
    ('Plano Pré-pago Turbo', 'Plano pré-pago com recargas de dados de alta velocidade.'),
    ('Internet Fibra Residencial', 'Banda larga via fibra óptica para residências.'),
    ('TV por Assinatura', 'Pacotes de canais por assinatura com opção de streaming incluso.'),
    ('Internet Móvel 5G', 'Plano de dados móveis com cobertura 5G nas capitais.'),
    ('Plano Empresarial Corporate', 'Linhas corporativas com gestão centralizada para empresas.'),
    ('Combo Fibra + Móvel', 'Pacote combinado de internet fibra e plano móvel com desconto.'),
    ('Plano Controle', 'Plano pós-pago sem fidelidade, com limite de consumo controlado.'),
    ('Telefonia Fixa', 'Linha fixa residencial e empresarial com pacotes de ligações.'),
    ('IoT Corporativo', 'Conectividade M2M/IoT para frotas, sensores e dispositivos corporativos.'),
    ('Plano Estudante', 'Plano móvel com desconto para estudantes matriculados.'),
    ('Roaming Internacional', 'Pacotes de dados e ligações para uso fora do país.')
) AS t(name, description);

-- ============================================================================
-- Canais — somente WEB e MOBILE (app), dois por produto
-- ============================================================================
INSERT INTO channel (channel_id, product_id, name, type, status, description, created_at, updated_at)
SELECT gen_random_uuid(), p.product_id, 'Canal Web — ' || p.name, 'WEB', 'ACTIVE',
       'Atendimento via site institucional', now(), now()
FROM product p
UNION ALL
SELECT gen_random_uuid(), p.product_id, 'Canal App — ' || p.name, 'MOBILE', 'ACTIVE',
       'Atendimento via aplicativo mobile', now(), now()
FROM product p;

-- ============================================================================
-- Formulários (ids fixos para poderem ser referenciados pelos templates de fluxo)
-- ============================================================================
INSERT INTO form (form_id, name, description, fields, created_at, updated_at) VALUES
('00000000-0000-4000-8000-000000000001', 'Dados Pessoais', 'Coleta de dados básicos do cliente', '[
  {"name":"introducao","type":"TEXT","inputSubtype":null,"label":"Preencha seus dados para continuar com a solicitação.","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"nomeCompleto","type":"INPUT","inputSubtype":"TEXT","label":"Nome completo","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"cpf","type":"INPUT","inputSubtype":"TEXT","label":"CPF","required":true,"defaultValue":null,"helpText":"Somente números","options":null,"minValue":null,"maxValue":null,"validationPattern":"^\\d{11}$","acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"email","type":"INPUT","inputSubtype":"EMAIL","label":"E-mail","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"dataNascimento","type":"INPUT","inputSubtype":"DATE","label":"Data de nascimento","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"planoDesejado","type":"SINGLE_SELECT","inputSubtype":null,"label":"Plano desejado","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Básico","value":"BASICO"},{"label":"Intermediário","value":"INTERMEDIARIO"},{"label":"Premium","value":"PREMIUM"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000002', 'Endereço', 'Dados de endereço para instalação/entrega', '[
  {"name":"cep","type":"INPUT","inputSubtype":"TEXT","label":"CEP","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":"^\\d{5}-?\\d{3}$","acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"logradouro","type":"INPUT","inputSubtype":"TEXT","label":"Logradouro","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"numero","type":"INPUT","inputSubtype":"NUMBER","label":"Número","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":1,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"complemento","type":"INPUT","inputSubtype":"TEXT","label":"Complemento","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"tipoResidencia","type":"SINGLE_SELECT","inputSubtype":null,"label":"Tipo de imóvel","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Casa","value":"CASA"},{"label":"Apartamento","value":"APARTAMENTO"},{"label":"Comercial","value":"COMERCIAL"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000003', 'Troca de Plano', 'Seleção do novo plano desejado', '[
  {"name":"planoAtual","type":"TEXT","inputSubtype":null,"label":"Seu plano atual será substituído pelo plano escolhido abaixo.","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"novoPlano","type":"SINGLE_SELECT","inputSubtype":null,"label":"Novo plano","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Básico","value":"BASICO"},{"label":"Intermediário","value":"INTERMEDIARIO"},{"label":"Premium","value":"PREMIUM"},{"label":"Ilimitado","value":"ILIMITADO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"motivoTroca","type":"MULTI_SELECT","inputSubtype":null,"label":"Motivo da troca","required":false,"defaultValue":null,"helpText":null,"options":[{"label":"Preço","value":"PRECO"},{"label":"Velocidade","value":"VELOCIDADE"},{"label":"Benefícios adicionais","value":"BENEFICIOS"},{"label":"Outro","value":"OUTRO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000004', 'Motivo de Cancelamento', 'Coleta do motivo de cancelamento/pendência', '[
  {"name":"motivoCancelamento","type":"SINGLE_SELECT","inputSubtype":null,"label":"Motivo","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Preço alto","value":"PRECO_ALTO"},{"label":"Mudança de operadora","value":"MUDANCA_OPERADORA"},{"label":"Insatisfação com o serviço","value":"INSATISFACAO"},{"label":"Mudança de endereço","value":"MUDANCA_ENDERECO"},{"label":"Outro","value":"OUTRO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"comentarioAdicional","type":"INPUT","inputSubtype":"TEXT","label":"Comentário adicional","required":false,"defaultValue":null,"helpText":"Opcional","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000005', 'Portabilidade Numérica', 'Dados para portar o número de outra operadora', '[
  {"name":"operadoraOrigem","type":"SINGLE_SELECT","inputSubtype":null,"label":"Operadora de origem","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Claro","value":"CLARO"},{"label":"Vivo","value":"VIVO"},{"label":"TIM","value":"TIM"},{"label":"Oi","value":"OI"},{"label":"Outra","value":"OUTRA"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"numeroPortar","type":"INPUT","inputSubtype":"TEXT","label":"Número a portar","required":true,"defaultValue":null,"helpText":"DDD + número","options":null,"minValue":null,"maxValue":null,"validationPattern":"^\\d{10,11}$","acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"dataPreferencial","type":"INPUT","inputSubtype":"DATE","label":"Data preferencial","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000006', 'Segunda Via de Fatura', 'Solicitação de segunda via', '[
  {"name":"mesReferencia","type":"INPUT","inputSubtype":"TEXT","label":"Mês de referência","required":true,"defaultValue":null,"helpText":"Formato MM/AAAA","options":null,"minValue":null,"maxValue":null,"validationPattern":"^\\d{2}/\\d{4}$","acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"formatoEnvio","type":"SINGLE_SELECT","inputSubtype":null,"label":"Formato de envio","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"E-mail","value":"EMAIL"},{"label":"SMS","value":"SMS"},{"label":"Correios","value":"CORREIOS"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000007', 'Suporte Técnico', 'Abertura de chamado técnico', '[
  {"name":"categoriaProblema","type":"SINGLE_SELECT","inputSubtype":null,"label":"Categoria do problema","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sem sinal","value":"SEM_SINAL"},{"label":"Lentidão na internet","value":"LENTIDAO"},{"label":"Queda de chamadas","value":"QUEDA_CHAMADAS"},{"label":"Problema na fatura","value":"PROBLEMA_FATURA"},{"label":"Outro","value":"OUTRO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"descricaoProblema","type":"INPUT","inputSubtype":"TEXT","label":"Descrição do problema","required":true,"defaultValue":null,"helpText":"Descreva o problema com o máximo de detalhes","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"anexoEvidencia","type":"FILE_UPLOAD","inputSubtype":null,"label":"Anexar evidência (opcional)","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":[".jpg",".png",".pdf"],"maxFileSizeBytes":5242880}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000008', 'Ativação de Linha', 'Dados para ativação de uma nova linha', '[
  {"name":"iccid","type":"INPUT","inputSubtype":"TEXT","label":"ICCID do chip","required":true,"defaultValue":null,"helpText":"Número impresso no chip","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"tipoChip","type":"SINGLE_SELECT","inputSubtype":null,"label":"Tipo de chip","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Físico","value":"FISICO"},{"label":"eSIM","value":"ESIM"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"dddPreferencial","type":"INPUT","inputSubtype":"NUMBER","label":"DDD preferencial","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":11,"maxValue":99,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-000000000009', 'Alteração Cadastral', 'Atualização de dados cadastrais', '[
  {"name":"camposAlterar","type":"MULTI_SELECT","inputSubtype":null,"label":"Campos a alterar","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Telefone","value":"TELEFONE"},{"label":"E-mail","value":"EMAIL"},{"label":"Endereço","value":"ENDERECO"},{"label":"Nome","value":"NOME"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"novoValor","type":"INPUT","inputSubtype":"TEXT","label":"Novo valor","required":true,"defaultValue":null,"helpText":"Novo valor para o(s) campo(s) selecionado(s)","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-00000000000a', 'Dados Empresariais', 'Dados da empresa para planos corporativos', '[
  {"name":"razaoSocial","type":"INPUT","inputSubtype":"TEXT","label":"Razão social","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"cnpj","type":"INPUT","inputSubtype":"TEXT","label":"CNPJ","required":true,"defaultValue":null,"helpText":"Somente números","options":null,"minValue":null,"maxValue":null,"validationPattern":"^\\d{14}$","acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"quantidadeLinhas","type":"INPUT","inputSubtype":"NUMBER","label":"Quantidade de linhas","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":1,"maxValue":10000,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-00000000000b', 'Reclamação de Cobrança', 'Contestação de valores cobrados', '[
  {"name":"valorContestado","type":"INPUT","inputSubtype":"NUMBER","label":"Valor contestado (R$)","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":0,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"motivoContestacao","type":"INPUT","inputSubtype":"TEXT","label":"Motivo da contestação","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"comprovante","type":"FILE_UPLOAD","inputSubtype":null,"label":"Comprovante (opcional)","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":[".pdf",".jpg",".png"],"maxFileSizeBytes":5242880}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-00000000000c', 'Confirmação Final', 'Tela de confirmação antes de concluir', '[
  {"name":"resumo","type":"TEXT","inputSubtype":null,"label":"Confira os dados informados antes de confirmar a solicitação.","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"confirmar","type":"SINGLE_SELECT","inputSubtype":null,"label":"Confirmar solicitação?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-00000000000d', 'Provisionamento IoT', 'Dados para provisionamento de dispositivos IoT', '[
  {"name":"quantidadeDispositivos","type":"INPUT","inputSubtype":"NUMBER","label":"Quantidade de dispositivos","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":1,"maxValue":5000,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"tipoDispositivo","type":"MULTI_SELECT","inputSubtype":null,"label":"Tipo de dispositivo","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sensor","value":"SENSOR"},{"label":"Rastreador","value":"RASTREADOR"},{"label":"Câmera","value":"CAMERA"},{"label":"Medidor de consumo","value":"MEDIDOR"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"planoDados","type":"SINGLE_SELECT","inputSubtype":null,"label":"Plano de dados","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"1GB","value":"1GB"},{"label":"5GB","value":"5GB"},{"label":"10GB","value":"10GB"},{"label":"Ilimitado","value":"ILIMITADO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now()),

('00000000-0000-4000-8000-00000000000e', 'Bloqueio de Linha', 'Bloqueio temporário ou definitivo da linha', '[
  {"name":"motivoBloqueio","type":"SINGLE_SELECT","inputSubtype":null,"label":"Motivo do bloqueio","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Perda","value":"PERDA"},{"label":"Roubo","value":"ROUBO"},{"label":"Uso indevido","value":"USO_INDEVIDO"},{"label":"Outro","value":"OUTRO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null},
  {"name":"telefoneContato","type":"INPUT","inputSubtype":"TEXT","label":"Telefone alternativo","required":true,"defaultValue":null,"helpText":"Para contato durante o bloqueio","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}
]'::jsonb, now(), now());

-- ============================================================================
-- Templates de fluxo (9 formatos: 2 básicos + 7 complexos, cobrindo USER_TASK,
-- SERVICE_TASK, RECEIVE_TASK, MESSAGE_START_EVENT, GATEWAY, conectores REST/KAFKA
-- e mapeamento de saída). Guardados numa tabela temporária e reaproveitados por
-- várias jornadas — os nomes de nó/variável só precisam ser únicos dentro de
-- cada fluxo (jornada), não entre jornadas diferentes.
-- ============================================================================
CREATE TEMP TABLE tmp_shape (shape_id int PRIMARY KEY, label text, nodes jsonb, connections jsonb) ON COMMIT DROP;

-- Shape 1 — básico: início -> tarefa de usuário -> fim
INSERT INTO tmp_shape VALUES (1, 'basico_1_etapa',
'[
  {"id":"Node_a_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_a_ut","type":"USER_TASK","name":"Coletar dados do cliente","description":"Formulário inicial de coleta de dados","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000001","connectorConfig":null},
  {"id":"Node_a_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":560,"positionY":300,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_a_1","sourceNodeId":"Node_a_start","targetNodeId":"Node_a_ut","condition":null,"isDefault":false},
  {"id":"Flow_a_2","sourceNodeId":"Node_a_ut","targetNodeId":"Node_a_end","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 2 — básico: início -> dados -> confirmação -> fim
INSERT INTO tmp_shape VALUES (2, 'basico_2_etapas',
'[
  {"id":"Node_b_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_b_ut1","type":"USER_TASK","name":"Coletar endereço","description":"Dados de endereço","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000002","connectorConfig":null},
  {"id":"Node_b_ut2","type":"USER_TASK","name":"Confirmar solicitação","description":"Revisão final antes de concluir","positionX":560,"positionY":300,"formId":"00000000-0000-4000-8000-00000000000c","connectorConfig":null},
  {"id":"Node_b_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":780,"positionY":300,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_b_1","sourceNodeId":"Node_b_start","targetNodeId":"Node_b_ut1","condition":null,"isDefault":false},
  {"id":"Flow_b_2","sourceNodeId":"Node_b_ut1","targetNodeId":"Node_b_ut2","condition":null,"isDefault":false},
  {"id":"Flow_b_3","sourceNodeId":"Node_b_ut2","targetNodeId":"Node_b_end","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 3 — complexo: validação de elegibilidade via REST + gateway de aprovação
INSERT INTO tmp_shape VALUES (3, 'aprovacao_rest_gateway',
'[
  {"id":"Node_c_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_c_ut","type":"USER_TASK","name":"Coletar dados da solicitação","description":"Dados cadastrais do cliente","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000009","connectorConfig":null},
  {"id":"Node_c_st","type":"SERVICE_TASK","name":"Validar elegibilidade","description":"Consulta o serviço de elegibilidade","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/elegibilidade","headers":{"Content-Type":"application/json"},"params":null,"body":{"origem":"admin-portal"},"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"},{"name":"protocolo","jsonPath":"$.protocolo","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_c_gw","type":"GATEWAY","name":"Decisão: elegível?","description":"Encaminha conforme o resultado da validação","positionX":780,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_c_uta","type":"USER_TASK","name":"Confirmar conclusão","description":"Confirmação final ao cliente","positionX":1000,"positionY":180,"formId":"00000000-0000-4000-8000-00000000000c","connectorConfig":null},
  {"id":"Node_c_enda","type":"END","name":"Fim (aprovado)","description":"Encerra o fluxo","positionX":1220,"positionY":180,"formId":null,"connectorConfig":null},
  {"id":"Node_c_utb","type":"USER_TASK","name":"Registrar pendência","description":"Coleta de motivo para análise manual","positionX":1000,"positionY":420,"formId":"00000000-0000-4000-8000-000000000004","connectorConfig":null},
  {"id":"Node_c_endb","type":"END","name":"Fim (pendente)","description":"Encerra o fluxo","positionX":1220,"positionY":420,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_c_1","sourceNodeId":"Node_c_start","targetNodeId":"Node_c_ut","condition":null,"isDefault":false},
  {"id":"Flow_c_2","sourceNodeId":"Node_c_ut","targetNodeId":"Node_c_st","condition":null,"isDefault":false},
  {"id":"Flow_c_3","sourceNodeId":"Node_c_st","targetNodeId":"Node_c_gw","condition":null,"isDefault":false},
  {"id":"Flow_c_4","sourceNodeId":"Node_c_gw","targetNodeId":"Node_c_uta","condition":"{{elegivel}} == true","isDefault":false},
  {"id":"Flow_c_5","sourceNodeId":"Node_c_gw","targetNodeId":"Node_c_utb","condition":null,"isDefault":true},
  {"id":"Flow_c_6","sourceNodeId":"Node_c_uta","targetNodeId":"Node_c_enda","condition":null,"isDefault":false},
  {"id":"Flow_c_7","sourceNodeId":"Node_c_utb","targetNodeId":"Node_c_endb","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 4 — complexo: consulta de prazo via REST + gateway + espera de confirmação via Kafka
INSERT INTO tmp_shape VALUES (4, 'portabilidade_receive_gateway',
'[
  {"id":"Node_d_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_d_ut","type":"USER_TASK","name":"Coletar dados de portabilidade","description":"Dados da linha a portar","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000005","connectorConfig":null},
  {"id":"Node_d_st","type":"SERVICE_TASK","name":"Consultar operadora de origem","description":"Consulta prazo estimado de portabilidade","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"https://api.telecom-datacenter.com.br/v1/portabilidade/consulta","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[{"name":"prazoDias","jsonPath":"$.prazoEstimadoDias","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_d_gw","type":"GATEWAY","name":"Decisão: portabilidade imediata?","description":"Encaminha conforme o prazo estimado","positionX":780,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_d_rt","type":"RECEIVE_TASK","name":"Aguardar confirmação da operadora","description":"Espera mensagem de confirmação imediata","positionX":1000,"positionY":180,"formId":null,"connectorConfig":{"connectorType":"KAFKA","config":{"topic":"telecom.portabilidade.confirmacao","operation":"CONSUME","headers":{},"payload":null,"outputMapping":[{"name":"statusConfirmacao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"Node_d_uta","type":"USER_TASK","name":"Confirmar portabilidade","description":"Confirmação final ao cliente","positionX":1220,"positionY":180,"formId":"00000000-0000-4000-8000-00000000000c","connectorConfig":null},
  {"id":"Node_d_enda","type":"END","name":"Fim (imediata)","description":"Encerra o fluxo","positionX":1440,"positionY":180,"formId":null,"connectorConfig":null},
  {"id":"Node_d_utb","type":"USER_TASK","name":"Informar prazo estendido","description":"Comunica prazo maior ao cliente","positionX":1000,"positionY":420,"formId":"00000000-0000-4000-8000-00000000000c","connectorConfig":null},
  {"id":"Node_d_endb","type":"END","name":"Fim (prazo estendido)","description":"Encerra o fluxo","positionX":1220,"positionY":420,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_d_1","sourceNodeId":"Node_d_start","targetNodeId":"Node_d_ut","condition":null,"isDefault":false},
  {"id":"Flow_d_2","sourceNodeId":"Node_d_ut","targetNodeId":"Node_d_st","condition":null,"isDefault":false},
  {"id":"Flow_d_3","sourceNodeId":"Node_d_st","targetNodeId":"Node_d_gw","condition":null,"isDefault":false},
  {"id":"Flow_d_4","sourceNodeId":"Node_d_gw","targetNodeId":"Node_d_rt","condition":"{{prazoDias}} < 3","isDefault":false},
  {"id":"Flow_d_5","sourceNodeId":"Node_d_gw","targetNodeId":"Node_d_utb","condition":null,"isDefault":true},
  {"id":"Flow_d_6","sourceNodeId":"Node_d_rt","targetNodeId":"Node_d_uta","condition":null,"isDefault":false},
  {"id":"Flow_d_7","sourceNodeId":"Node_d_uta","targetNodeId":"Node_d_enda","condition":null,"isDefault":false},
  {"id":"Flow_d_8","sourceNodeId":"Node_d_utb","targetNodeId":"Node_d_endb","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 5 — complexo: score de retenção via REST + gateway (retenção x cancelamento)
INSERT INTO tmp_shape VALUES (5, 'retencao_cancelamento_gateway',
'[
  {"id":"Node_e_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_e_ut","type":"USER_TASK","name":"Registrar motivo de cancelamento","description":"Coleta o motivo informado pelo cliente","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000004","connectorConfig":null},
  {"id":"Node_e_st1","type":"SERVICE_TASK","name":"Consultar score de retenção","description":"Calcula a propensão de retenção do cliente","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"https://api.telecom-datacenter.com.br/v1/retencao/score","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[{"name":"scoreRetencao","jsonPath":"$.score","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_e_gw","type":"GATEWAY","name":"Decisão: oferecer retenção?","description":"Encaminha conforme o score calculado","positionX":780,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_e_st2","type":"SERVICE_TASK","name":"Aplicar oferta de retenção","description":"Aplica desconto/benefício de retenção","positionX":1000,"positionY":180,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/retencao/oferta","headers":{"Content-Type":"application/json"},"params":null,"body":{"score":"{{scoreRetencao}}"},"outputMapping":[]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_e_enda","type":"END","name":"Fim (retido)","description":"Encerra o fluxo","positionX":1220,"positionY":180,"formId":null,"connectorConfig":null},
  {"id":"Node_e_st3","type":"SERVICE_TASK","name":"Processar cancelamento","description":"Efetiva o cancelamento do serviço","positionX":1000,"positionY":420,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/cancelamento","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_e_endb","type":"END","name":"Fim (cancelado)","description":"Encerra o fluxo","positionX":1220,"positionY":420,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_e_1","sourceNodeId":"Node_e_start","targetNodeId":"Node_e_ut","condition":null,"isDefault":false},
  {"id":"Flow_e_2","sourceNodeId":"Node_e_ut","targetNodeId":"Node_e_st1","condition":null,"isDefault":false},
  {"id":"Flow_e_3","sourceNodeId":"Node_e_st1","targetNodeId":"Node_e_gw","condition":null,"isDefault":false},
  {"id":"Flow_e_4","sourceNodeId":"Node_e_gw","targetNodeId":"Node_e_st2","condition":"{{scoreRetencao}} > 70","isDefault":false},
  {"id":"Flow_e_5","sourceNodeId":"Node_e_gw","targetNodeId":"Node_e_st3","condition":null,"isDefault":true},
  {"id":"Flow_e_6","sourceNodeId":"Node_e_st2","targetNodeId":"Node_e_enda","condition":null,"isDefault":false},
  {"id":"Flow_e_7","sourceNodeId":"Node_e_st3","targetNodeId":"Node_e_endb","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 6 — complexo: início por mensagem Kafka (abertura de chamado) + diagnóstico automático
INSERT INTO tmp_shape VALUES (6, 'suporte_tecnico_mensagem',
'[
  {"id":"Node_f_mse","type":"MESSAGE_START_EVENT","name":"Chamado aberto","description":"Inicia a partir da abertura de um chamado","positionX":120,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"KAFKA","config":{"topic":"telecom.suporte.chamados.abertura","operation":"CONSUME","headers":{},"payload":null,"outputMapping":[{"name":"ticketId","jsonPath":"$.ticketId","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"Node_f_rt","type":"RECEIVE_TASK","name":"Aguardar diagnóstico automático","description":"Espera o resultado do diagnóstico automatizado","positionX":340,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"KAFKA","config":{"topic":"telecom.suporte.diagnostico","operation":"CONSUME","headers":{},"payload":null,"outputMapping":[{"name":"diagnosticoAutomatico","jsonPath":"$.resultado","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"Node_f_ut","type":"USER_TASK","name":"Detalhar problema","description":"Coleta detalhes complementares do cliente","positionX":560,"positionY":300,"formId":"00000000-0000-4000-8000-000000000007","connectorConfig":null},
  {"id":"Node_f_st","type":"SERVICE_TASK","name":"Abrir chamado técnico","description":"Registra o chamado no sistema de field service","positionX":780,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/suporte/chamados","headers":{"Content-Type":"application/json"},"params":null,"body":{"ticketId":"{{ticketId}}","diagnostico":"{{diagnosticoAutomatico}}"},"outputMapping":[{"name":"numeroChamado","jsonPath":"$.numeroChamado","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_f_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":1000,"positionY":300,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_f_1","sourceNodeId":"Node_f_mse","targetNodeId":"Node_f_rt","condition":null,"isDefault":false},
  {"id":"Flow_f_2","sourceNodeId":"Node_f_rt","targetNodeId":"Node_f_ut","condition":null,"isDefault":false},
  {"id":"Flow_f_3","sourceNodeId":"Node_f_ut","targetNodeId":"Node_f_st","condition":null,"isDefault":false},
  {"id":"Flow_f_4","sourceNodeId":"Node_f_st","targetNodeId":"Node_f_end","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 7 — complexo: verificação de elegibilidade de upgrade via REST + gateway
INSERT INTO tmp_shape VALUES (7, 'upgrade_plano_gateway',
'[
  {"id":"Node_g_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_g_ut","type":"USER_TASK","name":"Selecionar novo plano","description":"Cliente escolhe o plano desejado","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000003","connectorConfig":null},
  {"id":"Node_g_st1","type":"SERVICE_TASK","name":"Verificar elegibilidade de upgrade","description":"Consulta se o cliente pode migrar de plano","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"https://api.telecom-datacenter.com.br/v1/planos/elegibilidade-upgrade","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_g_gw","type":"GATEWAY","name":"Decisão: elegível para upgrade?","description":"Encaminha conforme o resultado da verificação","positionX":780,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_g_st2","type":"SERVICE_TASK","name":"Aplicar troca de plano","description":"Efetiva a troca no sistema de billing","positionX":1000,"positionY":180,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/planos/trocar","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_g_enda","type":"END","name":"Fim (upgrade aplicado)","description":"Encerra o fluxo","positionX":1220,"positionY":180,"formId":null,"connectorConfig":null},
  {"id":"Node_g_utb","type":"USER_TASK","name":"Apresentar oferta alternativa","description":"Oferece outro plano compatível","positionX":1000,"positionY":420,"formId":"00000000-0000-4000-8000-000000000003","connectorConfig":null},
  {"id":"Node_g_endb","type":"END","name":"Fim (oferta alternativa)","description":"Encerra o fluxo","positionX":1220,"positionY":420,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_g_1","sourceNodeId":"Node_g_start","targetNodeId":"Node_g_ut","condition":null,"isDefault":false},
  {"id":"Flow_g_2","sourceNodeId":"Node_g_ut","targetNodeId":"Node_g_st1","condition":null,"isDefault":false},
  {"id":"Flow_g_3","sourceNodeId":"Node_g_st1","targetNodeId":"Node_g_gw","condition":null,"isDefault":false},
  {"id":"Flow_g_4","sourceNodeId":"Node_g_gw","targetNodeId":"Node_g_st2","condition":"{{elegivel}} == true","isDefault":false},
  {"id":"Flow_g_5","sourceNodeId":"Node_g_gw","targetNodeId":"Node_g_utb","condition":null,"isDefault":true},
  {"id":"Flow_g_6","sourceNodeId":"Node_g_st2","targetNodeId":"Node_g_enda","condition":null,"isDefault":false},
  {"id":"Flow_g_7","sourceNodeId":"Node_g_utb","targetNodeId":"Node_g_endb","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 8 — complexo linear: ativação de linha via REST + espera de confirmação de rede via Kafka
INSERT INTO tmp_shape VALUES (8, 'ativacao_linha_linear',
'[
  {"id":"Node_h_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_h_ut1","type":"USER_TASK","name":"Coletar dados da linha","description":"Dados do chip e DDD desejado","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-000000000008","connectorConfig":null},
  {"id":"Node_h_st","type":"SERVICE_TASK","name":"Ativar linha","description":"Envia comando de ativação ao HLR","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/linhas/ativar","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[{"name":"statusAtivacao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_h_rt","type":"RECEIVE_TASK","name":"Aguardar confirmação da rede","description":"Espera confirmação de propagação na rede","positionX":780,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"KAFKA","config":{"topic":"telecom.linha.confirmacao-rede","operation":"CONSUME","headers":{},"payload":null,"outputMapping":[{"name":"confirmacaoRede","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"Node_h_ut2","type":"USER_TASK","name":"Confirmar ativação","description":"Confirmação final ao cliente","positionX":1000,"positionY":300,"formId":"00000000-0000-4000-8000-00000000000c","connectorConfig":null},
  {"id":"Node_h_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":1220,"positionY":300,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_h_1","sourceNodeId":"Node_h_start","targetNodeId":"Node_h_ut1","condition":null,"isDefault":false},
  {"id":"Flow_h_2","sourceNodeId":"Node_h_ut1","targetNodeId":"Node_h_st","condition":null,"isDefault":false},
  {"id":"Flow_h_3","sourceNodeId":"Node_h_st","targetNodeId":"Node_h_rt","condition":null,"isDefault":false},
  {"id":"Flow_h_4","sourceNodeId":"Node_h_rt","targetNodeId":"Node_h_ut2","condition":null,"isDefault":false},
  {"id":"Flow_h_5","sourceNodeId":"Node_h_ut2","targetNodeId":"Node_h_end","condition":null,"isDefault":false}
]'::jsonb);

-- Shape 9 — complexo: provisionamento IoT via REST + gateway + notificação via Kafka (produce)
INSERT INTO tmp_shape VALUES (9, 'iot_provisionamento_gateway',
'[
  {"id":"Node_i_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_i_ut","type":"USER_TASK","name":"Coletar dados de provisionamento","description":"Quantidade e tipo de dispositivos IoT","positionX":340,"positionY":300,"formId":"00000000-0000-4000-8000-00000000000d","connectorConfig":null},
  {"id":"Node_i_st1","type":"SERVICE_TASK","name":"Provisionar dispositivos","description":"Provisiona os SIMs de máquina a máquina","positionX":560,"positionY":300,"formId":null,"connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"https://api.telecom-datacenter.com.br/v1/iot/provisionar","headers":{"Content-Type":"application/json"},"params":null,"body":null,"outputMapping":[{"name":"qtdProvisionada","jsonPath":"$.quantidadeProvisionada","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"Node_i_gw","type":"GATEWAY","name":"Decisão: provisionamento concluído?","description":"Encaminha conforme a quantidade provisionada","positionX":780,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_i_st2","type":"SERVICE_TASK","name":"Notificar provisionamento concluído","description":"Publica evento de conclusão para os sistemas downstream","positionX":1000,"positionY":180,"formId":null,"connectorConfig":{"connectorType":"KAFKA","config":{"topic":"telecom.iot.provisionamento.concluido","operation":"PRODUCE","headers":{},"payload":{"quantidade":"{{qtdProvisionada}}"}},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"Node_i_enda","type":"END","name":"Fim (concluído)","description":"Encerra o fluxo","positionX":1220,"positionY":180,"formId":null,"connectorConfig":null},
  {"id":"Node_i_utb","type":"USER_TASK","name":"Registrar falha de provisionamento","description":"Coleta informações para reprocessamento manual","positionX":1000,"positionY":420,"formId":"00000000-0000-4000-8000-000000000004","connectorConfig":null},
  {"id":"Node_i_endb","type":"END","name":"Fim (falha)","description":"Encerra o fluxo","positionX":1220,"positionY":420,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_i_1","sourceNodeId":"Node_i_start","targetNodeId":"Node_i_ut","condition":null,"isDefault":false},
  {"id":"Flow_i_2","sourceNodeId":"Node_i_ut","targetNodeId":"Node_i_st1","condition":null,"isDefault":false},
  {"id":"Flow_i_3","sourceNodeId":"Node_i_st1","targetNodeId":"Node_i_gw","condition":null,"isDefault":false},
  {"id":"Flow_i_4","sourceNodeId":"Node_i_gw","targetNodeId":"Node_i_st2","condition":"{{qtdProvisionada}} > 0","isDefault":false},
  {"id":"Flow_i_5","sourceNodeId":"Node_i_gw","targetNodeId":"Node_i_utb","condition":null,"isDefault":true},
  {"id":"Flow_i_6","sourceNodeId":"Node_i_st2","targetNodeId":"Node_i_enda","condition":null,"isDefault":false},
  {"id":"Flow_i_7","sourceNodeId":"Node_i_utb","targetNodeId":"Node_i_endb","condition":null,"isDefault":false}
]'::jsonb);

-- ============================================================================
-- Jornadas — 5 por canal (12 produtos x 2 canais x 5 = 120), alternando entre os
-- 9 templates acima, todas em DRAFT (publicar de verdade é um passo à parte, via
-- API, depois de rodar este script).
-- ============================================================================
DO $$
DECLARE
  rec RECORD;
  shape_rec RECORD;
  j INT;
  counter INT := 0;
  themes TEXT[] := ARRAY['Abertura de conta','Troca de plano','Cancelamento de serviço','Portabilidade numérica',
    'Segunda via de fatura','Contratação de plano','Recarga pré-paga','Alteração cadastral','Consulta de saldo',
    'Suporte técnico','Ativação de linha','Migração de plano','Solicitação de bônus','Desbloqueio de linha',
    'Troca de titularidade','Adesão a combo','Cancelamento de assinatura','Consulta de fatura','Alteração de endereço',
    'Reclamação de cobrança','Upgrade de velocidade','Contratação de roaming','Provisionamento de IoT',
    'Renovação de contrato','Troca de chip para eSIM','Suspensão temporária de linha','Reativação de linha',
    'Contratação de seguro de aparelho','Alteração de vencimento de fatura','Portabilidade empresarial'];
  v_journey_id uuid;
  v_flow_id text;
  v_name text;
  v_created timestamptz;
  v_nodes jsonb;
  v_connections jsonb;
BEGIN
  FOR rec IN
    SELECT c.channel_id, c.name AS channel_name, c.type AS channel_type, p.name AS product_name
    FROM channel c JOIN product p ON p.product_id = c.product_id
    ORDER BY p.name, c.type
  LOOP
    FOR j IN 1..5 LOOP
      counter := counter + 1;
      SELECT * INTO shape_rec FROM tmp_shape WHERE shape_id = 1 + (counter % 9);
      v_journey_id := gen_random_uuid();
      v_flow_id := 'Process_' || gen_random_uuid();
      v_name := themes[1 + (counter % array_length(themes, 1))] || ' — ' || rec.product_name;
      v_created := now() - (floor(random() * 90) || ' days')::interval;

      -- O motor de runtime deriva o nome da mensagem BPMN do id do nó MESSAGE_START_EVENT
      -- (Message_<id>) e rejeita reimplantar um processo com o mesmo nome de mensagem de
      -- outro já publicado — como o shape 6 é reaproveitado por várias jornadas, o id do
      -- nó precisa ser único por jornada, senão só a primeira publicação daquele shape vai
      -- para o motor com sucesso.
      IF shape_rec.shape_id = 6 THEN
        v_nodes := replace(shape_rec.nodes::text, '"Node_f_mse"', '"Node_f_mse_' || left(v_journey_id::text, 8) || '"')::jsonb;
        v_connections := replace(shape_rec.connections::text, '"Node_f_mse"', '"Node_f_mse_' || left(v_journey_id::text, 8) || '"')::jsonb;
      ELSE
        v_nodes := shape_rec.nodes;
        v_connections := shape_rec.connections;
      END IF;

      INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at)
      VALUES (v_journey_id, rec.channel_id, v_name,
              'Jornada gerada para simulação (' || shape_rec.label || ') — canal ' || rec.channel_name,
              'DRAFT', v_created, v_created);

      INSERT INTO flow (flow_id, journey_id, name, nodes, connections, created_at, updated_at)
      VALUES (v_flow_id, v_journey_id, 'Fluxo principal', v_nodes, v_connections, v_created, v_created);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Produto "Elastic Journey" (canal só Web) + jornada "Survey (Questionário) —
-- Elastic Journey": 15 telas sequenciais de pesquisa de satisfação, uma
-- pergunta por tela/formulário, sem gateway e sem conector — só
-- START -> USER_TASK x15 -> END.
-- ============================================================================
INSERT INTO product (product_id, name, description, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Elastic Journey', 'Marca institucional da plataforma, usada para pesquisas e comunicações internas.', 'ACTIVE', now(), now());

INSERT INTO channel (channel_id, product_id, name, type, status, description, created_at, updated_at)
SELECT gen_random_uuid(), p.product_id, 'Canal Web — Elastic Journey', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()
FROM product p WHERE p.name = 'Elastic Journey';

INSERT INTO form (form_id, name, description, fields, created_at, updated_at) VALUES
('00000000-0000-4000-9000-000000000001', 'Survey — Pergunta 01', 'Avaliação geral da experiência', '[{"name":"avaliacaoGeral","type":"SINGLE_SELECT","inputSubtype":null,"label":"Como você avalia sua experiência geral com a Elastic Journey?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Péssima","value":"PESSIMA"},{"label":"Ruim","value":"RUIM"},{"label":"Regular","value":"REGULAR"},{"label":"Boa","value":"BOA"},{"label":"Excelente","value":"EXCELENTE"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000002', 'Survey — Pergunta 02', 'Recomendação da marca', '[{"name":"recomendaria","type":"SINGLE_SELECT","inputSubtype":null,"label":"Você recomendaria a Elastic Journey para outras pessoas?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000003', 'Survey — Pergunta 03', 'O que mais gosta na marca', '[{"name":"gostaMais","type":"INPUT","inputSubtype":"TEXT","label":"O que você mais gosta na Elastic Journey?","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000004', 'Survey — Pergunta 04', 'Frequência de uso', '[{"name":"frequenciaUso","type":"SINGLE_SELECT","inputSubtype":null,"label":"Com que frequência você utiliza os serviços da Elastic Journey?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Diariamente","value":"DIARIAMENTE"},{"label":"Semanalmente","value":"SEMANALMENTE"},{"label":"Mensalmente","value":"MENSALMENTE"},{"label":"Raramente","value":"RARAMENTE"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000005', 'Survey — Pergunta 05', 'Problema técnico', '[{"name":"problemaTecnico","type":"SINGLE_SELECT","inputSubtype":null,"label":"Você já teve algum problema técnico ao usar nossos serviços?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000006', 'Survey — Pergunta 06', 'Resolução do problema', '[{"name":"problemaResolvido","type":"SINGLE_SELECT","inputSubtype":null,"label":"Se teve um problema, ele foi resolvido de forma satisfatória?","required":false,"defaultValue":null,"helpText":"Responda apenas se teve algum problema","options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"},{"label":"Não se aplica","value":"NAO_SE_APLICA"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000007', 'Survey — Pergunta 07', 'Canais utilizados', '[{"name":"canaisUtilizados","type":"MULTI_SELECT","inputSubtype":null,"label":"Quais canais de atendimento você já utilizou?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Site","value":"SITE"},{"label":"Aplicativo","value":"APP"},{"label":"WhatsApp","value":"WHATSAPP"},{"label":"Central telefônica","value":"CONTACT_CENTER"},{"label":"Loja física","value":"LOJA"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000008', 'Survey — Pergunta 08', 'Probabilidade de continuar cliente (NPS)', '[{"name":"probabilidadeContinuar","type":"INPUT","inputSubtype":"NUMBER","label":"Em uma escala de 0 a 10, qual a probabilidade de você continuar cliente da Elastic Journey?","required":true,"defaultValue":null,"helpText":null,"options":null,"minValue":0,"maxValue":10,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-000000000009', 'Survey — Pergunta 09', 'Sugestão de melhoria', '[{"name":"sugestaoMelhoria","type":"INPUT","inputSubtype":"TEXT","label":"O que poderíamos melhorar na sua experiência?","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000a', 'Survey — Pergunta 10', 'Percepção de preço', '[{"name":"precoJusto","type":"SINGLE_SELECT","inputSubtype":null,"label":"Você considera o preço dos nossos planos justo?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"},{"label":"Talvez","value":"TALVEZ"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000b', 'Survey — Pergunta 11', 'Qualidade do atendimento', '[{"name":"qualidadeAtendimento","type":"SINGLE_SELECT","inputSubtype":null,"label":"Como você avalia a qualidade do atendimento recebido?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Péssimo","value":"PESSIMO"},{"label":"Ruim","value":"RUIM"},{"label":"Regular","value":"REGULAR"},{"label":"Bom","value":"BOM"},{"label":"Excelente","value":"EXCELENTE"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000c', 'Survey — Pergunta 12', 'Dificuldade de navegação', '[{"name":"dificuldadeNavegacao","type":"SINGLE_SELECT","inputSubtype":null,"label":"Você teve dificuldade em navegar pelo site ou aplicativo?","required":true,"defaultValue":null,"helpText":null,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000d', 'Survey — Pergunta 13', 'Funcionalidades desejadas', '[{"name":"funcionalidadesDesejadas","type":"MULTI_SELECT","inputSubtype":null,"label":"Quais funcionalidades você gostaria de ver no futuro?","required":false,"defaultValue":null,"helpText":null,"options":[{"label":"Mais planos","value":"MAIS_PLANOS"},{"label":"Suporte 24h","value":"SUPORTE_24H"},{"label":"Chat ao vivo","value":"CHAT_AO_VIVO"},{"label":"Autoatendimento","value":"AUTOATENDIMENTO"},{"label":"Outro","value":"OUTRO"}],"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000e', 'Survey — Pergunta 14', 'Última interação', '[{"name":"ultimaInteracao","type":"INPUT","inputSubtype":"DATE","label":"Qual a data aproximada da sua última interação conosco?","required":false,"defaultValue":null,"helpText":null,"options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now()),
('00000000-0000-4000-9000-00000000000f', 'Survey — Pergunta 15', 'Comentário final', '[{"name":"comentarioFinal","type":"INPUT","inputSubtype":"TEXT","label":"Deixe um comentário final sobre sua experiência com a Elastic Journey.","required":false,"defaultValue":null,"helpText":"Opcional","options":null,"minValue":null,"maxValue":null,"validationPattern":null,"acceptedExtensions":null,"maxFileSizeBytes":null}]'::jsonb, now(), now());

WITH new_journey AS (
  INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at)
  SELECT gen_random_uuid(), c.channel_id, 'Survey (Questionário) — Elastic Journey',
         'Pesquisa de satisfação sequencial sobre a experiência com a marca Elastic Journey — 15 telas, sem gateway nem conector.',
         'DRAFT', now(), now()
  FROM channel c JOIN product p ON p.product_id = c.product_id
  WHERE p.name = 'Elastic Journey' AND c.type = 'WEB'
  RETURNING journey_id
)
INSERT INTO flow (flow_id, journey_id, name, nodes, connections, created_at, updated_at)
SELECT 'Process_' || gen_random_uuid(), journey_id, 'Fluxo principal',
'[
  {"id":"Node_survey_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300,"formId":null,"connectorConfig":null},
  {"id":"Node_survey_q1","type":"USER_TASK","name":"Pergunta 01","description":"Avaliação geral","positionX":300,"positionY":300,"formId":"00000000-0000-4000-9000-000000000001","connectorConfig":null},
  {"id":"Node_survey_q2","type":"USER_TASK","name":"Pergunta 02","description":"Recomendação","positionX":480,"positionY":300,"formId":"00000000-0000-4000-9000-000000000002","connectorConfig":null},
  {"id":"Node_survey_q3","type":"USER_TASK","name":"Pergunta 03","description":"O que mais gosta","positionX":660,"positionY":300,"formId":"00000000-0000-4000-9000-000000000003","connectorConfig":null},
  {"id":"Node_survey_q4","type":"USER_TASK","name":"Pergunta 04","description":"Frequência de uso","positionX":840,"positionY":300,"formId":"00000000-0000-4000-9000-000000000004","connectorConfig":null},
  {"id":"Node_survey_q5","type":"USER_TASK","name":"Pergunta 05","description":"Problema técnico","positionX":1020,"positionY":300,"formId":"00000000-0000-4000-9000-000000000005","connectorConfig":null},
  {"id":"Node_survey_q6","type":"USER_TASK","name":"Pergunta 06","description":"Resolução do problema","positionX":1200,"positionY":300,"formId":"00000000-0000-4000-9000-000000000006","connectorConfig":null},
  {"id":"Node_survey_q7","type":"USER_TASK","name":"Pergunta 07","description":"Canais utilizados","positionX":1380,"positionY":300,"formId":"00000000-0000-4000-9000-000000000007","connectorConfig":null},
  {"id":"Node_survey_q8","type":"USER_TASK","name":"Pergunta 08","description":"Probabilidade de continuar cliente","positionX":1560,"positionY":300,"formId":"00000000-0000-4000-9000-000000000008","connectorConfig":null},
  {"id":"Node_survey_q9","type":"USER_TASK","name":"Pergunta 09","description":"Sugestão de melhoria","positionX":1740,"positionY":300,"formId":"00000000-0000-4000-9000-000000000009","connectorConfig":null},
  {"id":"Node_survey_q10","type":"USER_TASK","name":"Pergunta 10","description":"Percepção de preço","positionX":1920,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000a","connectorConfig":null},
  {"id":"Node_survey_q11","type":"USER_TASK","name":"Pergunta 11","description":"Qualidade do atendimento","positionX":2100,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000b","connectorConfig":null},
  {"id":"Node_survey_q12","type":"USER_TASK","name":"Pergunta 12","description":"Dificuldade de navegação","positionX":2280,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000c","connectorConfig":null},
  {"id":"Node_survey_q13","type":"USER_TASK","name":"Pergunta 13","description":"Funcionalidades desejadas","positionX":2460,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000d","connectorConfig":null},
  {"id":"Node_survey_q14","type":"USER_TASK","name":"Pergunta 14","description":"Última interação","positionX":2640,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000e","connectorConfig":null},
  {"id":"Node_survey_q15","type":"USER_TASK","name":"Pergunta 15","description":"Comentário final","positionX":2820,"positionY":300,"formId":"00000000-0000-4000-9000-00000000000f","connectorConfig":null},
  {"id":"Node_survey_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":3000,"positionY":300,"formId":null,"connectorConfig":null}
]'::jsonb,
'[
  {"id":"Flow_survey_1","sourceNodeId":"Node_survey_start","targetNodeId":"Node_survey_q1","condition":null,"isDefault":false},
  {"id":"Flow_survey_2","sourceNodeId":"Node_survey_q1","targetNodeId":"Node_survey_q2","condition":null,"isDefault":false},
  {"id":"Flow_survey_3","sourceNodeId":"Node_survey_q2","targetNodeId":"Node_survey_q3","condition":null,"isDefault":false},
  {"id":"Flow_survey_4","sourceNodeId":"Node_survey_q3","targetNodeId":"Node_survey_q4","condition":null,"isDefault":false},
  {"id":"Flow_survey_5","sourceNodeId":"Node_survey_q4","targetNodeId":"Node_survey_q5","condition":null,"isDefault":false},
  {"id":"Flow_survey_6","sourceNodeId":"Node_survey_q5","targetNodeId":"Node_survey_q6","condition":null,"isDefault":false},
  {"id":"Flow_survey_7","sourceNodeId":"Node_survey_q6","targetNodeId":"Node_survey_q7","condition":null,"isDefault":false},
  {"id":"Flow_survey_8","sourceNodeId":"Node_survey_q7","targetNodeId":"Node_survey_q8","condition":null,"isDefault":false},
  {"id":"Flow_survey_9","sourceNodeId":"Node_survey_q8","targetNodeId":"Node_survey_q9","condition":null,"isDefault":false},
  {"id":"Flow_survey_10","sourceNodeId":"Node_survey_q9","targetNodeId":"Node_survey_q10","condition":null,"isDefault":false},
  {"id":"Flow_survey_11","sourceNodeId":"Node_survey_q10","targetNodeId":"Node_survey_q11","condition":null,"isDefault":false},
  {"id":"Flow_survey_12","sourceNodeId":"Node_survey_q11","targetNodeId":"Node_survey_q12","condition":null,"isDefault":false},
  {"id":"Flow_survey_13","sourceNodeId":"Node_survey_q12","targetNodeId":"Node_survey_q13","condition":null,"isDefault":false},
  {"id":"Flow_survey_14","sourceNodeId":"Node_survey_q13","targetNodeId":"Node_survey_q14","condition":null,"isDefault":false},
  {"id":"Flow_survey_15","sourceNodeId":"Node_survey_q14","targetNodeId":"Node_survey_q15","condition":null,"isDefault":false},
  {"id":"Flow_survey_16","sourceNodeId":"Node_survey_q15","targetNodeId":"Node_survey_end","condition":null,"isDefault":false}
]'::jsonb,
now(), now()
FROM new_journey;

COMMIT;
