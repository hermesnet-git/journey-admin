// Jornada "Abertura de BD pelo VE" (Fênix, FTAT-933) do produto "Vivo empresas - VE", canal App.
// Telas: Figma [B2B] Suporte Técnico, página "Abertura de BD - App" (extração em admin/fenix/figma/).
// Regras: as 9 USs em admin/fenix/ + decisões combinadas com o usuário em 03/11/2026 (anotadas no canvas).
//
// Conectores apontam para o ms-mock-api-rest (8084) e para o tópico de teste eljy.eventos.entrada só
// para a jornada poder ser publicada; as APIs reais entram quando os data mappings chegarem.
//
// Rode com: node jornada_abertura_bd_ve.mjs

import { createRequire } from 'node:module';
import {
  api, login, ensureJourney, publishNewFlow,
  startNode, endNode, userTaskNode, gatewayNode, serviceTaskNode, receiveTaskNode, connection,
  text, checkbox, datePicker, submitButton, actionButton, alert, card, stack, selectList,
} from './sdui_helpers.mjs';

const require = createRequire(import.meta.url);
const ELK = require('../../../../front/node_modules/elkjs/lib/elk.bundled.js');

const MOCK = 'http://localhost:8084/v1';
const KAFKA_LOCAL = '6590dbdc-6ab8-433f-9baf-0c271486157b';
const VE_PRODUCT_ID = '66896bd3-f42d-4549-af38-df2c1c0e34df';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const RESILIENT = { readTimeoutMs: 30000, retries: 1, retryIntervalMs: 1000 };

const out = (name, jsonPath, type = 'string') => ({ name, jsonPath, type });
const list = (name, jsonPath, keepFields) => ({ name, jsonPath, type: 'list', keepFields });
const body = (id, value) => text(id, value, 'body');
const caption = (id, value) => text(id, value, 'caption');
const heading = (id, value) => text(id, value, 'heading');
const secondary = (id, label, varName, value) => actionButton(id, label, varName, value, { variant: 'secondary' });
const passos = (p) => [body(`${p}_1`, '1. Retire o modem da tomada'), body(`${p}_2`, '2. Aguarde 30 segundos'), body(`${p}_3`, '3. Ligue o modem de novo')];

// Nós nascem em (0, 0): o layout (ELK) preenche as posições depois.
const tela = (id, name, desc, title, children) => userTaskNode(id, name, desc, 0, 0, id.replace('Node_', '').toLowerCase(), title, children);
const rest = (id, name, desc, config) => serviceTaskNode(id, name, desc, 0, 0, 'REST', config);

// --- Blocos de tela reaproveitados ------------------------------------------------------------
const TITULO_IMPEDIMENTO = 'Identificamos o que pode estar afetando seu serviço';
const cardMassiva = (p) => card(`card_${p}_massiva`, [stack(`stack_${p}_massiva`, [
  heading(`${p}_massiva_titulo`, 'Instabilidade na região'),
  body(`${p}_massiva_prev`, 'Os serviços devem voltar a funcionar em {{data.massivaPrevisaoConclusao}}'),
  caption(`${p}_massiva_prot`, 'Protocolo {{data.massivaProtocolo}}'),
])]);
const cardFaturas = (p) => card(`card_${p}_faturas`, [stack(`stack_${p}_faturas`, [
  heading(`${p}_fat_titulo`, 'Faturas em atraso'),
  caption(`${p}_fat_sub`, 'O pagamento é necessário para manter sua internet ativa'),
  selectList(`${p}_fat_lista`, 'Faturas', 'data.faturasEmAtraso', 'faturaConsultada', {
    itemValue: 'referencia', itemTitle: 'Venceu em {{item.vencimento}}', itemDescription: 'Fatura de {{item.referencia}}',
    itemHint: 'Atrasada · R$ {{item.valor}}', required: false, actions: [],
  }),
])]);
const cardVisita = (p) => card(`card_${p}_visita`, [stack(`stack_${p}_visita`, [
  heading(`${p}_vis_titulo`, 'Visita técnica agendada'),
  caption(`${p}_vis_sub`, 'Abaixo mais informações sobre a visita técnica agendada'),
  body(`${p}_vis_data`, 'Agendada para {{data.bdPrevisaoConclusao}}'),
  caption(`${p}_vis_prot`, 'Protocolo {{data.bdProtocoloAtendimento}}'),
])]);
const statusTela = (id, name, cards, botao) => tela(id, name, 'Tela de impedimento do Figma (Status de bloqueio - Cenários possíveis).', TITULO_IMPEDIMENTO, [
  text(`${id}_titulo`, TITULO_IMPEDIMENTO, 'title'), ...cards, submitButton(`${id}_btn`, botao),
]);
const voltou = (id, name, pergunta, dica, varName) => tela(id, name, 'Pergunta do Figma: Sim encerra como resolvido, Não segue.', 'Suporte técnico', [
  text(`${id}_titulo`, pergunta, 'title'), caption(`${id}_dica`, dica),
  actionButton(`${id}_sim`, 'Sim', varName, 'sim', { variant: 'secondary' }), secondary(`${id}_nao`, 'Não', varName, 'nao'),
]);

