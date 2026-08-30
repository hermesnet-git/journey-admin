-- Massa de dados de uma grande operadora de Telecom fictícia: 20 jornadas
-- curadas à mão (não geradas em massa por laço procedural, ao contrário da
-- versão anterior deste arquivo), cobrindo canais WEB e MOBILE, em três
-- níveis de complexidade:
--   - 6 básicas   (1-2 telas, sem conector nenhum)
--   - 8 médias    (tela(s) + 1 conector REST + 1 gateway de decisão)
--   - 6 altas     (REST + Kafka — produce e/ou consume — múltiplos gateways,
--                  e para uma delas início por mensagem/MESSAGE_START_EVENT)
--
-- Mudança de arquitetura em relação à versão anterior deste script: a User
-- Task NÃO referencia mais um Form do catálogo por `formId` (essa associação
-- foi removida do domínio em 2026-08-24). A tela agora vem embutida direto no
-- nó do fluxo, no campo `embeddedScreen` (array de FormField). Por isso este
-- script não cria nenhuma linha na tabela `form` — não há necessidade, a tela
-- de cada User Task já nasce pronta dentro de `flow.nodes`.
--
-- Conectores Kafka: só DOIS tópicos no total, reaproveitados entre as
-- jornadas de alta complexidade — `atendimento.confirmacao.externa`
-- (CONSUME) e `atendimento.notificacao.concluida` (PRODUCE). Não existe
-- broker Kafka dentro deste repo: para essas jornadas executarem de verdade
-- fim-a-fim, é preciso um broker acessível em localhost:9092 rodando por
-- fora (ex.: a distribuição em D:\her\desenv\kafka\kafka_2.13-4.3.1) com
-- auto-create de tópico habilitado — sem isso, a jornada ainda publica e
-- roda normalmente até o passo que depende do Kafka, só esse passo específico
-- não vai concluir.
--
-- Conectores REST: apontam para os 10 endpoints reais do ms-mock-api-rest
-- (porta 8084) — outputMapping usa os nomes de campo reais que cada endpoint
-- devolve (não são só ilustrativos, funcionam de verdade contra o mock).
--
-- O que este script NÃO faz: não publica nenhuma jornada (não insere em
-- journey_version/journey_publication) — todas nascem em DRAFT. Publicar de
-- verdade (pra gerar as versões/publicações corretas, incluindo o
-- embeddedScreenSdui compilado, e implantar o BPMN no motor de runtime via
-- ms-transform-publication) é feito depois, chamando a API real
-- (POST /api/v1/journeys/{id}/publish) para cada jornada — é isso que
-- popular_massa_dados.ps1/.sh já fazem automaticamente após rodar este
-- arquivo.
--
-- Como rodar: script SQL avulso (BEGIN/COMMIT, sem bloco anônimo/DO $$, sem
-- tabela temporária — todas as 20 jornadas são INSERTs estáticos, direto).
-- Executar o arquivo inteiro de uma vez numa ferramenta cliente de
-- PostgreSQL (DBeaver, DataGrip, pgAdmin, psql etc.) conectada ao banco
-- journey_admin. Via linha de comando: psql -h <host> -U <usuario> -d
-- journey_admin -f massa_de_dados_journeys.sql
BEGIN;

TRUNCATE TABLE journey_publication, journey_version, flow, journey, channel, product, form, audit_event;

-- ============================================================================
-- Produtos e canais — um produto + um canal por jornada (20 no total), sem
-- reaproveitar produto entre jornadas diferentes, pra manter o catálogo
-- variado e cada INSERT de jornada/flow autocontido e fácil de seguir.
-- ============================================================================
INSERT INTO product (product_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-8000-000000000001', 'Internet Móvel 5G', 'Plano de dados móveis com cobertura 5G nas capitais.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000002', 'Assistente Virtual Smart', 'Assistente virtual por voz/chat integrado à conta do cliente.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000003', 'Plano Pós-pago Família', 'Plano pós-pago com compartilhamento de franquia entre até 5 linhas.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000004', 'Pacote de SMS Extra', 'Pacote avulso de mensagens SMS adicionais.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000005', 'Telefonia Fixa Residencial', 'Linha fixa residencial com pacotes de ligações.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000006', 'Plano Estudante Digital', 'Plano móvel com desconto para estudantes matriculados.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000007', 'Portfólio de Planos Pós-pago', 'Linha completa de planos pós-pago para troca/upgrade.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000008', 'Roaming Internacional', 'Pacotes de dados e ligações para uso fora do país.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000009', 'Linha Pré-paga Turbo', 'Pré-pago com recargas de dados de alta velocidade.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000a', 'Franquia de Dados Extra', 'Pacotes adicionais de dados móveis sob demanda.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000b', 'TV por Assinatura Premium', 'Pacotes de canais por assinatura com streaming incluso.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000c', 'Faturamento e Cobrança', 'Serviços de consulta e contestação de valores cobrados.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000d', 'Combo Fibra + Móvel', 'Pacote combinado de internet fibra e plano móvel com desconto.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000e', 'Internet Fibra Residencial', 'Banda larga via fibra óptica para residências.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-00000000000f', 'Portabilidade Numérica Nacional', 'Portabilidade de número de outra operadora.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000010', 'Ativação eSIM Corporativo', 'Ativação de linhas corporativas via eSIM.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000011', 'IoT Corporativo Frotas', 'Conectividade M2M/IoT para frotas e sensores corporativos.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000012', 'Central de Suporte Técnico', 'Abertura e diagnóstico automatizado de chamados técnicos.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000013', 'Plano Empresarial Corporate', 'Linhas corporativas com gestão centralizada para empresas.', 'ACTIVE', now(), now()),
('20000000-0000-4000-8000-000000000014', 'Segurança de Linha', 'Bloqueio e reativação de linha por perda/roubo.', 'ACTIVE', now(), now());

INSERT INTO channel (channel_id, product_id, name, type, status, description, created_at, updated_at) VALUES
('20000000-0000-4000-9000-000000000001', '20000000-0000-4000-8000-000000000001', 'Canal Web — Internet Móvel 5G', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000002', '20000000-0000-4000-8000-000000000002', 'Canal App — Assistente Virtual Smart', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000003', '20000000-0000-4000-8000-000000000003', 'Canal Web — Plano Pós-pago Família', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000004', '20000000-0000-4000-8000-000000000004', 'Canal App — Pacote de SMS Extra', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000005', '20000000-0000-4000-8000-000000000005', 'Canal Web — Telefonia Fixa Residencial', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000006', '20000000-0000-4000-8000-000000000006', 'Canal App — Plano Estudante Digital', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000007', '20000000-0000-4000-8000-000000000007', 'Canal Web — Portfólio de Planos Pós-pago', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000008', '20000000-0000-4000-8000-000000000008', 'Canal App — Roaming Internacional', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000009', '20000000-0000-4000-8000-000000000009', 'Canal Web — Linha Pré-paga Turbo', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-00000000000a', '20000000-0000-4000-8000-00000000000a', 'Canal App — Franquia de Dados Extra', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-00000000000b', '20000000-0000-4000-8000-00000000000b', 'Canal Web — TV por Assinatura Premium', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-00000000000c', '20000000-0000-4000-8000-00000000000c', 'Canal App — Faturamento e Cobrança', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-00000000000d', '20000000-0000-4000-8000-00000000000d', 'Canal Web — Combo Fibra + Móvel', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-00000000000e', '20000000-0000-4000-8000-00000000000e', 'Canal App — Internet Fibra Residencial', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-00000000000f', '20000000-0000-4000-8000-00000000000f', 'Canal Web — Portabilidade Numérica Nacional', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000010', '20000000-0000-4000-8000-000000000010', 'Canal App — Ativação eSIM Corporativo', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000011', '20000000-0000-4000-8000-000000000011', 'Canal Web — IoT Corporativo Frotas', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000012', '20000000-0000-4000-8000-000000000012', 'Canal App — Central de Suporte Técnico', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now()),
('20000000-0000-4000-9000-000000000013', '20000000-0000-4000-8000-000000000013', 'Canal Web — Plano Empresarial Corporate', 'WEB', 'ACTIVE', 'Atendimento via site institucional', now(), now()),
('20000000-0000-4000-9000-000000000014', '20000000-0000-4000-8000-000000000014', 'Canal App — Segurança de Linha', 'MOBILE', 'ACTIVE', 'Atendimento via aplicativo mobile', now(), now());

-- ============================================================================
-- Jornadas — 20 no total (6 básicas, 8 médias, 6 altas), todas DRAFT.
-- Cada uma tem exatamente 1 flow associado (flow_id/journey_id 1:1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BÁSICAS (6) — só USER_TASK(s) em sequência, sem conector nenhum.
-- ----------------------------------------------------------------------------

-- J01 — WEB — Consulta de Saldo de Dados (1 tela)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000001', '20000000-0000-4000-9000-000000000001', 'Consulta de Saldo de Dados', 'Jornada básica: consulta rápida de saldo de franquia de dados.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J01', '20000000-0000-4000-a000-000000000001', 'Fluxo principal',
'[
  {"id":"N01_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N01_ut","type":"USER_TASK","name":"Consultar saldo","description":"Tela única de consulta","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Consulta de Saldo de Dados","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"linhaConsulta","type":"INPUT","inputSubtype":"TEXT","label":"Número da linha (DDD + número)","required":true,"validationPattern":"^\\d{10,11}$","positionX":40,"positionY":112,"width":320},
     {"name":"canalPreferido","type":"SINGLE_SELECT","label":"Como prefere receber o resultado?","required":true,"options":[{"label":"Na tela","value":"TELA"},{"label":"SMS","value":"SMS"}],"positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N01_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":560,"positionY":300}
]'::jsonb,
'[
  {"id":"F01_1","sourceNodeId":"N01_start","targetNodeId":"N01_ut"},
  {"id":"F01_2","sourceNodeId":"N01_ut","targetNodeId":"N01_end"}
]'::jsonb);

-- J02 — MOBILE — Ativação do Assistente Virtual (1 tela)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000002', '20000000-0000-4000-9000-000000000002', 'Ativação do Assistente Virtual', 'Jornada básica: ativação do assistente virtual por voz/chat.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J02', '20000000-0000-4000-a000-000000000002', 'Fluxo principal',
'[
  {"id":"N02_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N02_ut","type":"USER_TASK","name":"Ativar assistente","description":"Tela única de ativação","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Ativar Assistente Virtual","required":false},
     {"name":"aceitaTermos","type":"SWITCH","label":"Aceito os termos de uso do assistente virtual","required":true},
     {"name":"vozPreferida","type":"SINGLE_SELECT","label":"Voz preferida","required":false,"options":[{"label":"Feminina","value":"FEMININA"},{"label":"Masculina","value":"MASCULINA"},{"label":"Neutra","value":"NEUTRA"}]}
   ]},
  {"id":"N02_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":560,"positionY":300}
]'::jsonb,
'[
  {"id":"F02_1","sourceNodeId":"N02_start","targetNodeId":"N02_ut"},
  {"id":"F02_2","sourceNodeId":"N02_ut","targetNodeId":"N02_end"}
]'::jsonb);

