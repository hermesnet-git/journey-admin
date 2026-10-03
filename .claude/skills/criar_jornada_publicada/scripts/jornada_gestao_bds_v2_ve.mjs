// Jornada "Gestão de BDs v2" do produto VE (Vivo Empresas) — segunda versão da gestão de bilhete de
// defeito, a partir do desenho "Suporte Técnico": lista de solicitações em andamento (com "Ver
// histórico"), detalhe com Cancelar / Reagendar / Adicionar informação, e os retornos entre telas.
//
// O que a v2 exercita, e a v1 (jornada_gestao_bds_ve.mjs) não:
// - o identificador do cliente (CNPJ) vem do canal: variável de entrada "cnpj" do nó Início;
// - botões comuns que dizem à jornada qual foi apertado (action.submit com path/value, a "C1") e que
//   se desabilitam pelo status da solicitação ($active sobre data.*);
// - laços de retorno (Voltar, Ir para o início, Ver solicitação) em vez de um caminho só de ida;
// - a falha sistêmica: quando a chamada de escrita esgota as tentativas, a saída "Se falhar" leva a
//   uma tela de indisponibilidade com "Tentar novamente" (volta à tela anterior, para confirmar de novo)
//   e "Tentar mais tarde" (encerra);
// - "Voltar" genérico (backButton): reabre a tela anterior sem Decisão nem ligação de retorno no fluxo.
//
// APIs: ms-mock-api-rest (porta 8084), rotas /v2 com estado em memória (SolicitacaoTecnicaController).
// Só o CNPJ 45537128000127 tem solicitações. As rotas /v1 da jornada v1 ficam intactas, para comparação.
//
// Rode com: node jornada_gestao_bds_v2_ve.mjs

import {
  api, login, ensureJourney, publishNewFlow, ensureDataSource,
  startNode, endNode, userTaskNode, gatewayNode, serviceTaskNode, connection,
  text, textArea, select, datePicker, submitButton, alert, selectList, selectFromList, actionButton, backButton,
} from './sdui_helpers.mjs';

const MOCK = 'http://localhost:8084/v2';
// Só para testar a falha sistêmica sem derrubar o mock: aponta as chamadas de ESCRITA para outro endereço
// (ex.: MOCK_ESCRITA=http://localhost:9/v2, porta fechada) e publica sob outro nome (JORNADA_NOME).
const MOCK_ESCRITA = process.env.MOCK_ESCRITA ?? MOCK;
const JORNADA_NOME = process.env.JORNADA_NOME ?? 'Gestão de BDs v2';
const VE_PRODUCT_ID = '66896bd3-f42d-4549-af38-df2c1c0e34df';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Grade: cada etapa tem (coluna, linha); posição gravada = canto superior-esquerdo, centro do nó no
// centro da célula. O botão "Organizar" do editor refaz isso se preferir.
const SIZE = { START: 52, END: 52, GATEWAY: 50, USER_TASK: 78, SERVICE_TASK: 78 };
const COL = 150;
const ROW = 120;
const X0 = 110;
const Y0 = 520;
const at = (col, row, type) => [Math.round(X0 + col * COL - SIZE[type] / 2), Math.round(Y0 + row * ROW - SIZE[type] / 2)];

const out = (name, jsonPath, type = 'string') => ({ name, jsonPath, type });
const list = (name, jsonPath, keepFields) => ({ name, jsonPath, type: 'list', keepFields });
// Resiliência das chamadas: 5 s para responder e até 2 novas tentativas (só falha passageira), com a
// mesma Idempotency-Key em todas.
const RESILIENT = { readTimeoutMs: 5000, retries: 2, retryIntervalMs: 1000 };
const ITEM_FIELDS = ['protocolo', 'servico', 'endereco', 'status', 'data', 'visitaTexto'];
const ITEM_DESCRIPTION = '{{item.servico}} · {{item.endereco}} · Status: {{item.status}} · Visita: {{item.visitaTexto}}';