// --- Etapas -------------------------------------------------------------------------------------
const nodes = [
  startNode('Node_Start', 'Início', 0, 0, 'O VE inicia a jornada só com o designador.', [{ name: 'designador', type: 'string' }]),

  // Consultas e impedimentos
  rest('Node_ConsultaPendencia', 'Consulta pendência financeira', 'Faturas em atraso do cliente.', {
    method: 'GET', url: `${MOCK}/clientes/{{data_designador}}/pendencias-financeiras`, headers: { Accept: 'application/json' },
    outputMapping: [out('pendenciaHttpStatus', '$httpStatus', 'number'), list('faturasEmAtraso', '$.faturasPendentes', ['referencia', 'valor', 'vencimento'])],
    ...RESILIENT,
  }),
  rest('Node_ConsultaMassiva', 'Consulta massiva', 'Massiva ou manutenção programada aberta (Sigitm).', {
    method: 'GET', url: `${MOCK}/clientes/{{data_designador}}/manutencoes-massivas`, headers: { Accept: 'application/json' },
    outputMapping: [out('massivaHttpStatus', '$httpStatus', 'number'), out('massivaProtocolo', '$.protocoloManutencao'), out('massivaPrevisaoConclusao', '$.previsaoConclusao')],
    ...RESILIENT,
  }),
  rest('Node_ConsultaBD', 'Consulta BD aberto', 'BD preventivo ou pró-ativo aberto (Service Now).', {
    method: 'GET', url: `${MOCK}/clientes/{{data_designador}}/bilhetes-defeito`, headers: { Accept: 'application/json' },
    outputMapping: [
      out('bdHttpStatus', '$httpStatus', 'number'), out('bdNumero', '$.numeroBilhete'),
      out('bdProtocoloAtendimento', '$.protocoloAtendimento'), out('bdPrevisaoConclusao', '$.previsaoConclusao'),
    ],
    ...RESILIENT,
  }),
  gatewayNode('Node_DecImpedimento', 'Cliente tem algum ponto de impedimento do serviço?', 0, 0, 'Losango do Figma; vale a primeira condição verdadeira.'),
  statusTela('Node_StatusMassivaAtraso', 'Massiva + atraso em pagamentos', [cardMassiva('sma'), cardFaturas('sma')], 'Ir pra Central de faturas'),
  statusTela('Node_StatusMassivaVisita', 'Massiva + visita técnica', [cardMassiva('smv'), cardVisita('smv')], 'Ir pra Central de visitas'),
  tela('Node_StatusMassiva', 'Massiva', 'Tela de impedimento do Figma (Cenário Massiva).', 'Instabilidade na região', [
    text('sm_titulo', 'Identificamos uma instabilidade na sua região', 'title'),
    body('sm_prev', 'Os serviços devem voltar a funcionar em {{data.massivaPrevisaoConclusao}}'),
    caption('sm_prot', 'Protocolo {{data.massivaProtocolo}}'),
    submitButton('sm_btn', 'Ir para o início'),
  ]),
  statusTela('Node_StatusAtraso', 'Atraso em pagamentos', [cardFaturas('sa')], 'Ir pra Central de faturas'),
  statusTela('Node_StatusVisita', 'Visita técnica agendada', [cardVisita('sv')], 'Ir pra Central de visitas'),
  endNode('Node_End_Impedimento', 'Fim — impedimento', 0, 0),

  // Reinício do modem (Troubleshooting)
  tela('Node_Reinicie', 'Reinicie o modem', 'Troubleshooting do Figma.', 'Suporte técnico', [
    text('re_titulo', 'Até aqui, não identificamos o que está afetando sua internet', 'title'),
    body('re_sub', 'Agora, vamos reiniciar o modem para tentar resolver o problema. Siga as etapas:'),
    ...passos('re_passo'),
    actionButton('re_ok', 'Já reiniciei', 'acaoReinicio', 'reiniciei'),
    secondary('re_nao', 'Não consigo reiniciar', 'acaoReinicio', 'nao_consigo'),
  ]),
  gatewayNode('Node_DecReinicio', 'Conseguiu reiniciar?', 0, 0),
  voltou('Node_VoltouReinicio', 'A internet voltou?', 'Depois de reiniciar o modem, a internet voltou a funcionar?', 'Aguarde as luzes pararem de piscar antes de testar', 'voltouReinicio'),
  gatewayNode('Node_DecVoltouReinicio', 'Voltou após reiniciar?', 0, 0),
  tela('Node_InternetVoltou', 'Sua internet voltou', 'Final de fluxo do Figma (problema resolvido).', 'Suporte técnico', [
    text('iv_titulo', 'Sua internet voltou a funcionar', 'title'),
    body('iv_sub', 'A gente está por aqui se você precisar de ajuda'),
    submitButton('iv_btn', 'Ir para o início'),
  ]),
  endNode('Node_End_Resolvido', 'Fim — problema resolvido', 0, 0),

  // Diagnóstico automático
  tela('Node_TesteConexao', 'Vamos testar a sua conexão', 'Diagnóstico automático do Figma: Continuar equivale a "cliente pronto".', 'Suporte técnico', [
    text('tc_titulo', 'Agora, vamos testar a sua conexão', 'title'),
    body('tc_sub', 'Como o problema continua, a gente vai tentar identificar o que está acontecendo'),
    heading('tc_1t', 'Isso pode levar alguns minutos'), caption('tc_1d', 'Aguarde enquanto verificamos sua conexão'),
    heading('tc_2t', 'Você pode ficar sem internet'), caption('tc_2d', 'Isso pode acontecer durante os testes'),
    heading('tc_3t', 'Use outra conexão'), caption('tc_3d', 'Se possível, use os dados móveis do seu celular'),
    actionButton('tc_ok', 'Continuar', 'acaoTeste', 'continuar'),
    secondary('tc_inicio', 'Ir para o início', 'acaoTeste', 'inicio'),
  ]),
  gatewayNode('Node_DecTeste', 'Cliente quer testar?', 0, 0),
  endNode('Node_End_Desistiu', 'Fim — cliente voltou ao início', 0, 0),
  rest('Node_SolicitaDiagnostico', 'Solicita diagnóstico (HPSD)', 'Dispara o teste no HPSD (TMF653 POST /serviceTest).', {
    method: 'POST', url: `${MOCK}/diagnosticos/solicitacoes`, headers: JSON_HEADERS,
    body: { designador: '{{data_designador}}', tipoAvaliacao: 'CONECTIVIDADE_E_SINAL' },
    outputMapping: [out('diagnosticoProtocolo', '$.protocolo')],
    ...RESILIENT,
  }),
  receiveTaskNode('Node_AguardaDiagnostico', 'Aguarda resultado do diagnóstico', 'Retorno assíncrono do HPSD pelo Kafka.', 0, 0, 'KAFKA', {
    operation: 'CONSUME', topic: 'eljy.eventos.entrada', clusterId: KAFKA_LOCAL, waitTimeoutMs: 180000,
    outputMapping: [out('idRetornoDiagnostico', '$.payload.data.idRetorno')],
  }, 'teste'),
  gatewayNode('Node_DecIdDiagnostico', 'IDs de respostas do diagnóstico', 0, 0, 'Losango do Figma.'),

  // Reiniciar novamente (ID 06, 07 ou 10)
  tela('Node_ReinicieNovamente', 'Reinicie de novo', 'Cenário "Reiniciar novamente" do Figma.', 'Suporte técnico', [
    text('rn_titulo', 'Vamos reiniciar o modem de novo', 'title'),
    body('rn_sub', 'Algumas mudanças precisam que você desligue e ligue o modem. Siga as etapas:'),
    ...passos('rn_passo'),
    submitButton('rn_ok', 'Já reiniciei'),
  ]),
  voltou('Node_VoltouNovamente', 'A internet voltou?', 'Depois de reiniciar o modem, a internet voltou a funcionar?', 'Aguarde as luzes pararem de piscar antes de testar', 'voltouNovamente'),
  gatewayNode('Node_DecVoltouNovamente', 'Voltou após o ajuste?', 0, 0),

  // Sem energia (ID 09)
  tela('Node_SemEnergia', 'Modem sem energia', 'Cenário "Sem sinal de energia elétrica" do Figma.', 'Suporte técnico', [
    text('se_titulo', 'O modem não está recebendo energia', 'title'),
    body('se_sub', 'Vamos verificar o que pode estar acontecendo'),
    heading('se_1t', 'A tomada está funcionando?'), caption('se_1d', 'Você pode testar o modem em outro ponto de energia que esteja funcionando'),
    heading('se_2t', 'O cabo de energia está conectado?'), caption('se_2d', 'Verifique se o modem está bem encaixado'),
    actionButton('se_ok', 'Já verifiquei', 'acaoEnergia', 'verifiquei'),
    secondary('se_nao', 'Não consigo verificar', 'acaoEnergia', 'nao_consigo'),
  ]),
  gatewayNode('Node_DecEnergia', 'Conseguiu verificar?', 0, 0),
  voltou('Node_VoltouEnergia', 'A internet voltou?', 'Depois de testar a tomada e o cabo, sua internet voltou a funcionar?', 'Aguarde as luzes do modem pararem de piscar antes de testar a conexão', 'voltouEnergia'),
  gatewayNode('Node_DecVoltouEnergia', 'Voltou após verificar?', 0, 0),
  tela('Node_TemEnergia', 'Tem energia no endereço?', 'Cenário "Sem sinal de energia elétrica" do Figma.', 'Suporte técnico', [
    text('te_titulo', 'Tem energia elétrica no seu endereço?', 'title'),
    body('te_sub', 'Pode ser que o problema esteja na rede elétrica. As luzes e outros aparelhos estão funcionando normalmente?'),
    actionButton('te_sim', 'Sim', 'temEnergia', 'sim', { variant: 'secondary' }), secondary('te_nao', 'Não', 'temEnergia', 'nao'),
  ]),
  gatewayNode('Node_DecTemEnergia', 'Há energia no endereço?', 0, 0),
  tela('Node_RedeEletrica', 'Problema na rede elétrica', 'Final de fluxo do Figma (sem energia no endereço).', 'Suporte técnico', [
    text('rl_titulo', 'O problema pode estar na rede elétrica', 'title'),
    body('rl_sub', 'Pode ser que algo não esteja funcionando bem na rede elétrica. Assim que tudo estiver normalizado, você pode fazer um novo teste'),
    submitButton('rl_btn', 'Ir para o início'),
  ]),
  endNode('Node_End_RedeEletrica', 'Fim — rede elétrica', 0, 0),

  // Abertura de BD
  tela('Node_AgendarVisita', 'Vamos agendar uma visita técnica', 'Abertura de BD do Figma.', 'Suporte técnico', [
    text('av_titulo', 'Vamos agendar uma visita técnica', 'title'),
    body('av_sub', 'Os testes não resolveram o problema com a sua internet. A nossa equipe técnica vai até o endereço para avaliar o que está acontecendo'),
    actionButton('av_ok', 'Agendar visita', 'acaoAgendar', 'agendar'),
    secondary('av_inicio', 'Ir para o início', 'acaoAgendar', 'inicio'),
  ]),
  gatewayNode('Node_DecAgendar', 'Cliente quer agendar?', 0, 0),
  endNode('Node_End_SemAgendar', 'Fim — sem agendamento', 0, 0),
  rest('Node_ConsultaSlots', 'Consulta horários (WFM)', 'Opções de horário para a visita técnica (wfm-journey-orchestration-v1).', {
    method: 'GET', url: `${MOCK}/instalacoes/horarios-disponiveis?designador={{data_designador}}`, headers: { Accept: 'application/json' },
    outputMapping: [list('horariosVisita', '$.horarios', ['value', 'label'])],
    ...RESILIENT,
  }),
  tela('Node_EscolheHorario', 'Escolha do horário', 'Layout do Figma: data, períodos e aceite de aviso.', 'Agendar visita técnica', [
    text('eh_titulo', 'Selecione a melhor data para agendar sua visita técnica', 'title'),
    datePicker('eh_data', 'Data da visita técnica', 'dataVisita'),
    selectList('eh_horarios', 'Horários', 'data.horariosVisita', 'horarioVisita', {
      itemValue: 'value', itemTitle: '{{item.label}}', emptyMessage: 'Não há horários disponíveis.', actions: [],
    }),
    checkbox('eh_aviso', 'Aceito que a Vivo me avise se surgir um horário mais cedo', 'avisarHorarioMaisCedo'),
    submitButton('eh_ok', 'Confirmar agendamento'),
  ]),
  rest('Node_CriaWO', 'Cria WO (WFM)', 'Cria a work order com o horário escolhido.', {
    method: 'POST', url: `${MOCK}/instalacoes/agendamentos`, headers: JSON_HEADERS,
    body: { designador: '{{data_designador}}', data: '{{form_dataVisita}}', horario: '{{form_horarioVisita}}', avisarHorarioMaisCedo: '{{form_avisarHorarioMaisCedo}}' },
    outputMapping: [out('woNumero', '$.protocolo'), out('woStatus', '$.status'), out('woHorario', '$.horario')],
    ...RESILIENT,
  }),
  gatewayNode('Node_DecAgendado', 'Agendado com sucesso?', 0, 0),
  tela('Node_HorarioOcupado', 'Horário ocupado', 'Tela criada aqui (US 7): o horário foi usado por outro atendimento.', 'Agendar visita técnica', [
    alert('ho_alerta', 'warning', 'O horário escolhido acabou de ser ocupado por outro atendimento. Escolha outro horário.', { title: 'Não conseguimos agendar' }),
    submitButton('ho_btn', 'Escolher outro horário'),
  ]),
  rest('Node_CriaBD', 'Cria BD', 'Abre o BD (Trouble Ticket Management v1).', {
    method: 'POST', url: `${MOCK}/suporte/chamados`, headers: JSON_HEADERS,
    body: { designador: '{{data_designador}}', numeroWO: '{{data_woNumero}}', protocoloDiagnostico: '{{data_diagnosticoProtocolo}}' },
    outputMapping: [out('bdCriadoHttpStatus', '$httpStatus', 'number'), out('bdCriadoNumero', '$.numeroChamado')],
    ...RESILIENT,
  }),
  gatewayNode('Node_DecBDCriado', 'BD criado?', 0, 0),
  tela('Node_VisitaAgendada', 'Você agendou a visita técnica', 'Abertura de BD do Figma (sucesso).', 'Visita agendada', [
    text('va_titulo', 'Você agendou a visita técnica', 'title'),
    card('va_card', [stack('va_stack', [
      caption('va_data_l', 'Data da visita'), body('va_data', '{{form.dataVisita}}'),
      caption('va_per_l', 'Período'), body('va_per', '{{data.woHorario}}'),
    ])]),
    caption('va_aviso', 'É preciso ter uma pessoa maior de 18 anos presente no dia da visita'),
    actionButton('va_agenda', 'Salvar na agenda', 'acaoFinal', 'salvar_agenda'),
    secondary('va_inicio', 'Ir para o início', 'acaoFinal', 'inicio'),
  ]),
  endNode('Node_End_Agendado', 'Fim — visita agendada e BD criado', 0, 0),
  rest('Node_CancelaWO', 'Cancela WO (WFM)', 'Cancela a work order quando o BD não é criado; não aguarda resposta.', {
    method: 'POST', url: `${MOCK}/ordens-servico/{{data_woNumero}}/encerramento`, headers: JSON_HEADERS,
    body: { motivo: 'BD não criado' }, background: true,
  }),
  tela('Node_BDNaoCriado', 'BD não criado', 'Tela criada aqui (US 8): falha na criação do BD.', 'Suporte técnico', [
    alert('bn_alerta', 'warning', 'Não conseguimos registrar a sua solicitação e a visita foi cancelada. Tente de novo mais tarde ou fale com o atendimento Vivo.', { title: 'Não foi possível concluir' }),
    submitButton('bn_btn', 'Ir para o início'),
  ]),
  endNode('Node_End_BDNaoCriado', 'Fim — BD não criado', 0, 0),

  // Falha de integração (sugestão)
  tela('Node_FalhaConsulta', 'Não conseguimos verificar', 'Sugestão: usada quando uma integração falha de vez.', 'Suporte técnico', [
    alert('fc_alerta', 'warning', 'Tivemos um problema para consultar as informações do seu serviço. Fale com o atendimento Vivo.', { title: 'Não conseguimos verificar agora' }),
    submitButton('fc_btn', 'Ir para o início'),
  ]),
  endNode('Node_End_Falha', 'Fim — falha de integração', 0, 0),
];