-- J03 — WEB — Atualização de Dados Cadastrais (2 telas)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000003', '20000000-0000-4000-9000-000000000003', 'Atualização de Dados Cadastrais', 'Jornada básica: atualização de dados cadastrais do cliente.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J03', '20000000-0000-4000-a000-000000000003', 'Fluxo principal',
'[
  {"id":"N03_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N03_ut1","type":"USER_TASK","name":"Selecionar campos","description":"Escolha do que atualizar","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Alteração Cadastral","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"camposAlterar","type":"MULTI_SELECT","label":"Campos a alterar","required":true,"options":[{"label":"Telefone","value":"TELEFONE"},{"label":"E-mail","value":"EMAIL"},{"label":"Endereço","value":"ENDERECO"},{"label":"Nome","value":"NOME"}],"positionX":40,"positionY":112,"width":320},
     {"name":"novoValor","type":"INPUT","inputSubtype":"TEXT","label":"Novo valor","required":true,"helpText":"Novo valor para o(s) campo(s) selecionado(s)","positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N03_ut2","type":"USER_TASK","name":"Confirmar alteração","description":"Revisão final antes de concluir","positionX":560,"positionY":300,
   "embeddedScreen":[
     {"name":"resumo","type":"TEXT","label":"Confira os dados informados antes de confirmar a alteração.","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"confirmar","type":"SINGLE_SELECT","label":"Confirmar alteração cadastral?","required":true,"options":[{"label":"Sim","value":"SIM"},{"label":"Não","value":"NAO"}],"positionX":40,"positionY":112,"width":320}
   ]},
  {"id":"N03_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":780,"positionY":300}
]'::jsonb,
'[
  {"id":"F03_1","sourceNodeId":"N03_start","targetNodeId":"N03_ut1"},
  {"id":"F03_2","sourceNodeId":"N03_ut1","targetNodeId":"N03_ut2"},
  {"id":"F03_3","sourceNodeId":"N03_ut2","targetNodeId":"N03_end"}
]'::jsonb);

-- J04 — MOBILE — Contratação de Pacote de SMS (2 telas)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000004', '20000000-0000-4000-9000-000000000004', 'Contratação de Pacote de SMS', 'Jornada básica: contratação de pacote avulso de SMS.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J04', '20000000-0000-4000-a000-000000000004', 'Fluxo principal',
'[
  {"id":"N04_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N04_ut1","type":"USER_TASK","name":"Escolher pacote","description":"Seleção do pacote de SMS","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Pacote de SMS Extra","required":false},
     {"name":"pacote","type":"RADIO","label":"Escolha o pacote","required":true,"options":[{"label":"100 SMS","value":"SMS_100"},{"label":"500 SMS","value":"SMS_500"},{"label":"Ilimitado","value":"SMS_ILIMITADO"}]},
     {"name":"vigencia","type":"SINGLE_SELECT","label":"Vigência","required":true,"options":[{"label":"7 dias","value":"7D"},{"label":"30 dias","value":"30D"}]}
   ]},
  {"id":"N04_ut2","type":"USER_TASK","name":"Confirmar contratação","description":"Confirmação final","positionX":560,"positionY":300,
   "embeddedScreen":[
     {"name":"resumo","type":"TEXT","label":"Confirme a contratação do pacote escolhido.","required":false},
     {"name":"confirmar","type":"SWITCH","label":"Confirmo a contratação","required":true}
   ]},
  {"id":"N04_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":780,"positionY":300}
]'::jsonb,
'[
  {"id":"F04_1","sourceNodeId":"N04_start","targetNodeId":"N04_ut1"},
  {"id":"F04_2","sourceNodeId":"N04_ut1","targetNodeId":"N04_ut2"},
  {"id":"F04_3","sourceNodeId":"N04_ut2","targetNodeId":"N04_end"}
]'::jsonb);

-- J05 — WEB — Emissão de Boleto Avulso (1 tela)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000005', '20000000-0000-4000-9000-000000000005', 'Emissão de Boleto Avulso', 'Jornada básica: emissão de segunda via/boleto avulso.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J05', '20000000-0000-4000-a000-000000000005', 'Fluxo principal',
'[
  {"id":"N05_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N05_ut","type":"USER_TASK","name":"Emitir boleto","description":"Tela única de emissão","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Emissão de Boleto Avulso","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"mesReferencia","type":"INPUT","inputSubtype":"TEXT","label":"Mês de referência","required":true,"helpText":"Formato MM/AAAA","validationPattern":"^\\d{2}/\\d{4}$","positionX":40,"positionY":112,"width":320},
     {"name":"formatoEnvio","type":"SINGLE_SELECT","label":"Formato de envio","required":true,"options":[{"label":"E-mail","value":"EMAIL"},{"label":"SMS","value":"SMS"},{"label":"Correios","value":"CORREIOS"}],"positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N05_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":560,"positionY":300}
]'::jsonb,
'[
  {"id":"F05_1","sourceNodeId":"N05_start","targetNodeId":"N05_ut"},
  {"id":"F05_2","sourceNodeId":"N05_ut","targetNodeId":"N05_end"}
]'::jsonb);

