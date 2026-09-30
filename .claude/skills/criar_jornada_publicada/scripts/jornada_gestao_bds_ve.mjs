// Jornada "Gestão de BDs" do produto VE (Vivo Empresas) — exemplo da lista de seleção e das fontes de
// dados de referência (ADR-002). O cliente informa o CNPJ, vê os bilhetes de defeito em aberto (lista
// vinda de integração, gravada como variável do tipo lista), escolhe um e uma ação sobre ele —
// "Reagendar visita" ou "Cancelar bilhete", liberadas conforme o próprio bilhete (podeReagendar/
// podeCancelar, regra do sistema de origem). No reagendamento, os horários disponíveis vêm da fonte de
// dados "Agenda técnica", buscada quando a tela abre (não passam pelo fluxo).
//
// APIs do ms-mock-api-rest (porta 8084): GET /v1/clientes/{cnpj}/bilhetes (só 45537128000127 tem
// bilhetes), GET /v1/bilhetes/{numero}/horarios-disponiveis, POST .../reagendamento e .../cancelamento.
//
// Rode com: node jornada_gestao_bds_ve.mjs

import {
  api, login, ensureJourney, publishNewFlow, ensureDataSource,
  startNode, endNode, userTaskNode, gatewayNode, serviceTaskNode, connection,
  text, textInput, submitButton, alert, selectList, selectFromList,
} from './sdui_helpers.mjs';

const MOCK = 'http://localhost:8084/v1';
// Produto VE (Vivo Empresas) da massa de fábrica.
const VE_PRODUCT_ID = '66896bd3-f42d-4549-af38-df2c1c0e34df';

// positionX/Y é o canto superior-esquerdo; centraliza pelo tamanho de cada tipo.
const SIZE = { START: 52, END: 52, GATEWAY: 50, USER_TASK: 78, SERVICE_TASK: 78 };
const at = (x, centerY, type) => [x, Math.round(centerY - SIZE[type] / 2)];
const MAIN = 320;
const UP = 150;
const DOWN = 490;