// --- Ligações -----------------------------------------------------------------------------------
const M = '{{data_massivaHttpStatus}} == 200';
const P = '{{data_pendenciaHttpStatus}} == 200';
const B = '{{data_bdHttpStatus}} == 200';
const ID = '{{data_idRetornoDiagnostico}}';
const eq = (v, val) => `${v} == "${val}"`;
const c = (from, to, opts) => connection(`Flow_${from}_${to}${opts?.onError ? '_Falha' : ''}`, `Node_${from}`, `Node_${to}`, opts);
const connections = [
  c('Start', 'ConsultaPendencia'),
  c('ConsultaPendencia', 'ConsultaMassiva'), c('ConsultaPendencia', 'FalhaConsulta', { onError: true }),
  c('ConsultaMassiva', 'ConsultaBD'), c('ConsultaMassiva', 'FalhaConsulta', { onError: true }),
  c('ConsultaBD', 'DecImpedimento'), c('ConsultaBD', 'FalhaConsulta', { onError: true }),
  c('DecImpedimento', 'StatusMassivaAtraso', { condition: `${M} && ${P}`, label: 'Massiva + atraso' }),
  c('DecImpedimento', 'StatusMassivaVisita', { condition: `${M} && ${B}`, label: 'Massiva + visita' }),
  c('DecImpedimento', 'StatusMassiva', { condition: M, label: 'Massiva' }),
  c('DecImpedimento', 'StatusAtraso', { condition: P, label: 'Atraso em pagamentos' }),
  c('DecImpedimento', 'StatusVisita', { condition: B, label: 'Visita técnica (BD aberto)' }),
  c('DecImpedimento', 'Reinicie', { isDefault: true, label: 'Não' }),
  ...['StatusMassivaAtraso', 'StatusMassivaVisita', 'StatusMassiva', 'StatusAtraso', 'StatusVisita'].map((s) => c(s, 'End_Impedimento')),

  c('Reinicie', 'DecReinicio'),
  c('DecReinicio', 'TesteConexao', { condition: eq('{{form_acaoReinicio}}', 'nao_consigo'), label: 'Não consigo reiniciar' }),
  c('DecReinicio', 'VoltouReinicio', { isDefault: true, label: 'Já reiniciei' }),
  c('VoltouReinicio', 'DecVoltouReinicio'),
  c('DecVoltouReinicio', 'InternetVoltou', { condition: eq('{{form_voltouReinicio}}', 'sim'), label: 'Sim' }),
  c('DecVoltouReinicio', 'TesteConexao', { isDefault: true, label: 'Não' }),
  c('InternetVoltou', 'End_Resolvido'),

  c('TesteConexao', 'DecTeste'),
  c('DecTeste', 'End_Desistiu', { condition: eq('{{form_acaoTeste}}', 'inicio'), label: 'Ir para o início' }),
  c('DecTeste', 'SolicitaDiagnostico', { isDefault: true, label: 'Continuar' }),
  c('SolicitaDiagnostico', 'AguardaDiagnostico'), c('SolicitaDiagnostico', 'FalhaConsulta', { onError: true }),
  c('AguardaDiagnostico', 'DecIdDiagnostico'), c('AguardaDiagnostico', 'AgendarVisita', { onError: true, label: 'Sem resposta em 3 min' }),
  c('DecIdDiagnostico', 'ReinicieNovamente', { condition: `${eq(ID, '06')} || ${eq(ID, '07')} || ${eq(ID, '10')}`, label: 'IDs 06, 07 ou 10' }),
  c('DecIdDiagnostico', 'SemEnergia', { condition: eq(ID, '09'), label: 'ID 09' }),
  c('DecIdDiagnostico', 'AgendarVisita', { isDefault: true, label: 'IDs 01, 02, 08 ou outro' }),

  c('ReinicieNovamente', 'VoltouNovamente'),
  c('VoltouNovamente', 'DecVoltouNovamente'),
  c('DecVoltouNovamente', 'InternetVoltou', { condition: eq('{{form_voltouNovamente}}', 'sim'), label: 'Sim' }),
  c('DecVoltouNovamente', 'AgendarVisita', { isDefault: true, label: 'Não' }),

  c('SemEnergia', 'DecEnergia'),
  c('DecEnergia', 'AgendarVisita', { condition: eq('{{form_acaoEnergia}}', 'nao_consigo'), label: 'Não consigo verificar' }),
  c('DecEnergia', 'VoltouEnergia', { isDefault: true, label: 'Já verifiquei' }),
  c('VoltouEnergia', 'DecVoltouEnergia'),
  c('DecVoltouEnergia', 'InternetVoltou', { condition: eq('{{form_voltouEnergia}}', 'sim'), label: 'Sim' }),
  c('DecVoltouEnergia', 'TemEnergia', { isDefault: true, label: 'Não' }),
  c('TemEnergia', 'DecTemEnergia'),
  c('DecTemEnergia', 'AgendarVisita', { condition: eq('{{form_temEnergia}}', 'sim'), label: 'Sim' }),
  c('DecTemEnergia', 'RedeEletrica', { isDefault: true, label: 'Não' }),
  c('RedeEletrica', 'End_RedeEletrica'),

  c('AgendarVisita', 'DecAgendar'),
  c('DecAgendar', 'End_SemAgendar', { condition: eq('{{form_acaoAgendar}}', 'inicio'), label: 'Ir para o início' }),
  c('DecAgendar', 'ConsultaSlots', { isDefault: true, label: 'Agendar visita' }),
  c('ConsultaSlots', 'EscolheHorario'), c('ConsultaSlots', 'FalhaConsulta', { onError: true }),
  c('EscolheHorario', 'CriaWO'),
  c('CriaWO', 'DecAgendado'), c('CriaWO', 'FalhaConsulta', { onError: true }),
  c('DecAgendado', 'CriaBD', { condition: eq('{{data_woStatus}}', 'AGENDADO'), label: 'Sim' }),
  c('DecAgendado', 'HorarioOcupado', { isDefault: true, label: 'Não (horário ocupado)' }),
  c('HorarioOcupado', 'ConsultaSlots'),
  c('CriaBD', 'DecBDCriado'), c('CriaBD', 'CancelaWO', { onError: true }),
  c('DecBDCriado', 'VisitaAgendada', { condition: '{{data_bdCriadoHttpStatus}} == 200 || {{data_bdCriadoHttpStatus}} == 201', label: 'Sim' }),
  c('DecBDCriado', 'CancelaWO', { isDefault: true, label: 'Não' }),
  c('VisitaAgendada', 'End_Agendado'),
  c('CancelaWO', 'BDNaoCriado'),
  c('BDNaoCriado', 'End_BDNaoCriado'),
  c('FalhaConsulta', 'End_Falha'),
];