-- J06 — MOBILE — Modo Economia de Dados (1 tela)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000006', '20000000-0000-4000-9000-000000000006', 'Ativação do Modo Economia de Dados', 'Jornada básica: ativação do modo de economia de franquia de dados.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J06', '20000000-0000-4000-a000-000000000006', 'Fluxo principal',
'[
  {"id":"N06_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N06_ut","type":"USER_TASK","name":"Ativar modo economia","description":"Tela única de ativação","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Modo Economia de Dados","required":false},
     {"name":"descricao","type":"TEXT","label":"Reduz o consumo de dados em segundo plano dos aplicativos.","required":false},
     {"name":"ativar","type":"SWITCH","label":"Ativar modo economia de dados","required":true},
     {"name":"limiteAlerta","type":"SLIDER","label":"Alertar ao atingir (% da franquia)","required":false,"config":{"min":50,"max":100,"step":5}}
   ]},
  {"id":"N06_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":560,"positionY":300}
]'::jsonb,
'[
  {"id":"F06_1","sourceNodeId":"N06_start","targetNodeId":"N06_ut"},
  {"id":"F06_2","sourceNodeId":"N06_ut","targetNodeId":"N06_end"}
]'::jsonb);

-- ----------------------------------------------------------------------------
-- MÉDIAS (8) — USER_TASK(s) + 1 SERVICE_TASK (REST) + 1 GATEWAY de decisão.
-- ----------------------------------------------------------------------------

-- J07 — WEB — Troca de Plano (REST /v1/elegibilidade)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000007', '20000000-0000-4000-9000-000000000007', 'Troca de Plano', 'Jornada média: troca de plano com verificação de elegibilidade via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J07', '20000000-0000-4000-a000-000000000007', 'Fluxo principal',
'[
  {"id":"N07_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N07_ut","type":"USER_TASK","name":"Selecionar novo plano","description":"Cliente escolhe o plano desejado","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Troca de Plano","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"novoPlano","type":"SINGLE_SELECT","label":"Novo plano","required":true,"options":[{"label":"Básico","value":"BASICO"},{"label":"Intermediário","value":"INTERMEDIARIO"},{"label":"Premium","value":"PREMIUM"}],"positionX":40,"positionY":112,"width":320},
     {"name":"motivoTroca","type":"MULTI_SELECT","label":"Motivo da troca","required":false,"options":[{"label":"Preço","value":"PRECO"},{"label":"Velocidade","value":"VELOCIDADE"},{"label":"Benefícios adicionais","value":"BENEFICIOS"}],"positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N07_st","type":"SERVICE_TASK","name":"Validar elegibilidade","description":"Consulta o serviço de elegibilidade","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/elegibilidade","headers":{"Content-Type":"application/json"},"body":{"origem":"admin-portal"},"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"},{"name":"protocolo","jsonPath":"$.protocolo","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N07_gw","type":"GATEWAY","name":"Decisão: elegível?","description":"Encaminha conforme o resultado","positionX":780,"positionY":300},
  {"id":"N07_uta","type":"USER_TASK","name":"Confirmar troca","description":"Confirmação final ao cliente","positionX":1000,"positionY":180,
   "embeddedScreen":[
     {"name":"resumo","type":"CALLOUT","label":"Plano alterado com sucesso.","required":false,"config":{"variant":"sucesso","description":"Protocolo: {{protocolo}}"}}
   ]},
  {"id":"N07_enda","type":"END","name":"Fim (aprovado)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N07_utb","type":"USER_TASK","name":"Registrar pendência","description":"Coleta de motivo para análise manual","positionX":1000,"positionY":420,
   "embeddedScreen":[
     {"name":"motivoPendencia","type":"SINGLE_SELECT","label":"Motivo da pendência","required":true,"options":[{"label":"Score insuficiente","value":"SCORE"},{"label":"Documentação","value":"DOCUMENTACAO"},{"label":"Outro","value":"OUTRO"}]},
     {"name":"comentario","type":"INPUT","inputSubtype":"TEXT","label":"Comentário adicional","required":false}
   ]},
  {"id":"N07_endb","type":"END","name":"Fim (pendente)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F07_1","sourceNodeId":"N07_start","targetNodeId":"N07_ut"},
  {"id":"F07_2","sourceNodeId":"N07_ut","targetNodeId":"N07_st"},
  {"id":"F07_3","sourceNodeId":"N07_st","targetNodeId":"N07_gw"},
  {"id":"F07_4","sourceNodeId":"N07_gw","targetNodeId":"N07_uta","condition":"{{elegivel}} == true"},
  {"id":"F07_5","sourceNodeId":"N07_gw","targetNodeId":"N07_utb","isDefault":true},
  {"id":"F07_6","sourceNodeId":"N07_uta","targetNodeId":"N07_enda"},
  {"id":"F07_7","sourceNodeId":"N07_utb","targetNodeId":"N07_endb"}
]'::jsonb);

-- J08 — MOBILE — Contratação de Roaming Internacional (REST /v1/planos/elegibilidade-upgrade)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000008', '20000000-0000-4000-9000-000000000008', 'Contratação de Roaming Internacional', 'Jornada média: contratação de pacote de roaming com verificação de cobertura via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J08', '20000000-0000-4000-a000-000000000008', 'Fluxo principal',
'[
  {"id":"N08_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N08_ut","type":"USER_TASK","name":"Escolher destino","description":"Dados da viagem","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Roaming Internacional","required":false},
     {"name":"paisDestino","type":"AUTOCOMPLETE","label":"País de destino","required":true,"options":[{"label":"Estados Unidos","value":"US"},{"label":"Portugal","value":"PT"},{"label":"Argentina","value":"AR"},{"label":"Japão","value":"JP"}]},
     {"name":"dataViagem","type":"INPUT","inputSubtype":"DATE","label":"Data da viagem","required":true}
   ]},
  {"id":"N08_st","type":"SERVICE_TASK","name":"Verificar cobertura","description":"Consulta se há cobertura de roaming no destino","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/planos/elegibilidade-upgrade","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N08_gw","type":"GATEWAY","name":"Decisão: há cobertura?","description":"Encaminha conforme a cobertura","positionX":780,"positionY":300},
  {"id":"N08_uta","type":"USER_TASK","name":"Confirmar pacote","description":"Confirmação final ao cliente","positionX":1000,"positionY":180,
   "embeddedScreen":[{"name":"confirmar","type":"SWITCH","label":"Confirmo a contratação do pacote de roaming","required":true}]},
  {"id":"N08_enda","type":"END","name":"Fim (contratado)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N08_utb","type":"USER_TASK","name":"Sugerir alternativa","description":"Oferece Wi-Fi Calling ou chip local","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"alternativa","type":"SINGLE_SELECT","label":"Alternativa desejada","required":true,"options":[{"label":"Wi-Fi Calling","value":"WIFI_CALLING"},{"label":"Chip local","value":"CHIP_LOCAL"}]}]},
  {"id":"N08_endb","type":"END","name":"Fim (sem cobertura)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F08_1","sourceNodeId":"N08_start","targetNodeId":"N08_ut"},
  {"id":"F08_2","sourceNodeId":"N08_ut","targetNodeId":"N08_st"},
  {"id":"F08_3","sourceNodeId":"N08_st","targetNodeId":"N08_gw"},
  {"id":"F08_4","sourceNodeId":"N08_gw","targetNodeId":"N08_uta","condition":"{{elegivel}} == true"},
  {"id":"F08_5","sourceNodeId":"N08_gw","targetNodeId":"N08_utb","isDefault":true},
  {"id":"F08_6","sourceNodeId":"N08_uta","targetNodeId":"N08_enda"},
  {"id":"F08_7","sourceNodeId":"N08_utb","targetNodeId":"N08_endb"}
]'::jsonb);

