// Jornada "Consulta BD" do produto VE (Vivo Empresas): o cliente informa o CNPJ e o motor verifica
// bilhete de defeito aberto, pendência financeira "Aguardando pagamento" e manutenção massiva
// "Programada" (ms-mock-api-rest, porta 8084). Havendo alguma, mostra a tela de detalhes dela; senão
// solicita uma avaliação de diagnóstico (REST), aguarda o retorno pelo Kafka e mostra o resultado.
//
// Publica DUAS versões da mesma jornada, pra comparar os dois desenhos:
//   v "em sequência"   — consulta e decide uma a uma, parando na primeira situação encontrada.
//   v "consulta as 3"  — faz as três consultas antes e só depois decide (três Decisões em cadeia,
//                         já que uma Decisão só tem dois caminhos — FlowValidator).
// Prioridade nas duas: bilhete > pendência > massiva.
//
// O CNPJ 45537128000127 tem as três situações no mock (status da pendência/massiva é sorteado);
// qualquer outro CNPJ devolve 404 nas três e segue pro diagnóstico.
//
// Rode com: node jornada_consulta_bd_ve.mjs

import {
  login, ensureProduct, ensureJourney, publishNewFlow,
  startNode, endNode, userTaskNode, gatewayNode, serviceTaskNode, receiveTaskNode, connection,
  text, textInput, submitButton, card, stack, alert, divider,
} from './sdui_helpers.mjs';

const MOCK = 'http://localhost:8084/v1';
const KAFKA_LOCAL = '6590dbdc-6ab8-433f-9baf-0c271486157b';

// positionX/Y é o canto superior-esquerdo; centraliza pelo tamanho de cada tipo (ver layoutRow).
const SIZE = { START: 52, END: 52, GATEWAY: 50, USER_TASK: 78, SERVICE_TASK: 78, RECEIVE_TASK: 78 };
const MAIN_Y = 320;
const BRANCH_Y = 140;
const GAP = 70;

// Monta posições: `main` é a linha principal (esquerda→direita); `branches` pendura, acima de cada
// Decisão, a tela de detalhes e o fim daquele desvio.
function layout(main, branches) {
  const pos = {};
  let x = 80;
  for (const [id, type] of main) {
    pos[id] = [x, MAIN_Y - SIZE[type] / 2];
    x += SIZE[type] + GAP;
  }
  for (const [gatewayId, screenId, endId] of branches) {
    const gx = pos[gatewayId][0];
    pos[screenId] = [gx - 14, BRANCH_Y - SIZE.USER_TASK / 2];
    pos[endId] = [gx - 14 + SIZE.USER_TASK + GAP, BRANCH_Y - SIZE.END / 2];
  }
  return pos;
}

const row = (id, label, variable) => text(id, `${label}: {{data.${variable}}}`, 'body');

// --- Integrações --------------------------------------------------------------------------------

const out = (name, jsonPath, type = 'string') => ({ name, jsonPath, type });

const consultaBd = (P) => serviceTaskNode('Node_ConsultaBD', 'Consulta bilhete de defeito', 'Verifica se o CNPJ tem um bilhete de defeito em atendimento.', ...P.Node_ConsultaBD,
  'REST', {
    method: 'GET',
    url: `${MOCK}/clientes/{{form_cnpj}}/bilhetes-defeito`,
    headers: { Accept: 'application/json' },
    outputMapping: [
      out('bdHttpStatus', '$httpStatus', 'number'),
      out('bdNumero', '$.numeroBilhete'),
      out('bdStatus', '$.status'),
      out('bdTipoDefeito', '$.tipoDefeito'),
      out('bdDescricao', '$.descricao'),
      out('bdPrioridade', '$.prioridade'),
      out('bdCanalAbertura', '$.canalAbertura'),
      out('bdProtocoloAtendimento', '$.protocoloAtendimento'),
      out('bdDataAbertura', '$.dataAbertura'),
      out('bdPrevisaoConclusao', '$.previsaoConclusao'),
      out('bdTecnicoResponsavel', '$.tecnicoResponsavel'),
      out('bdLogradouro', '$.enderecoInstalacao.logradouro'),
      out('bdBairro', '$.enderecoInstalacao.bairro'),
      out('bdCidade', '$.enderecoInstalacao.cidade'),
      out('bdUf', '$.enderecoInstalacao.uf'),
      out('bdCep', '$.enderecoInstalacao.cep'),
      out('bdEquipamentoTipo', '$.equipamento.tipo'),
      out('bdEquipamentoModelo', '$.equipamento.modelo'),
      out('bdEquipamentoNumeroSerie', '$.equipamento.numeroSerie'),
    ],
  });