// --- Seções -------------------------------------------------------------------------------------
const ids = (...names) => names.map((n) => `Node_${n}`);
const sections = [
  { id: 'Sec_Consultas', name: 'Consultas e impedimentos', nodeIds: ids('ConsultaPendencia', 'ConsultaMassiva', 'ConsultaBD', 'DecImpedimento', 'StatusMassivaAtraso', 'StatusMassivaVisita', 'StatusMassiva', 'StatusAtraso', 'StatusVisita', 'End_Impedimento') },
  // "Sua internet voltou" fica fora das seções: é o final de três caminhos (reinício, reinício de novo, sem energia).
  { id: 'Sec_Reinicio', name: 'Reinício do modem', nodeIds: ids('Reinicie', 'DecReinicio', 'VoltouReinicio', 'DecVoltouReinicio') },
  { id: 'Sec_Diagnostico', name: 'Diagnóstico automático', nodeIds: ids('TesteConexao', 'DecTeste', 'End_Desistiu', 'SolicitaDiagnostico', 'AguardaDiagnostico', 'DecIdDiagnostico') },
  { id: 'Sec_ReinicieNovamente', name: 'Reiniciar novamente (ID 06, 07 ou 10)', nodeIds: ids('ReinicieNovamente', 'VoltouNovamente', 'DecVoltouNovamente') },
  { id: 'Sec_SemEnergia', name: 'Sem energia (ID 09)', nodeIds: ids('SemEnergia', 'DecEnergia', 'VoltouEnergia', 'DecVoltouEnergia', 'TemEnergia', 'DecTemEnergia', 'RedeEletrica', 'End_RedeEletrica') },
  { id: 'Sec_AberturaBD', name: 'Abertura de BD', nodeIds: ids('AgendarVisita', 'DecAgendar', 'End_SemAgendar', 'ConsultaSlots', 'EscolheHorario', 'CriaWO', 'DecAgendado', 'HorarioOcupado', 'CriaBD', 'DecBDCriado', 'VisitaAgendada', 'End_Agendado', 'CancelaWO', 'BDNaoCriado', 'End_BDNaoCriado') },
];