-- J09 — WEB — Segunda Via de Chip (REST /v1/bilhetes-defeito)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000009', '20000000-0000-4000-9000-000000000009', 'Segunda Via de Chip', 'Jornada média: solicitação de segunda via de chip com consulta de estoque via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J09', '20000000-0000-4000-a000-000000000009', 'Fluxo principal',
'[
  {"id":"N09_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N09_ut","type":"USER_TASK","name":"Coletar dados da linha","description":"Dados da linha atual","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Segunda Via de Chip","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"numeroLinha","type":"INPUT","inputSubtype":"TEXT","label":"Número da linha","required":true,"validationPattern":"^\\d{10,11}$","positionX":40,"positionY":112,"width":320},
     {"name":"tipoChip","type":"RADIO","label":"Tipo de chip","required":true,"options":[{"label":"Físico","value":"FISICO"},{"label":"eSIM","value":"ESIM"}],"positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N09_st","type":"SERVICE_TASK","name":"Consultar disponibilidade","description":"Verifica estoque de chip disponível","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/bilhetes-defeito","outputMapping":[{"name":"disponivel","jsonPath":"$.value","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N09_gw","type":"GATEWAY","name":"Decisão: chip disponível?","description":"Encaminha conforme a disponibilidade","positionX":780,"positionY":300},
  {"id":"N09_uta","type":"USER_TASK","name":"Informar endereço de entrega","description":"Endereço para envio do chip","positionX":1000,"positionY":180,
   "embeddedScreen":[
     {"name":"cep","type":"INPUT","inputSubtype":"TEXT","label":"CEP","required":true,"validationPattern":"^\\d{5}-?\\d{3}$"},
     {"name":"logradouro","type":"INPUT","inputSubtype":"TEXT","label":"Logradouro","required":true}
   ]},
  {"id":"N09_enda","type":"END","name":"Fim (a caminho)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N09_utb","type":"USER_TASK","name":"Agendar retirada em loja","description":"Sem estoque para envio — agenda retirada","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"lojaPreferida","type":"SINGLE_SELECT","label":"Loja mais próxima","required":true,"options":[{"label":"Loja Centro","value":"CENTRO"},{"label":"Loja Shopping","value":"SHOPPING"}]}]},
  {"id":"N09_endb","type":"END","name":"Fim (retirada agendada)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F09_1","sourceNodeId":"N09_start","targetNodeId":"N09_ut"},
  {"id":"F09_2","sourceNodeId":"N09_ut","targetNodeId":"N09_st"},
  {"id":"F09_3","sourceNodeId":"N09_st","targetNodeId":"N09_gw"},
  {"id":"F09_4","sourceNodeId":"N09_gw","targetNodeId":"N09_uta","condition":"{{disponivel}} == true"},
  {"id":"F09_5","sourceNodeId":"N09_gw","targetNodeId":"N09_utb","isDefault":true},
  {"id":"F09_6","sourceNodeId":"N09_uta","targetNodeId":"N09_enda"},
  {"id":"F09_7","sourceNodeId":"N09_utb","targetNodeId":"N09_endb"}
]'::jsonb);

-- J10 — MOBILE — Aumento de Franquia de Dados (REST /v1/pendencias-financeiras)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000010', '20000000-0000-4000-9000-00000000000a', 'Aumento de Franquia de Dados', 'Jornada média: contratação de franquia extra com verificação de pendência financeira.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J10', '20000000-0000-4000-a000-000000000010', 'Fluxo principal',
'[
  {"id":"N10_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N10_ut","type":"USER_TASK","name":"Escolher franquia extra","description":"Seleção do pacote adicional","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Franquia de Dados Extra","required":false},
     {"name":"pacoteExtra","type":"SINGLE_SELECT","label":"Pacote adicional","required":true,"options":[{"label":"1GB","value":"1GB"},{"label":"5GB","value":"5GB"},{"label":"10GB","value":"10GB"}]}
   ]},
  {"id":"N10_st","type":"SERVICE_TASK","name":"Verificar pendências","description":"Consulta pendência financeira do cliente","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/pendencias-financeiras","outputMapping":[{"name":"temPendencia","jsonPath":"$.value","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N10_gw","type":"GATEWAY","name":"Decisão: tem pendência?","description":"Encaminha conforme pendência financeira","positionX":780,"positionY":300},
  {"id":"N10_uta","type":"USER_TASK","name":"Confirmar contratação","description":"Confirmação final","positionX":1000,"positionY":180,
   "embeddedScreen":[{"name":"confirmar","type":"SWITCH","label":"Confirmo a contratação da franquia extra","required":true}]},
  {"id":"N10_enda","type":"END","name":"Fim (contratado)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N10_utb","type":"USER_TASK","name":"Regularizar pendência","description":"Orienta o cliente a regularizar antes de contratar","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"aviso","type":"CALLOUT","label":"Existe uma pendência financeira em aberto.","required":false,"config":{"variant":"aviso","description":"Regularize antes de contratar novos serviços."}}]},
  {"id":"N10_endb","type":"END","name":"Fim (pendência)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F10_1","sourceNodeId":"N10_start","targetNodeId":"N10_ut"},
  {"id":"F10_2","sourceNodeId":"N10_ut","targetNodeId":"N10_st"},
  {"id":"F10_3","sourceNodeId":"N10_st","targetNodeId":"N10_gw"},
  {"id":"F10_4","sourceNodeId":"N10_gw","targetNodeId":"N10_utb","condition":"{{temPendencia}} == true"},
  {"id":"F10_5","sourceNodeId":"N10_gw","targetNodeId":"N10_uta","isDefault":true},
  {"id":"F10_6","sourceNodeId":"N10_uta","targetNodeId":"N10_enda"},
  {"id":"F10_7","sourceNodeId":"N10_utb","targetNodeId":"N10_endb"}
]'::jsonb);

-- J11 — WEB — Cancelamento de TV por Assinatura (REST /v1/retencao/score + /v1/retencao/oferta ou /v1/cancelamento)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000011', '20000000-0000-4000-9000-00000000000b', 'Cancelamento de TV por Assinatura', 'Jornada média: cancelamento com score de retenção via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J11', '20000000-0000-4000-a000-000000000011', 'Fluxo principal',
'[
  {"id":"N11_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N11_ut","type":"USER_TASK","name":"Registrar motivo","description":"Coleta o motivo do cancelamento","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Cancelamento de Assinatura","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"motivoCancelamento","type":"SINGLE_SELECT","label":"Motivo","required":true,"options":[{"label":"Preço alto","value":"PRECO_ALTO"},{"label":"Pouco uso","value":"POUCO_USO"},{"label":"Mudança de operadora","value":"MUDANCA_OPERADORA"}],"positionX":40,"positionY":112,"width":320}
   ]},
  {"id":"N11_st1","type":"SERVICE_TASK","name":"Consultar score de retenção","description":"Calcula a propensão de retenção do cliente","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/retencao/score","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"scoreRetencao","jsonPath":"$.score","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N11_gw","type":"GATEWAY","name":"Decisão: oferecer retenção?","description":"Encaminha conforme o score calculado","positionX":780,"positionY":300},
  {"id":"N11_st2","type":"SERVICE_TASK","name":"Aplicar oferta de retenção","description":"Aplica desconto/benefício de retenção","positionX":1000,"positionY":180,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/retencao/oferta","headers":{"Content-Type":"application/json"},"body":{"score":"{{scoreRetencao}}"},"outputMapping":[{"name":"statusRetencao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N11_enda","type":"END","name":"Fim (retido)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N11_st3","type":"SERVICE_TASK","name":"Processar cancelamento","description":"Efetiva o cancelamento do serviço","positionX":1000,"positionY":420,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/cancelamento","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"statusCancelamento","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N11_endb","type":"END","name":"Fim (cancelado)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F11_1","sourceNodeId":"N11_start","targetNodeId":"N11_ut"},
  {"id":"F11_2","sourceNodeId":"N11_ut","targetNodeId":"N11_st1"},
  {"id":"F11_3","sourceNodeId":"N11_st1","targetNodeId":"N11_gw"},
  {"id":"F11_4","sourceNodeId":"N11_gw","targetNodeId":"N11_st2","condition":"{{scoreRetencao}} > 70"},
  {"id":"F11_5","sourceNodeId":"N11_gw","targetNodeId":"N11_st3","isDefault":true},
  {"id":"F11_6","sourceNodeId":"N11_st2","targetNodeId":"N11_enda"},
  {"id":"F11_7","sourceNodeId":"N11_st3","targetNodeId":"N11_endb"}
]'::jsonb);

-- J12 — MOBILE — Contestação de Fatura (REST /v1/manutencoes-massivas)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000012', '20000000-0000-4000-9000-00000000000c', 'Consulta e Contestação de Fatura', 'Jornada média: contestação de valores cobrados com checagem de cobrança em lote via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J12', '20000000-0000-4000-a000-000000000012', 'Fluxo principal',
'[
  {"id":"N12_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N12_ut","type":"USER_TASK","name":"Registrar contestação","description":"Dados da contestação","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Contestação de Fatura","required":false},
     {"name":"valorContestado","type":"INPUT","inputSubtype":"NUMBER","label":"Valor contestado (R$)","required":true,"minValue":0},
     {"name":"motivoContestacao","type":"INPUT","inputSubtype":"TEXT","label":"Motivo da contestação","required":true}
   ]},
  {"id":"N12_st","type":"SERVICE_TASK","name":"Checar cobrança em lote","description":"Verifica se o valor faz parte de uma cobrança massiva já identificada","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/manutencoes-massivas","outputMapping":[{"name":"cobrancaMassivaDetectada","jsonPath":"$.value","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N12_gw","type":"GATEWAY","name":"Decisão: cobrança massiva conhecida?","description":"Encaminha conforme a checagem","positionX":780,"positionY":300},
  {"id":"N12_uta","type":"USER_TASK","name":"Confirmar estorno automático","description":"Estorno já previsto para esse tipo de cobrança","positionX":1000,"positionY":180,
   "embeddedScreen":[{"name":"aviso","type":"CALLOUT","label":"Estorno automático já programado.","required":false,"config":{"variant":"sucesso","description":"Você será notificado quando o estorno for concluído."}}]},
  {"id":"N12_enda","type":"END","name":"Fim (estorno automático)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N12_utb","type":"USER_TASK","name":"Anexar comprovante","description":"Encaminha para análise manual","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"comprovante","type":"FILE_UPLOAD","label":"Comprovante (opcional)","required":false,"acceptedExtensions":[".pdf",".jpg",".png"],"maxFileSizeBytes":5242880}]},
  {"id":"N12_endb","type":"END","name":"Fim (análise manual)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F12_1","sourceNodeId":"N12_start","targetNodeId":"N12_ut"},
  {"id":"F12_2","sourceNodeId":"N12_ut","targetNodeId":"N12_st"},
  {"id":"F12_3","sourceNodeId":"N12_st","targetNodeId":"N12_gw"},
  {"id":"F12_4","sourceNodeId":"N12_gw","targetNodeId":"N12_uta","condition":"{{cobrancaMassivaDetectada}} == true"},
  {"id":"F12_5","sourceNodeId":"N12_gw","targetNodeId":"N12_utb","isDefault":true},
  {"id":"F12_6","sourceNodeId":"N12_uta","targetNodeId":"N12_enda"},
  {"id":"F12_7","sourceNodeId":"N12_utb","targetNodeId":"N12_endb"}
]'::jsonb);

-- J13 — WEB — Adesão a Combo Fibra + Móvel (REST /v1/planos/elegibilidade-upgrade)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000013', '20000000-0000-4000-9000-00000000000d', 'Adesão a Combo Fibra + Móvel', 'Jornada média: adesão ao combo com verificação de disponibilidade via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J13', '20000000-0000-4000-a000-000000000013', 'Fluxo principal',
'[
  {"id":"N13_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N13_ut","type":"USER_TASK","name":"Informar endereço","description":"Endereço para checagem de disponibilidade","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Combo Fibra + Móvel","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"cep","type":"INPUT","inputSubtype":"TEXT","label":"CEP","required":true,"validationPattern":"^\\d{5}-?\\d{3}$","positionX":40,"positionY":112,"width":320}
   ]},
  {"id":"N13_st","type":"SERVICE_TASK","name":"Verificar disponibilidade de fibra","description":"Consulta se há fibra disponível no endereço","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/planos/elegibilidade-upgrade","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"disponivel","jsonPath":"$.elegivel","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N13_gw","type":"GATEWAY","name":"Decisão: fibra disponível?","description":"Encaminha conforme a disponibilidade","positionX":780,"positionY":300},
  {"id":"N13_uta","type":"USER_TASK","name":"Escolher velocidade do combo","description":"Seleção final do combo","positionX":1000,"positionY":180,
   "embeddedScreen":[{"name":"velocidade","type":"SINGLE_SELECT","label":"Velocidade","required":true,"options":[{"label":"300 Mega","value":"300M"},{"label":"500 Mega","value":"500M"},{"label":"1 Giga","value":"1G"}]}]},
  {"id":"N13_enda","type":"END","name":"Fim (contratado)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N13_utb","type":"USER_TASK","name":"Oferecer lista de espera","description":"Sem fibra disponível no momento","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"entrarListaEspera","type":"SWITCH","label":"Entrar na lista de espera de expansão","required":false}]},
  {"id":"N13_endb","type":"END","name":"Fim (indisponível)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F13_1","sourceNodeId":"N13_start","targetNodeId":"N13_ut"},
  {"id":"F13_2","sourceNodeId":"N13_ut","targetNodeId":"N13_st"},
  {"id":"F13_3","sourceNodeId":"N13_st","targetNodeId":"N13_gw"},
  {"id":"F13_4","sourceNodeId":"N13_gw","targetNodeId":"N13_uta","condition":"{{disponivel}} == true"},
  {"id":"F13_5","sourceNodeId":"N13_gw","targetNodeId":"N13_utb","isDefault":true},
  {"id":"F13_6","sourceNodeId":"N13_uta","targetNodeId":"N13_enda"},
  {"id":"F13_7","sourceNodeId":"N13_utb","targetNodeId":"N13_endb"}
]'::jsonb);

-- J14 — MOBILE — Upgrade de Velocidade de Internet (REST /v1/elegibilidade)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000014', '20000000-0000-4000-9000-00000000000e', 'Upgrade de Velocidade de Internet', 'Jornada média: upgrade de velocidade com verificação de elegibilidade via REST.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J14', '20000000-0000-4000-a000-000000000014', 'Fluxo principal',
'[
  {"id":"N14_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N14_ut","type":"USER_TASK","name":"Escolher nova velocidade","description":"Seleção da velocidade desejada","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Upgrade de Velocidade","required":false},
     {"name":"velocidadeDesejada","type":"SINGLE_SELECT","label":"Nova velocidade","required":true,"options":[{"label":"500 Mega","value":"500M"},{"label":"1 Giga","value":"1G"}]}
   ]},
  {"id":"N14_st","type":"SERVICE_TASK","name":"Verificar elegibilidade","description":"Consulta se a infraestrutura suporta o upgrade","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/elegibilidade","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"},{"name":"protocolo","jsonPath":"$.protocolo","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N14_gw","type":"GATEWAY","name":"Decisão: elegível?","description":"Encaminha conforme o resultado","positionX":780,"positionY":300},
  {"id":"N14_uta","type":"USER_TASK","name":"Confirmar upgrade","description":"Confirmação final","positionX":1000,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"CALLOUT","label":"Upgrade aprovado.","required":false,"config":{"variant":"sucesso","description":"Protocolo: {{protocolo}}"}}]},
  {"id":"N14_enda","type":"END","name":"Fim (aprovado)","description":"Encerra o fluxo","positionX":1220,"positionY":180},
  {"id":"N14_utb","type":"USER_TASK","name":"Agendar visita técnica","description":"Necessário suporte técnico presencial","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"melhorTurno","type":"SINGLE_SELECT","label":"Melhor turno para visita","required":true,"options":[{"label":"Manhã","value":"MANHA"},{"label":"Tarde","value":"TARDE"}]}]},
  {"id":"N14_endb","type":"END","name":"Fim (visita agendada)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F14_1","sourceNodeId":"N14_start","targetNodeId":"N14_ut"},
  {"id":"F14_2","sourceNodeId":"N14_ut","targetNodeId":"N14_st"},
  {"id":"F14_3","sourceNodeId":"N14_st","targetNodeId":"N14_gw"},
  {"id":"F14_4","sourceNodeId":"N14_gw","targetNodeId":"N14_uta","condition":"{{elegivel}} == true"},
  {"id":"F14_5","sourceNodeId":"N14_gw","targetNodeId":"N14_utb","isDefault":true},
  {"id":"F14_6","sourceNodeId":"N14_uta","targetNodeId":"N14_enda"},
  {"id":"F14_7","sourceNodeId":"N14_utb","targetNodeId":"N14_endb"}
]'::jsonb);