const consultaPendencia = (P) => serviceTaskNode('Node_ConsultaPendencia', 'Consulta pendência financeira', 'Verifica se o CNPJ tem pendência financeira.', ...P.Node_ConsultaPendencia,
  'REST', {
    method: 'GET',
    url: `${MOCK}/clientes/{{form_cnpj}}/pendencias-financeiras`,
    headers: { Accept: 'application/json' },
    outputMapping: [
      out('pendenciaHttpStatus', '$httpStatus', 'number'),
      out('pendenciaNumero', '$.numeroPendencia'),
      out('pendenciaStatusCobranca', '$.statusCobranca'),
      out('pendenciaValor', '$.valorPendente', 'number'),
      out('pendenciaDataVencimento', '$.dataVencimento'),
      out('pendenciaDiasEmAtraso', '$.diasEmAtraso', 'number'),
      out('pendenciaFormaPagamento', '$.formaPagamentoDisponivel'),
      out('pendenciaLinhaDigitavel', '$.linhaDigitavel'),
      // ponytail: só a fatura mais recente vira variável; lista completa exige componente de lista.
      out('pendenciaFaturaReferencia', '$.faturasPendentes[0].referencia'),
      out('pendenciaFaturaValor', '$.faturasPendentes[0].valor', 'number'),
      out('pendenciaFaturaVencimento', '$.faturasPendentes[0].vencimento'),
    ],
  });

const consultaMassiva = (P) => serviceTaskNode('Node_ConsultaMassiva', 'Consulta manutenção massiva', 'Verifica se há manutenção massiva na região do CNPJ.', ...P.Node_ConsultaMassiva,
  'REST', {
    method: 'GET',
    url: `${MOCK}/clientes/{{form_cnpj}}/manutencoes-massivas`,
    headers: { Accept: 'application/json' },
    outputMapping: [
      out('massivaHttpStatus', '$httpStatus', 'number'),
      out('massivaProtocolo', '$.protocoloManutencao'),
      out('massivaTipo', '$.tipoManutencao'),
      out('massivaStatus', '$.statusManutencao'),
      out('massivaRegiao', '$.regiaoAfetada'),
      out('massivaImpacto', '$.impacto'),
      out('massivaDataInicio', '$.dataInicio'),
      out('massivaPrevisaoConclusao', '$.previsaoConclusao'),
      out('massivaClientesAfetados', '$.quantidadeClientesAfetados', 'number'),
    ],
  });

const solicitarDiagnostico = (P) => serviceTaskNode('Node_SolicitarDiagnostico', 'Solicita avaliação de diagnóstico', 'Pede a avaliação de conectividade e saúde do sinal do cliente.', ...P.Node_SolicitarDiagnostico,
  'REST', {
    method: 'POST',
    url: `${MOCK}/diagnosticos/solicitacoes`,
    headers: { 'Content-Type': 'application/json' },
    body: { cnpj: '{{form_cnpj}}', tipoAvaliacao: 'CONECTIVIDADE_E_SINAL' },
    outputMapping: [
      out('diagnosticoProtocolo', '$.protocolo'),
      out('diagnosticoStatusSolicitacao', '$.status'),
      out('diagnosticoPrevisaoRetorno', '$.previsaoRetorno'),
    ],
  });