async function main() {
  const token = await login();
  const channelTypes = ['WEB', 'MOBILE', 'WHATSAPP'];

  await ensureDataSource(token, {
    name: 'Agenda técnica',
    description: 'Horários livres da agenda técnica para reagendar a visita de um bilhete de defeito.',
    url: `${MOCK}/bilhetes/{bilhete}/horarios-disponiveis`,
    timeoutMs: 5000,
    itemsPath: '$.horarios',
    exposedFields: ['value', 'label'],
    credentialRef: null,
  });

  // Pelo id, não pelo nome: o produto VE da massa de fábrica pode ter sido renomeado no ambiente
  // (buscar por nome criava um produto "VE" duplicado).
  const product = await api('GET', `/products/${VE_PRODUCT_ID}`, token);
  const journey = await ensureJourney(token, {
    productId: product.productId, channelTypes, name: 'Gestão de BDs',
    description: 'Lista os bilhetes de defeito em aberto do CNPJ e deixa o cliente reagendar a visita técnica ou cancelar o bilhete, conforme o que cada bilhete permite.',
  });

  const nodes = [
    startNode('Node_Start', 'Início', ...at(80, MAIN, 'START')),

    userTaskNode('Node_InformaCnpj', 'Informe o CNPJ', 'Coleta o CNPJ da empresa.', ...at(190, MAIN, 'USER_TASK'), 'informa-cnpj', 'Seus bilhetes de defeito', [
      text('text_cnpj_titulo', 'Vamos buscar os bilhetes de defeito da sua empresa', 'title'),
      textInput('input_cnpj', 'CNPJ (somente números)', 'cnpj', { placeholder: '00000000000000', inputMode: 'text', maxLength: 14 }),
      submitButton('button_cnpj_consultar', 'Consultar bilhetes'),
    ]),

    serviceTaskNode('Node_ConsultaBilhetes', 'Consulta bilhetes em aberto', 'Busca os bilhetes de defeito em aberto do CNPJ.', ...at(340, MAIN, 'SERVICE_TASK'),
      'REST', {
        method: 'GET',
        url: `${MOCK}/clientes/{{form_cnpj}}/bilhetes`,
        headers: { Accept: 'application/json' },
        outputMapping: [
          { name: 'quantidadeBilhetes', jsonPath: '$.quantidade', type: 'number' },
          {
            name: 'bilhetes', jsonPath: '$.bilhetes', type: 'list',
            keepFields: ['numeroBilhete', 'tipoDefeito', 'status', 'prioridade', 'dataAbertura', 'previsaoConclusao', 'podeReagendar', 'podeCancelar', 'motivoBloqueio'],
          },
        ],
      }),

    gatewayNode('Node_DecTemBilhetes', 'Tem bilhetes em aberto?', ...at(490, MAIN, 'GATEWAY'), 'Sem bilhetes, avisa e encerra.'),

    userTaskNode('Node_SemBilhetes', 'Nenhum bilhete em aberto', 'Informa que não há bilhetes.', ...at(560, UP, 'USER_TASK'), 'sem-bilhetes', 'Nenhum bilhete em aberto', [
      alert('alert_sem_bilhetes', 'positive', 'Não encontramos bilhetes de defeito em aberto para este CNPJ.', { title: 'Tudo certo por aqui' }),
      submitButton('button_sem_bilhetes', 'Concluir'),
    ]),
    endNode('Node_End_SemBilhetes', 'Fim — sem bilhetes', ...at(700, UP, 'END')),

    userTaskNode('Node_EscolheBilhete', 'Escolha o bilhete e a ação', 'Lista os bilhetes e as ações liberadas para cada um.', ...at(600, MAIN, 'USER_TASK'), 'escolhe-bilhete', 'Seus bilhetes de defeito', [
      text('text_bilhetes_titulo', 'Escolha o bilhete e o que deseja fazer', 'title'),
      selectList('lista_bilhetes', 'Bilhetes em aberto', 'data.bilhetes', 'bilheteSelecionado', {
        itemValue: 'numeroBilhete',
        itemTitle: '{{item.tipoDefeito}} — {{item.prioridade}}',
        itemDescription: '{{item.numeroBilhete}} · {{item.status}} · aberto em {{item.dataAbertura}}',
        itemHint: '{{item.motivoBloqueio}}',
        emptyMessage: 'Você não tem bilhetes em aberto.',
        actionVar: 'acaoBilhete',
        actions: [
          { id: 'reagendar', label: 'Reagendar visita', variant: 'primary', enabledWhen: '{{item.podeReagendar}} == true' },
          { id: 'cancelar', label: 'Cancelar bilhete', variant: 'danger', enabledWhen: '{{item.podeCancelar}} == true' },
        ],
      }),
    ]),

    gatewayNode('Node_DecAcao', 'Reagendar ou cancelar?', ...at(750, MAIN, 'GATEWAY'), 'Segue a ação escolhida para o bilhete.'),

    // Reagendamento: horários vêm da fonte de dados (dado de referência), buscados ao abrir a tela.
    userTaskNode('Node_EscolheHorario', 'Escolha o novo horário', 'Horários livres da agenda técnica.', ...at(840, UP, 'USER_TASK'), 'escolhe-horario', 'Reagendar visita técnica', [
      text('text_horario_titulo', 'Escolha um novo horário para o bilhete {{form.bilheteSelecionado}}', 'title'),
      selectFromList('select_horario', 'Horários disponíveis', 'horarioEscolhido', 'data.horarios'),
      submitButton('button_horario_confirmar', 'Confirmar reagendamento'),
    ], [
      { alias: 'horarios', source: 'Agenda técnica', params: { bilhete: '{{form_bilheteSelecionado}}' }, required: true, errorMessage: 'Não foi possível carregar os horários disponíveis agora.' },
    ]),
    serviceTaskNode('Node_Reagendar', 'Reagenda a visita', 'Confirma o novo horário no sistema de campo.', ...at(990, UP, 'SERVICE_TASK'),
      'REST', {
        method: 'POST',
        url: `${MOCK}/bilhetes/{{form_bilheteSelecionado}}/reagendamento`,
        headers: { 'Content-Type': 'application/json' },
        body: { horario: '{{form_horarioEscolhido}}' },
        outputMapping: [{ name: 'protocoloReagendamento', jsonPath: '$.protocolo', type: 'string' }],
      }),
    userTaskNode('Node_Reagendado', 'Visita reagendada', 'Confirma o reagendamento.', ...at(1140, UP, 'USER_TASK'), 'reagendado', 'Visita reagendada', [
      alert('alert_reagendado', 'positive', 'Bilhete {{form.bilheteSelecionado}} reagendado. Protocolo {{data.protocoloReagendamento}}.', { title: 'Tudo certo' }),
      submitButton('button_reagendado', 'Concluir'),
    ]),
    endNode('Node_End_Reagendado', 'Fim — reagendado', ...at(1290, UP, 'END')),

    serviceTaskNode('Node_Cancelar', 'Cancela o bilhete', 'Cancela o bilhete no sistema de origem.', ...at(840, DOWN, 'SERVICE_TASK'),
      'REST', {
        method: 'POST',
        url: `${MOCK}/bilhetes/{{form_bilheteSelecionado}}/cancelamento`,
        headers: { 'Content-Type': 'application/json' },
        body: { motivo: 'Solicitado pelo cliente' },
        outputMapping: [{ name: 'protocoloCancelamento', jsonPath: '$.protocolo', type: 'string' }],
      }),
    userTaskNode('Node_Cancelado', 'Bilhete cancelado', 'Confirma o cancelamento.', ...at(990, DOWN, 'USER_TASK'), 'cancelado', 'Bilhete cancelado', [
      alert('alert_cancelado', 'positive', 'Bilhete {{form.bilheteSelecionado}} cancelado. Protocolo {{data.protocoloCancelamento}}.', { title: 'Cancelamento registrado' }),
      submitButton('button_cancelado', 'Concluir'),
    ]),
    endNode('Node_End_Cancelado', 'Fim — cancelado', ...at(1140, DOWN, 'END')),
  ];

  const connections = [
    connection('Flow_Start_Cnpj', 'Node_Start', 'Node_InformaCnpj'),
    connection('Flow_Cnpj_Consulta', 'Node_InformaCnpj', 'Node_ConsultaBilhetes'),
    connection('Flow_Consulta_DecTem', 'Node_ConsultaBilhetes', 'Node_DecTemBilhetes'),
    connection('Flow_DecTem_SemBilhetes', 'Node_DecTemBilhetes', 'Node_SemBilhetes', { condition: '{{data_quantidadeBilhetes}} == 0' }),
    connection('Flow_DecTem_Escolhe', 'Node_DecTemBilhetes', 'Node_EscolheBilhete', { isDefault: true }),
    connection('Flow_SemBilhetes_End', 'Node_SemBilhetes', 'Node_End_SemBilhetes'),
    connection('Flow_Escolhe_DecAcao', 'Node_EscolheBilhete', 'Node_DecAcao'),
    connection('Flow_DecAcao_Horario', 'Node_DecAcao', 'Node_EscolheHorario', { condition: '{{form_acaoBilhete}} == "reagendar"' }),
    connection('Flow_DecAcao_Cancelar', 'Node_DecAcao', 'Node_Cancelar', { isDefault: true }),
    connection('Flow_Horario_Reagendar', 'Node_EscolheHorario', 'Node_Reagendar'),
    connection('Flow_Reagendar_Reagendado', 'Node_Reagendar', 'Node_Reagendado'),
    connection('Flow_Reagendado_End', 'Node_Reagendado', 'Node_End_Reagendado'),
    connection('Flow_Cancelar_Cancelado', 'Node_Cancelar', 'Node_Cancelado'),
    connection('Flow_Cancelado_End', 'Node_Cancelado', 'Node_End_Cancelado'),
  ];

  const published = await publishNewFlow(token, journey.journeyId, { name: 'Fluxo Gestão de BDs', nodes, connections },
    'Gestão de BDs — lista de seleção com reagendar/cancelar e horários por fonte de dados');
  console.log('Publicado:', published.status, 'v' + published.versionNumber, '— journeyId:', journey.journeyId);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