-- ----------------------------------------------------------------------------
-- ALTAS (6) — REST + Kafka (produce e/ou consume) + múltiplos gateways;
-- J18 também exercita início por mensagem (MESSAGE_START_EVENT).
-- Tópicos usados (só dois no total): atendimento.confirmacao.externa
-- (CONSUME) e atendimento.notificacao.concluida (PRODUCE).
-- ----------------------------------------------------------------------------

-- J15 — WEB — Portabilidade Numérica Nacional (REST + Kafka CONSUME)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000015', '20000000-0000-4000-9000-00000000000f', 'Portabilidade Numérica Nacional', 'Jornada alta: portabilidade com consulta de prazo via REST e confirmação assíncrona via Kafka.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J15', '20000000-0000-4000-a000-000000000015', 'Fluxo principal',
'[
  {"id":"N15_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N15_ut","type":"USER_TASK","name":"Coletar dados de portabilidade","description":"Dados da linha a portar","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Portabilidade Numérica","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"operadoraOrigem","type":"SINGLE_SELECT","label":"Operadora de origem","required":true,"options":[{"label":"Claro","value":"CLARO"},{"label":"Vivo","value":"VIVO"},{"label":"TIM","value":"TIM"},{"label":"Oi","value":"OI"}],"positionX":40,"positionY":112,"width":320},
     {"name":"numeroPortar","type":"INPUT","inputSubtype":"TEXT","label":"Número a portar","required":true,"helpText":"DDD + número","validationPattern":"^\\d{10,11}$","positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N15_st","type":"SERVICE_TASK","name":"Consultar operadora de origem","description":"Consulta prazo estimado de portabilidade","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/portabilidade/consulta","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"prazoDias","jsonPath":"$.prazoEstimadoDias","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N15_gw","type":"GATEWAY","name":"Decisão: portabilidade imediata?","description":"Encaminha conforme o prazo estimado","positionX":780,"positionY":300},
  {"id":"N15_rt","type":"RECEIVE_TASK","name":"Aguardar confirmação da operadora","description":"Espera mensagem de confirmação imediata","positionX":1000,"positionY":180,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.confirmacao.externa","outputMapping":[{"name":"statusConfirmacao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N15_uta","type":"USER_TASK","name":"Confirmar portabilidade","description":"Confirmação final ao cliente","positionX":1220,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"CALLOUT","label":"Portabilidade confirmada.","required":false,"config":{"variant":"sucesso","description":"Status: {{statusConfirmacao}}"}}]},
  {"id":"N15_enda","type":"END","name":"Fim (imediata)","description":"Encerra o fluxo","positionX":1440,"positionY":180},
  {"id":"N15_utb","type":"USER_TASK","name":"Informar prazo estendido","description":"Comunica prazo maior ao cliente","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"aviso","type":"CALLOUT","label":"Prazo estendido de portabilidade.","required":false,"config":{"variant":"aviso","description":"Prazo estimado: {{prazoDias}} dias."}}]},
  {"id":"N15_endb","type":"END","name":"Fim (prazo estendido)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F15_1","sourceNodeId":"N15_start","targetNodeId":"N15_ut"},
  {"id":"F15_2","sourceNodeId":"N15_ut","targetNodeId":"N15_st"},
  {"id":"F15_3","sourceNodeId":"N15_st","targetNodeId":"N15_gw"},
  {"id":"F15_4","sourceNodeId":"N15_gw","targetNodeId":"N15_rt","condition":"{{prazoDias}} < 3"},
  {"id":"F15_5","sourceNodeId":"N15_gw","targetNodeId":"N15_utb","isDefault":true},
  {"id":"F15_6","sourceNodeId":"N15_rt","targetNodeId":"N15_uta"},
  {"id":"F15_7","sourceNodeId":"N15_uta","targetNodeId":"N15_enda"},
  {"id":"F15_8","sourceNodeId":"N15_utb","targetNodeId":"N15_endb"}
]'::jsonb);

-- J16 — MOBILE — Ativação eSIM Corporativo (REST + Kafka CONSUME)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000016', '20000000-0000-4000-9000-000000000010', 'Ativação de Linha via eSIM Corporativo', 'Jornada alta: ativação de linha com confirmação de propagação de rede via Kafka.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J16', '20000000-0000-4000-a000-000000000016', 'Fluxo principal',
'[
  {"id":"N16_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N16_ut1","type":"USER_TASK","name":"Coletar dados da linha","description":"Dados do eSIM e DDD desejado","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Ativação eSIM Corporativo","required":false},
     {"name":"iccid","type":"INPUT","inputSubtype":"TEXT","label":"ICCID do eSIM","required":true},
     {"name":"dddPreferencial","type":"INPUT","inputSubtype":"INTEGER","label":"DDD preferencial","required":true,"minValue":11,"maxValue":99}
   ]},
  {"id":"N16_st1","type":"SERVICE_TASK","name":"Ativar linha","description":"Envia comando de ativação ao HLR","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/linhas/ativar","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"statusAtivacao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N16_rt","type":"RECEIVE_TASK","name":"Aguardar confirmação da rede","description":"Espera confirmação de propagação na rede","positionX":780,"positionY":300,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.confirmacao.externa","outputMapping":[{"name":"confirmacaoRede","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N16_gw","type":"GATEWAY","name":"Decisão: rede confirmou?","description":"Encaminha conforme a confirmação de rede","positionX":1000,"positionY":300},
  {"id":"N16_ut2","type":"USER_TASK","name":"Confirmar ativação","description":"Confirmação final ao cliente","positionX":1220,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"CALLOUT","label":"Linha ativada com sucesso.","required":false,"config":{"variant":"sucesso","description":"Status inicial: {{statusAtivacao}}"}}]},
  {"id":"N16_enda","type":"END","name":"Fim (ativada)","description":"Encerra o fluxo","positionX":1440,"positionY":180},
  {"id":"N16_utb","type":"USER_TASK","name":"Registrar falha de propagação","description":"Coleta dados para reprocessamento manual","positionX":1220,"positionY":420,
   "embeddedScreen":[{"name":"comentario","type":"INPUT","inputSubtype":"TEXT","label":"Detalhes do problema observado","required":false}]},
  {"id":"N16_endb","type":"END","name":"Fim (falha)","description":"Encerra o fluxo","positionX":1440,"positionY":420}
]'::jsonb,
'[
  {"id":"F16_1","sourceNodeId":"N16_start","targetNodeId":"N16_ut1"},
  {"id":"F16_2","sourceNodeId":"N16_ut1","targetNodeId":"N16_st1"},
  {"id":"F16_3","sourceNodeId":"N16_st1","targetNodeId":"N16_rt"},
  {"id":"F16_4","sourceNodeId":"N16_rt","targetNodeId":"N16_gw"},
  {"id":"F16_5","sourceNodeId":"N16_gw","targetNodeId":"N16_ut2","condition":"{{confirmacaoRede}} == \"CONFIRMADA\""},
  {"id":"F16_6","sourceNodeId":"N16_gw","targetNodeId":"N16_utb","isDefault":true},
  {"id":"F16_7","sourceNodeId":"N16_ut2","targetNodeId":"N16_enda"},
  {"id":"F16_8","sourceNodeId":"N16_utb","targetNodeId":"N16_endb"}
]'::jsonb);