// O validador exige declarar as variáveis que a tela de resultado usa. No Kafka o jsonPath é lido
// contra o envelope inteiro (correlationId/messageName/payload), por isso o $.payload.data.<campo>;
// campo ausente na mensagem só gera aviso no log (KafkaConnectorWorker.resolveOutputMapping).
const DIAGNOSTICO_CAMPOS = [
  ['statusConexao'], ['qualidadeSinal'], ['conclusao'], ['recomendacao'],
  ['velocidadeContratadaMbps', 'number'], ['velocidadeDownloadMbps', 'number'], ['velocidadeUploadMbps', 'number'],
  ['latenciaMs', 'number'], ['jitterMs', 'number'], ['perdaPacotesPercentual', 'number'],
  ['potenciaSinalOpticoDbm', 'number'], ['snrDb', 'number'], ['disponibilidade30dPercentual', 'number'],
  ['quedasUltimas24h', 'number'], ['ultimaQuedaEm'], ['statusEquipamento'],
];
const aguardaDiagnostico = (P) => receiveTaskNode('Node_AguardaDiagnostico', 'Aguarda resultado do diagnóstico', 'Aguarda o retorno da avaliação de diagnóstico pelo Kafka.', ...P.Node_AguardaDiagnostico,
  'KAFKA', {
    operation: 'CONSUME', topic: 'eljy.eventos.entrada', clusterId: KAFKA_LOCAL,
    outputMapping: DIAGNOSTICO_CAMPOS.map(([campo, type]) => out(campo, `$.payload.data.${campo}`, type)),
  }, 'teste');

// --- Telas --------------------------------------------------------------------------------------

const telaCnpj = (P) => userTaskNode('Node_InformaCnpj', 'Informe o CNPJ', 'Coleta o CNPJ da empresa.', ...P.Node_InformaCnpj, 'informa-cnpj', 'Suporte Vivo Empresas', [
  text('text_cnpj_titulo', 'Vamos verificar a situação da sua empresa', 'title'),
  text('text_cnpj_corpo', 'Informe o CNPJ para consultarmos chamados técnicos, pendências financeiras e manutenções na sua região.', 'body'),
  textInput('input_cnpj', 'CNPJ (somente números)', 'cnpj', { placeholder: '00000000000000', inputMode: 'number', maxLength: 14 }),
  submitButton('button_cnpj_consultar', 'Consultar'),
]);

const telaBd = (P) => userTaskNode('Node_TelaBD', 'Bilhete de defeito aberto', 'Mostra os detalhes do bilhete de defeito em atendimento.', ...P.Node_TelaBD, 'tela-bd', 'Bilhete de defeito em atendimento', [
  text('text_bd_titulo', 'Você já tem um bilhete de defeito aberto', 'title'),
  alert('alert_bd_status', 'warning', 'Bilhete {{data.bdNumero}} — status: {{data.bdStatus}}. Não é preciso abrir um novo chamado.', { title: 'Chamado em andamento' }),
  card('card_bd_defeito', [stack('stack_bd_defeito', [
    text('text_bd_sec_defeito', 'Defeito', 'heading'),
    row('text_bd_tipo', 'Tipo', 'bdTipoDefeito'),
    row('text_bd_descricao', 'Descrição', 'bdDescricao'),
    row('text_bd_prioridade', 'Prioridade', 'bdPrioridade'),
    row('text_bd_canal', 'Canal de abertura', 'bdCanalAbertura'),
    row('text_bd_protocolo', 'Protocolo de atendimento', 'bdProtocoloAtendimento'),
  ])]),
  card('card_bd_prazos', [stack('stack_bd_prazos', [
    text('text_bd_sec_prazos', 'Prazos e responsável', 'heading'),
    row('text_bd_abertura', 'Aberto em', 'bdDataAbertura'),
    row('text_bd_previsao', 'Previsão de conclusão', 'bdPrevisaoConclusao'),
    row('text_bd_tecnico', 'Técnico responsável', 'bdTecnicoResponsavel'),
  ])]),
  card('card_bd_local', [stack('stack_bd_local', [
    text('text_bd_sec_local', 'Local e equipamento', 'heading'),
    text('text_bd_endereco', 'Endereço: {{data.bdLogradouro}}, {{data.bdBairro}} — {{data.bdCidade}}/{{data.bdUf}}, CEP {{data.bdCep}}', 'body'),
    text('text_bd_equipamento', 'Equipamento: {{data.bdEquipamentoTipo}} {{data.bdEquipamentoModelo}} (série {{data.bdEquipamentoNumeroSerie}})', 'body'),
  ])]),
  submitButton('button_bd_concluir', 'Entendi'),
]);