// --- Notas no canvas (origem de cada decisão) -------------------------------------------------
const notes = [
  [['Start'], 'Entrada: só o designador vem do VE. O desambiguador do Figma (perfil, empresa, serviço, endereço) e a tela "Agora, vamos verificar…" ficam no VE, antes de iniciar a jornada. As telas de "carregando" do Figma não viram etapas: o canal mostra a espera enquanto as integrações rodam.'],
  [['ConsultaPendencia', 'ConsultaMassiva', 'ConsultaBD', 'SolicitaDiagnostico', 'AguardaDiagnostico', 'ConsultaSlots', 'CriaWO', 'CriaBD', 'CancelaWO'], 'Conectores MOCKADOS para permitir publicar: APIs do ms-mock-api-rest (8084) e tópico de teste eljy.eventos.entrada. Trocar pelas reais quando os data mappings do Jira chegarem: Service Now (Trouble Ticket Management v1), Sigitm (Customer Problem Management v1), HPSD (TMF653), WFM (wfm-journey-orchestration-v1 / Appointment Management v1).'],
  [['ConsultaPendencia'], 'Pendência financeira: as USs dizem que o VE já sabe do bloqueio financeiro (consulta de asset). Esta consulta pode ser trocada por variáveis de entrada da jornada (indicador + lista de faturas); nesse caso a etapa sai e a Decisão passa a ler as variáveis.'],
  [['DecImpedimento'], 'Ordem das condições (vale a primeira verdadeira): Massiva + atraso, Massiva + visita, Massiva, Atraso, Visita. Só existem as 5 telas do Figma: Atraso + visita cai em "Atraso em pagamentos" e as três juntas em "Massiva + atraso" (decisão de 03/11/2026). "Visita técnica agendada" = BD aberto; o horário da visita não vem na consulta de BD.'],
  [['FalhaConsulta'], 'SUGESTÃO (não está no Figma): Observação 3 das USs 1 e 2 — se não for possível consultar (ex.: API indisponível), orientar o cliente a procurar o atendimento Vivo. Usada por todas as integrações que falham de vez.'],
  [['AguardaDiagnostico', 'DecIdDiagnostico'], 'Adotado em 03/11/2026: prazo de 3 minutos (as USs pedem 30 s, mas a tela avisa que o teste "pode levar alguns minutos"). Sem resposta no prazo segue para a abertura de BD, como no Figma ("sem resposta"). IDs: 06/07/10 → reiniciar de novo; 09 → sem energia; 01, 02, 08 ou qualquer outro → abertura de BD (US 4 e Figma). A mensagem precisa trazer o correlationId da instância e o ID em payload.data.idRetorno; formato do ID (06, ID06 ou número) a confirmar no data mapping.'],
  [['AgendarVisita', 'HorarioOcupado', 'CriaBD', 'CancelaWO', 'BDNaoCriado'], 'Abertura de BD — origem: US 5 (consulta de horários no WFM), US 6 (criação da WO), US 7 (horário ocupado → volta para a consulta de horários), US 8 (BD não criado → informar falha e cancelar a WO sem aguardar resposta), US 9 (BD criado). "Horário ocupado" e "BD não criado" são telas criadas aqui, não existem no Figma. Falha técnica na criação do BD também cancela a WO (não definido nas USs).'],
  [['EscolheHorario'], 'Layout do Figma mantido: data, lista de períodos e aceite de aviso. A lista vem da consulta ao WFM uma vez só; trocar a data não refaz a lista (o catálogo não filtra uma lista por outro campo da mesma tela). O endereço que o Figma mostra no topo não está nos dados da jornada. O aceite "horário mais cedo" não existe nas USs nem no contrato do WFM; fica em form.avisarHorarioMaisCedo.'],
  [['StatusMassivaAtraso', 'StatusMassivaVisita', 'StatusMassiva', 'StatusAtraso', 'StatusVisita', 'InternetVoltou', 'RedeEletrica', 'VisitaAgendada'], 'Botões "Ir pra Central de faturas", "Ir pra Central de visitas", "Salvar na agenda" e "Ir para o início" levam a áreas do app fora deste fluxo. Por isso concluem a etapa e a jornada termina; quem leva o cliente ao destino é o VE.'],
  [['InternetVoltou', 'VisitaAgendada'], 'O Figma mostra "Protocolo" em "Sua internet voltou" e as USs pedem que o VE informe o ID do BD e da WO ao cliente, mas a tela de sucesso do Figma só mostra data e período. Ficou como no Figma; o número do BD está em data.bdCriadoNumero e o da WO em data.woNumero.'],
];