const detalheTextos = (prefix, p) => [
  text(`${prefix}_protocolo`, `Protocolo: {{data.${p}Protocolo}}`, 'body'),
  text(`${prefix}_servico`, `Serviço: {{data.${p}Servico}}`, 'body'),
  text(`${prefix}_endereco`, `Endereço: {{data.${p}Endereco}}`, 'body'),
  text(`${prefix}_status`, `Status: {{data.${p}Status}}`, 'body'),
  text(`${prefix}_data`, `Data: {{data.${p}Data}}`, 'body'),
  text(`${prefix}_visita`, `Visita: {{data.${p}Visita}}`, 'body'),
  text(`${prefix}_comentarios`, `Comentários: {{data.${p}Comentarios}}`, 'body'),
];

const detalheOutputs = (p) => [
  out(`${p}Protocolo`, '$.protocolo'), out(`${p}Servico`, '$.servico'), out(`${p}Endereco`, '$.endereco'),
  out(`${p}Status`, '$.status'), out(`${p}Data`, '$.dataTexto'), out(`${p}Visita`, '$.visitaTexto'),
  out(`${p}Comentarios`, '$.comentarios'),
];

// Tela de indisponibilidade sistêmica de uma chamada de escrita: "Tentar novamente" volta à tela
// anterior (o usuário confirma de novo e a chamada é refeita); "Tentar mais tarde" conclui e encerra.
// Resposta recusada pelo sistema de origem (por exemplo, horário que deixou de estar livre).
const naoConcluido = (id, col, row) => userTaskNode(
  `Node_${id}`, 'Não foi possível concluir', 'Resposta recusada pelo sistema de origem (por exemplo, horário que deixou de estar livre).',
  ...at(col, row, 'USER_TASK'), id.toLowerCase(), 'Não foi possível concluir', [
    alert(`al_${id}`, 'warning', 'O sistema não aceitou a solicitação. Confira os dados e tente de novo.', { title: 'Não foi possível concluir' }),
    submitButton(`btn_${id}`, 'Voltar para a solicitação'),
  ]);

const secondarySubmit = (id, label) => {
  const button = submitButton(id, label);
  return { ...button, props: { ...button.props, variant: 'secondary' } };
};

const indisponivel = (id, nome, col, row) => userTaskNode(
  `Node_${id}`, nome, 'Usada quando a chamada falha de vez, depois de todas as tentativas.', ...at(col, row, 'USER_TASK'),
  id.toLowerCase(), 'Sistema indisponível', [
    alert(`al_${id}`, 'warning', 'Houve uma indisponibilidade no sistema e não conseguimos concluir agora. Você pode tentar de novo agora ou mais tarde.', { title: 'Sistema indisponível' }),
    backButton(`btn_${id}_novamente`, 'Tentar novamente', { variant: 'primary' }),
    secondarySubmit(`btn_${id}_depois`, 'Tentar mais tarde'),
  ]);