const telaPendencia = (P) => userTaskNode('Node_TelaPendencia', 'Pendência aguardando pagamento', 'Mostra os detalhes da pendência financeira.', ...P.Node_TelaPendencia, 'tela-pendencia', 'Pendência financeira', [
  text('text_pf_titulo', 'Existe uma pendência aguardando pagamento', 'title'),
  alert('alert_pf_status', 'warning', 'Pendência {{data.pendenciaNumero}} — {{data.pendenciaStatusCobranca}}.', { title: 'Regularize para seguir com o atendimento' }),
  card('card_pf_valores', [stack('stack_pf_valores', [
    text('text_pf_sec_valores', 'Valores', 'heading'),
    text('text_pf_valor', 'Valor pendente: R$ {{data.pendenciaValor}}', 'body'),
    row('text_pf_vencimento', 'Vencimento', 'pendenciaDataVencimento'),
    text('text_pf_atraso', 'Dias em atraso: {{data.pendenciaDiasEmAtraso}}', 'body'),
  ])]),
  card('card_pf_fatura', [stack('stack_pf_fatura', [
    text('text_pf_sec_fatura', 'Fatura mais recente', 'heading'),
    row('text_pf_fat_ref', 'Referência', 'pendenciaFaturaReferencia'),
    text('text_pf_fat_valor', 'Valor: R$ {{data.pendenciaFaturaValor}}', 'body'),
    row('text_pf_fat_venc', 'Vencimento', 'pendenciaFaturaVencimento'),
  ])]),
  card('card_pf_pagamento', [stack('stack_pf_pagamento', [
    text('text_pf_sec_pagamento', 'Como pagar', 'heading'),
    row('text_pf_forma', 'Forma de pagamento disponível', 'pendenciaFormaPagamento'),
    row('text_pf_linha', 'Linha digitável', 'pendenciaLinhaDigitavel'),
  ])]),
  submitButton('button_pf_concluir', 'Entendi'),
]);

const telaMassiva = (P) => userTaskNode('Node_TelaMassiva', 'Manutenção massiva programada', 'Mostra os detalhes da manutenção massiva na região.', ...P.Node_TelaMassiva, 'tela-massiva', 'Manutenção programada na sua região', [
  text('text_mm_titulo', 'Há uma manutenção programada na sua região', 'title'),
  alert('alert_mm_status', 'informative', 'Protocolo {{data.massivaProtocolo}} — {{data.massivaStatus}}. O serviço volta ao normal ao fim da manutenção.', { title: 'Manutenção massiva' }),
  card('card_mm_detalhes', [stack('stack_mm_detalhes', [
    text('text_mm_sec_detalhes', 'Detalhes', 'heading'),
    row('text_mm_tipo', 'Tipo', 'massivaTipo'),
    row('text_mm_impacto', 'Impacto esperado', 'massivaImpacto'),
    row('text_mm_regiao', 'Região afetada', 'massivaRegiao'),
    text('text_mm_clientes', 'Clientes afetados: {{data.massivaClientesAfetados}}', 'body'),
  ])]),
  card('card_mm_prazos', [stack('stack_mm_prazos', [
    text('text_mm_sec_prazos', 'Prazos', 'heading'),
    row('text_mm_inicio', 'Início', 'massivaDataInicio'),
    row('text_mm_previsao', 'Previsão de conclusão', 'massivaPrevisaoConclusao'),
  ])]),
  submitButton('button_mm_concluir', 'Entendi'),
]);