-- J17 — WEB — Provisionamento de IoT Corporativo (REST + Kafka PRODUCE)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000017', '20000000-0000-4000-9000-000000000011', 'Provisionamento de IoT Corporativo', 'Jornada alta: provisionamento de dispositivos IoT com notificação de conclusão via Kafka.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J17', '20000000-0000-4000-a000-000000000017', 'Fluxo principal',
'[
  {"id":"N17_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N17_ut","type":"USER_TASK","name":"Coletar dados de provisionamento","description":"Quantidade e tipo de dispositivos IoT","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Provisionamento IoT Corporativo","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"quantidadeDispositivos","type":"STEPPER","label":"Quantidade de dispositivos","required":true,"minValue":1,"maxValue":5000,"positionX":40,"positionY":112,"width":320},
     {"name":"tipoDispositivo","type":"MULTI_SELECT","label":"Tipo de dispositivo","required":true,"options":[{"label":"Sensor","value":"SENSOR"},{"label":"Rastreador","value":"RASTREADOR"},{"label":"Câmera","value":"CAMERA"}],"positionX":40,"positionY":184,"width":320}
   ]},
  {"id":"N17_st1","type":"SERVICE_TASK","name":"Provisionar dispositivos","description":"Provisiona os SIMs de máquina a máquina","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/iot/provisionar","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"qtdProvisionada","jsonPath":"$.quantidadeProvisionada","type":"number"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N17_gw","type":"GATEWAY","name":"Decisão: provisionamento concluído?","description":"Encaminha conforme a quantidade provisionada","positionX":780,"positionY":300},
  {"id":"N17_st2","type":"SERVICE_TASK","name":"Notificar conclusão","description":"Publica evento de conclusão para sistemas downstream","positionX":1000,"positionY":180,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.notificacao.concluida","payload":{"quantidade":"{{qtdProvisionada}}"}},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N17_uta","type":"USER_TASK","name":"Confirmar provisionamento","description":"Confirmação final ao responsável técnico","positionX":1220,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"METER","label":"Dispositivos provisionados","required":false,"config":{"value":100,"type":"linear"}}]},
  {"id":"N17_enda","type":"END","name":"Fim (concluído)","description":"Encerra o fluxo","positionX":1440,"positionY":180},
  {"id":"N17_utb","type":"USER_TASK","name":"Registrar falha de provisionamento","description":"Coleta informações para reprocessamento manual","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"comentario","type":"INPUT","inputSubtype":"TEXT","label":"Descrição da falha","required":false}]},
  {"id":"N17_endb","type":"END","name":"Fim (falha)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F17_1","sourceNodeId":"N17_start","targetNodeId":"N17_ut"},
  {"id":"F17_2","sourceNodeId":"N17_ut","targetNodeId":"N17_st1"},
  {"id":"F17_3","sourceNodeId":"N17_st1","targetNodeId":"N17_gw"},
  {"id":"F17_4","sourceNodeId":"N17_gw","targetNodeId":"N17_st2","condition":"{{qtdProvisionada}} > 0"},
  {"id":"F17_5","sourceNodeId":"N17_gw","targetNodeId":"N17_utb","isDefault":true},
  {"id":"F17_6","sourceNodeId":"N17_st2","targetNodeId":"N17_uta"},
  {"id":"F17_7","sourceNodeId":"N17_uta","targetNodeId":"N17_enda"},
  {"id":"F17_8","sourceNodeId":"N17_utb","targetNodeId":"N17_endb"}
]'::jsonb);