async function main() {
  const token = await login();
  const channelTypes = ['WEB', 'MOBILE', 'WHATSAPP'];

  await ensureDataSource(token, {
    name: 'Horários da solicitação',
    description: 'Períodos livres da agenda técnica, no dia escolhido, para reagendar a visita de uma solicitação técnica.',
    url: `${MOCK}/solicitacoes/{protocolo}/horarios-disponiveis?data={data}`,
    timeoutMs: 5000,
    itemsPath: '$.horarios',
    exposedFields: ['value', 'label'],
    credentialRef: null,
  });

  const product = await api('GET', `/products/${VE_PRODUCT_ID}`, token);
  const journey = await ensureJourney(token, {
    productId: product.productId, channelTypes, name: JORNADA_NOME,
    description: 'Segunda versão da gestão de bilhete de defeito: lista as solicitações técnicas do cliente, com histórico, e deixa consultar o detalhe, reagendar a visita, cancelar ou adicionar informação — com tratamento de indisponibilidade do sistema.',
  });

  const nodes = [
    startNode('Node_Start', 'Início', ...at(0, 0, 'START'), 'O CNPJ do cliente vem do canal.', [{ name: 'cnpj', type: 'string' }]),

    // --- Lista inicial ---------------------------------------------------------------------------
    serviceTaskNode('Node_ConsultaAndamento', 'Consulta solicitações em andamento', 'Busca as solicitações técnicas em andamento do cliente.', ...at(1, 0, 'SERVICE_TASK'), 'REST', {
      method: 'GET', url: `${MOCK}/clientes/{{data_cnpj}}/solicitacoes?situacao=andamento`, headers: { Accept: 'application/json' },
      outputMapping: [out('quantidadeAndamento', '$.quantidade', 'number'), list('solicitacoesAndamento', '$.solicitacoes', ITEM_FIELDS)],
      ...RESILIENT,
    }),
    userTaskNode('Node_Lista', 'Solicitações técnicas', 'Lista as solicitações em andamento e oferece o histórico.', ...at(2, 0, 'USER_TASK'), 'lista', 'Solicitações técnicas', [
      text('text_lista_sub', 'Acompanhe as solicitações em aberto', 'caption'),
      selectList('lista_solicitacoes', 'Em andamento', 'data.solicitacoesAndamento', 'solicitacaoSelecionada', {
        itemValue: 'protocolo', itemTitle: 'Protocolo {{item.protocolo}}', itemDescription: ITEM_DESCRIPTION,
        emptyMessage: 'Você não tem solicitações em andamento.',
        actionVar: 'acaoLista', actions: [{ id: 'detalhe', label: 'Ver detalhes', variant: 'primary' }],
        // Sem escolha obrigatória: "Ver histórico" conclui a tela sem item selecionado.
        required: false,
      }),
      actionButton('btn_ver_historico', 'Ver histórico', 'acaoLista', 'historico', { variant: 'secondary' }),
    ]),
    gatewayNode('Node_DecLista', 'Histórico ou detalhe?', ...at(3, 0, 'GATEWAY'), 'Histórico se o botão foi "Ver histórico"; senão, o detalhe do item escolhido.'),

    // --- Histórico -------------------------------------------------------------------------------
    serviceTaskNode('Node_ConsultaHistorico', 'Consulta histórico', 'Busca as solicitações concluídas ou canceladas.', ...at(4, -2, 'SERVICE_TASK'), 'REST', {
      method: 'GET', url: `${MOCK}/clientes/{{data_cnpj}}/solicitacoes?situacao=historico`, headers: { Accept: 'application/json' },
      outputMapping: [out('quantidadeHistorico', '$.quantidade', 'number'), list('solicitacoesHistorico', '$.solicitacoes', ITEM_FIELDS)],
      ...RESILIENT,
    }),
    userTaskNode('Node_Historico', 'Histórico', 'Lista as solicitações encerradas.', ...at(5, -2, 'USER_TASK'), 'historico', 'Histórico', [
      text('text_hist_sub', 'Solicitações concluídas ou canceladas', 'caption'),
      selectList('lista_historico', 'Encerradas', 'data.solicitacoesHistorico', 'solicitacaoHistoricoSelecionada', {
        itemValue: 'protocolo', itemTitle: 'Protocolo {{item.protocolo}}', itemDescription: ITEM_DESCRIPTION,
        emptyMessage: 'Você não tem solicitações no histórico.',
        actionVar: 'acaoHistorico', actions: [{ id: 'detalhe', label: 'Ver detalhes', variant: 'primary' }],
        required: false,
      }),
      // Aqui o "Voltar" continua concluindo a tela, com Decisão: é a única saída do histórico no
      // fluxo — sem ela, histórico e detalhe do histórico ficariam fora de um caminho até um Fim.
      actionButton('btn_hist_voltar', 'Voltar', 'acaoHistorico', 'voltar', { variant: 'secondary' }),
    ]),
    gatewayNode('Node_DecHistorico', 'Voltar ou detalhe?', ...at(6, -2, 'GATEWAY'), 'Volta à lista inicial ou abre o detalhe do item escolhido.'),
    serviceTaskNode('Node_ConsultaDetalheHist', 'Consulta detalhe do histórico', 'Busca os dados da solicitação encerrada.', ...at(7, -2, 'SERVICE_TASK'), 'REST', {
      method: 'GET', url: `${MOCK}/solicitacoes/{{form_solicitacaoHistoricoSelecionada}}`, headers: { Accept: 'application/json' },
      outputMapping: detalheOutputs('hist'), ...RESILIENT,
    }),
    userTaskNode('Node_DetalheHist', 'Detalhe do histórico', 'Mostra a solicitação encerrada, só para consulta.', ...at(8, -2, 'USER_TASK'), 'detalhehist', 'Detalhe da solicitação', [
      ...detalheTextos('dh', 'hist'),
      submitButton('btn_dh_voltar', 'Voltar para o histórico'),
    ]),

    // --- Detalhe ---------------------------------------------------------------------------------
    serviceTaskNode('Node_ConsultaDetalhe', 'Consulta detalhe', 'Busca os dados e as ações liberadas da solicitação.', ...at(4, 0, 'SERVICE_TASK'), 'REST', {
      method: 'GET', url: `${MOCK}/solicitacoes/{{form_solicitacaoSelecionada}}`, headers: { Accept: 'application/json' },
      outputMapping: [
        ...detalheOutputs('det'),
        out('podeReagendar', '$.podeReagendar', 'boolean'), out('podeCancelar', '$.podeCancelar', 'boolean'),
        out('podeAdicionarInformacao', '$.podeAdicionarInformacao', 'boolean'),
      ],
      ...RESILIENT,
    }),
    userTaskNode('Node_Detalhe', 'Detalhe da solicitação', 'Mostra a solicitação e oferece cancelar, reagendar e adicionar informação, conforme o status.', ...at(5, 0, 'USER_TASK'), 'detalhe', 'Detalhe da solicitação', [
      ...detalheTextos('dt', 'det'),
      actionButton('btn_cancelar', 'Cancelar solicitação', 'acaoDetalhe', 'cancelar', { variant: 'secondary', activeWhen: { path: 'data.podeCancelar', rule: 'equals', value: true } }),
      actionButton('btn_reagendar', 'Reagendar visita', 'acaoDetalhe', 'reagendar', { variant: 'secondary', activeWhen: { path: 'data.podeReagendar', rule: 'equals', value: true } }),
      actionButton('btn_informacao', 'Adicionar informação', 'acaoDetalhe', 'informacao', { activeWhen: { path: 'data.podeAdicionarInformacao', rule: 'equals', value: true } }),
      // Sempre para a lista (com Decisão), não o "Voltar" genérico: ao detalhe também se chega depois
      // de enviar informação ou de "Não foi possível concluir", e voltar ali não é o que o usuário espera.
      actionButton('btn_detalhe_voltar', 'Voltar para a lista', 'acaoDetalhe', 'voltar', { variant: 'secondary' }),
    ]),
    // Uma Decisão com quatro saídas: as condições são avaliadas na ordem das ligações e "Voltar para a
    // lista" é a padrão.
    gatewayNode('Node_DecDetalhe', 'O que deseja fazer?', ...at(6, 0, 'GATEWAY'), 'Segue a escolha feita no detalhe.'),

    // --- Reagendar -------------------------------------------------------------------------------
    userTaskNode('Node_EscolheData', 'Nova data', 'Pergunta a nova data da visita.', ...at(7, 1, 'USER_TASK'), 'escolhedata', 'Reagendar visita', [
      text('text_data_atual', 'Visita atual: {{data.detVisita}}', 'body'),
      datePicker('picker_nova_data', 'Nova data', 'dataNova'),
      submitButton('btn_data_continuar', 'Continuar'),
      backButton('btn_data_voltar'),
    ]),
    userTaskNode('Node_EscolhePeriodo', 'Período da visita', 'Mostra os períodos livres do dia escolhido, buscados quando a tela abre.', ...at(9, 1, 'USER_TASK'), 'escolheperiodo', 'Reagendar visita', [
      text('text_periodo_titulo', 'Escolha o período', 'title'),
      text('text_periodo_data', 'Nova data: {{form.dataNova}}', 'body'),
      selectFromList('select_periodo', 'Períodos disponíveis', 'periodoEscolhido', 'data.horarios'),
      submitButton('btn_periodo_confirmar', 'Confirmar'),
      backButton('btn_periodo_voltar'),
    ], [
      { alias: 'horarios', source: 'Horários da solicitação', params: { protocolo: '{{form_solicitacaoSelecionada}}', data: '{{form_dataNova}}' }, required: true, errorMessage: 'Não foi possível carregar os períodos disponíveis. Volte e escolha a data novamente.' },
    ]),
    serviceTaskNode('Node_Reagenda', 'Reagenda a visita', 'Confirma a nova data e o período no sistema de campo.', ...at(11, 1, 'SERVICE_TASK'), 'REST', {
      method: 'POST', url: `${MOCK_ESCRITA}/solicitacoes/{{form_solicitacaoSelecionada}}/reagendamento`, headers: JSON_HEADERS,
      body: { data: '{{form_dataNova}}', periodo: '{{form_periodoEscolhido}}' },
      outputMapping: [out('httpStatusReagenda', '$httpStatus', 'number'), out('novaVisitaData', '$.visita.data'), out('novaVisitaPeriodo', '$.visita.periodo')],
      ...RESILIENT,
    }),
    gatewayNode('Node_DecReagendou', 'Reagendamento confirmado?', ...at(12, 1, 'GATEWAY'), '200 é confirmado; qualquer outra resposta, não concluído.'),
    userTaskNode('Node_Reagendado', 'Visita reagendada', 'Confirma o reagendamento.', ...at(13, 1, 'USER_TASK'), 'reagendado', 'Visita reagendada', [
      alert('al_reagendado', 'positive', 'Nova data: {{data.novaVisitaData}}, período {{data.novaVisitaPeriodo}}.', { title: 'Sua visita foi reagendada' }),
      submitButton('btn_reag_inicio', 'Ir para o início'),
    ]),
    indisponivel('IndispReagendar', 'Reagendamento indisponível', 12, 2),

    // --- Adicionar informação --------------------------------------------------------------------
    userTaskNode('Node_Informacao', 'Adicionar informação', 'Coleta a informação a acrescentar à solicitação.', ...at(7, 4, 'USER_TASK'), 'informacao', 'Adicionar informação', [
      textArea('area_informacao', 'Informação adicional', 'informacao', { required: true }),
      submitButton('btn_info_enviar', 'Enviar'),
      backButton('btn_info_voltar'),
    ]),
    serviceTaskNode('Node_EnviaInformacao', 'Envia a informação', 'Acrescenta a informação à solicitação no sistema de origem.', ...at(9, 4, 'SERVICE_TASK'), 'REST', {
      method: 'POST', url: `${MOCK_ESCRITA}/solicitacoes/{{form_solicitacaoSelecionada}}/informacoes`, headers: JSON_HEADERS,
      body: { informacao: '{{form_informacao}}' },
      outputMapping: [out('httpStatusInformacao', '$httpStatus', 'number')],
      ...RESILIENT,
    }),
    indisponivel('IndispInformacao', 'Envio indisponível', 10, 5),

    // --- Cancelar --------------------------------------------------------------------------------
    // Motivo e confirmação numa tela só: "Confirmar" é o único botão que conclui a tela (sem decisão
    // depois dela, motivo obrigatório); "Voltar" desiste e reabre o detalhe.
    userTaskNode('Node_Motivo', 'Por que quer cancelar?', 'Pergunta o motivo e confirma o cancelamento.', ...at(7, 7, 'USER_TASK'), 'motivo', 'Cancelar solicitação', [
      text('text_motivo_titulo', 'Por que quer cancelar?', 'title'),
      select('select_motivo', 'Motivo', 'motivoCancelamento', [
        { label: 'Problema resolvido', value: 'Problema resolvido' }, { label: 'Resolvi de outra forma', value: 'Resolvi de outra forma' },
        { label: 'Abri por engano', value: 'Abri por engano' }, { label: 'Outro', value: 'Outro' },
      ]),
      text('text_motivo_aviso', 'Ao cancelar, a visita também será cancelada.', 'body'),
      submitButton('btn_motivo_confirmar', 'Confirmar'),
      backButton('btn_motivo_voltar'),
    ]),
    serviceTaskNode('Node_Cancela', 'Cancela a solicitação', 'Cancela a solicitação no sistema de origem.', ...at(11, 7, 'SERVICE_TASK'), 'REST', {
      method: 'POST', url: `${MOCK_ESCRITA}/solicitacoes/{{form_solicitacaoSelecionada}}/cancelamento`, headers: JSON_HEADERS,
      body: { motivo: '{{form_motivoCancelamento}}' },
      outputMapping: [out('httpStatusCancelamento', '$httpStatus', 'number')],
      ...RESILIENT,
    }),
    gatewayNode('Node_DecCancelou', 'Cancelamento confirmado?', ...at(12, 7, 'GATEWAY'), '200 é confirmado; qualquer outra resposta, não concluído.'),
    userTaskNode('Node_Cancelado', 'Solicitação cancelada', 'Confirma o cancelamento.', ...at(13, 7, 'USER_TASK'), 'cancelado', 'Solicitação cancelada', [
      alert('al_cancelado', 'positive', 'A solicitação foi cancelada e a visita também.', { title: 'Sua solicitação foi cancelada' }),
      submitButton('btn_cancelado_ok', 'Ir para o início'),
    ]),
    indisponivel('IndispCancelamento', 'Cancelamento indisponível', 11, 8),

    // --- "Não foi possível concluir" -----------------------------------------------------------
    // Uma por seção (reagendar e cancelar), em vez de uma compartilhada: com a seção recolhida, a
    // tela some junto com o trecho, sem ficar solta no canvas.
    naoConcluido('NaoConcluidoReagendar', 13, 2.6),
    naoConcluido('NaoConcluidoCancelamento', 13, 8.6),
    // Um Fim ao lado de cada saída, em vez de um só no canto: evita linhas longas atravessando o fluxo.
    // Como no desenho, as telas de sucesso encerram a jornada (o canal leva o usuário ao início dele).
    endNode('Node_End_Reagendado', 'Fim — visita reagendada', ...at(14, 1, 'END')),
    endNode('Node_End_Cancelado', 'Fim — solicitação cancelada', ...at(14, 7, 'END')),
    endNode('Node_End_MaisTardeReagendar', 'Fim — tentar mais tarde', ...at(14, 2, 'END')),
    endNode('Node_End_MaisTardeInformacao', 'Fim — tentar mais tarde', ...at(12, 5, 'END')),
    endNode('Node_End_MaisTardeCancelamento', 'Fim — tentar mais tarde', ...at(13, 8, 'END')),
  ];

  const c = (id, from, to, opts) => connection(`Flow_${id}`, `Node_${from}`, `Node_${to}`, opts);
  const connections = [
    c('Start_Andamento', 'Start', 'ConsultaAndamento'),
    c('Andamento_Lista', 'ConsultaAndamento', 'Lista'),
    c('Lista_Dec', 'Lista', 'DecLista'),
    c('DecLista_Historico', 'DecLista', 'ConsultaHistorico', { condition: '{{form_acaoLista}} == "historico"', label: 'Ver histórico' }),
    c('DecLista_Detalhe', 'DecLista', 'ConsultaDetalhe', { isDefault: true }),

    c('Historico_Tela', 'ConsultaHistorico', 'Historico'),
    c('Historico_Dec', 'Historico', 'DecHistorico'),
    c('DecHistorico_Voltar', 'DecHistorico', 'ConsultaAndamento', { condition: '{{form_acaoHistorico}} == "voltar"', label: 'Voltar' }),
    c('DecHistorico_Detalhe', 'DecHistorico', 'ConsultaDetalheHist', { isDefault: true }),
    c('DetalheHist_Consulta', 'ConsultaDetalheHist', 'DetalheHist'),
    c('DetalheHist_Volta', 'DetalheHist', 'Historico'),

    c('Detalhe_Tela', 'ConsultaDetalhe', 'Detalhe'),
    c('Detalhe_Dec', 'Detalhe', 'DecDetalhe'),
    c('DecDetalhe_Reagendar', 'DecDetalhe', 'EscolheData', { condition: '{{form_acaoDetalhe}} == "reagendar"', label: 'Reagendar' }),
    c('DecDetalhe_Cancelar', 'DecDetalhe', 'Motivo', { condition: '{{form_acaoDetalhe}} == "cancelar"', label: 'Cancelar' }),
    c('DecDetalhe_Informacao', 'DecDetalhe', 'Informacao', { condition: '{{form_acaoDetalhe}} == "informacao"', label: 'Adicionar informação' }),
    c('DecDetalhe_Voltar', 'DecDetalhe', 'ConsultaAndamento', { isDefault: true, label: 'Voltar para a lista' }),

    c('Data_Periodo', 'EscolheData', 'EscolhePeriodo'),
    c('Periodo_Reagenda', 'EscolhePeriodo', 'Reagenda'),
    c('Reagenda_Dec', 'Reagenda', 'DecReagendou'),
    c('Reagenda_Falha', 'Reagenda', 'IndispReagendar', { onError: true }),
    c('DecReagendou_Sim', 'DecReagendou', 'Reagendado', { condition: '{{data_httpStatusReagenda}} == 200', label: 'Sim' }),
    c('DecReagendou_Nao', 'DecReagendou', 'NaoConcluidoReagendar', { isDefault: true, label: 'Não' }),
    c('NaoConcluidoReagendar_Detalhe', 'NaoConcluidoReagendar', 'ConsultaDetalhe'),
    c('Reagendado_Fim', 'Reagendado', 'End_Reagendado'),
    c('IndispReagendar_Fim', 'IndispReagendar', 'End_MaisTardeReagendar', { label: 'Mais tarde' }),

    c('Informacao_Envia', 'Informacao', 'EnviaInformacao'),
    c('Envia_Detalhe', 'EnviaInformacao', 'ConsultaDetalhe'),
    c('Envia_Falha', 'EnviaInformacao', 'IndispInformacao', { onError: true }),
    c('IndispInformacao_Fim', 'IndispInformacao', 'End_MaisTardeInformacao', { label: 'Mais tarde' }),

    c('Motivo_Cancela', 'Motivo', 'Cancela'),
    c('Cancela_Dec', 'Cancela', 'DecCancelou'),
    c('Cancela_Falha', 'Cancela', 'IndispCancelamento', { onError: true }),
    c('DecCancelou_Sim', 'DecCancelou', 'Cancelado', { condition: '{{data_httpStatusCancelamento}} == 200', label: 'Sim' }),
    c('DecCancelou_Nao', 'DecCancelou', 'NaoConcluidoCancelamento', { isDefault: true, label: 'Não' }),
    c('NaoConcluidoCancelamento_Detalhe', 'NaoConcluidoCancelamento', 'ConsultaDetalhe'),
    c('Cancelado_Fim', 'Cancelado', 'End_Cancelado'),
    c('IndispCancelamento_Fim', 'IndispCancelamento', 'End_MaisTardeCancelamento', { label: 'Mais tarde' }),

  ];

  // Seções que o editor pode recolher: cada uma vira um bloco, só com a linha que chega nele.
  const ids = (...names) => names.map((n) => `Node_${n}`);
  const sections = [
    { id: 'Sec_Historico', name: 'Consultar histórico', nodeIds: ids('ConsultaHistorico', 'Historico', 'DecHistorico', 'ConsultaDetalheHist', 'DetalheHist') },
    { id: 'Sec_Reagendar', name: 'Reagendar visita', nodeIds: ids('EscolheData', 'EscolhePeriodo', 'Reagenda', 'DecReagendou', 'Reagendado', 'IndispReagendar', 'NaoConcluidoReagendar', 'End_Reagendado', 'End_MaisTardeReagendar') },
    { id: 'Sec_Cancelar', name: 'Cancelar solicitação', nodeIds: ids('Motivo', 'Cancela', 'DecCancelou', 'Cancelado', 'IndispCancelamento', 'NaoConcluidoCancelamento', 'End_Cancelado', 'End_MaisTardeCancelamento') },
    { id: 'Sec_Informacao', name: 'Adicionar informação', nodeIds: ids('Informacao', 'EnviaInformacao', 'IndispInformacao', 'End_MaisTardeInformacao') },
  ];

  const published = await publishNewFlow(token, journey.journeyId, { name: 'Fluxo Gestão de BDs v2', nodes, connections, sections },
    'Gestão de BDs v2 — lista com histórico, detalhe com ações por status e tratamento de indisponibilidade');
  console.log('Publicado:', published.status, 'v' + published.versionNumber, '— journeyId:', journey.journeyId);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