// Campos do resultado vêm do payload.data da mensagem Kafka (data_<campo>).
const telaDiagnostico = (P) => userTaskNode('Node_TelaDiagnostico', 'Resultado do diagnóstico', 'Mostra o resultado da avaliação de conectividade e saúde do sinal.', ...P.Node_TelaDiagnostico, 'tela-diagnostico', 'Resultado do diagnóstico', [
  text('text_dg_titulo', 'Resultado do diagnóstico da sua conexão', 'title'),
  alert('alert_dg_conclusao', 'informative', '{{data.conclusao}}', { title: 'Conexão: {{data.statusConexao}} — sinal {{data.qualidadeSinal}}' }),
  row('text_dg_protocolo', 'Protocolo do diagnóstico', 'diagnosticoProtocolo'),
  card('card_dg_desempenho', [stack('stack_dg_desempenho', [
    text('text_dg_sec_desempenho', 'Desempenho da conexão', 'heading'),
    text('text_dg_download', 'Download: {{data.velocidadeDownloadMbps}} Mbps (contratado: {{data.velocidadeContratadaMbps}} Mbps)', 'body'),
    text('text_dg_upload', 'Upload: {{data.velocidadeUploadMbps}} Mbps', 'body'),
    text('text_dg_latencia', 'Latência: {{data.latenciaMs}} ms — jitter: {{data.jitterMs}} ms', 'body'),
    text('text_dg_perda', 'Perda de pacotes: {{data.perdaPacotesPercentual}}%', 'body'),
  ])]),
  card('card_dg_sinal', [stack('stack_dg_sinal', [
    text('text_dg_sec_sinal', 'Saúde do sinal', 'heading'),
    text('text_dg_potencia', 'Potência do sinal óptico: {{data.potenciaSinalOpticoDbm}} dBm', 'body'),
    text('text_dg_snr', 'Relação sinal/ruído (SNR): {{data.snrDb}} dB', 'body'),
    text('text_dg_disponibilidade', 'Disponibilidade nos últimos 30 dias: {{data.disponibilidade30dPercentual}}%', 'body'),
    text('text_dg_quedas', 'Quedas nas últimas 24h: {{data.quedasUltimas24h}} (última em {{data.ultimaQuedaEm}})', 'body'),
    row('text_dg_equipamento', 'Equipamento', 'statusEquipamento'),
  ])]),
  divider('div_dg'),
  row('text_dg_recomendacao', 'Recomendação', 'recomendacao'),
  submitButton('button_dg_concluir', 'Concluir'),
]);

const branchEnd = (id, name, P) => endNode(id, name, ...P[id], name);

const IS_BD = '{{data_bdHttpStatus}} == 200';
const IS_PENDENCIA = '{{data_pendenciaStatusCobranca}} == "Aguardando pagamento"';
const IS_MASSIVA = '{{data_massivaStatus}} == "Programada"';

// Trecho comum às duas versões: telas de detalhe (cada uma com seu fim) + caminho do diagnóstico.
function tail(P) {
  return {
    nodes: [
      telaBd(P), branchEnd('Node_End_BD', 'Fim — bilhete aberto', P),
      telaPendencia(P), branchEnd('Node_End_Pendencia', 'Fim — pendência', P),
      telaMassiva(P), branchEnd('Node_End_Massiva', 'Fim — manutenção massiva', P),
      solicitarDiagnostico(P), aguardaDiagnostico(P), telaDiagnostico(P),
      endNode('Node_End_Diagnostico', 'Fim — diagnóstico', ...P.Node_End_Diagnostico, 'Diagnóstico apresentado'),
    ],
    connections: [
      connection('Flow_TelaBD_End', 'Node_TelaBD', 'Node_End_BD'),
      connection('Flow_TelaPendencia_End', 'Node_TelaPendencia', 'Node_End_Pendencia'),
      connection('Flow_TelaMassiva_End', 'Node_TelaMassiva', 'Node_End_Massiva'),
      connection('Flow_Solicitar_Aguarda', 'Node_SolicitarDiagnostico', 'Node_AguardaDiagnostico'),
      connection('Flow_Aguarda_TelaDiag', 'Node_AguardaDiagnostico', 'Node_TelaDiagnostico'),
      connection('Flow_TelaDiag_End', 'Node_TelaDiagnostico', 'Node_End_Diagnostico'),
    ],
  };
}