// --- Layout (ELK) -----------------------------------------------------------------------------
const SIZE = { START: 52, END: 52, GATEWAY: 50, USER_TASK: 78, SERVICE_TASK: 78, RECEIVE_TASK: 78 };
const NOTE_WIDTH = 190;

async function layout() {
  const sectionOf = new Map(sections.flatMap((s) => s.nodeIds.map((id) => [id, s.id])));
  const leaf = (n) => ({ id: n.nodeId, width: SIZE[n.nodeType], height: SIZE[n.nodeType] });
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70', 'elk.spacing.nodeNode': '50', 'elk.padding': '[top=60,left=40,bottom=40,right=40]',
    },
    children: [
      ...nodes.filter((n) => !sectionOf.has(n.nodeId)).map(leaf),
      ...sections.map((s) => ({ id: s.id, layoutOptions: { 'elk.padding': '[top=50,left=30,bottom=30,right=30]' }, children: nodes.filter((n) => sectionOf.get(n.nodeId) === s.id).map(leaf) })),
    ],
    edges: connections.map((e) => ({ id: e.connectionId, sources: [e.sourceNodeId], targets: [e.targetNodeId] })),
  };
  const res = await new ELK().layout(graph);
  const abs = new Map();
  const walk = (g, ox, oy) => (g.children ?? []).forEach((ch) => { abs.set(ch.id, [ox + ch.x, oy + ch.y]); walk(ch, ox + ch.x, oy + ch.y); });
  walk(res, 0, 400);
  for (const n of nodes) [n.positionX, n.positionY] = abs.get(n.nodeId).map(Math.round);
  // Notas numa faixa acima do fluxo, na altura de cada primeira etapa ligada.
  return notes.map(([linked, value], i) => {
    const first = abs.get(`Node_${linked[0]}`);
    return { id: `Annotation_${i + 1}`, text: value, positionX: Math.round(first[0]), positionY: 40 + (i % 2) * 170, linkedNodeIds: linked.map((l) => `Node_${l}`) };
  });
}

async function main() {
  const annotations = await layout();
  const token = await login();
  const product = await api('GET', `/products/${VE_PRODUCT_ID}`, token);
  const journey = await ensureJourney(token, {
    productId: product.productId, channelTypes: ['MOBILE'], name: 'Abertura de BD pelo VE',
    description: 'Autoatendimento de suporte técnico FTTH B2B (FTAT-933): verifica pendência financeira, massiva e BD aberto; sem impedimento, conduz reinício do modem e diagnóstico automático (HPSD); se o problema continuar, agenda a visita técnica e abre o BD.',
  });
  console.log('journeyId:', journey.journeyId);
  const published = await publishNewFlow(token, journey.journeyId, { name: 'Fluxo Abertura de BD pelo VE', nodes, connections, annotations, sections },
    'A partir do Figma "Abertura de BD - App" e das USs FTAT-933, com conectores mockados');
  console.log('Publicado:', published.status, 'v' + published.versionNumber, '| etapas:', nodes.length, '| ligações:', connections.length);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