-- J18 — MOBILE — Central de Suporte Técnico (início por mensagem Kafka + REST)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000018', '20000000-0000-4000-9000-000000000012', 'Abertura de Chamado com Diagnóstico Automático', 'Jornada alta: início por mensagem Kafka (abertura de chamado), diagnóstico automático e abertura no sistema de field service.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J18', '20000000-0000-4000-a000-000000000018', 'Fluxo principal',
'[
  {"id":"N18_mse","type":"MESSAGE_START_EVENT","name":"Chamado aberto","description":"Inicia a partir da abertura de um chamado","positionX":120,"positionY":300,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.confirmacao.externa","outputMapping":[{"name":"ticketId","jsonPath":"$.ticketId","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N18_rt","type":"RECEIVE_TASK","name":"Aguardar diagnóstico automático","description":"Espera o resultado do diagnóstico automatizado","positionX":340,"positionY":300,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.confirmacao.externa","outputMapping":[{"name":"diagnosticoAutomatico","jsonPath":"$.resultado","type":"string"}]},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N18_ut","type":"USER_TASK","name":"Detalhar problema","description":"Coleta detalhes complementares do cliente","positionX":560,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Suporte Técnico","required":false},
     {"name":"categoriaProblema","type":"SINGLE_SELECT","label":"Categoria do problema","required":true,"options":[{"label":"Sem sinal","value":"SEM_SINAL"},{"label":"Lentidão","value":"LENTIDAO"},{"label":"Queda de chamadas","value":"QUEDA_CHAMADAS"}]},
     {"name":"avaliacaoUrgencia","type":"RATING","label":"Qual a urgência do problema?","required":false}
   ]},
  {"id":"N18_st","type":"SERVICE_TASK","name":"Abrir chamado técnico","description":"Registra o chamado no sistema de field service","positionX":780,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/suporte/chamados","headers":{"Content-Type":"application/json"},"body":{"ticketId":"{{ticketId}}","diagnostico":"{{diagnosticoAutomatico}}"},"outputMapping":[{"name":"numeroChamado","jsonPath":"$.numeroChamado","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N18_end","type":"END","name":"Fim","description":"Encerra o fluxo","positionX":1000,"positionY":300}
]'::jsonb,
'[
  {"id":"F18_1","sourceNodeId":"N18_mse","targetNodeId":"N18_rt"},
  {"id":"F18_2","sourceNodeId":"N18_rt","targetNodeId":"N18_ut"},
  {"id":"F18_3","sourceNodeId":"N18_ut","targetNodeId":"N18_st"},
  {"id":"F18_4","sourceNodeId":"N18_st","targetNodeId":"N18_end"}
]'::jsonb);