const BRANCHES = [
  ['Node_DecBD', 'Node_TelaBD', 'Node_End_BD'],
  ['Node_DecPendencia', 'Node_TelaPendencia', 'Node_End_Pendencia'],
  ['Node_DecMassiva', 'Node_TelaMassiva', 'Node_End_Massiva'],
];
const DIAG_TAIL = [
  ['Node_SolicitarDiagnostico', 'SERVICE_TASK'], ['Node_AguardaDiagnostico', 'RECEIVE_TASK'],
  ['Node_TelaDiagnostico', 'USER_TASK'], ['Node_End_Diagnostico', 'END'],
];

function versaoSequencial() {
  const P = layout([
    ['Node_Start', 'START'], ['Node_InformaCnpj', 'USER_TASK'],
    ['Node_ConsultaBD', 'SERVICE_TASK'], ['Node_DecBD', 'GATEWAY'],
    ['Node_ConsultaPendencia', 'SERVICE_TASK'], ['Node_DecPendencia', 'GATEWAY'],
    ['Node_ConsultaMassiva', 'SERVICE_TASK'], ['Node_DecMassiva', 'GATEWAY'],
    ...DIAG_TAIL,
  ], BRANCHES);
  const t = tail(P);
  return {
    nodes: [
      startNode('Node_Start', 'Início', ...P.Node_Start), telaCnpj(P),
      consultaBd(P), gatewayNode('Node_DecBD', 'Tem bilhete aberto?', ...P.Node_DecBD, 'Desvia para os detalhes do bilhete se a consulta encontrou um.'),
      consultaPendencia(P), gatewayNode('Node_DecPendencia', 'Pendência aguardando pagamento?', ...P.Node_DecPendencia, 'Desvia para os detalhes da pendência se ela está aguardando pagamento.'),
      consultaMassiva(P), gatewayNode('Node_DecMassiva', 'Massiva programada?', ...P.Node_DecMassiva, 'Desvia para os detalhes da manutenção se ela está programada.'),
      ...t.nodes,
    ],
    connections: [
      connection('Flow_Start_Cnpj', 'Node_Start', 'Node_InformaCnpj'),
      connection('Flow_Cnpj_ConsultaBD', 'Node_InformaCnpj', 'Node_ConsultaBD'),
      connection('Flow_ConsultaBD_DecBD', 'Node_ConsultaBD', 'Node_DecBD'),
      connection('Flow_DecBD_TelaBD', 'Node_DecBD', 'Node_TelaBD', { condition: IS_BD }),
      connection('Flow_DecBD_ConsultaPendencia', 'Node_DecBD', 'Node_ConsultaPendencia', { isDefault: true }),
      connection('Flow_ConsultaPendencia_DecPendencia', 'Node_ConsultaPendencia', 'Node_DecPendencia'),
      connection('Flow_DecPendencia_TelaPendencia', 'Node_DecPendencia', 'Node_TelaPendencia', { condition: IS_PENDENCIA }),
      connection('Flow_DecPendencia_ConsultaMassiva', 'Node_DecPendencia', 'Node_ConsultaMassiva', { isDefault: true }),
      connection('Flow_ConsultaMassiva_DecMassiva', 'Node_ConsultaMassiva', 'Node_DecMassiva'),
      connection('Flow_DecMassiva_TelaMassiva', 'Node_DecMassiva', 'Node_TelaMassiva', { condition: IS_MASSIVA }),
      connection('Flow_DecMassiva_Solicitar', 'Node_DecMassiva', 'Node_SolicitarDiagnostico', { isDefault: true }),
      ...t.connections,
    ],
  };
}

function versaoConsultaAs3() {
  const P = layout([
    ['Node_Start', 'START'], ['Node_InformaCnpj', 'USER_TASK'],
    ['Node_ConsultaBD', 'SERVICE_TASK'], ['Node_ConsultaPendencia', 'SERVICE_TASK'], ['Node_ConsultaMassiva', 'SERVICE_TASK'],
    ['Node_DecBD', 'GATEWAY'], ['Node_DecPendencia', 'GATEWAY'], ['Node_DecMassiva', 'GATEWAY'],
    ...DIAG_TAIL,
  ], BRANCHES);
  const t = tail(P);
  return {
    nodes: [
      startNode('Node_Start', 'Início', ...P.Node_Start), telaCnpj(P),
      consultaBd(P), consultaPendencia(P), consultaMassiva(P),
      gatewayNode('Node_DecBD', 'Tem bilhete aberto?', ...P.Node_DecBD, 'Prioridade 1: bilhete de defeito em atendimento.'),
      gatewayNode('Node_DecPendencia', 'Pendência aguardando pagamento?', ...P.Node_DecPendencia, 'Prioridade 2: pendência financeira aguardando pagamento.'),
      gatewayNode('Node_DecMassiva', 'Massiva programada?', ...P.Node_DecMassiva, 'Prioridade 3: manutenção massiva programada.'),
      ...t.nodes,
    ],
    connections: [
      connection('Flow_Start_Cnpj', 'Node_Start', 'Node_InformaCnpj'),
      connection('Flow_Cnpj_ConsultaBD', 'Node_InformaCnpj', 'Node_ConsultaBD'),
      connection('Flow_ConsultaBD_ConsultaPendencia', 'Node_ConsultaBD', 'Node_ConsultaPendencia'),
      connection('Flow_ConsultaPendencia_ConsultaMassiva', 'Node_ConsultaPendencia', 'Node_ConsultaMassiva'),
      connection('Flow_ConsultaMassiva_DecBD', 'Node_ConsultaMassiva', 'Node_DecBD'),
      connection('Flow_DecBD_TelaBD', 'Node_DecBD', 'Node_TelaBD', { condition: IS_BD }),
      connection('Flow_DecBD_DecPendencia', 'Node_DecBD', 'Node_DecPendencia', { isDefault: true }),
      connection('Flow_DecPendencia_TelaPendencia', 'Node_DecPendencia', 'Node_TelaPendencia', { condition: IS_PENDENCIA }),
      connection('Flow_DecPendencia_DecMassiva', 'Node_DecPendencia', 'Node_DecMassiva', { isDefault: true }),
      connection('Flow_DecMassiva_TelaMassiva', 'Node_DecMassiva', 'Node_TelaMassiva', { condition: IS_MASSIVA }),
      connection('Flow_DecMassiva_Solicitar', 'Node_DecMassiva', 'Node_SolicitarDiagnostico', { isDefault: true }),
      ...t.connections,
    ],
  };
}

async function main() {
  const token = await login();
  const channelTypes = ['WEB', 'MOBILE', 'WHATSAPP'];

  // Produto "VE" já existia no ambiente local (Vivo Empresas, três canais) — reaproveitado.
  const product = await ensureProduct(token, { name: 'VE', description: 'Vivo Empresas', channelTypes });
  const journey = await ensureJourney(token, {
    productId: product.productId, channelTypes, name: 'Consulta BD',
    description: 'Consulta pelo CNPJ se a empresa tem bilhete de defeito aberto, pendência aguardando pagamento ou manutenção massiva programada; se não tiver, solicita e apresenta um diagnóstico de conectividade.',
  });

  for (const [descricao, build] of [
    ['Consulta BD — em sequência (para na primeira situação encontrada)', versaoSequencial],
    ['Consulta BD — consulta as 3 e decide depois', versaoConsultaAs3],
  ]) {
    const published = await publishNewFlow(token, journey.journeyId, { name: 'Fluxo Consulta BD', ...build() }, descricao);
    console.log('Publicado:', published.status, 'v' + published.versionNumber, '—', descricao);
  }
  console.log('journeyId:', journey.journeyId);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