-- J19 — WEB — Migração de Plano Empresarial (REST + Kafka PRODUCE + 2 gateways-equivalentes em série)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000019', '20000000-0000-4000-9000-000000000013', 'Migração de Plano Empresarial com Aprovação de Crédito', 'Jornada alta: migração de plano corporativo com aprovação de crédito via REST e notificação via Kafka.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J19', '20000000-0000-4000-a000-000000000019', 'Fluxo principal',
'[
  {"id":"N19_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N19_ut1","type":"USER_TASK","name":"Coletar dados empresariais","description":"Dados da empresa para a migração","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Migração de Plano Empresarial","required":false,"positionX":40,"positionY":40,"width":320},
     {"name":"razaoSocial","type":"INPUT","inputSubtype":"TEXT","label":"Razão social","required":true,"positionX":40,"positionY":112,"width":320},
     {"name":"cnpj","type":"INPUT","inputSubtype":"TEXT","label":"CNPJ","required":true,"validationPattern":"^\\d{14}$","positionX":40,"positionY":184,"width":320},
     {"name":"quantidadeLinhas","type":"INPUT","inputSubtype":"INTEGER","label":"Quantidade de linhas","required":true,"minValue":1,"maxValue":10000,"positionX":40,"positionY":256,"width":320}
   ]},
  {"id":"N19_st1","type":"SERVICE_TASK","name":"Verificar aprovação de crédito","description":"Consulta aprovação de crédito corporativo","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/elegibilidade","headers":{"Content-Type":"application/json"},"body":{"origem":"migracao-empresarial"},"outputMapping":[{"name":"elegivel","jsonPath":"$.elegivel","type":"boolean"},{"name":"protocolo","jsonPath":"$.protocolo","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N19_gw1","type":"GATEWAY","name":"Decisão: crédito aprovado?","description":"Encaminha conforme a aprovação de crédito","positionX":780,"positionY":300},
  {"id":"N19_st2","type":"SERVICE_TASK","name":"Aplicar migração de plano","description":"Efetiva a migração no sistema de billing","positionX":1000,"positionY":180,
   "connectorConfig":{"connectorType":"REST","config":{"method":"POST","url":"http://localhost:8084/v1/planos/trocar","headers":{"Content-Type":"application/json"},"outputMapping":[{"name":"statusMigracao","jsonPath":"$.status","type":"string"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N19_st3","type":"SERVICE_TASK","name":"Notificar migração concluída","description":"Publica evento de migração para sistemas downstream","positionX":1220,"positionY":180,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.notificacao.concluida","payload":{"cnpj":"{{cnpj}}","status":"{{statusMigracao}}"}},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N19_uta","type":"USER_TASK","name":"Confirmar migração","description":"Confirmação final ao responsável","positionX":1440,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"CALLOUT","label":"Migração concluída com sucesso.","required":false,"config":{"variant":"sucesso","description":"Protocolo: {{protocolo}}"}}]},
  {"id":"N19_enda","type":"END","name":"Fim (migrado)","description":"Encerra o fluxo","positionX":1660,"positionY":180},
  {"id":"N19_utb","type":"USER_TASK","name":"Registrar pendência de crédito","description":"Encaminha para análise manual de crédito","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"comentario","type":"INPUT","inputSubtype":"TEXT","label":"Observações para análise de crédito","required":false}]},
  {"id":"N19_endb","type":"END","name":"Fim (pendente)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F19_1","sourceNodeId":"N19_start","targetNodeId":"N19_ut1"},
  {"id":"F19_2","sourceNodeId":"N19_ut1","targetNodeId":"N19_st1"},
  {"id":"F19_3","sourceNodeId":"N19_st1","targetNodeId":"N19_gw1"},
  {"id":"F19_4","sourceNodeId":"N19_gw1","targetNodeId":"N19_st2","condition":"{{elegivel}} == true"},
  {"id":"F19_5","sourceNodeId":"N19_gw1","targetNodeId":"N19_utb","isDefault":true},
  {"id":"F19_6","sourceNodeId":"N19_st2","targetNodeId":"N19_st3"},
  {"id":"F19_7","sourceNodeId":"N19_st3","targetNodeId":"N19_uta"},
  {"id":"F19_8","sourceNodeId":"N19_uta","targetNodeId":"N19_enda"},
  {"id":"F19_9","sourceNodeId":"N19_utb","targetNodeId":"N19_endb"}
]'::jsonb);

-- J20 — MOBILE — Bloqueio de Linha por Perda/Roubo (REST + Kafka PRODUCE)
INSERT INTO journey (journey_id, channel_id, name, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-a000-000000000020', '20000000-0000-4000-9000-000000000014', 'Bloqueio de Linha por Perda ou Roubo', 'Jornada alta: bloqueio de linha com validação via REST e notificação de bloqueio confirmado via Kafka.', 'DRAFT', now(), now());
INSERT INTO flow (flow_id, journey_id, name, nodes, connections) VALUES
('Process_J20', '20000000-0000-4000-a000-000000000020', 'Fluxo principal',
'[
  {"id":"N20_start","type":"START","name":"Início","description":"Inicia o fluxo","positionX":120,"positionY":300},
  {"id":"N20_ut1","type":"USER_TASK","name":"Registrar motivo do bloqueio","description":"Coleta o motivo e telefone alternativo","positionX":340,"positionY":300,
   "embeddedScreen":[
     {"name":"titulo","type":"TITLE","label":"Bloqueio de Linha","required":false},
     {"name":"motivoBloqueio","type":"SINGLE_SELECT","label":"Motivo do bloqueio","required":true,"options":[{"label":"Perda","value":"PERDA"},{"label":"Roubo","value":"ROUBO"},{"label":"Uso indevido","value":"USO_INDEVIDO"}]},
     {"name":"telefoneContato","type":"INPUT","inputSubtype":"PHONE","label":"Telefone alternativo","required":true,"helpText":"Para contato durante o bloqueio"}
   ]},
  {"id":"N20_st1","type":"SERVICE_TASK","name":"Validar solicitação de bloqueio","description":"Verifica se a linha é elegível para bloqueio imediato","positionX":560,"positionY":300,
   "connectorConfig":{"connectorType":"REST","config":{"method":"GET","url":"http://localhost:8084/v1/bilhetes-defeito","outputMapping":[{"name":"elegivelBloqueioImediato","jsonPath":"$.value","type":"boolean"}]},"credentialRef":"cred-telecom-core-api"}},
  {"id":"N20_gw","type":"GATEWAY","name":"Decisão: bloqueio imediato?","description":"Encaminha conforme a elegibilidade","positionX":780,"positionY":300},
  {"id":"N20_st2","type":"SERVICE_TASK","name":"Notificar bloqueio confirmado","description":"Publica evento de bloqueio para sistemas antifraude","positionX":1000,"positionY":180,
   "connectorConfig":{"connectorType":"KAFKA","config":{"topic":"atendimento.notificacao.concluida","payload":{"motivo":"{{motivoBloqueio}}"}},"credentialRef":"cred-telecom-kafka-cluster"}},
  {"id":"N20_uta","type":"USER_TASK","name":"Confirmar bloqueio","description":"Confirmação final ao cliente","positionX":1220,"positionY":180,
   "embeddedScreen":[{"name":"resumo","type":"CALLOUT","label":"Linha bloqueada com sucesso.","required":false,"config":{"variant":"sucesso","description":"Um SMS de confirmação foi enviado ao telefone alternativo."}}]},
  {"id":"N20_enda","type":"END","name":"Fim (bloqueada)","description":"Encerra o fluxo","positionX":1440,"positionY":180},
  {"id":"N20_utb","type":"USER_TASK","name":"Encaminhar para análise manual","description":"Bloqueio requer verificação adicional","positionX":1000,"positionY":420,
   "embeddedScreen":[{"name":"comentario","type":"INPUT","inputSubtype":"TEXT","label":"Informações adicionais para análise","required":false}]},
  {"id":"N20_endb","type":"END","name":"Fim (em análise)","description":"Encerra o fluxo","positionX":1220,"positionY":420}
]'::jsonb,
'[
  {"id":"F20_1","sourceNodeId":"N20_start","targetNodeId":"N20_ut1"},
  {"id":"F20_2","sourceNodeId":"N20_ut1","targetNodeId":"N20_st1"},
  {"id":"F20_3","sourceNodeId":"N20_st1","targetNodeId":"N20_gw"},
  {"id":"F20_4","sourceNodeId":"N20_gw","targetNodeId":"N20_st2","condition":"{{elegivelBloqueioImediato}} == true"},
  {"id":"F20_5","sourceNodeId":"N20_gw","targetNodeId":"N20_utb","isDefault":true},
  {"id":"F20_6","sourceNodeId":"N20_st2","targetNodeId":"N20_uta"},
  {"id":"F20_7","sourceNodeId":"N20_uta","targetNodeId":"N20_enda"},
  {"id":"F20_8","sourceNodeId":"N20_utb","targetNodeId":"N20_endb"}
]'::jsonb);

COMMIT;
