// Gera os templates da aba "Template" em Nova jornada: um JSON por exemplo em
// back/src/main/resources/journey-templates (lidos pelo JsonJourneyTemplateCatalog na subida do back).
// O JSON é a fonte da verdade; este script só existe pra escrever os 32 fluxos com os mesmos
// construtores de tela da skill, em vez de digitar árvores SDUI na mão. Rodar de novo regrava tudo.
//
// Regras que os templates seguem:
// - REST aponta pro ms-mock-api-rest (localhost:8084) — roda de ponta a ponta no ambiente local.
// - Mensageria (Kafka) e fonte de dados de tela vêm SEM cluster/tópico/credencial/fonte: dependem do
//   ambiente, o autor escolhe no editor (o back lista essas lacunas e bloqueia a publicação até lá).
// - Todo caminho até um Fim passa por uma tela, uma espera ou uma publicação depois da última chamada
//   REST (SynchronousChainCheck) — conferido em selfCheck() abaixo.
//
// Rode com: node gerar_templates_jornada.mjs

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  screen, text, textInput, textArea, select, checkbox, datePicker, submitButton, card, stack, alert, divider,
  progress, link, selectList, selectFromList,
} from './sdui_helpers.mjs';

const OUT_DIR = fileURLToPath(new URL('../../../../back/src/main/resources/journey-templates/', import.meta.url));
const MOCK = 'http://localhost:8084/v1';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ACCEPT = { Accept: 'application/json' };
const ALL = ['WEB', 'MOBILE', 'WHATSAPP'];
const DIGITAL = ['WEB', 'MOBILE'];

// --- Montagem do fluxo em grade ------------------------------------------------------------------
// Cada etapa ocupa uma célula (coluna, raia); a posição gravada é o canto superior-esquerdo, com o
// centro do nó no centro da célula (mesma convenção de layoutRow em sdui_helpers.mjs).

const SIZE = { START: 52, MESSAGE_START_EVENT: 52, END: 52, GATEWAY: 50, USER_TASK: 78, SERVICE_TASK: 78, RECEIVE_TASK: 78 };
const COL = 150;
const LANE = 150;
const X0 = 110;
const Y0 = 320;
const NOTE_WIDTH = 190;

const out = (name, jsonPath, type = 'string') => ({ name, jsonPath, type });
const list = (name, jsonPath, keepFields) => ({ name, jsonPath, type: 'list', keepFields });
const fromMessage = (fields) => fields.map(([name, type = 'string']) => out(name, `$.payload.data.${name}`, type));
const opt = (label, value) => ({ label, value });

function kafkaConsume(fields) {
  return { connectorType: 'KAFKA', config: { operation: 'CONSUME', outputMapping: fromMessage(fields) }, credentialRef: null };
}

function kafkaProduce(fields) {
  const payloadFields = fields.map(([name, value, type = 'string']) => ({ name, value, type }));
  return {
    connectorType: 'KAFKA',
    config: {
      operation: 'PRODUCE', payloadMode: 'CUSTOM', payloadFields,
      payload: Object.fromEntries(payloadFields.map((f) => [f.name, f.value])),
    },
    credentialRef: null,
  };
}

function flow(name) {
  const nodes = [];
  const connections = [];
  const annotations = [];
  const center = (col, lane) => [X0 + col * COL, Y0 + lane * LANE];
  const add = (id, nodeType, nodeName, description, col, lane, extra = {}) => {
    const [cx, cy] = center(col, lane);
    nodes.push({
      nodeId: `Node_${id}`, nodeType, name: nodeName, description,
      positionX: Math.round(cx - SIZE[nodeType] / 2), positionY: Math.round(cy - SIZE[nodeType] / 2),
      userTaskConfig: null, connectorConfig: null, startVariables: null, ...extra,
    });
    return `Node_${id}`;
  };
  return {
    start: (col, lane, startVariables = null) => add('Inicio', 'START', 'Início', 'Início da jornada', col, lane, { startVariables }),
    messageStart: (id, nodeName, description, col, lane, fields) =>
      add(id, 'MESSAGE_START_EVENT', nodeName, description, col, lane, { connectorConfig: kafkaConsume(fields) }),
    end: (id, nodeName, col, lane) => add(id, 'END', nodeName, nodeName, col, lane),
    screen: (id, nodeName, description, col, lane, title, children, dataSources = null) =>
      add(id, 'USER_TASK', nodeName, description, col, lane, {
        userTaskConfig: { embeddedScreenRoot: screen(id.toLowerCase(), title, children), dataSources },
      }),
    rest: (id, nodeName, description, col, lane, config) =>
      add(id, 'SERVICE_TASK', nodeName, description, col, lane, { connectorConfig: { connectorType: 'REST', config, credentialRef: null } }),
    publish: (id, nodeName, description, col, lane, fields) =>
      add(id, 'SERVICE_TASK', nodeName, description, col, lane, { connectorConfig: kafkaProduce(fields) }),
    receive: (id, nodeName, description, col, lane, fields) =>
      add(id, 'RECEIVE_TASK', nodeName, description, col, lane, { connectorConfig: kafkaConsume(fields) }),
    decision: (id, nodeName, description, col, lane) => add(id, 'GATEWAY', nodeName, description, col, lane),
    link: (from, to, opts = {}) => connections.push({
      connectionId: `Flow_${connections.length + 1}`, sourceNodeId: from, targetNodeId: to,
      condition: opts.when ?? null, isDefault: !!opts.otherwise, onError: !!opts.onError,
    }),
    chain: (...ids) => ids.slice(1).forEach((to, i) => connections.push({
      connectionId: `Flow_${connections.length + 1}`, sourceNodeId: ids[i], targetNodeId: to, condition: null, isDefault: false, onError: false,
    })),
    // Nota no canvas: acima da célula por padrão, abaixo com below=true.
    note: (value, col, lane, linkedNodeIds = [], below = false) => {
      const [cx, cy] = center(col, lane);
      annotations.push({
        id: `Annotation_${annotations.length + 1}`, text: value,
        positionX: Math.round(cx - NOTE_WIDTH / 2), positionY: below ? cy + 80 : cy - 175, linkedNodeIds,
      });
    },
    build: () => ({ name, nodes, connections, annotations }),
  };
}

const TEMPLATES = [];
const template = (meta, build) => TEMPLATES.push({ ...meta, build });
const ok = (id, label = 'Continuar') => submitButton(id, label);
const caption = (id, value) => text(id, value, 'caption');
const body = (id, value) => text(id, value, 'body');
const title = (id, value) => text(id, value, 'title');
const heading = (id, value) => text(id, value, 'heading');

// =================================================================================================
// Trilha 1 — Primeiros passos
// =================================================================================================

template({
  templateId: 'primeira-jornada', name: 'Minha primeira jornada', track: 'primeiros-passos', area: null, channelTypes: ALL,
  description: 'Duas telas e uma variável de entrada: o ponto de partida para entender como uma jornada funciona.',
  highlights: [
    'Variável de entrada preenchida por quem inicia a jornada',
    'Resposta de uma tela que vira variável',
    'Texto que repete o que o usuário respondeu',
  ],
}, () => {
  const f = flow('Minha primeira jornada');
  const ini = f.start(0, 0, [{ name: 'nomeCliente', type: 'string' }]);
  const boasVindas = f.screen('BoasVindas', 'Boas-vindas', 'Cumprimenta o cliente e pergunta como ele prefere ser chamado.', 1, 0, 'Boas-vindas', [
    title('txt_ola', 'Olá, {{data.nomeCliente}}! Que bom ter você aqui.'),
    body('txt_intro', 'Antes de começar, conta pra gente como você prefere ser chamado.'),
    textInput('in_apelido', 'Como prefere ser chamado?', 'apelido', { placeholder: 'Ex.: Ju, Beto, Dra. Ana', maxLength: 40 }),
    ok('btn_continuar'),
  ]);
  const agradecimento = f.screen('Agradecimento', 'Agradecimento', 'Usa a resposta da tela anterior para agradecer.', 2, 0, 'Tudo certo', [
    alert('al_pronto', 'positive', 'Prazer, {{form.apelido}}! Daqui pra frente vamos te chamar assim.', { title: 'Anotado' }),
    ok('btn_concluir', 'Concluir'),
  ]);
  const fim = f.end('Fim', 'Fim', 3, 0);
  f.chain(ini, boasVindas, agradecimento, fim);
  f.note('Variável de entrada: quem inicia a jornada informa "nomeCliente". Nas telas ela aparece como {{data.nomeCliente}}.', 0, 0, [ini]);
  f.note('Toda resposta vira variável da jornada: o campo da tela anterior fica disponível aqui como {{form.apelido}}.', 2, 0, [agradecimento], true);
  return f.build();
});

const UF_OPTIONS = [opt('São Paulo', 'SP'), opt('Rio de Janeiro', 'RJ'), opt('Minas Gerais', 'MG'), opt('Paraná', 'PR'), opt('Outro estado', 'OUTRO')];

template({
  templateId: 'formulario-com-revisao', name: 'Formulário com revisão', track: 'primeiros-passos', area: null, channelTypes: DIGITAL,
  description: 'Coleta dados, mostra um resumo para conferência e deixa o usuário voltar para corrigir antes de confirmar.',
  highlights: [
    'Decisão que devolve o usuário para a tela anterior',
    'Campos já preenchidos ao voltar para corrigir',
    'Data, lista de opções e campos de texto',
  ],
}, () => {
  const f = flow('Formulário com revisão');
  const ini = f.start(0, 0);
  const dados = f.screen('Dados', 'Seus dados', 'Coleta os dados cadastrais.', 1, 0, 'Seus dados', [
    title('txt_titulo', 'Conte um pouco sobre você'),
    textInput('in_nome', 'Nome completo', 'nome', { placeholder: 'Como está no documento' }),
    textInput('in_email', 'E-mail', 'email', { inputMode: 'email', placeholder: 'voce@exemplo.com' }),
    textInput('in_celular', 'Celular com DDD', 'celular', { inputMode: 'tel', placeholder: '(11) 90000-0000' }),
    datePicker('dt_nascimento', 'Data de nascimento', 'nascimento'),
    select('sel_uf', 'Estado', 'uf', UF_OPTIONS),
    ok('btn_revisar', 'Revisar'),
  ]);
  const revisao = f.screen('Revisao', 'Revisão', 'Mostra o resumo e pergunta se está tudo certo.', 2, 0, 'Confira seus dados', [
    title('txt_confira', 'Confira se está tudo certo'),
    card('card_resumo', [stack('stk_resumo', [
      body('txt_nome', 'Nome: {{form.nome}}'),
      body('txt_email', 'E-mail: {{form.email}}'),
      body('txt_celular', 'Celular: {{form.celular}}'),
      body('txt_nascimento', 'Nascimento: {{form.nascimento}}'),
      body('txt_uf', 'Estado: {{form.uf}}'),
    ])]),
    select('sel_confirmacao', 'Está tudo certo?', 'confirmacao', [opt('Sim, pode confirmar', 'confirmar'), opt('Quero corrigir', 'corrigir')]),
    ok('btn_seguir'),
  ]);
  const corrigir = f.decision('QuerCorrigir', 'Quer corrigir?', 'Volta para a primeira tela se o usuário pediu para corrigir.', 3, 0);
  const concluido = f.screen('Concluido', 'Cadastro confirmado', 'Confirma o cadastro.', 4, 0, 'Cadastro confirmado', [
    alert('al_ok', 'positive', 'Cadastro confirmado, {{form.nome}}. Obrigado!', { title: 'Tudo certo' }),
    ok('btn_concluir', 'Concluir'),
  ]);
  const fim = f.end('Fim', 'Fim', 5, 0);
  f.chain(ini, dados, revisao, corrigir);
  f.link(corrigir, dados, { when: '{{form_confirmacao}} == "corrigir"' });
  f.link(corrigir, concluido, { otherwise: true });
  f.chain(concluido, fim);
  f.note('O caminho "corrigir" volta para a primeira tela, que reabre com o que o usuário já tinha digitado.', 1, 0, [dados]);
  f.note('Toda Decisão tem dois caminhos: um com condição e um padrão, usado quando a condição não vale.', 3, 0, [corrigir], true);
  return f.build();
});

template({
  templateId: 'decisao-varios-caminhos', name: 'Decisão em vários caminhos', track: 'primeiros-passos', area: null, channelTypes: ALL,
  description: 'Direciona cada perfil de cliente para uma oferta diferente encadeando decisões.',
  highlights: [
    'Três resultados com duas decisões encadeadas',
    'Caminho padrão em cada decisão',
    'Um fim para cada resultado',
  ],
}, () => {
  const f = flow('Decisão em vários caminhos');
  const ini = f.start(0, 0);
  const perfil = f.screen('Perfil', 'Perfil do cliente', 'Pergunta o perfil e o tamanho da operação.', 1, 0, 'Vamos encontrar a melhor oferta', [
    title('txt_titulo', 'Vamos encontrar a melhor oferta para você'),
    select('sel_perfil', 'Para quem é a contratação?', 'perfil', [
      opt('Para minha casa', 'residencial'), opt('Pequena empresa (até 49 linhas)', 'pequena'), opt('Grande empresa (50 linhas ou mais)', 'grande'),
    ]),
    textInput('in_linhas', 'Quantas linhas você tem hoje?', 'qtdLinhas', { inputMode: 'number', required: false, maxLength: 5 }),
    ok('btn_ver', 'Ver ofertas'),
  ]);
  const grande = f.decision('Grande', 'Grande empresa?', 'Grandes empresas vão para o atendimento corporativo.', 2, 0);
  const pequena = f.decision('Pequena', 'Pequena empresa?', 'Pequenas empresas vão para os planos PME; o resto, residencial.', 3, 0);
  const corporativo = f.screen('Corporativo', 'Atendimento corporativo', 'Encaminha para um consultor.', 3, -1, 'Atendimento corporativo', [
    title('txt_corp', 'Uma proposta feita sob medida'),
    body('txt_corp_linhas', 'Com {{form.qtdLinhas}} linhas, um consultor dedicado vai montar uma proposta para a sua empresa.'),
    alert('al_corp', 'informative', 'Um consultor entra em contato em até 1 dia útil.'),
    ok('btn_corp', 'Concluir'),
  ]);
  const pme = f.screen('Pme', 'Planos para pequenas empresas', 'Mostra os planos PME.', 4, 0, 'Planos Vivo Empresas', [
    title('txt_pme', 'Planos para pequenas empresas'),
    card('card_pme', [stack('stk_pme', [
      heading('txt_pme_1', 'Empresas 20GB por linha'),
      body('txt_pme_2', 'Gestão das linhas pelo portal e atendimento prioritário.'),
    ])]),
    ok('btn_pme', 'Concluir'),
  ]);
  const residencial = f.screen('Residencial', 'Planos residenciais', 'Mostra os planos para casa.', 4, 1, 'Planos para sua casa', [
    title('txt_res', 'Planos para sua casa'),
    body('txt_res_1', 'Internet fibra, celular e TV num só lugar.'),
    ok('btn_res', 'Concluir'),
  ]);
  const fimCorp = f.end('FimCorporativo', 'Fim — corporativo', 4, -1);
  const fimPme = f.end('FimPme', 'Fim — PME', 5, 0);
  const fimRes = f.end('FimResidencial', 'Fim — residencial', 5, 1);
  f.chain(ini, perfil, grande);
  f.link(grande, corporativo, { when: '{{form_perfil}} == "grande"' });
  f.link(grande, pequena, { otherwise: true });
  f.link(pequena, pme, { when: '{{form_perfil}} == "pequena"' });
  f.link(pequena, residencial, { otherwise: true });
  f.chain(corporativo, fimCorp);
  f.chain(pme, fimPme);
  f.chain(residencial, fimRes);
  f.note('Uma Decisão sempre tem dois caminhos. Para três resultados, encadeie duas — cada uma com seu caminho padrão.', 2, 0, [grande, pequena], true);
  return f.build();
});

template({
  templateId: 'aprovacao-pedido', name: 'Aprovação de pedido', track: 'primeiros-passos', area: null, channelTypes: ['WEB'],
  description: 'Um aprovador analisa o pedido recebido, decide, e o resultado é avisado por mensagem.',
  highlights: [
    'Dados do pedido recebidos como variáveis de entrada',
    'Decisão pela escolha do aprovador',
    'Resultado avisado por mensagem para outros sistemas',
  ],
}, () => {
  const f = flow('Aprovação de pedido');
  const ini = f.start(0, 0, [
    { name: 'pedidoId', type: 'string' }, { name: 'valorPedido', type: 'number' }, { name: 'solicitante', type: 'string' },
  ]);
  const analisar = f.screen('Analisar', 'Analisar pedido', 'Mostra o pedido e coleta a decisão do aprovador.', 1, 0, 'Aprovação de pedido', [
    title('txt_pedido', 'Pedido {{data.pedidoId}}'),
    card('card_pedido', [stack('stk_pedido', [
      body('txt_solicitante', 'Solicitante: {{data.solicitante}}'),
      body('txt_valor', 'Valor: R$ {{data.valorPedido}}'),
    ])]),
    select('sel_decisao', 'Sua decisão', 'decisao', [opt('Aprovar', 'aprovar'), opt('Reprovar', 'reprovar')]),
    textArea('ta_justificativa', 'Justificativa', 'justificativa', { required: false, placeholder: 'Opcional para aprovação' }),
    ok('btn_registrar', 'Registrar decisão'),
  ]);
  const aprovado = f.decision('Aprovado', 'Aprovado?', 'Segue a decisão do aprovador.', 2, 0);
  const avisaAprovacao = f.publish('AvisaAprovacao', 'Avisa aprovação', 'Publica a aprovação para os sistemas interessados.', 3, -1, [
    ['pedidoId', '{{data_pedidoId}}'], ['decisao', 'APROVADO'], ['justificativa', '{{form_justificativa}}'],
  ]);
  const avisaReprovacao = f.publish('AvisaReprovacao', 'Avisa reprovação', 'Publica a reprovação para os sistemas interessados.', 3, 1, [
    ['pedidoId', '{{data_pedidoId}}'], ['decisao', 'REPROVADO'], ['justificativa', '{{form_justificativa}}'],
  ]);
  const telaAprovado = f.screen('TelaAprovado', 'Pedido aprovado', 'Confirma a aprovação.', 4, -1, 'Pedido aprovado', [
    alert('al_aprovado', 'positive', 'Pedido {{data.pedidoId}} aprovado. O solicitante já foi avisado.', { title: 'Aprovado' }),
    ok('btn_ok_aprovado', 'Concluir'),
  ]);
  const telaReprovado = f.screen('TelaReprovado', 'Pedido reprovado', 'Confirma a reprovação.', 4, 1, 'Pedido reprovado', [
    alert('al_reprovado', 'warning', 'Pedido {{data.pedidoId}} reprovado. O solicitante já foi avisado.', { title: 'Reprovado' }),
    ok('btn_ok_reprovado', 'Concluir'),
  ]);
  f.chain(ini, analisar, aprovado);
  f.link(aprovado, avisaAprovacao, { when: '{{form_decisao}} == "aprovar"' });
  f.link(aprovado, avisaReprovacao, { otherwise: true });
  f.chain(avisaAprovacao, telaAprovado, f.end('FimAprovado', 'Fim — aprovado', 5, -1));
  f.chain(avisaReprovacao, telaReprovado, f.end('FimReprovado', 'Fim — reprovado', 5, 1));
  f.note('Os dados do pedido chegam como variáveis de entrada, informadas pelo sistema que inicia a jornada.', 0, 0, [ini]);
  f.note('Antes de publicar: escolha cluster, tópico e credencial de mensageria nas duas etapas de aviso.', 3, -1, [avisaAprovacao, avisaReprovacao]);
  return f.build();
});

// =================================================================================================
// Trilha 2 — Integrações
// =================================================================================================

template({
  templateId: 'consulta-e-decide', name: 'Consulta e decide', track: 'integracoes', area: null, channelTypes: ALL,
  description: 'Chama uma API com os dados da tela e segue um caminho diferente conforme a resposta.',
  highlights: [
    'Chamada REST com dados da tela no corpo',
    'Resposta da API mapeada para variáveis',
    'Decisão pelo resultado da integração',
  ],
}, () => {
  const f = flow('Consulta e decide');
  const ini = f.start(0, 0);
  const identificacao = f.screen('Identificacao', 'Identificação', 'Coleta o CPF e o serviço desejado.', 1, 0, 'Consulta de disponibilidade', [
    title('txt_titulo', 'Vamos ver se você já pode contratar'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    select('sel_servico', 'Serviço', 'servico', [opt('Internet fibra', 'internet'), opt('Plano móvel', 'movel'), opt('TV por assinatura', 'tv')]),
    ok('btn_consultar', 'Consultar'),
  ]);
  const consulta = f.rest('ConsultaElegibilidade', 'Consulta elegibilidade', 'Pergunta ao sistema de crédito se o cliente pode contratar.', 2, 0, {
    method: 'POST', url: `${MOCK}/elegibilidade`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', servico: '{{form_servico}}' },
    outputMapping: [out('elegivel', '$.elegivel', 'boolean'), out('protocoloConsulta', '$.protocolo')],
  });
  const elegivel = f.decision('Elegivel', 'Elegível?', 'Segue conforme a resposta da consulta.', 3, 0);
  const pode = f.screen('PodeContratar', 'Pode contratar', 'Informa que o cliente pode contratar.', 4, -1, 'Você pode contratar', [
    alert('al_pode', 'positive', 'Boa notícia: você já pode contratar este serviço.', { title: 'Tudo certo' }),
    caption('txt_protocolo', 'Protocolo da consulta: {{data.protocoloConsulta}}'),
    ok('btn_pode', 'Concluir'),
  ]);
  const naoPode = f.screen('NaoPode', 'Não elegível', 'Informa que não é possível contratar agora.', 4, 1, 'Não foi possível', [
    alert('al_nao', 'warning', 'No momento não é possível contratar este serviço com este CPF.', { title: 'Não foi possível' }),
    ok('btn_nao', 'Concluir'),
  ]);
  f.chain(ini, identificacao, consulta, elegivel);
  f.link(elegivel, pode, { when: '{{data_elegivel}} == true' });
  f.link(elegivel, naoPode, { otherwise: true });
  f.chain(pode, f.end('FimPode', 'Fim — pode contratar', 5, -1));
  f.chain(naoPode, f.end('FimNaoPode', 'Fim — não elegível', 5, 1));
  f.note('No corpo da chamada, {{form_cpf}} e {{form_servico}}: o nome da variável no motor leva o prefixo de onde ela veio (form_ para telas, data_ para integrações).', 2, 0, [consulta]);
  f.note('A Decisão lê {{data_elegivel}}, mapeada do campo $.elegivel da resposta como booleano.', 3, 0, [elegivel], true);
  return f.build();
});

const PLANOS_KEEP = ['codigo', 'nome', 'franquia', 'preco', 'destaque', 'disponivel'];
const planosOutput = () => ({
  method: 'GET', url: `${MOCK}/planos/ofertas`, headers: ACCEPT,
  outputMapping: [out('quantidadePlanos', '$.quantidade', 'number'), list('planos', '$.planos', PLANOS_KEEP)],
});
const listaPlanos = (id, varName, actionLabel) => selectList(id, 'Planos disponíveis', 'data.planos', varName, {
  itemValue: 'codigo', itemTitle: '{{item.nome}}', itemDescription: '{{item.franquia}} · R$ {{item.preco}}/mês',
  itemHint: '{{item.destaque}}', emptyMessage: 'Nenhum plano disponível agora.', actionVar: `acao${varName[0].toUpperCase()}${varName.slice(1)}`,
  actions: [{ id: 'escolher', label: actionLabel, variant: 'primary', enabledWhen: '{{item.disponivel}} == true' }],
});

template({
  templateId: 'escolha-lista-api', name: 'Escolha numa lista vinda de API', track: 'integracoes', area: null, channelTypes: ALL,
  description: 'Busca os planos à venda e deixa o cliente escolher um, com a ação liberada só nos disponíveis.',
  highlights: [
    'Resposta da API gravada como lista',
    'Lista de seleção com ação liberada item a item',
    'Cada item montado com campos do plano',
  ],
}, () => {
  const f = flow('Escolha numa lista vinda de API');
  const ini = f.start(0, 0);
  const ofertas = f.rest('BuscaPlanos', 'Busca planos à venda', 'Traz o catálogo comercial de planos.', 1, 0, planosOutput());
  const escolha = f.screen('EscolhePlano', 'Escolha o plano', 'Lista os planos e a ação de escolher.', 2, 0, 'Escolha seu plano', [
    title('txt_titulo', 'Qual plano combina com você?'),
    listaPlanos('lst_planos', 'planoEscolhido', 'Quero este'),
  ]);
  const escolhido = f.screen('PlanoEscolhido', 'Plano escolhido', 'Confirma a escolha.', 3, 0, 'Plano reservado', [
    alert('al_escolhido', 'positive', 'Plano {{form.planoEscolhido}} reservado para você.', { title: 'Boa escolha' }),
    ok('btn_concluir', 'Concluir'),
  ]);
  f.chain(ini, ofertas, escolha, escolhido, f.end('Fim', 'Fim', 4, 0));
  f.note('Saída do tipo lista: $.planos vira a lista data.planos, guardando só os campos que a tela usa.', 1, 0, [ofertas]);
  f.note('A ação "Quero este" só fica liberada nos planos com disponivel = true — a regra vem da API, não da tela.', 2, 0, [escolha], true);
  return f.build();
});

const horariosFonte = (paramName, paramValue) => [{
  alias: 'horarios', source: '', params: { [paramName]: paramValue }, required: true,
  errorMessage: 'Não conseguimos carregar os horários agora.',
}];

template({
  templateId: 'tela-fonte-dados', name: 'Tela com fonte de dados', track: 'integracoes', area: null, channelTypes: ALL,
  description: 'Agenda a instalação com horários buscados na hora em que a tela abre.',
  highlights: [
    'Opções da tela buscadas sem passar pelo fluxo',
    '"Tentar novamente" quando a busca falha',
    'Parâmetro da busca vindo de uma tela anterior',
  ],
}, () => {
  const f = flow('Tela com fonte de dados');
  const ini = f.start(0, 0);
  const cep = f.screen('Cep', 'Endereço de instalação', 'Coleta o CEP da instalação.', 1, 0, 'Agende sua instalação', [
    title('txt_titulo', 'Onde vamos instalar?'),
    textInput('in_cep', 'CEP (só números)', 'cep', { inputMode: 'text', maxLength: 8 }),
    ok('btn_cep', 'Ver horários'),
  ]);
  const horario = f.screen('Horario', 'Escolha o horário', 'Horários livres para o CEP, buscados quando a tela abre.', 2, 0, 'Escolha o horário', [
    title('txt_horario', 'Escolha o melhor horário'),
    selectFromList('sel_horario', 'Horários disponíveis', 'horarioInstalacao', 'data.horarios'),
    ok('btn_horario', 'Agendar'),
  ], horariosFonte('cep', '{{form_cep}}'));
  const agendar = f.rest('Agendar', 'Agenda a instalação', 'Confirma o horário na agenda técnica.', 3, 0, {
    method: 'POST', url: `${MOCK}/instalacoes/agendamentos`, headers: JSON_HEADERS,
    body: { cep: '{{form_cep}}', horario: '{{form_horarioInstalacao}}' },
    outputMapping: [out('protocoloAgendamento', '$.protocolo')],
  });
  const agendado = f.screen('Agendado', 'Instalação agendada', 'Confirma o agendamento.', 4, 0, 'Instalação agendada', [
    alert('al_agendado', 'positive', 'Instalação agendada. Protocolo {{data.protocoloAgendamento}}.', { title: 'Tudo certo' }),
    ok('btn_concluir', 'Concluir'),
  ]);
  f.chain(ini, cep, horario, agendar, agendado, f.end('Fim', 'Fim', 5, 0));
  f.note('Antes de publicar: cadastre no Catálogo de Integrações uma fonte de dados para GET http://localhost:8084/v1/instalacoes/horarios-disponiveis?cep={cep} (itens em $.horarios, campos value e label), escolha-a nesta tela e ligue o parâmetro cep a {{form_cep}}.', 2, 0, [horario]);
  f.note('Fonte obrigatória: se a busca falhar, a tela oferece "Tentar novamente" em vez de seguir sem opções.', 2, 0, [horario], true);
  return f.build();
});

template({
  templateId: 'avisa-e-segue', name: 'Avisa e segue', track: 'integracoes', area: null, channelTypes: DIGITAL,
  description: 'Publica um evento de alteração de cadastro e segue a jornada sem esperar resposta.',
  highlights: [
    'Publicação de mensagem sem esperar retorno',
    'Mensagem montada campo a campo',
    'Valores fixos e respostas da tela no mesmo evento',
  ],
}, () => {
  const f = flow('Avisa e segue');
  const ini = f.start(0, 0);
  const email = f.screen('NovoEmail', 'Atualizar e-mail', 'Coleta o novo e-mail e a preferência de comunicação.', 1, 0, 'Atualize seu e-mail', [
    title('txt_titulo', 'Qual é o seu novo e-mail?'),
    textInput('in_email', 'Novo e-mail', 'novoEmail', { inputMode: 'email', placeholder: 'voce@exemplo.com' }),
    checkbox('chk_novidades', 'Quero receber novidades e ofertas por e-mail', 'aceitaNovidades'),
    ok('btn_salvar', 'Salvar'),
  ]);
  const publica = f.publish('PublicaAlteracao', 'Publica alteração de cadastro', 'Avisa os outros sistemas sobre o novo e-mail.', 2, 0, [
    ['evento', 'EMAIL_ALTERADO'], ['email', '{{form_novoEmail}}'], ['aceitaNovidades', '{{form_aceitaNovidades}}', 'boolean'],
  ]);
  const pronto = f.screen('Pronto', 'E-mail atualizado', 'Confirma a alteração.', 3, 0, 'E-mail atualizado', [
    alert('al_pronto', 'positive', 'Seu e-mail agora é {{form.novoEmail}}.', { title: 'Pronto' }),
    ok('btn_concluir', 'Concluir'),
  ]);
  f.chain(ini, email, publica, pronto, f.end('Fim', 'Fim', 4, 0));
  f.note('Publica e segue: a jornada não espera resposta. Antes de publicar: escolha cluster, tópico e credencial de mensageria.', 2, 0, [publica]);
  f.note('O conteúdo da mensagem é montado campo a campo, misturando valores fixos e respostas da tela.', 2, 0, [publica], true);
  return f.build();
});

const DIAGNOSTICO_CAMPOS = [
  ['statusConexao'], ['qualidadeSinal'], ['conclusao'], ['recomendacao'],
  ['velocidadeDownloadMbps', 'number'], ['latenciaMs', 'number'],
];
const telaDiagnostico = (f, id, col, lane) => f.screen(id, 'Resultado do diagnóstico', 'Mostra o resultado da avaliação de conexão.', col, lane, 'Resultado do diagnóstico', [
  title('txt_dg_titulo', 'Resultado do diagnóstico da sua conexão'),
  alert('al_dg', 'informative', '{{data.conclusao}}', { title: 'Conexão {{data.statusConexao}} — sinal {{data.qualidadeSinal}}' }),
  card('card_dg', [stack('stk_dg', [
    body('txt_dg_download', 'Download: {{data.velocidadeDownloadMbps}} Mbps'),
    body('txt_dg_latencia', 'Latência: {{data.latenciaMs}} ms'),
    caption('txt_dg_protocolo', 'Protocolo: {{data.protocoloDiagnostico}}'),
  ])]),
  divider('div_dg'),
  body('txt_dg_recomendacao', 'Recomendação: {{data.recomendacao}}'),
  ok('btn_dg', 'Concluir'),
]);
const solicitaDiagnostico = (f, col, lane) => f.rest('SolicitaDiagnostico', 'Solicita diagnóstico', 'Pede a avaliação de conexão do cliente.', col, lane, {
  method: 'POST', url: `${MOCK}/diagnosticos/solicitacoes`, headers: JSON_HEADERS,
  body: { cnpj: '{{form_cnpj}}', tipoAvaliacao: 'CONECTIVIDADE_E_SINAL' },
  outputMapping: [out('protocoloDiagnostico', '$.protocolo'), out('previsaoRetorno', '$.previsaoRetorno')],
});
const telaCnpj = (f, col, lane, heading_) => f.screen('InformaCnpj', 'Informe o CNPJ', 'Coleta o CNPJ da empresa.', col, lane, 'Suporte Vivo Empresas', [
  title('txt_cnpj', heading_),
  textInput('in_cnpj', 'CNPJ (só números)', 'cnpj', { inputMode: 'text', maxLength: 14, placeholder: '00000000000000' }),
  ok('btn_cnpj', 'Consultar'),
]);

template({
  templateId: 'api-e-mensagem', name: 'Pede pela API, recebe por mensagem', track: 'integracoes', area: null, channelTypes: ALL,
  description: 'A API só confirma o pedido de diagnóstico; o resultado chega depois, por mensagem, e vai para a tela.',
  highlights: [
    'API que só confirma o pedido',
    'Etapa que espera a mensagem de retorno',
    'Campos da mensagem exibidos na tela',
  ],
}, () => {
  const f = flow('Pede pela API, recebe por mensagem');
  const ini = f.start(0, 0);
  const cnpj = telaCnpj(f, 1, 0, 'Vamos avaliar a conexão da sua empresa');
  const solicita = solicitaDiagnostico(f, 2, 0);
  const aguarda = f.receive('AguardaDiagnostico', 'Aguarda resultado do diagnóstico', 'Espera o retorno da avaliação por mensagem.', 3, 0, DIAGNOSTICO_CAMPOS);
  const resultado = telaDiagnostico(f, 'Resultado', 4, 0);
  f.chain(ini, cnpj, solicita, aguarda, resultado, f.end('Fim', 'Fim', 5, 0));
  f.note('A API só confirma o pedido (protocolo e previsão). O resultado chega depois, por mensagem.', 2, 0, [solicita]);
  f.note('A jornada fica parada aqui até a mensagem desta execução chegar; os campos de payload.data viram variáveis. Antes de publicar: escolha cluster, tópico e credencial.', 3, 0, [aguarda], true);
  return f.build();
});

template({
  templateId: 'disparada-por-evento', name: 'Jornada disparada por evento', track: 'integracoes', area: null, channelTypes: ALL,
  description: 'Começa sozinha quando chega o evento de fatura vencida e guia o cliente até o pagamento.',
  highlights: [
    'Início por mensagem, sem ninguém iniciar',
    'Dados do evento viram variáveis da jornada',
    'Cliente continua a partir do aviso',
  ],
}, () => {
  const f = flow('Jornada disparada por evento');
  const evento = f.messageStart('FaturaVencida', 'Fatura vencida', 'Começa quando chega o evento de fatura vencida.', 0, 0, [
    ['clienteNome'], ['faturaReferencia'], ['faturaValor', 'number'], ['faturaVencimento'],
  ]);
  const aviso = f.screen('Aviso', 'Aviso de fatura vencida', 'Avisa o cliente e pergunta o que ele quer fazer.', 1, 0, 'Sua fatura venceu', [
    alert('al_vencida', 'warning', 'A fatura {{data.faturaReferencia}}, de R$ {{data.faturaValor}}, venceu em {{data.faturaVencimento}}.', { title: 'Olá, {{data.clienteNome}}' }),
    select('sel_acao', 'O que você quer fazer?', 'acaoFatura', [opt('Quero pagar agora', 'pagar'), opt('Já paguei', 'ja_paguei')]),
    ok('btn_acao', 'Continuar'),
  ]);
  const jaPagou = f.decision('JaPagou', 'Já pagou?', 'Se já pagou, agradece; senão, mostra como pagar.', 2, 0);
  const conferir = f.screen('Conferir', 'Pagamento informado', 'Agradece e avisa que o pagamento será conferido.', 3, -1, 'Obrigado', [
    alert('al_conferir', 'positive', 'Obrigado! Vamos conferir o pagamento em até 2 dias úteis.'),
    ok('btn_conferir', 'Concluir'),
  ]);
  const comoPagar = f.screen('ComoPagar', 'Como pagar', 'Mostra as formas de pagamento.', 3, 1, 'Como pagar', [
    title('txt_como', 'Você pode pagar de três jeitos'),
    body('txt_formas', 'Pelo app, por Pix ou no banco, com a linha digitável da fatura.'),
    ok('btn_como', 'Entendi'),
  ]);
  f.chain(evento, aviso, jaPagou);
  f.link(jaPagou, conferir, { when: '{{form_acaoFatura}} == "ja_paguei"' });
  f.link(jaPagou, comoPagar, { otherwise: true });
  f.chain(conferir, f.end('FimConferir', 'Fim — já pagou', 4, -1));
  f.chain(comoPagar, f.end('FimComoPagar', 'Fim — como pagar', 4, 1));
  f.note('Início por mensagem: a jornada começa sozinha quando o evento chega, e os campos do evento viram variáveis. Antes de publicar: escolha cluster, tópico e credencial.', 0, 0, [evento]);
  return f.build();
});

template({
  templateId: 'processamento-em-fila', name: 'Processamento em fila', track: 'integracoes', area: null, channelTypes: ['WEB'],
  description: 'Envia uma troca de titularidade para outro sistema processar e espera o retorno para seguir.',
  highlights: [
    'Envio para processamento e espera do retorno',
    'Ida e volta pela mesma mensageria',
    'Decisão pelo status devolvido',
  ],
}, () => {
  const f = flow('Processamento em fila');
  const ini = f.start(0, 0);
  const pedido = f.screen('Pedido', 'Pedido de troca de titularidade', 'Coleta os dados da troca.', 1, 0, 'Troca de titularidade', [
    title('txt_titulo', 'Troca de titularidade da linha'),
    textInput('in_atual', 'CPF do titular atual', 'cpfTitular', { inputMode: 'text', maxLength: 11 }),
    textInput('in_novo', 'CPF do novo titular', 'cpfNovoTitular', { inputMode: 'text', maxLength: 11 }),
    select('sel_motivo', 'Motivo', 'motivoTroca', [opt('Mudança de empresa', 'mudanca_empresa'), opt('Acordo entre as partes', 'acordo'), opt('Outro', 'outro')]),
    ok('btn_enviar', 'Enviar pedido'),
  ]);
  const envia = f.publish('EnviaProcessamento', 'Envia para processamento', 'Coloca o pedido na fila do sistema de cadastro.', 2, 0, [
    ['cpfTitular', '{{form_cpfTitular}}'], ['cpfNovoTitular', '{{form_cpfNovoTitular}}'], ['motivo', '{{form_motivoTroca}}'],
  ]);
  const aguarda = f.receive('AguardaProcessamento', 'Aguarda processamento', 'Espera o retorno do sistema de cadastro.', 3, 0, [
    ['statusProcessamento'], ['protocoloProcessamento'], ['motivoRecusa'],
  ]);
  const aprovado = f.decision('Aprovado', 'Troca aprovada?', 'Segue conforme o status devolvido.', 4, 0);
  const feito = f.screen('Transferida', 'Titularidade transferida', 'Confirma a troca.', 5, -1, 'Troca concluída', [
    alert('al_feito', 'positive', 'Titularidade transferida. Protocolo {{data.protocoloProcessamento}}.', { title: 'Concluído' }),
    ok('btn_feito', 'Concluir'),
  ]);
  const recusa = f.screen('Recusada', 'Troca recusada', 'Mostra o motivo da recusa.', 5, 1, 'Não foi possível', [
    alert('al_recusa', 'warning', '{{data.motivoRecusa}}', { title: 'A troca não foi aprovada' }),
    ok('btn_recusa', 'Concluir'),
  ]);
  f.chain(ini, pedido, envia, aguarda, aprovado);
  f.link(aprovado, feito, { when: '{{data_statusProcessamento}} == "APROVADO"' });
  f.link(aprovado, recusa, { otherwise: true });
  f.chain(feito, f.end('FimTransferida', 'Fim — transferida', 6, -1));
  f.chain(recusa, f.end('FimRecusada', 'Fim — recusada', 6, 1));
  f.note('Padrão de fila: publica o pedido e espera o retorno do processamento. Antes de publicar: escolha cluster, tópico e credencial nas duas etapas.', 2, 0, [envia, aguarda]);
  return f.build();
});

template({
  templateId: 'alerta-dispositivo-iot', name: 'Alerta de dispositivo IoT', track: 'integracoes', area: null, channelTypes: DIGITAL,
  description: 'Um alerta enviado por um dispositivo inicia a jornada e, se for crítico, o gestor aciona um técnico.',
  highlights: [
    'Evento do dispositivo inicia a jornada',
    'Decisão por valor numérico da mensagem',
    'Resposta publicada de volta na mensageria',
  ],
}, () => {
  const f = flow('Alerta de dispositivo IoT');
  const alerta = f.messageStart('AlertaDispositivo', 'Alerta do dispositivo', 'Começa quando um dispositivo envia um alerta.', 0, 0, [
    ['dispositivoId'], ['tipoAlerta'], ['nivelBateria', 'number'], ['localizacao'],
  ]);
  const critico = f.decision('Critico', 'Bateria crítica?', 'Alertas com menos de 10% de bateria vão para o gestor.', 1, 0);
  const acao = f.screen('Acao', 'Ação do gestor', 'O gestor decide o que fazer.', 2, -1, 'Alerta crítico', [
    alert('al_critico', 'warning', 'Dispositivo {{data.dispositivoId}} em {{data.localizacao}} com {{data.nivelBateria}}% de bateria.', { title: 'Atenção' }),
    select('sel_acao', 'O que fazer?', 'acaoGestor', [opt('Enviar um técnico', 'enviar_tecnico'), opt('Só monitorar', 'monitorar')]),
    ok('btn_acao', 'Confirmar'),
  ]);
  const ordem = f.publish('OrdemTecnico', 'Envia ordem ao técnico', 'Publica a ordem para a equipe de campo.', 3, -1, [
    ['dispositivoId', '{{data_dispositivoId}}'], ['localizacao', '{{data_localizacao}}'], ['acao', '{{form_acaoGestor}}'],
  ]);
  const enviada = f.screen('Enviada', 'Ordem enviada', 'Confirma o envio.', 4, -1, 'Ordem enviada', [
    alert('al_enviada', 'positive', 'A equipe de campo recebeu a ordem para o dispositivo {{data.dispositivoId}}.'),
    ok('btn_enviada', 'Concluir'),
  ]);
  const registrado = f.screen('Registrado', 'Alerta registrado', 'Registra o alerta sem ação imediata.', 2, 1, 'Alerta registrado', [
    body('txt_registrado', 'Alerta {{data.tipoAlerta}} do dispositivo {{data.dispositivoId}} registrado para acompanhamento.'),
    ok('btn_registrado', 'Concluir'),
  ]);
  f.chain(alerta, critico);
  f.link(critico, acao, { when: '{{data_nivelBateria}} < 10' });
  f.link(critico, registrado, { otherwise: true });
  f.chain(acao, ordem, enviada, f.end('FimOrdem', 'Fim — ordem enviada', 5, -1));
  f.chain(registrado, f.end('FimRegistrado', 'Fim — registrado', 3, 1));
  f.note('O evento do dispositivo inicia a jornada. Antes de publicar: escolha cluster, tópico e credencial aqui e na ordem ao técnico.', 0, 0, [alerta, ordem]);
  f.note('Condição numérica: {{data_nivelBateria}} < 10.', 1, 0, [critico], true);
  return f.build();
});

template({
  templateId: 'orquestracao-em-sequencia', name: 'Orquestração em sequência', track: 'integracoes', area: null, channelTypes: DIGITAL,
  description: 'Encadeia análise de crédito, elegibilidade e criação de pedido, cada chamada usando o resultado da anterior.',
  highlights: [
    'Três integrações encadeadas',
    'Resultado de uma chamada no corpo da próxima',
    'Sequência terminando numa tela',
  ],
}, () => {
  const f = flow('Orquestração em sequência');
  const ini = f.start(0, 0);
  const dados = f.screen('Dados', 'Dados do cliente', 'Coleta CPF, nome e plano.', 1, 0, 'Contratação', [
    title('txt_titulo', 'Vamos montar seu pedido'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    textInput('in_nome', 'Nome completo', 'nomeCompleto'),
    select('sel_plano', 'Plano', 'planoDesejado', [opt('Vivo Controle 15GB', 'CTRL-15'), opt('Vivo Pós 40GB', 'POS-40'), opt('Vivo Pós 100GB', 'POS-100')]),
    ok('btn_enviar', 'Enviar'),
  ]);
  const credito = f.rest('AnaliseCredito', 'Análise de crédito', 'Calcula o score de crédito.', 2, 0, {
    method: 'POST', url: `${MOCK}/credito/score`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', nomeCompleto: '{{form_nomeCompleto}}' },
    outputMapping: [out('creditoAprovado', '$.aprovado', 'boolean'), out('scoreCredito', '$.score', 'number'), out('limiteSugerido', '$.limiteSugerido', 'number')],
  });
  const eleg = f.rest('Elegibilidade', 'Elegibilidade', 'Confere a elegibilidade usando o score.', 3, 0, {
    method: 'POST', url: `${MOCK}/elegibilidade`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', score: '{{data_scoreCredito}}' },
    outputMapping: [out('elegivelPedido', '$.elegivel', 'boolean'), out('protocoloElegibilidade', '$.protocolo')],
  });
  const pedido = f.rest('CriaPedido', 'Cria o pedido', 'Cria o pedido com o protocolo da elegibilidade.', 4, 0, {
    method: 'POST', url: `${MOCK}/pedidos`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', plano: '{{form_planoDesejado}}', protocoloElegibilidade: '{{data_protocoloElegibilidade}}' },
    outputMapping: [out('numeroPedido', '$.numeroPedido'), out('dataAtivacaoPrevista', '$.dataAtivacaoPrevista')],
  });
  const resumo = f.screen('Resumo', 'Resumo do pedido', 'Mostra o resultado das três integrações.', 5, 0, 'Pedido criado', [
    alert('al_pedido', 'positive', 'Pedido {{data.numeroPedido}} criado. Ativação prevista para {{data.dataAtivacaoPrevista}}.', { title: 'Tudo certo, {{form.nomeCompleto}}' }),
    card('card_resumo', [stack('stk_resumo', [
      body('txt_score', 'Score de crédito: {{data.scoreCredito}}'),
      body('txt_limite', 'Limite sugerido: R$ {{data.limiteSugerido}}'),
      caption('txt_protocolo', 'Protocolo de elegibilidade: {{data.protocoloElegibilidade}}'),
    ])]),
    ok('btn_concluir', 'Concluir'),
  ]);
  f.chain(ini, dados, credito, eleg, pedido, resumo, f.end('Fim', 'Fim', 6, 0));
  f.note('Cada chamada usa o resultado da anterior: o score vai no corpo da elegibilidade, e o protocolo dela vai no pedido.', 3, 0, [credito, eleg, pedido]);
  f.note('Uma sequência de chamadas REST precisa terminar numa tela ou numa espera: o motor precisa de um ponto de parada antes do fim.', 5, 0, [resumo], true);
  return f.build();
});

// =================================================================================================
// Trilha 3 — Canais
// =================================================================================================

const FATURAS_KEEP = ['id', 'referencia', 'valor', 'vencimento', 'status', 'podeSegundaVia', 'podeNegociar', 'motivoBloqueio'];
const consultaFaturas = (f, col, lane) => f.rest('BuscaFaturas', 'Busca faturas em aberto', 'Traz as faturas em aberto do CPF.', col, lane, {
  method: 'GET', url: `${MOCK}/clientes/{{form_cpf}}/faturas`, headers: ACCEPT,
  outputMapping: [out('quantidadeFaturas', '$.quantidade', 'number'), list('faturas', '$.faturas', FATURAS_KEEP)],
});
const segundaVia = (f, col, lane) => f.rest('GeraSegundaVia', 'Gera 2ª via', 'Gera linha digitável e Pix da fatura escolhida.', col, lane, {
  method: 'POST', url: `${MOCK}/faturas/{{form_faturaEscolhida}}/segunda-via`, headers: JSON_HEADERS, body: {},
  outputMapping: [out('linhaDigitavel', '$.linhaDigitavel'), out('pixCopiaECola', '$.pixCopiaECola'), out('validadeSegundaVia', '$.validade')],
});
const telaSegundaVia = (f, id, col, lane) => f.screen(id, 'Sua 2ª via', 'Mostra os dados para pagamento.', col, lane, 'Sua 2ª via', [
  title('txt_sv', 'Prontinho! Aqui está sua 2ª via'),
  body('txt_sv_linha', 'Linha digitável: {{data.linhaDigitavel}}'),
  body('txt_sv_pix', 'Pix copia e cola: {{data.pixCopiaECola}}'),
  caption('txt_sv_validade', 'Válida até {{data.validadeSegundaVia}}'),
  ok('btn_sv', 'Encerrar'),
]);
const telaEmDia = (f, col, lane) => f.screen('EmDia', 'Tudo em dia', 'Informa que não há faturas em aberto.', col, lane, 'Tudo em dia', [
  alert('al_em_dia', 'positive', 'Você não tem faturas em aberto.', { title: 'Tudo em dia' }),
  ok('btn_em_dia', 'Encerrar'),
]);

template({
  templateId: 'atendimento-whatsapp', name: 'Atendimento pelo WhatsApp', track: 'canais', area: null, channelTypes: ['WHATSAPP'],
  description: 'Conversa guiada no WhatsApp: menu de opções, lista de faturas e envio da 2ª via.',
  highlights: [
    'Menu de opções numa conversa',
    'Lista do WhatsApp com botão de ação',
    'Frases curtas pensadas para mensagem',
  ],
}, () => {
  const f = flow('Atendimento pelo WhatsApp');
  const ini = f.start(0, 0);
  const menu = f.screen('Menu', 'Menu de atendimento', 'Cumprimenta e pergunta o assunto.', 1, 0, 'Atendimento Vivo', [
    title('txt_oi', 'Oi! Sou o assistente virtual da Vivo.'),
    select('sel_assunto', 'Como posso ajudar?', 'assunto', [opt('2ª via de fatura', 'segunda_via'), opt('Falar com um atendente', 'atendente')]),
    ok('btn_menu', 'Enviar'),
  ]);
  const assunto = f.decision('SegundaViaOuAtendente', '2ª via?', 'Segue para a 2ª via ou para o atendente.', 2, 0);
  const cpf = f.screen('Cpf', 'CPF do titular', 'Pede o CPF do titular.', 3, -1, 'CPF do titular', [
    body('txt_cpf', 'Pra encontrar suas faturas, me diz o CPF do titular.'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    ok('btn_cpf', 'Enviar'),
  ]);
  const faturas = consultaFaturas(f, 4, -1);
  const tem = f.decision('TemFaturas', 'Tem faturas?', 'Sem faturas, avisa e encerra.', 5, -1);
  const escolha = f.screen('EscolheFatura', 'Escolha a fatura', 'Lista as faturas com o botão de 2ª via.', 6, -1, 'Suas faturas', [
    body('txt_escolha', 'Encontrei estas faturas. Qual você quer?'),
    selectList('lst_faturas', 'Suas faturas', 'data.faturas', 'faturaEscolhida', {
      itemValue: 'id', itemTitle: 'Fatura {{item.referencia}}', itemDescription: 'R$ {{item.valor}} · vence {{item.vencimento}}',
      itemHint: '{{item.status}}', emptyMessage: 'Você não tem faturas em aberto.', actionVar: 'acaoFatura',
      actions: [{ id: 'segunda_via', label: 'Enviar 2ª via', variant: 'primary', enabledWhen: '{{item.podeSegundaVia}} == true' }],
    }),
  ]);
  const gera = segundaVia(f, 7, -1);
  const enviada = telaSegundaVia(f, 'SegundaVia', 8, -1);
  const atendente = f.screen('Atendente', 'Transferir para atendente', 'Avisa que vai transferir.', 3, 1, 'Atendimento humano', [
    alert('al_atendente', 'informative', 'Vou te transferir para um atendente. É rapidinho.'),
    ok('btn_atendente', 'Ok'),
  ]);
  f.chain(ini, menu, assunto);
  f.link(assunto, cpf, { when: '{{form_assunto}} == "segunda_via"' });
  f.link(assunto, atendente, { otherwise: true });
  f.chain(cpf, faturas, tem);
  f.link(tem, telaEmDia(f, 6, -2), { when: '{{data_quantidadeFaturas}} == 0' });
  f.link(tem, escolha, { otherwise: true });
  f.chain('Node_EmDia', f.end('FimEmDia', 'Fim — em dia', 7, -2));
  f.chain(escolha, gera, enviada, f.end('FimSegundaVia', 'Fim — 2ª via enviada', 9, -1));
  f.chain(atendente, f.end('FimAtendente', 'Fim — atendente', 4, 1));
  f.note('No WhatsApp cada tela vira mensagem: a lista de opções vira um menu e o botão vira resposta rápida.', 1, 0, [menu]);
  f.note('Na lista do WhatsApp, cada item tem até 3 botões, com no máximo 20 caracteres cada.', 6, -1, [escolha], true);
  return f.build();
});

template({
  templateId: 'um-fluxo-tres-canais', name: 'Um fluxo, três canais', track: 'canais', area: null, channelTypes: ALL,
  description: 'As mesmas telas na Web, no App e no WhatsApp, com conteúdo e caminhos ajustados a cada canal.',
  highlights: [
    'Conteúdo que aparece só em alguns canais',
    'Decisão pelo canal de origem',
    'Mesmas telas nos três canais',
  ],
}, () => {
  const f = flow('Um fluxo, três canais');
  const ini = f.start(0, 0);
  const boasVindas = f.screen('BoasVindas', 'Boas-vindas', 'Coleta nome e e-mail com mensagens por canal.', 1, 0, 'Receba sua proposta', [
    title('txt_titulo', 'Receba uma proposta em poucos minutos'),
    alert('al_wpp', 'informative', 'Você está falando com a Vivo pelo WhatsApp. É só responder às mensagens.', {
      visibility: { path: 'channel', rule: 'equals', value: 'WHATSAPP' },
    }),
    stack('stk_instrucao', [body('txt_instrucao', 'Preencha os campos abaixo e enviamos a proposta para o seu e-mail.')], {
      visibility: { path: 'channel', rule: 'notIn', value: ['WHATSAPP'] },
    }),
    textInput('in_nome', 'Seu nome', 'nome'),
    textInput('in_email', 'Seu e-mail', 'email', { inputMode: 'email' }),
    ok('btn_enviar', 'Quero a proposta'),
  ]);
  const canal = f.decision('VeioDoWhatsapp', 'Veio pelo WhatsApp?', 'No WhatsApp a proposta segue na conversa.', 2, 0);
  const wpp = f.screen('PropostaConversa', 'Proposta na conversa', 'Continua a conversa no WhatsApp.', 3, -1, 'Sua proposta', [
    body('txt_wpp', 'Pronto, {{form.nome}}! Vou te mandar a proposta aqui mesmo, nesta conversa.'),
    ok('btn_wpp', 'Ok'),
  ]);
  const digital = f.screen('PropostaEmail', 'Proposta por e-mail', 'Confirma o envio por e-mail.', 3, 1, 'Proposta enviada', [
    alert('al_email', 'positive', 'Enviamos a proposta para {{form.email}}.', { title: 'Tudo certo, {{form.nome}}' }),
    body('txt_app', 'Você também acompanha a proposta em Meus pedidos, no app.', ),
    link('lk_planos', 'Conhecer outros planos', { visibility: { path: 'channel', rule: 'equals', value: 'WEB' } }),
    ok('btn_email', 'Concluir'),
  ]);
  f.chain(ini, boasVindas, canal);
  f.link(canal, wpp, { when: '{{channel}} == "WHATSAPP"' });
  f.link(canal, digital, { otherwise: true });
  f.chain(wpp, f.end('FimWhatsapp', 'Fim — WhatsApp', 4, -1));
  f.chain(digital, f.end('FimDigital', 'Fim — Web e App', 4, 1));
  f.note('Conteúdo por canal: o aviso só aparece no WhatsApp e a instrução só na Web e no App (regra de visibilidade pela variável channel).', 1, 0, [boasVindas]);
  f.note('A variável channel também vale em decisões: {{channel}} == "WHATSAPP".', 2, 0, [canal], true);
  return f.build();
});

template({
  templateId: 'pesquisa-satisfacao', name: 'Pesquisa de satisfação', track: 'canais', area: null, channelTypes: ALL,
  description: 'Pesquisa curta depois de um atendimento, com uma pergunta extra só para quem avaliou mal.',
  highlights: [
    'Campo que só aparece conforme a resposta',
    'Mesma pesquisa em qualquer canal',
    'Avaliação publicada para análise',
  ],
}, () => {
  const f = flow('Pesquisa de satisfação');
  const ini = f.start(0, 0, [{ name: 'protocoloAtendimento', type: 'string' }]);
  const avaliacao = f.screen('Avaliacao', 'Avaliação', 'Coleta a satisfação e, se baixa, o motivo.', 1, 0, 'Como foi o atendimento?', [
    title('txt_titulo', 'Como foi o seu atendimento?'),
    caption('txt_protocolo', 'Protocolo {{data.protocoloAtendimento}}'),
    select('sel_satisfacao', 'Sua avaliação', 'satisfacao', [
      opt('Muito satisfeito', '5'), opt('Satisfeito', '4'), opt('Neutro', '3'), opt('Insatisfeito', '2'), opt('Muito insatisfeito', '1'),
    ]),
    { ...textArea('ta_melhorar', 'O que podemos melhorar?', 'melhoria', { required: false }), visibility: { path: 'form.satisfacao', rule: 'in', value: ['1', '2', '3'] } },
    checkbox('chk_contato', 'Pode entrar em contato comigo sobre esta avaliação', 'autorizaContato'),
    ok('btn_enviar', 'Enviar avaliação'),
  ]);
  const registra = f.publish('RegistraAvaliacao', 'Registra avaliação', 'Publica a avaliação para a área de qualidade.', 2, 0, [
    ['protocolo', '{{data_protocoloAtendimento}}'], ['satisfacao', '{{form_satisfacao}}', 'number'],
    ['melhoria', '{{form_melhoria}}'], ['autorizaContato', '{{form_autorizaContato}}', 'boolean'],
  ]);
  const obrigado = f.screen('Obrigado', 'Agradecimento', 'Agradece a participação.', 3, 0, 'Obrigado', [
    alert('al_obrigado', 'positive', 'Obrigado pela avaliação! Ela ajuda a melhorar nosso atendimento.'),
    ok('btn_obrigado', 'Concluir'),
  ]);
  f.chain(ini, avaliacao, registra, obrigado, f.end('Fim', 'Fim', 4, 0));
  f.note('Campo condicional: "O que podemos melhorar?" só aparece para avaliações de 1 a 3.', 1, 0, [avaliacao]);
  f.note('Antes de publicar: escolha cluster, tópico e credencial de mensageria.', 2, 0, [registra], true);
  return f.build();
});

template({
  templateId: 'cadastro-passo-a-passo', name: 'Cadastro passo a passo no app', track: 'canais', area: null, channelTypes: ['MOBILE', 'WEB'],
  description: 'Cadastro dividido em três telas curtas, com barra de progresso e o teclado certo para cada campo.',
  highlights: [
    'Formulário em passos curtos com progresso',
    'Teclado certo para cada tipo de campo',
    'Aceite de termos obrigatório',
  ],
}, () => {
  const f = flow('Cadastro passo a passo no app');
  const ini = f.start(0, 0);
  const passo1 = f.screen('Passo1', 'Passo 1 — identificação', 'Nome e CPF.', 1, 0, 'Criar conta', [
    progress('pg_1', 0.33, { label: 'Passo 1 de 3' }),
    title('txt_p1', 'Vamos começar pelo básico'),
    textInput('in_nome', 'Nome completo', 'nomeCompleto'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    ok('btn_p1'),
  ]);
  const passo2 = f.screen('Passo2', 'Passo 2 — contato', 'Nascimento, celular e e-mail.', 2, 0, 'Criar conta', [
    progress('pg_2', 0.66, { label: 'Passo 2 de 3' }),
    title('txt_p2', 'Como falamos com você?'),
    datePicker('dt_nascimento', 'Data de nascimento', 'nascimento'),
    textInput('in_celular', 'Celular com DDD', 'celular', { inputMode: 'tel' }),
    textInput('in_email', 'E-mail', 'email', { inputMode: 'email' }),
    ok('btn_p2'),
  ]);
  const passo3 = f.screen('Passo3', 'Passo 3 — termos', 'Aceite dos termos.', 3, 0, 'Criar conta', [
    progress('pg_3', 1, { label: 'Passo 3 de 3' }),
    title('txt_p3', 'Quase lá, {{form.nomeCompleto}}!'),
    checkbox('chk_termos', 'Li e aceito os Termos de Uso e a Política de Privacidade', 'aceiteTermos', { required: true }),
    checkbox('chk_ofertas', 'Quero receber ofertas personalizadas', 'aceiteOfertas'),
    ok('btn_p3', 'Criar minha conta'),
  ]);
  const cadastro = f.rest('CriaCadastro', 'Cria o cadastro', 'Envia o cadastro para o sistema de clientes.', 4, 0, {
    method: 'POST', url: `${MOCK}/clientes/cadastro`, headers: JSON_HEADERS,
    body: { nome: '{{form_nomeCompleto}}', cpf: '{{form_cpf}}', email: '{{form_email}}', celular: '{{form_celular}}', nascimento: '{{form_nascimento}}' },
    outputMapping: [out('idCliente', '$.idCliente')],
  });
  const bemVindo = f.screen('BemVindo', 'Boas-vindas', 'Confirma a criação da conta.', 5, 0, 'Conta criada', [
    alert('al_bem_vindo', 'positive', 'Conta criada! Seu código de cliente é {{data.idCliente}}.', { title: 'Bem-vindo, {{form.nomeCompleto}}' }),
    ok('btn_bem_vindo', 'Começar'),
  ]);
  f.chain(ini, passo1, passo2, passo3, cadastro, bemVindo, f.end('Fim', 'Fim', 6, 0));
  f.note('Cada passo é uma tela curta com sua barra de progresso — no app, rende mais do que um formulário longo.', 2, 0, [passo1, passo2, passo3]);
  f.note('Para tratar falhas desta chamada, veja o modelo "Integração com tratamento de falha".', 4, 0, [cadastro], true);
  return f.build();
});

// =================================================================================================
// Trilha 4 — Jornadas de negócio
// =================================================================================================

template({
  templateId: 'contratacao-plano', name: 'Contratação de plano com análise de crédito', track: 'negocio', area: 'Vendas', channelTypes: ALL,
  description: 'Do CPF ao pedido: análise de crédito, escolha do plano no catálogo, endereço e criação do pedido.',
  highlights: [
    'Análise de crédito decide o caminho',
    'Planos vindos do catálogo comercial',
    'Pedido criado com dados de várias telas',
  ],
}, () => {
  const f = flow('Contratação de plano');
  const ini = f.start(0, 0);
  const ident = f.screen('Identificacao', 'Identificação', 'Coleta CPF e nome.', 1, 0, 'Contrate seu plano', [
    title('txt_titulo', 'Contrate seu plano em poucos passos'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    textInput('in_nome', 'Nome completo', 'nomeCompleto'),
    ok('btn_ident', 'Continuar'),
  ]);
  const credito = f.rest('AnaliseCredito', 'Análise de crédito', 'Consulta o crédito do CPF.', 2, 0, {
    method: 'POST', url: `${MOCK}/credito/score`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', nomeCompleto: '{{form_nomeCompleto}}' },
    outputMapping: [out('creditoAprovado', '$.aprovado', 'boolean'), out('scoreCredito', '$.score', 'number')],
  });
  const aprovado = f.decision('CreditoAprovado', 'Crédito aprovado?', 'Aprovado segue para os planos; senão, oferta pré-pago.', 3, 0);
  const ofertas = f.rest('BuscaPlanos', 'Busca planos à venda', 'Traz o catálogo comercial.', 4, -1, planosOutput());
  const plano = f.screen('EscolhePlano', 'Escolha do plano', 'Lista os planos disponíveis.', 5, -1, 'Escolha seu plano', [
    title('txt_plano', 'Escolha o seu plano'),
    listaPlanos('lst_planos', 'planoEscolhido', 'Contratar'),
  ]);
  const endereco = f.screen('Endereco', 'Endereço', 'Coleta o endereço de entrega.', 6, -1, 'Onde entregamos o chip?', [
    title('txt_endereco', 'Onde entregamos o seu chip?'),
    textInput('in_cep', 'CEP (só números)', 'cep', { inputMode: 'text', maxLength: 8 }),
    textInput('in_numero', 'Número', 'numeroEndereco', { maxLength: 10 }),
    textInput('in_complemento', 'Complemento', 'complemento', { required: false }),
    ok('btn_endereco', 'Finalizar pedido'),
  ]);
  const pedido = f.rest('CriaPedido', 'Cria o pedido', 'Cria o pedido de contratação.', 7, -1, {
    method: 'POST', url: `${MOCK}/pedidos`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', plano: '{{form_planoEscolhido}}', cep: '{{form_cep}}', numero: '{{form_numeroEndereco}}' },
    outputMapping: [out('numeroPedido', '$.numeroPedido'), out('dataAtivacaoPrevista', '$.dataAtivacaoPrevista')],
  });
  const confirmado = f.screen('Confirmado', 'Pedido confirmado', 'Confirma o pedido.', 8, -1, 'Pedido confirmado', [
    alert('al_confirmado', 'positive', 'Pedido {{data.numeroPedido}} confirmado. Ativação prevista para {{data.dataAtivacaoPrevista}}.', { title: 'Parabéns, {{form.nomeCompleto}}!' }),
    ok('btn_confirmado', 'Concluir'),
  ]);
  const prePago = f.screen('OfertaPrePago', 'Oferta pré-pago', 'Oferece um plano pré-pago.', 4, 1, 'Uma alternativa para você', [
    alert('al_pre', 'informative', 'Que tal começar com um plano pré-pago? Você recarrega quando quiser, sem análise de crédito.', { title: 'Uma alternativa' }),
    ok('btn_pre', 'Entendi'),
  ]);
  f.chain(ini, ident, credito, aprovado);
  f.link(aprovado, ofertas, { when: '{{data_creditoAprovado}} == true' });
  f.link(aprovado, prePago, { otherwise: true });
  f.chain(ofertas, plano, endereco, pedido, confirmado, f.end('FimContratado', 'Fim — contratado', 9, -1));
  f.chain(prePago, f.end('FimPrePago', 'Fim — pré-pago', 5, 1));
  f.note('O crédito decide o caminho: aprovado segue para o catálogo de planos; reprovado recebe uma alternativa.', 3, 0, [aprovado], true);
  f.note('O pedido junta dados de três telas diferentes: identificação, plano e endereço.', 7, -1, [pedido]);
  return f.build();
});

template({
  templateId: 'portabilidade', name: 'Portabilidade numérica', track: 'negocio', area: 'Vendas', channelTypes: ALL,
  description: 'Consulta o prazo da portabilidade e, se for curto, solicita e espera a confirmação da operadora de origem.',
  highlights: [
    'Decisão por prazo numérico',
    'Confirmação da outra operadora por mensagem',
    'Protocolo e janela exibidos ao cliente',
  ],
}, () => {
  const f = flow('Portabilidade numérica');
  const ini = f.start(0, 0);
  const dados = f.screen('Dados', 'Dados da portabilidade', 'Coleta o número, a operadora atual e o CPF.', 1, 0, 'Traga seu número', [
    title('txt_titulo', 'Traga seu número para a Vivo'),
    textInput('in_numero', 'Número a trazer, com DDD', 'numeroPortar', { inputMode: 'tel' }),
    textInput('in_operadora', 'Operadora atual', 'operadoraAtual'),
    textInput('in_cpf', 'CPF do titular (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    ok('btn_consultar', 'Consultar prazo'),
  ]);
  const consulta = f.rest('ConsultaPrazo', 'Consulta prazo', 'Pergunta quantos dias a portabilidade leva.', 2, 0, {
    method: 'GET', url: `${MOCK}/portabilidade/consulta?numero={{form_numeroPortar}}`, headers: ACCEPT,
    outputMapping: [out('prazoEstimadoDias', '$.prazoEstimadoDias', 'number')],
  });
  const curto = f.decision('PrazoCurto', 'Prazo curto?', 'Menos de 3 dias: solicita já; senão, informa o prazo.', 3, 0);
  const solicita = f.rest('Solicita', 'Solicita portabilidade', 'Registra o pedido de portabilidade.', 4, -1, {
    method: 'POST', url: `${MOCK}/portabilidade/solicitacoes`, headers: JSON_HEADERS,
    body: { numero: '{{form_numeroPortar}}', operadoraAtual: '{{form_operadoraAtual}}', cpf: '{{form_cpf}}' },
    outputMapping: [out('protocoloPortabilidade', '$.protocolo'), out('janelaPortabilidade', '$.janelaPortabilidade')],
  });
  const aguarda = f.receive('AguardaOperadora', 'Aguarda a operadora de origem', 'Espera a confirmação da outra operadora.', 5, -1, [
    ['statusPortabilidade'], ['dataEfetivacao'],
  ]);
  const concluida = f.screen('Concluida', 'Portabilidade concluída', 'Mostra o resultado.', 6, -1, 'Seu número é Vivo', [
    alert('al_concluida', 'positive', 'O número {{form.numeroPortar}} agora é Vivo! Efetivado em {{data.dataEfetivacao}}.', { title: 'Bem-vindo' }),
    caption('txt_protocolo', 'Protocolo {{data.protocoloPortabilidade}} · janela {{data.janelaPortabilidade}}'),
    ok('btn_concluida', 'Concluir'),
  ]);
  const prazo = f.screen('PrazoEstendido', 'Prazo estendido', 'Informa o prazo maior.', 4, 1, 'Prazo da portabilidade', [
    alert('al_prazo', 'informative', 'A portabilidade do número {{form.numeroPortar}} leva cerca de {{data.prazoEstimadoDias}} dias. Vamos te avisar quando puder seguir.'),
    ok('btn_prazo', 'Entendi'),
  ]);
  f.chain(ini, dados, consulta, curto);
  f.link(curto, solicita, { when: '{{data_prazoEstimadoDias}} < 3' });
  f.link(curto, prazo, { otherwise: true });
  f.chain(solicita, aguarda, concluida, f.end('FimConcluida', 'Fim — concluída', 7, -1));
  f.chain(prazo, f.end('FimPrazo', 'Fim — prazo estendido', 5, 1));
  f.note('A confirmação da operadora de origem chega por mensagem. Antes de publicar: escolha cluster, tópico e credencial.', 5, -1, [aguarda]);
  return f.build();
});

template({
  templateId: 'upgrade-plano', name: 'Upgrade de plano', track: 'negocio', area: 'Vendas', channelTypes: ALL,
  description: 'O cliente escolhe um plano novo, a elegibilidade é conferida e a troca é aplicada na hora.',
  highlights: [
    'Linha do cliente recebida como variável de entrada',
    'Escolha do plano numa lista vinda de API',
    'Troca aplicada só se elegível',
  ],
}, () => {
  const f = flow('Upgrade de plano');
  const ini = f.start(0, 0, [{ name: 'linhaCliente', type: 'string' }]);
  const ofertas = f.rest('BuscaPlanos', 'Busca planos à venda', 'Traz o catálogo comercial.', 1, 0, planosOutput());
  const escolha = f.screen('EscolhePlano', 'Escolha o plano novo', 'Lista os planos para upgrade.', 2, 0, 'Faça upgrade', [
    title('txt_titulo', 'Mais internet para a linha {{data.linhaCliente}}'),
    listaPlanos('lst_planos', 'planoNovo', 'Quero este'),
  ]);
  const eleg = f.rest('Elegibilidade', 'Confere elegibilidade', 'Confere se a linha pode migrar.', 3, 0, {
    method: 'GET', url: `${MOCK}/planos/elegibilidade-upgrade?linha={{data_linhaCliente}}&plano={{form_planoNovo}}`, headers: ACCEPT,
    outputMapping: [out('elegivelUpgrade', '$.elegivel', 'boolean')],
  });
  const pode = f.decision('PodeTrocar', 'Pode trocar?', 'Aplica a troca se a linha for elegível.', 4, 0);
  const troca = f.rest('AplicaTroca', 'Aplica a troca', 'Troca o plano no faturamento.', 5, -1, {
    method: 'POST', url: `${MOCK}/planos/trocar`, headers: JSON_HEADERS,
    body: { linha: '{{data_linhaCliente}}', plano: '{{form_planoNovo}}' },
    outputMapping: [out('statusTroca', '$.status')],
  });
  const ok_ = f.screen('Trocado', 'Plano alterado', 'Confirma a troca.', 6, -1, 'Plano alterado', [
    alert('al_trocado', 'positive', 'A linha {{data.linhaCliente}} já está no plano {{form.planoNovo}}.', { title: 'Upgrade feito' }),
    ok('btn_trocado', 'Concluir'),
  ]);
  const indisponivel = f.screen('Indisponivel', 'Upgrade indisponível', 'Informa que a troca não é possível.', 5, 1, 'Upgrade indisponível', [
    alert('al_indisp', 'warning', 'Esta linha ainda não pode migrar para o plano escolhido.', { title: 'Não foi possível' }),
    ok('btn_indisp', 'Entendi'),
  ]);
  f.chain(ini, ofertas, escolha, eleg, pode);
  f.link(pode, troca, { when: '{{data_elegivelUpgrade}} == true' });
  f.link(pode, indisponivel, { otherwise: true });
  f.chain(troca, ok_, f.end('FimTrocado', 'Fim — upgrade feito', 7, -1));
  f.chain(indisponivel, f.end('FimIndisponivel', 'Fim — indisponível', 6, 1));
  f.note('A linha chega como variável de entrada e vai na URL da consulta: ?linha={{data_linhaCliente}}.', 3, 0, [ini, eleg]);
  return f.build();
});

template({
  templateId: 'ativacao-linha', name: 'Ativação de linha e chip', track: 'negocio', area: 'Ativação', channelTypes: ALL,
  description: 'Ativa a linha com chip físico ou eSIM e espera a confirmação da rede para avisar o cliente.',
  highlights: [
    'Campo que só aparece para chip físico',
    'Confirmação da rede por mensagem',
    'Decisão pelo status da rede',
  ],
}, () => {
  const f = flow('Ativação de linha e chip');
  const ini = f.start(0, 0);
  const chip = f.screen('Chip', 'Dados do chip', 'Coleta tipo de chip, número do chip e DDD.', 1, 0, 'Ative sua linha', [
    title('txt_titulo', 'Vamos ativar sua linha'),
    select('sel_tipo', 'Tipo de chip', 'tipoChip', [opt('Chip físico', 'fisico'), opt('eSIM', 'esim')]),
    { ...textInput('in_iccid', 'Número do chip (ICCID)', 'iccid', { inputMode: 'text', maxLength: 20, required: false }), visibility: { path: 'form.tipoChip', rule: 'equals', value: 'fisico' } },
    textInput('in_ddd', 'DDD de preferência', 'ddd', { inputMode: 'text', maxLength: 2 }),
    ok('btn_ativar', 'Ativar'),
  ]);
  const ativa = f.rest('AtivaLinha', 'Ativa a linha', 'Envia o comando de ativação.', 2, 0, {
    method: 'POST', url: `${MOCK}/linhas/ativar`, headers: JSON_HEADERS,
    body: { tipoChip: '{{form_tipoChip}}', iccid: '{{form_iccid}}', ddd: '{{form_ddd}}' },
    outputMapping: [out('statusAtivacao', '$.status')],
  });
  const aguarda = f.receive('AguardaRede', 'Aguarda confirmação da rede', 'Espera a rede confirmar a linha.', 3, 0, [['numeroLinha'], ['statusRede']]);
  const ativaNaRede = f.decision('AtivaNaRede', 'Linha ativa na rede?', 'Segue conforme o status da rede.', 4, 0);
  const ativada = f.screen('Ativada', 'Linha ativada', 'Confirma a ativação.', 5, -1, 'Linha ativa', [
    alert('al_ativada', 'positive', 'Sua linha {{data.numeroLinha}} está ativa. Já pode usar!', { title: 'Tudo pronto' }),
    ok('btn_ativada', 'Concluir'),
  ]);
  const analise = f.screen('EmAnalise', 'Ativação em análise', 'Informa que a ativação está em análise.', 5, 1, 'Ativação em análise', [
    alert('al_analise', 'informative', 'A rede ainda não confirmou sua linha. Vamos te avisar assim que estiver ativa.'),
    ok('btn_analise', 'Entendi'),
  ]);
  f.chain(ini, chip, ativa, aguarda, ativaNaRede);
  f.link(ativaNaRede, ativada, { when: '{{data_statusRede}} == "ATIVA"' });
  f.link(ativaNaRede, analise, { otherwise: true });
  f.chain(ativada, f.end('FimAtivada', 'Fim — ativada', 6, -1));
  f.chain(analise, f.end('FimAnalise', 'Fim — em análise', 6, 1));
  f.note('O número do chip só aparece para chip físico: regra de visibilidade pelo campo tipoChip da própria tela.', 1, 0, [chip]);
  f.note('A rede confirma por mensagem. Antes de publicar: escolha cluster, tópico e credencial.', 3, 0, [aguarda], true);
  return f.build();
});

template({
  templateId: 'cancelamento-retencao', name: 'Cancelamento com oferta de retenção', track: 'negocio', area: 'Retenção', channelTypes: ALL,
  description: 'Antes de cancelar, calcula a chance de reter o cliente e, se valer a pena, faz uma oferta.',
  highlights: [
    'Score decide se vale ofertar',
    'Dois caminhos que se encontram no cancelamento',
    'Desfecho registrado nos sistemas',
  ],
}, () => {
  const f = flow('Cancelamento com oferta de retenção');
  const ini = f.start(0, 0);
  const motivo = f.screen('Motivo', 'Motivo do cancelamento', 'Coleta o motivo.', 1, 0, 'Cancelar serviço', [
    title('txt_titulo', 'Poxa, que pena. Conta pra gente o motivo?'),
    select('sel_motivo', 'Motivo', 'motivoCancelamento', [
      opt('O preço está alto', 'preco'), opt('Vou mudar de endereço', 'mudanca'), opt('Qualidade do sinal', 'qualidade'), opt('Outro motivo', 'outro'),
    ]),
    textArea('ta_detalhes', 'Quer contar mais?', 'detalhesMotivo', { required: false }),
    ok('btn_motivo', 'Continuar'),
  ]);
  const score = f.rest('ScoreRetencao', 'Calcula chance de retenção', 'Calcula o score de retenção.', 2, 0, {
    method: 'GET', url: `${MOCK}/retencao/score?motivo={{form_motivoCancelamento}}`, headers: ACCEPT,
    outputMapping: [out('scoreRetencao', '$.score', 'number')],
  });
  const valeOfertar = f.decision('ValeOfertar', 'Vale ofertar?', 'Score acima de 70 recebe oferta.', 3, 0);
  const oferta = f.screen('Oferta', 'Oferta de retenção', 'Apresenta a oferta.', 4, -1, 'Temos uma oferta', [
    alert('al_oferta', 'informative', 'Antes de ir: que tal 30% de desconto por 6 meses?', { title: 'Uma oferta para você' }),
    select('sel_decisao', 'O que você prefere?', 'decisaoOferta', [opt('Quero o desconto', 'aceitar'), opt('Quero cancelar mesmo assim', 'recusar')]),
    ok('btn_oferta', 'Confirmar'),
  ]);
  const aceitou = f.decision('Aceitou', 'Aceitou?', 'Aplica a oferta ou segue para o cancelamento.', 5, -1);
  const aplica = f.rest('AplicaOferta', 'Aplica a oferta', 'Aplica o desconto.', 6, -2, {
    method: 'POST', url: `${MOCK}/retencao/oferta`, headers: JSON_HEADERS,
    body: { motivo: '{{form_motivoCancelamento}}', score: '{{data_scoreRetencao}}' },
    outputMapping: [out('statusOferta', '$.status')],
  });
  const retido = f.screen('Retido', 'Cliente retido', 'Confirma o desconto.', 7, -2, 'Desconto aplicado', [
    alert('al_retido', 'positive', 'Desconto aplicado! Que bom que você fica com a gente.'),
    ok('btn_retido', 'Concluir'),
  ]);
  const cancela = f.rest('Cancela', 'Cancela o serviço', 'Efetiva o cancelamento.', 6, 1, {
    method: 'POST', url: `${MOCK}/cancelamento`, headers: JSON_HEADERS,
    body: { motivo: '{{form_motivoCancelamento}}', detalhes: '{{form_detalhesMotivo}}' },
    outputMapping: [out('statusCancelamento', '$.status')],
  });
  const cancelado = f.screen('Cancelado', 'Cancelamento confirmado', 'Confirma o cancelamento.', 7, 1, 'Cancelamento confirmado', [
    alert('al_cancelado', 'informative', 'Seu serviço foi cancelado. Se mudar de ideia, estamos aqui.'),
    ok('btn_cancelado', 'Concluir'),
  ]);
  f.chain(ini, motivo, score, valeOfertar);
  f.link(valeOfertar, oferta, { when: '{{data_scoreRetencao}} > 70' });
  f.link(valeOfertar, cancela, { otherwise: true });
  f.chain(oferta, aceitou);
  f.link(aceitou, aplica, { when: '{{form_decisaoOferta}} == "aceitar"' });
  f.link(aceitou, cancela, { otherwise: true });
  f.chain(aplica, retido, f.end('FimRetido', 'Fim — retido', 8, -2));
  f.chain(cancela, cancelado, f.end('FimCancelado', 'Fim — cancelado', 8, 1));
  f.note('Dois caminhos chegam ao mesmo cancelamento: sem oferta (score baixo) e oferta recusada.', 6, 1, [cancela], true);
  return f.build();
});

template({
  templateId: 'abertura-chamado', name: 'Abertura de chamado técnico', track: 'negocio', area: 'Suporte', channelTypes: ALL,
  description: 'O cliente descreve o problema, o chamado é aberto e a equipe de campo é avisada na hora.',
  highlights: [
    'Chamado aberto por API',
    'Equipe de campo avisada por mensagem',
    'Protocolo exibido ao cliente',
  ],
}, () => {
  const f = flow('Abertura de chamado técnico');
  const ini = f.start(0, 0);
  const problema = f.screen('Problema', 'Descreva o problema', 'Coleta categoria, descrição e período de visita.', 1, 0, 'Abrir chamado', [
    title('txt_titulo', 'Conta pra gente o que está acontecendo'),
    select('sel_categoria', 'Tipo de problema', 'categoriaProblema', [
      opt('Sem internet', 'sem_internet'), opt('Internet lenta', 'lentidao'), opt('TV sem sinal', 'tv'), opt('Telefone fixo mudo', 'telefone'),
    ]),
    textArea('ta_descricao', 'Descreva o problema', 'descricaoProblema', { required: true }),
    select('sel_periodo', 'Melhor período para a visita', 'periodoVisita', [opt('Manhã', 'manha'), opt('Tarde', 'tarde')]),
    checkbox('chk_visita', 'Autorizo a visita técnica no endereço de instalação', 'autorizaVisita', { required: true }),
    ok('btn_abrir', 'Abrir chamado'),
  ]);
  const abre = f.rest('AbreChamado', 'Abre o chamado', 'Abre o chamado no sistema de suporte.', 2, 0, {
    method: 'POST', url: `${MOCK}/suporte/chamados`, headers: JSON_HEADERS,
    body: { categoria: '{{form_categoriaProblema}}', descricao: '{{form_descricaoProblema}}', periodo: '{{form_periodoVisita}}' },
    outputMapping: [out('numeroChamado', '$.numeroChamado')],
  });
  const avisa = f.publish('AvisaCampo', 'Avisa a equipe de campo', 'Publica o chamado para o despacho técnico.', 3, 0, [
    ['numeroChamado', '{{data_numeroChamado}}'], ['categoria', '{{form_categoriaProblema}}'], ['periodo', '{{form_periodoVisita}}'],
  ]);
  const aberto = f.screen('Aberto', 'Chamado aberto', 'Mostra o protocolo.', 4, 0, 'Chamado aberto', [
    alert('al_aberto', 'positive', 'Chamado {{data.numeroChamado}} aberto. A equipe técnica já foi avisada.', { title: 'Tudo certo' }),
    ok('btn_aberto', 'Concluir'),
  ]);
  f.chain(ini, problema, abre, avisa, aberto, f.end('Fim', 'Fim', 5, 0));
  f.note('O chamado é aberto pela API e o despacho técnico é avisado por mensagem. Antes de publicar: escolha cluster, tópico e credencial.', 3, 0, [avisa]);
  return f.build();
});

template({
  templateId: 'autoatendimento-internet', name: 'Autoatendimento: falha na internet', track: 'negocio', area: 'Suporte', channelTypes: ALL,
  description: 'Verifica chamado aberto, pendência financeira e manutenção na região antes de diagnosticar a conexão.',
  highlights: [
    'Três verificações antes do diagnóstico',
    'Resposta 404 tratada como "nada encontrado"',
    'Diagnóstico pedido por API e recebido por mensagem',
  ],
}, () => {
  const f = flow('Autoatendimento: falha na internet');
  const ini = f.start(0, 0);
  const cnpj = telaCnpj(f, 1, 0, 'Vamos verificar a situação da sua empresa');
  const bd = f.rest('ConsultaChamado', 'Consulta chamado aberto', 'Verifica se há bilhete de defeito em atendimento.', 2, 0, {
    method: 'GET', url: `${MOCK}/clientes/{{form_cnpj}}/bilhetes-defeito`, headers: ACCEPT,
    outputMapping: [out('bdHttpStatus', '$httpStatus', 'number'), out('bdNumero', '$.numeroBilhete'), out('bdStatus', '$.status'), out('bdPrevisao', '$.previsaoConclusao')],
  });
  const temBd = f.decision('TemChamado', 'Tem chamado aberto?', 'Achou o bilhete (200), mostra os detalhes.', 3, 0);
  const pend = f.rest('ConsultaPendencia', 'Consulta pendência financeira', 'Verifica pendência aguardando pagamento.', 4, 0, {
    method: 'GET', url: `${MOCK}/clientes/{{form_cnpj}}/pendencias-financeiras`, headers: ACCEPT,
    outputMapping: [out('pendenciaStatus', '$.statusCobranca'), out('pendenciaValor', '$.valorPendente', 'number'), out('pendenciaLinhaDigitavel', '$.linhaDigitavel')],
  });
  const temPend = f.decision('TemPendencia', 'Pendência aguardando pagamento?', 'Mostra a pendência se estiver aguardando pagamento.', 5, 0);
  const massiva = f.rest('ConsultaMassiva', 'Consulta manutenção na região', 'Verifica manutenção massiva.', 6, 0, {
    method: 'GET', url: `${MOCK}/clientes/{{form_cnpj}}/manutencoes-massivas`, headers: ACCEPT,
    outputMapping: [out('massivaStatus', '$.statusManutencao'), out('massivaImpacto', '$.impacto'), out('massivaPrevisao', '$.previsaoConclusao')],
  });
  const temMassiva = f.decision('TemMassiva', 'Manutenção programada?', 'Mostra a manutenção se estiver programada.', 7, 0);
  const solicita = solicitaDiagnostico(f, 8, 0);
  const aguarda = f.receive('AguardaDiagnostico', 'Aguarda resultado do diagnóstico', 'Espera o retorno por mensagem.', 9, 0, DIAGNOSTICO_CAMPOS);
  const resultado = telaDiagnostico(f, 'Resultado', 10, 0);
  const telaBd = f.screen('TelaChamado', 'Chamado em andamento', 'Mostra o bilhete aberto.', 4, -1, 'Chamado em andamento', [
    alert('al_bd', 'warning', 'Bilhete {{data.bdNumero}} — {{data.bdStatus}}. Previsão: {{data.bdPrevisao}}.', { title: 'Você já tem um chamado aberto' }),
    ok('btn_bd', 'Entendi'),
  ]);
  const telaPend = f.screen('TelaPendencia', 'Pendência financeira', 'Mostra a pendência.', 6, -1, 'Pendência financeira', [
    alert('al_pend', 'warning', 'Há R$ {{data.pendenciaValor}} aguardando pagamento.', { title: 'Regularize para seguir' }),
    body('txt_linha', 'Linha digitável: {{data.pendenciaLinhaDigitavel}}'),
    ok('btn_pend', 'Entendi'),
  ]);
  const telaMassiva = f.screen('TelaMassiva', 'Manutenção na região', 'Mostra a manutenção programada.', 8, -1, 'Manutenção na sua região', [
    alert('al_massiva', 'informative', '{{data.massivaImpacto}}. Previsão de conclusão: {{data.massivaPrevisao}}.', { title: 'Manutenção programada' }),
    ok('btn_massiva', 'Entendi'),
  ]);
  f.chain(ini, cnpj, bd, temBd);
  f.link(temBd, telaBd, { when: '{{data_bdHttpStatus}} == 200' });
  f.link(temBd, pend, { otherwise: true });
  f.chain(pend, temPend);
  f.link(temPend, telaPend, { when: '{{data_pendenciaStatus}} == "Aguardando pagamento"' });
  f.link(temPend, massiva, { otherwise: true });
  f.chain(massiva, temMassiva);
  f.link(temMassiva, telaMassiva, { when: '{{data_massivaStatus}} == "Programada"' });
  f.link(temMassiva, solicita, { otherwise: true });
  f.chain(solicita, aguarda, resultado, f.end('FimDiagnostico', 'Fim — diagnóstico', 11, 0));
  f.chain(telaBd, f.end('FimChamado', 'Fim — chamado aberto', 5, -1));
  f.chain(telaPend, f.end('FimPendencia', 'Fim — pendência', 7, -1));
  f.chain(telaMassiva, f.end('FimMassiva', 'Fim — manutenção', 9, -1));
  f.note('Cada consulta devolve 404 quando não acha nada; a jornada lê o status HTTP ($httpStatus) e segue para a próxima verificação. Teste com o CNPJ 45537128000127.', 2, 0, [bd]);
  f.note('Antes de publicar: escolha cluster, tópico e credencial na espera do diagnóstico.', 9, 0, [aguarda], true);
  return f.build();
});

template({
  templateId: 'acompanhamento-instalacao', name: 'Acompanhamento da instalação', track: 'negocio', area: 'Campo', channelTypes: ALL,
  description: 'Avisa que o técnico está a caminho e, se o cliente não estiver em casa, reagenda na hora.',
  highlights: [
    'Jornada que começa esperando um evento',
    'Reagendamento com horários buscados na tela',
    'Dados do pedido como variáveis de entrada',
  ],
}, () => {
  const f = flow('Acompanhamento da instalação');
  const ini = f.start(0, 0, [{ name: 'numeroPedido', type: 'string' }, { name: 'cep', type: 'string' }]);
  const aCaminho = f.receive('TecnicoACaminho', 'Aguarda saída do técnico', 'Espera o aviso de que o técnico saiu.', 1, 0, [['tecnicoNome'], ['previsaoChegada']]);
  const aviso = f.screen('Aviso', 'Técnico a caminho', 'Avisa o cliente e confirma a presença.', 2, 0, 'Técnico a caminho', [
    title('txt_aviso', '{{data.tecnicoNome}} está a caminho'),
    body('txt_previsao', 'Previsão de chegada: {{data.previsaoChegada}}. Pedido {{data.numeroPedido}}.'),
    select('sel_em_casa', 'Você vai estar em casa?', 'estaraEmCasa', [opt('Sim, estarei em casa', 'sim'), opt('Não, preciso reagendar', 'nao')]),
    ok('btn_aviso', 'Responder'),
  ]);
  const emCasa = f.decision('PrecisaReagendar', 'Precisa reagendar?', 'Se o cliente não estiver em casa, reagenda.', 3, 0);
  const ateJa = f.screen('AteJa', 'Até já', 'Confirma a visita.', 4, -1, 'Até já', [
    alert('al_ate_ja', 'positive', 'Combinado! {{data.tecnicoNome}} chega em breve.'),
    ok('btn_ate_ja', 'Ok'),
  ]);
  const novoHorario = f.screen('NovoHorario', 'Novo horário', 'Horários livres buscados quando a tela abre.', 4, 1, 'Escolha um novo horário', [
    title('txt_novo', 'Sem problema. Escolha um novo horário'),
    selectFromList('sel_horario', 'Horários disponíveis', 'novoHorario', 'data.horarios'),
    ok('btn_novo', 'Reagendar'),
  ], horariosFonte('cep', '{{data_cep}}'));
  const reagenda = f.rest('Reagenda', 'Reagenda a instalação', 'Confirma o novo horário.', 5, 1, {
    method: 'POST', url: `${MOCK}/instalacoes/agendamentos`, headers: JSON_HEADERS,
    body: { pedido: '{{data_numeroPedido}}', cep: '{{data_cep}}', horario: '{{form_novoHorario}}' },
    outputMapping: [out('protocoloReagendamento', '$.protocolo')],
  });
  const reagendado = f.screen('Reagendado', 'Instalação reagendada', 'Confirma o reagendamento.', 6, 1, 'Instalação reagendada', [
    alert('al_reagendado', 'positive', 'Instalação reagendada. Protocolo {{data.protocoloReagendamento}}.'),
    ok('btn_reagendado', 'Concluir'),
  ]);
  f.chain(ini, aCaminho, aviso, emCasa);
  f.link(emCasa, novoHorario, { when: '{{form_estaraEmCasa}} == "nao"' });
  f.link(emCasa, ateJa, { otherwise: true });
  f.chain(ateJa, f.end('FimVisita', 'Fim — visita mantida', 5, -1));
  f.chain(novoHorario, reagenda, reagendado, f.end('FimReagendado', 'Fim — reagendado', 7, 1));
  f.note('A jornada começa e fica esperando o aviso de saída do técnico. Antes de publicar: escolha cluster, tópico e credencial.', 1, 0, [aCaminho]);
  f.note('Antes de publicar: cadastre uma fonte de dados para GET http://localhost:8084/v1/instalacoes/horarios-disponiveis?cep={cep} (itens em $.horarios, campos value e label), escolha-a nesta tela e ligue o parâmetro cep a {{data_cep}}.', 4, 1, [novoHorario], true);
  return f.build();
});

template({
  templateId: 'manutencao-fibra-campo', name: 'Manutenção de fibra em campo', track: 'negocio', area: 'Campo', channelTypes: ['MOBILE'],
  description: 'Passo a passo para o técnico: consulta a ordem de serviço, faz o checklist, registra o reparo e encerra ou escala.',
  highlights: [
    'Jornada para o técnico, no app',
    'Checklist de chegada com campos obrigatórios',
    'Escalonamento por mensagem quando não resolve',
  ],
}, () => {
  const f = flow('Manutenção de fibra em campo');
  const ini = f.start(0, 0);
  const os = f.screen('OrdemServico', 'Ordem de serviço', 'O técnico informa a OS.', 1, 0, 'Atendimento em campo', [
    title('txt_os', 'Qual ordem de serviço você vai atender?'),
    textInput('in_os', 'Número da ordem de serviço', 'numeroOS', { placeholder: 'OS-2026-0001' }),
    ok('btn_os', 'Abrir OS'),
  ]);
  const consulta = f.rest('ConsultaOS', 'Consulta a OS', 'Traz os dados da ordem de serviço.', 2, 0, {
    method: 'GET', url: `${MOCK}/ordens-servico/{{form_numeroOS}}`, headers: ACCEPT,
    outputMapping: [
      out('clienteNome', '$.clienteNome'), out('enderecoAtendimento', '$.endereco'), out('defeitoRelatado', '$.defeitoRelatado'),
      out('equipamentoModelo', '$.equipamentoModelo'), out('potenciaEsperadaDbm', '$.potenciaEsperadaDbm', 'number'), out('janelaAtendimento', '$.janelaAtendimento'),
    ],
  });
  const chegada = f.screen('Chegada', 'Checklist de chegada', 'Confere o local e mede o sinal.', 3, 0, 'Checklist de chegada', [
    card('card_os', [stack('stk_os', [
      heading('txt_cliente', '{{data.clienteNome}}'),
      body('txt_endereco', '{{data.enderecoAtendimento}}'),
      body('txt_defeito', 'Defeito relatado: {{data.defeitoRelatado}}'),
      caption('txt_equip', 'Equipamento {{data.equipamentoModelo}} · janela {{data.janelaAtendimento}}'),
    ])]),
    checkbox('chk_presente', 'Cliente ou responsável presente', 'clientePresente', { required: true }),
    checkbox('chk_ligado', 'Equipamento ligado na tomada', 'equipamentoLigado'),
    textInput('in_potencia', 'Potência medida na ONT (dBm)', 'potenciaMedida', { inputMode: 'number', placeholder: 'Esperado: {{data.potenciaEsperadaDbm}}' }),
    ok('btn_chegada', 'Iniciar reparo'),
  ]);
  const reparo = f.screen('Reparo', 'Registro do reparo', 'Registra a solução aplicada.', 4, 0, 'Reparo', [
    select('sel_solucao', 'Solução aplicada', 'solucaoAplicada', [
      opt('Troca de conector', 'troca_conector'), opt('Troca da ONT', 'troca_ont'), opt('Reparo do cabo', 'reparo_cabo'), opt('Ajuste de configuração', 'ajuste_config'),
    ]),
    textArea('ta_obs', 'Observações', 'observacoesTecnico', { required: false }),
    select('sel_resolvido', 'O defeito foi resolvido?', 'defeitoResolvido', [opt('Sim', 'sim'), opt('Não', 'nao')]),
    ok('btn_reparo', 'Registrar'),
  ]);
  const resolvido = f.decision('Resolvido', 'Resolvido?', 'Encerra a OS ou escala para a equipe de rede.', 5, 0);
  const encerra = f.rest('EncerraOS', 'Encerra a OS', 'Encerra a ordem de serviço.', 6, -1, {
    method: 'POST', url: `${MOCK}/ordens-servico/{{form_numeroOS}}/encerramento`, headers: JSON_HEADERS,
    body: { solucao: '{{form_solucaoAplicada}}', observacoes: '{{form_observacoesTecnico}}', potenciaMedida: '{{form_potenciaMedida}}' },
    outputMapping: [out('protocoloEncerramento', '$.protocolo')],
  });
  const encerrada = f.screen('Encerrada', 'OS encerrada', 'Confirma o encerramento.', 7, -1, 'OS encerrada', [
    alert('al_encerrada', 'positive', 'OS encerrada. Protocolo {{data.protocoloEncerramento}}. A pesquisa de satisfação já foi enviada ao cliente.'),
    ok('btn_encerrada', 'Concluir'),
  ]);
  const escala = f.publish('EscalaRede', 'Escala para a equipe de rede', 'Publica o caso para a equipe de rede externa.', 6, 1, [
    ['numeroOS', '{{form_numeroOS}}'], ['defeito', '{{data_defeitoRelatado}}'], ['solucaoTentada', '{{form_solucaoAplicada}}'], ['potenciaMedida', '{{form_potenciaMedida}}', 'number'],
  ]);
  const escalada = f.screen('Escalada', 'Caso escalado', 'Confirma o escalonamento.', 7, 1, 'Caso escalado', [
    alert('al_escalada', 'informative', 'A equipe de rede externa recebeu o caso da OS {{form.numeroOS}}.'),
    ok('btn_escalada', 'Concluir'),
  ]);
  f.chain(ini, os, consulta, chegada, reparo, resolvido);
  f.link(resolvido, encerra, { when: '{{form_defeitoResolvido}} == "sim"' });
  f.link(resolvido, escala, { otherwise: true });
  f.chain(encerra, encerrada, f.end('FimEncerrada', 'Fim — OS encerrada', 8, -1));
  f.chain(escala, escalada, f.end('FimEscalada', 'Fim — escalada', 8, 1));
  f.note('Jornada para o técnico, pensada para o app: telas curtas, checklist e medição no próprio local.', 3, 0, [chegada]);
  f.note('Quando o reparo não resolve, o caso vai por mensagem para a equipe de rede. Antes de publicar: escolha cluster, tópico e credencial.', 6, 1, [escala], true);
  return f.build();
});

template({
  templateId: 'negociacao-debito', name: '2ª via e negociação de débito', track: 'negocio', area: 'Financeiro', channelTypes: ALL,
  description: 'Lista as faturas em aberto e deixa o cliente gerar a 2ª via ou parcelar as vencidas.',
  highlights: [
    'Duas ações por fatura, liberadas conforme a fatura',
    'Parcelamento com o número de parcelas escolhido',
    'Caminho próprio para cliente em dia',
  ],
}, () => {
  const f = flow('2ª via e negociação de débito');
  const ini = f.start(0, 0);
  const cpf = f.screen('Cpf', 'Identificação', 'Coleta o CPF do titular.', 1, 0, 'Suas faturas', [
    title('txt_cpf', 'Vamos ver suas faturas'),
    textInput('in_cpf', 'CPF do titular (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    ok('btn_cpf', 'Consultar'),
  ]);
  const faturas = consultaFaturas(f, 2, 0);
  const tem = f.decision('TemFaturas', 'Tem faturas?', 'Sem faturas, avisa e encerra.', 3, 0);
  const escolha = f.screen('EscolheFatura', 'Escolha a fatura e a ação', 'Lista as faturas com 2ª via e negociação.', 4, 0, 'Suas faturas', [
    title('txt_escolha', 'Escolha a fatura e o que deseja fazer'),
    selectList('lst_faturas', 'Faturas em aberto', 'data.faturas', 'faturaEscolhida', {
      itemValue: 'id', itemTitle: 'Fatura {{item.referencia}} — R$ {{item.valor}}', itemDescription: '{{item.status}} · vence {{item.vencimento}}',
      itemHint: '{{item.motivoBloqueio}}', emptyMessage: 'Você não tem faturas em aberto.', actionVar: 'acaoFatura',
      actions: [
        { id: 'segunda_via', label: '2ª via', variant: 'secondary', enabledWhen: '{{item.podeSegundaVia}} == true' },
        { id: 'negociar', label: 'Negociar', variant: 'primary', enabledWhen: '{{item.podeNegociar}} == true' },
      ],
    }),
  ]);
  const acao = f.decision('Negociar', 'Negociar?', 'Segue a ação escolhida.', 5, 0);
  const parcelas = f.screen('Parcelas', 'Parcelamento', 'Coleta o número de parcelas.', 6, 1, 'Negociar fatura', [
    title('txt_parcelas', 'Em quantas vezes?'),
    select('sel_parcelas', 'Número de parcelas', 'parcelasAcordo', [opt('2 vezes', '2'), opt('3 vezes', '3'), opt('6 vezes', '6'), opt('10 vezes', '10')]),
    ok('btn_parcelas', 'Fechar acordo'),
  ]);
  const acordo = f.rest('FechaAcordo', 'Fecha o acordo', 'Registra o parcelamento.', 7, 1, {
    method: 'POST', url: `${MOCK}/acordos`, headers: JSON_HEADERS,
    body: { faturaId: '{{form_faturaEscolhida}}', parcelas: '{{form_parcelasAcordo}}' },
    outputMapping: [out('protocoloAcordo', '$.protocolo'), out('valorParcela', '$.valorParcela', 'number'), out('primeiroVencimento', '$.primeiroVencimento')],
  });
  const acordoOk = f.screen('AcordoFechado', 'Acordo fechado', 'Confirma o acordo.', 8, 1, 'Acordo fechado', [
    alert('al_acordo', 'positive', '{{form.parcelasAcordo}} parcelas de R$ {{data.valorParcela}}. Primeiro vencimento em {{data.primeiroVencimento}}.', { title: 'Acordo {{data.protocoloAcordo}}' }),
    ok('btn_acordo', 'Concluir'),
  ]);
  const gera = segundaVia(f, 6, -1);
  const via = telaSegundaVia(f, 'SegundaVia', 7, -1);
  f.chain(ini, cpf, faturas, tem);
  f.link(tem, telaEmDia(f, 4, -1), { when: '{{data_quantidadeFaturas}} == 0' });
  f.link(tem, escolha, { otherwise: true });
  f.chain('Node_EmDia', f.end('FimEmDia', 'Fim — em dia', 5, -1));
  f.chain(escolha, acao);
  f.link(acao, parcelas, { when: '{{form_acaoFatura}} == "negociar"' });
  f.link(acao, gera, { otherwise: true });
  f.chain(parcelas, acordo, acordoOk, f.end('FimAcordo', 'Fim — acordo', 9, 1));
  f.chain(gera, via, f.end('FimSegundaVia', 'Fim — 2ª via', 8, -1));
  f.note('A API diz o que cada fatura permite (podeSegundaVia, podeNegociar) e o motivo quando bloqueia; a tela só aplica.', 4, 0, [escolha], true);
  return f.build();
});

template({
  templateId: 'gestao-bds', name: 'Gestão de bilhetes de defeito', track: 'negocio', area: 'Empresas', channelTypes: ALL,
  description: 'A empresa vê os bilhetes de defeito em aberto e reagenda a visita ou cancela o bilhete.',
  highlights: [
    'Lista de bilhetes com duas ações por item',
    'Horários de reagendamento buscados na tela',
    'Cada ação com seu próprio desfecho',
  ],
}, () => {
  const f = flow('Gestão de bilhetes de defeito');
  const ini = f.start(0, 0);
  const cnpj = telaCnpj(f, 1, 0, 'Vamos buscar os bilhetes de defeito da sua empresa');
  const consulta = f.rest('ConsultaBilhetes', 'Consulta bilhetes em aberto', 'Busca os bilhetes do CNPJ.', 2, 0, {
    method: 'GET', url: `${MOCK}/clientes/{{form_cnpj}}/bilhetes`, headers: ACCEPT,
    outputMapping: [
      out('quantidadeBilhetes', '$.quantidade', 'number'),
      list('bilhetes', '$.bilhetes', ['numeroBilhete', 'tipoDefeito', 'status', 'prioridade', 'dataAbertura', 'podeReagendar', 'podeCancelar', 'motivoBloqueio']),
    ],
  });
  const tem = f.decision('TemBilhetes', 'Tem bilhetes?', 'Sem bilhetes, avisa e encerra.', 3, 0);
  const sem = f.screen('SemBilhetes', 'Nenhum bilhete', 'Informa que não há bilhetes.', 4, -1, 'Nenhum bilhete em aberto', [
    alert('al_sem', 'positive', 'Não encontramos bilhetes de defeito em aberto para este CNPJ.', { title: 'Tudo certo por aqui' }),
    ok('btn_sem', 'Concluir'),
  ]);
  const escolhe = f.screen('EscolheBilhete', 'Escolha o bilhete e a ação', 'Lista os bilhetes e as ações liberadas.', 4, 0, 'Seus bilhetes de defeito', [
    title('txt_bilhetes', 'Escolha o bilhete e o que deseja fazer'),
    selectList('lst_bilhetes', 'Bilhetes em aberto', 'data.bilhetes', 'bilheteSelecionado', {
      itemValue: 'numeroBilhete', itemTitle: '{{item.tipoDefeito}} — {{item.prioridade}}',
      itemDescription: '{{item.numeroBilhete}} · {{item.status}} · aberto em {{item.dataAbertura}}', itemHint: '{{item.motivoBloqueio}}',
      emptyMessage: 'Você não tem bilhetes em aberto.', actionVar: 'acaoBilhete',
      actions: [
        { id: 'reagendar', label: 'Reagendar visita', variant: 'primary', enabledWhen: '{{item.podeReagendar}} == true' },
        { id: 'cancelar', label: 'Cancelar bilhete', variant: 'danger', enabledWhen: '{{item.podeCancelar}} == true' },
      ],
    }),
  ]);
  const acao = f.decision('ReagendarOuCancelar', 'Reagendar ou cancelar?', 'Segue a ação escolhida.', 5, 0);
  const horario = f.screen('NovoHorario', 'Escolha o novo horário', 'Horários livres da agenda técnica.', 6, -1, 'Reagendar visita técnica', [
    title('txt_horario', 'Novo horário para o bilhete {{form.bilheteSelecionado}}'),
    selectFromList('sel_horario', 'Horários disponíveis', 'horarioEscolhido', 'data.horarios'),
    ok('btn_horario', 'Confirmar reagendamento'),
  ], horariosFonte('bilhete', '{{form_bilheteSelecionado}}'));
  const reagenda = f.rest('Reagenda', 'Reagenda a visita', 'Confirma o novo horário.', 7, -1, {
    method: 'POST', url: `${MOCK}/bilhetes/{{form_bilheteSelecionado}}/reagendamento`, headers: JSON_HEADERS,
    body: { horario: '{{form_horarioEscolhido}}' }, outputMapping: [out('protocoloReagendamento', '$.protocolo')],
  });
  const reagendado = f.screen('Reagendado', 'Visita reagendada', 'Confirma o reagendamento.', 8, -1, 'Visita reagendada', [
    alert('al_reagendado', 'positive', 'Bilhete {{form.bilheteSelecionado}} reagendado. Protocolo {{data.protocoloReagendamento}}.'),
    ok('btn_reagendado', 'Concluir'),
  ]);
  const cancela = f.rest('Cancela', 'Cancela o bilhete', 'Cancela o bilhete no sistema de origem.', 6, 1, {
    method: 'POST', url: `${MOCK}/bilhetes/{{form_bilheteSelecionado}}/cancelamento`, headers: JSON_HEADERS,
    body: { motivo: 'Solicitado pelo cliente' }, outputMapping: [out('protocoloCancelamento', '$.protocolo')],
  });
  const cancelado = f.screen('Cancelado', 'Bilhete cancelado', 'Confirma o cancelamento.', 7, 1, 'Bilhete cancelado', [
    alert('al_cancelado', 'positive', 'Bilhete {{form.bilheteSelecionado}} cancelado. Protocolo {{data.protocoloCancelamento}}.'),
    ok('btn_cancelado', 'Concluir'),
  ]);
  f.chain(ini, cnpj, consulta, tem);
  f.link(tem, sem, { when: '{{data_quantidadeBilhetes}} == 0' });
  f.link(tem, escolhe, { otherwise: true });
  f.chain(sem, f.end('FimSem', 'Fim — sem bilhetes', 5, -1));
  f.chain(escolhe, acao);
  f.link(acao, horario, { when: '{{form_acaoBilhete}} == "reagendar"' });
  f.link(acao, cancela, { otherwise: true });
  f.chain(horario, reagenda, reagendado, f.end('FimReagendado', 'Fim — reagendado', 9, -1));
  f.chain(cancela, cancelado, f.end('FimCancelado', 'Fim — cancelado', 8, 1));
  f.note('Teste com o CNPJ 45537128000127. Cada bilhete diz se pode ser reagendado ou cancelado; a tela só libera o que ele permite.', 4, 0, [escolhe], true);
  f.note('Antes de publicar: cadastre uma fonte de dados para GET http://localhost:8084/v1/bilhetes/{bilhete}/horarios-disponiveis (itens em $.horarios, campos value e label), escolha-a nesta tela e ligue o parâmetro bilhete a {{form_bilheteSelecionado}}.', 6, -1, [horario]);
  return f.build();
});

template({
  templateId: 'iot-provisionamento', name: 'Provisionamento de dispositivos IoT', track: 'negocio', area: 'IoT', channelTypes: ['WEB'],
  description: 'A empresa pede chips para seus dispositivos, o lote é provisionado e o faturamento é avisado.',
  highlights: [
    'Pedido em lote para empresas',
    'Decisão pela quantidade provisionada',
    'Faturamento avisado por mensagem',
  ],
}, () => {
  const f = flow('Provisionamento de dispositivos IoT');
  const ini = f.start(0, 0);
  const pedido = f.screen('Pedido', 'Pedido de provisionamento', 'Coleta empresa, dispositivo, quantidade e plano.', 1, 0, 'Vivo IoT', [
    title('txt_titulo', 'Conecte seus dispositivos'),
    textInput('in_cnpj', 'CNPJ da empresa (só números)', 'cnpjEmpresa', { inputMode: 'text', maxLength: 14 }),
    select('sel_dispositivo', 'Tipo de dispositivo', 'tipoDispositivo', [
      opt('Rastreador veicular', 'rastreador'), opt('Sensor industrial', 'sensor'), opt('Medidor de consumo', 'medidor'), opt('Câmera de segurança', 'camera'),
    ]),
    textInput('in_qtd', 'Quantidade de dispositivos', 'quantidadeDispositivos', { inputMode: 'number', maxLength: 5 }),
    select('sel_plano', 'Plano de dados por chip', 'planoDados', [opt('100 MB', 'iot_100mb'), opt('1 GB', 'iot_1gb'), opt('5 GB', 'iot_5gb')]),
    ok('btn_provisionar', 'Provisionar'),
  ]);
  const prov = f.rest('Provisiona', 'Provisiona os chips', 'Provisiona o lote de chips.', 2, 0, {
    method: 'POST', url: `${MOCK}/iot/provisionar`, headers: JSON_HEADERS,
    body: { cnpj: '{{form_cnpjEmpresa}}', tipo: '{{form_tipoDispositivo}}', quantidade: '{{form_quantidadeDispositivos}}', plano: '{{form_planoDados}}' },
    outputMapping: [out('quantidadeProvisionada', '$.quantidadeProvisionada', 'number')],
  });
  const algum = f.decision('ProvisionouAlgum', 'Provisionou algum?', 'Segue conforme a quantidade provisionada.', 3, 0);
  const avisa = f.publish('AvisaFaturamento', 'Avisa o faturamento', 'Publica o lote para cobrança.', 4, -1, [
    ['cnpj', '{{form_cnpjEmpresa}}'], ['quantidade', '{{data_quantidadeProvisionada}}', 'number'], ['plano', '{{form_planoDados}}'],
  ]);
  const ativos = f.screen('Ativos', 'Dispositivos ativos', 'Confirma o provisionamento.', 5, -1, 'Dispositivos conectados', [
    alert('al_ativos', 'positive', '{{data.quantidadeProvisionada}} dispositivos conectados e prontos para uso.', { title: 'Lote ativo' }),
    ok('btn_ativos', 'Concluir'),
  ]);
  const falha = f.screen('Falha', 'Falha no provisionamento', 'Informa a falha.', 4, 1, 'Não foi possível', [
    alert('al_falha', 'warning', 'Nenhum chip foi provisionado. Nossa equipe vai entrar em contato.', { title: 'Falha no provisionamento' }),
    ok('btn_falha', 'Entendi'),
  ]);
  f.chain(ini, pedido, prov, algum);
  f.link(algum, avisa, { when: '{{data_quantidadeProvisionada}} > 0' });
  f.link(algum, falha, { otherwise: true });
  f.chain(avisa, ativos, f.end('FimAtivos', 'Fim — ativos', 6, -1));
  f.chain(falha, f.end('FimFalha', 'Fim — falha', 5, 1));
  f.note('Antes de publicar: escolha cluster, tópico e credencial no aviso ao faturamento.', 4, -1, [avisa]);
  return f.build();
});

template({
  templateId: 'reclamacao-multicanal', name: 'Resolução de reclamação multicanal', track: 'negocio', area: 'Ouvidoria', channelTypes: ALL,
  description: 'Triagem da reclamação, proposta de compensação e escalonamento para a ouvidoria quando preciso.',
  highlights: [
    'Triagem automática por API',
    'Compensação proposta e aplicada na hora',
    'Escalonamento por mensagem para a ouvidoria',
  ],
}, () => {
  const f = flow('Resolução de reclamação multicanal');
  const ini = f.start(0, 0);
  const reclamacao = f.screen('Reclamacao', 'Registro da reclamação', 'Coleta os dados da reclamação.', 1, 0, 'Registrar reclamação', [
    title('txt_titulo', 'Sentimos muito. Conta o que aconteceu'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    select('sel_categoria', 'Assunto', 'categoriaReclamacao', [
      opt('Cobrança indevida', 'cobranca_indevida'), opt('Atendimento', 'atendimento'), opt('Qualidade do serviço', 'qualidade'), opt('Instalação', 'instalacao'),
    ]),
    textArea('ta_relato', 'O que aconteceu?', 'relato', { required: true }),
    checkbox('chk_reincidente', 'Já reclamei disso antes', 'reincidente'),
    ok('btn_registrar', 'Registrar'),
  ]);
  const triagem = f.rest('Triagem', 'Faz a triagem', 'Classifica a reclamação.', 2, 0, {
    method: 'POST', url: `${MOCK}/ouvidoria/reclamacoes`, headers: JSON_HEADERS,
    body: { cpf: '{{form_cpf}}', categoria: '{{form_categoriaReclamacao}}', reincidente: '{{form_reincidente}}', relato: '{{form_relato}}' },
    outputMapping: [
      out('protocoloReclamacao', '$.protocolo'), out('nivelAtendimento', '$.nivel'),
      out('prazoRespostaDias', '$.prazoRespostaDias', 'number'), out('compensacaoSugerida', '$.compensacaoSugerida', 'number'),
    ],
  });
  const ouvidoria = f.decision('VaiParaOuvidoria', 'Vai para a ouvidoria?', 'Reincidência ou cobrança indevida vão direto para a ouvidoria.', 3, 0);
  const proposta = f.screen('Proposta', 'Proposta de solução', 'Propõe uma compensação.', 4, -1, 'Uma proposta para resolver', [
    alert('al_proposta', 'informative', 'Para resolver, oferecemos R$ {{data.compensacaoSugerida}} de crédito na próxima fatura.', { title: 'Protocolo {{data.protocoloReclamacao}}' }),
    select('sel_aceita', 'Você aceita?', 'aceitaCompensacao', [opt('Sim, aceito', 'sim'), opt('Não, quero falar com a ouvidoria', 'nao')]),
    ok('btn_proposta', 'Responder'),
  ]);
  const aceitou = f.decision('Aceitou', 'Aceitou?', 'Aplica a compensação ou escala.', 5, -1);
  const compensa = f.rest('AplicaCompensacao', 'Aplica a compensação', 'Credita a compensação.', 6, -2, {
    method: 'POST', url: `${MOCK}/ouvidoria/compensacoes`, headers: JSON_HEADERS,
    body: { protocoloReclamacao: '{{data_protocoloReclamacao}}', valor: '{{data_compensacaoSugerida}}' },
    outputMapping: [out('valorCreditado', '$.valorCreditado', 'number')],
  });
  const resolvida = f.screen('Resolvida', 'Reclamação resolvida', 'Confirma o crédito.', 7, -2, 'Reclamação resolvida', [
    alert('al_resolvida', 'positive', 'Creditamos R$ {{data.valorCreditado}} na sua próxima fatura.', { title: 'Resolvido' }),
    ok('btn_resolvida', 'Concluir'),
  ]);
  const escala = f.publish('EscalaOuvidoria', 'Encaminha para a ouvidoria', 'Publica o caso para a ouvidoria.', 6, 1, [
    ['protocolo', '{{data_protocoloReclamacao}}'], ['categoria', '{{form_categoriaReclamacao}}'], ['relato', '{{form_relato}}'],
  ]);
  const escalada = f.screen('Escalada', 'Reclamação escalada', 'Informa o prazo da ouvidoria.', 7, 1, 'Com a ouvidoria', [
    alert('al_escalada', 'informative', 'A ouvidoria responde em até {{data.prazoRespostaDias}} dias. Protocolo {{data.protocoloReclamacao}}.', { title: 'Encaminhado' }),
    ok('btn_escalada', 'Concluir'),
  ]);
  f.chain(ini, reclamacao, triagem, ouvidoria);
  f.link(ouvidoria, escala, { when: '{{data_nivelAtendimento}} == "OUVIDORIA"' });
  f.link(ouvidoria, proposta, { otherwise: true });
  f.chain(proposta, aceitou);
  f.link(aceitou, compensa, { when: '{{form_aceitaCompensacao}} == "sim"' });
  f.link(aceitou, escala, { otherwise: true });
  f.chain(compensa, resolvida, f.end('FimResolvida', 'Fim — resolvida', 8, -2));
  f.chain(escala, escalada, f.end('FimEscalada', 'Fim — ouvidoria', 8, 1));
  f.note('A triagem é da API: reincidência ou cobrança indevida vão direto para a ouvidoria.', 2, 0, [triagem]);
  f.note('Antes de publicar: escolha cluster, tópico e credencial no encaminhamento à ouvidoria.', 6, 1, [escala], true);
  return f.build();
});

// =================================================================================================
// Trilha 5 — Padrões avançados
// =================================================================================================

template({
  templateId: 'integracao-com-falha', name: 'Integração com tratamento de falha', track: 'arquitetura', area: null, channelTypes: DIGITAL,
  description: 'Cadastro que resiste a falhas: novas tentativas automáticas, caminho "Se falhar" quando o serviço não responde e correção dos dados recusados.',
  highlights: [
    'Tempo limite e novas tentativas configurados na integração',
    'Caminho "Se falhar" quando o serviço não responde',
    'Dados recusados voltando à tela para correção',
  ],
}, () => {
  const f = flow('Integração com tratamento de falha');
  const ini = f.start(0, 0);
  const dados = f.screen('Dados', 'Dados do cadastro', 'Coleta nome, CPF e e-mail.', 1, 0, 'Cadastro', [
    title('txt_titulo', 'Crie seu cadastro'),
    textInput('in_nome', 'Nome completo', 'nomeCompleto'),
    textInput('in_cpf', 'CPF (só números)', 'cpf', { inputMode: 'text', maxLength: 11 }),
    textInput('in_email', 'E-mail', 'email', { inputMode: 'email' }),
    ok('btn_cadastrar', 'Cadastrar'),
  ]);
  // Resiliência: 5 s pra responder e até 2 novas tentativas (só falha passageira: sem conexão, tempo
  // esgotado, 429/502/503/504), com a mesma Idempotency-Key em todas.
  const cadastro = f.rest('Cadastra', 'Cadastra o cliente', 'Envia o cadastro, com novas tentativas automáticas.', 2, 0, {
    method: 'POST', url: `${MOCK}/clientes/cadastro`, headers: JSON_HEADERS,
    body: { nome: '{{form_nomeCompleto}}', cpf: '{{form_cpf}}', email: '{{form_email}}' },
    outputMapping: [out('httpStatusCadastro', '$httpStatus', 'number'), out('idCliente', '$.idCliente')],
    readTimeoutMs: 5000, retries: 2, retryIntervalMs: 1000,
  });
  const deuCerto = f.decision('DeuCerto', 'Cadastrou?', '201 é sucesso; o resto, dado recusado.', 3, 0);
  const sucesso = f.screen('Sucesso', 'Cadastro concluído', 'Confirma o cadastro.', 4, -1, 'Cadastro concluído', [
    alert('al_sucesso', 'positive', 'Cadastro concluído. Seu código é {{data.idCliente}}.', { title: 'Tudo certo, {{form.nomeCompleto}}' }),
    ok('btn_sucesso', 'Concluir'),
  ]);
  const recusado = f.screen('Recusado', 'Dados recusados', 'Mostra o motivo e volta para corrigir.', 4, 0, 'Confira seus dados', [
    alert('al_recusado', 'warning', 'Não conseguimos validar seus dados. Confira se o CPF tem 11 dígitos e tente de novo.', { title: 'Confira seus dados' }),
    ok('btn_recusado', 'Corrigir'),
  ]);
  const indisponivel = f.screen('Indisponivel', 'Serviço indisponível', 'Usada quando a chamada falha de vez.', 3, 1, 'Não conseguimos concluir agora', [
    alert('al_indisponivel', 'warning', 'O sistema de cadastro não está respondendo. Você pode tentar de novo agora ou mais tarde.', { title: 'Não conseguimos concluir agora' }),
    select('sel_tentar', 'O que você prefere?', 'tentarNovamente', [opt('Tentar de novo', 'sim'), opt('Tentar mais tarde', 'nao')]),
    ok('btn_indisponivel', 'Continuar'),
  ]);
  const tentar = f.decision('TentarDeNovo', 'Tentar de novo?', 'Volta para a mesma integração.', 4, 1);
  const depois = f.screen('MaisTarde', 'Tentar mais tarde', 'Encerra sem cadastro.', 5, 1, 'Até logo', [
    body('txt_depois', 'Tudo bem. Seus dados não foram salvos; é só voltar quando quiser.'),
    ok('btn_depois', 'Ok'),
  ]);
  f.chain(ini, dados, cadastro, deuCerto);
  f.link(cadastro, indisponivel, { onError: true });
  f.link(deuCerto, sucesso, { when: '{{data_httpStatusCadastro}} == 201' });
  f.link(deuCerto, recusado, { otherwise: true });
  f.chain(recusado, dados);
  f.chain(indisponivel, tentar);
  f.link(tentar, cadastro, { when: '{{form_tentarNovamente}} == "sim"' });
  f.link(tentar, depois, { otherwise: true });
  f.chain(sucesso, f.end('FimSucesso', 'Fim — cadastrado', 5, -1));
  f.chain(depois, f.end('FimMaisTarde', 'Fim — mais tarde', 6, 1));
  f.note('Resiliência da integração: até 5 s para responder e 2 novas tentativas. Teste com um CPF começando com 000: a primeira chamada responde 503 e a nova tentativa já passa, sem o usuário perceber.', 2, 0, [cadastro]);
  f.note('Caminho "Se falhar": usado quando o serviço não responde, estoura o tempo limite ou continua com erro depois das tentativas. Para ver, desligue a API do mock.', 3, 1, [indisponivel], true);
  f.note('Respostas de negócio chegam à Decisão pelo status HTTP ($httpStatus); fora de 2xx só o status chega, por isso as telas de erro usam texto próprio.', 3, 0, [deuCerto]);
  return f.build();
});

template({
  templateId: 'eventos-ponta-a-ponta', name: 'Jornada orientada a eventos', track: 'arquitetura', area: null, channelTypes: ['WEB'],
  description: 'Do evento de pedido criado ao faturamento: publica, espera, decide e publica de novo.',
  highlights: [
    'Começa, conversa e termina por mensagens',
    'Ida e volta com outro sistema no meio do fluxo',
    'Tela só quando alguém precisa decidir',
  ],
}, () => {
  const f = flow('Jornada orientada a eventos');
  const criado = f.messageStart('PedidoCriado', 'Pedido criado', 'Começa quando um pedido é criado.', 0, 0, [['pedidoId'], ['clienteNome'], ['valorPedido', 'number']]);
  const reserva = f.publish('SolicitaReserva', 'Solicita reserva de estoque', 'Pede a reserva ao sistema de estoque.', 1, 0, [['pedidoId', '{{data_pedidoId}}']]);
  const aguarda = f.receive('AguardaReserva', 'Aguarda reserva', 'Espera a resposta do estoque.', 2, 0, [['reservaStatus'], ['previsaoEstoque']]);
  const reservado = f.decision('Reservado', 'Reservado?', 'Fatura se reservou; senão, alguém decide.', 3, 0);
  const fatura = f.publish('SolicitaFaturamento', 'Solicita faturamento', 'Pede o faturamento do pedido.', 4, -1, [
    ['pedidoId', '{{data_pedidoId}}'], ['valor', '{{data_valorPedido}}', 'number'],
  ]);
  const acompanhar = f.screen('Acompanhar', 'Acompanhar pedido', 'Mostra o andamento para o back-office.', 5, -1, 'Pedido em faturamento', [
    alert('al_faturamento', 'positive', 'Pedido {{data.pedidoId}} de {{data.clienteNome}} reservado e enviado para faturamento.'),
    ok('btn_acompanhar', 'Concluir'),
  ]);
  const semEstoque = f.screen('SemEstoque', 'Pedido sem estoque', 'O back-office decide o que fazer.', 4, 1, 'Pedido sem estoque', [
    alert('al_sem_estoque', 'warning', 'Sem estoque para o pedido {{data.pedidoId}}. Previsão: {{data.previsaoEstoque}}.', { title: 'Atenção' }),
    select('sel_decisao', 'O que fazer?', 'decisaoEstoque', [opt('Aguardar o estoque', 'aguardar'), opt('Cancelar o pedido', 'cancelar')]),
    ok('btn_decisao', 'Confirmar'),
  ]);
  const publicaDecisao = f.publish('PublicaDecisao', 'Publica a decisão', 'Avisa os sistemas sobre a decisão.', 5, 1, [
    ['pedidoId', '{{data_pedidoId}}'], ['decisao', '{{form_decisaoEstoque}}'],
  ]);
  f.chain(criado, reserva, aguarda, reservado);
  f.link(reservado, fatura, { when: '{{data_reservaStatus}} == "RESERVADO"' });
  f.link(reservado, semEstoque, { otherwise: true });
  f.chain(fatura, acompanhar, f.end('FimFaturado', 'Fim — faturado', 6, -1));
  f.chain(semEstoque, publicaDecisao, f.end('FimDecidido', 'Fim — decisão publicada', 6, 1));
  f.note('Começa por evento, conversa com o estoque por mensagens e termina publicando. Antes de publicar: escolha cluster, tópico e credencial em cada etapa de mensageria.', 1, 0, [criado, reserva, aguarda]);
  f.note('Uma publicação também pode ser a última etapa antes do fim.', 5, 1, [publicaDecisao], true);
  return f.build();
});

// --- Checagem estrutural (espelho do essencial de FlowValidator/SynchronousChainCheck) -----------

// Seções do canvas por modelo (só nos de 9+ etapas): nome do grupo e as etapas, pelo id usado acima.
const SECTIONS = {
  'decisao-varios-caminhos': [['Escolha do perfil', 'Perfil', 'Grande', 'Pequena'], ['Empresa grande', 'Corporativo', 'FimCorporativo'], ['Pequena empresa', 'Pme', 'FimPme'], ['Residencial', 'Residencial', 'FimResidencial']],
  'aprovacao-pedido': [['Análise', 'Analisar', 'Aprovado'], ['Aprovado', 'AvisaAprovacao', 'TelaAprovado', 'FimAprovado'], ['Reprovado', 'AvisaReprovacao', 'TelaReprovado', 'FimReprovado']],
  'processamento-em-fila': [['Pedido', 'Pedido', 'EnviaProcessamento'], ['Processamento', 'AguardaProcessamento', 'Aprovado'], ['Resultado', 'Transferida', 'Recusada', 'FimTransferida', 'FimRecusada']],
  'atendimento-whatsapp': [['Menu', 'Menu', 'SegundaViaOuAtendente'], ['Atendente', 'Atendente', 'FimAtendente'], ['Segunda via', 'Cpf', 'BuscaFaturas', 'TemFaturas', 'EmDia', 'EscolheFatura', 'FimEmDia', 'GeraSegundaVia', 'SegundaVia', 'FimSegundaVia']],
  'contratacao-plano': [['Identificação e crédito', 'Identificacao', 'AnaliseCredito', 'CreditoAprovado'], ['Pré-pago', 'OfertaPrePago', 'FimPrePago'], ['Escolha do plano', 'BuscaPlanos', 'EscolhePlano'], ['Pedido', 'Endereco', 'CriaPedido', 'Confirmado', 'FimContratado']],
  'portabilidade': [['Solicitação', 'Dados', 'ConsultaPrazo', 'PrazoCurto'], ['Prazo estendido', 'PrazoEstendido', 'FimPrazo'], ['Portabilidade', 'Solicita', 'AguardaOperadora', 'Concluida', 'FimConcluida']],
  'upgrade-plano': [['Escolha do plano', 'BuscaPlanos', 'EscolhePlano'], ['Elegibilidade', 'Elegibilidade', 'PodeTrocar'], ['Troca', 'AplicaTroca', 'Trocado', 'FimTrocado'], ['Sem troca', 'Indisponivel', 'FimIndisponivel']],
  'ativacao-linha': [['Ativação', 'Chip', 'AtivaLinha', 'AguardaRede', 'AtivaNaRede'], ['Resultado', 'Ativada', 'EmAnalise', 'FimAtivada', 'FimAnalise']],
  'cancelamento-retencao': [['Motivo', 'Motivo', 'ScoreRetencao', 'ValeOfertar'], ['Retenção', 'Oferta', 'Aceitou', 'AplicaOferta', 'Retido', 'FimRetido'], ['Cancelamento', 'Cancela', 'Cancelado', 'FimCancelado']],
  'autoatendimento-internet': [['Chamado aberto', 'ConsultaChamado', 'TemChamado', 'TelaChamado', 'FimChamado'], ['Pendência financeira', 'ConsultaPendencia', 'TemPendencia', 'TelaPendencia', 'FimPendencia'], ['Falha massiva', 'ConsultaMassiva', 'TemMassiva', 'TelaMassiva', 'FimMassiva'], ['Diagnóstico', 'SolicitaDiagnostico', 'AguardaDiagnostico', 'Resultado', 'FimDiagnostico']],
  'acompanhamento-instalacao': [['Aviso', 'TecnicoACaminho', 'Aviso', 'PrecisaReagendar'], ['Visita', 'AteJa', 'FimVisita'], ['Reagendamento', 'NovoHorario', 'Reagenda', 'Reagendado', 'FimReagendado']],
  'manutencao-fibra-campo': [['Atendimento', 'OrdemServico', 'ConsultaOS', 'Chegada', 'Reparo', 'Resolvido'], ['Encerramento', 'EncerraOS', 'Encerrada', 'FimEncerrada'], ['Escalada', 'EscalaRede', 'Escalada', 'FimEscalada']],
  'negociacao-debito': [['Consulta', 'Cpf', 'BuscaFaturas', 'TemFaturas', 'EmDia', 'FimEmDia'], ['Escolha', 'EscolheFatura', 'Negociar'], ['Segunda via', 'GeraSegundaVia', 'SegundaVia', 'FimSegundaVia'], ['Acordo', 'Parcelas', 'FechaAcordo', 'AcordoFechado', 'FimAcordo']],
  'gestao-bds': [['Consulta', 'InformaCnpj', 'ConsultaBilhetes', 'TemBilhetes', 'SemBilhetes', 'FimSem'], ['Ação', 'EscolheBilhete', 'ReagendarOuCancelar'], ['Reagendamento', 'NovoHorario', 'Reagenda', 'Reagendado', 'FimReagendado'], ['Cancelamento', 'Cancela', 'Cancelado', 'FimCancelado']],
  'iot-provisionamento': [['Provisionamento', 'Pedido', 'Provisiona', 'ProvisionouAlgum'], ['Ativos', 'AvisaFaturamento', 'Ativos', 'FimAtivos'], ['Falha', 'Falha', 'FimFalha']],
  'reclamacao-multicanal': [['Triagem', 'Reclamacao', 'Triagem', 'VaiParaOuvidoria'], ['Ouvidoria', 'EscalaOuvidoria', 'Escalada', 'FimEscalada'], ['Proposta', 'Proposta', 'Aceitou', 'AplicaCompensacao', 'Resolvida', 'FimResolvida']],
  'integracao-com-falha': [['Cadastro', 'Dados', 'Cadastra', 'DeuCerto'], ['Resultado', 'Sucesso', 'Recusado', 'FimSucesso'], ['Se falhar', 'Indisponivel', 'TentarDeNovo', 'MaisTarde', 'FimMaisTarde']],
  'eventos-ponta-a-ponta': [['Reserva', 'PedidoCriado', 'SolicitaReserva', 'AguardaReserva', 'Reservado'], ['Faturamento', 'SolicitaFaturamento', 'FimFaturado'], ['Sem estoque', 'SemEstoque', 'Acompanhar', 'PublicaDecisao', 'FimDecidido']],
};

function sectionsOf(templateId) {
  return (SECTIONS[templateId] ?? []).map(([name, ...ids], i) => ({ id: `Section_${i + 1}`, name, nodeIds: ids.map((id) => `Node_${id}`) }));
}

function selfCheck(t, fl) {
  const fail = (msg) => { throw new Error(`[${t.templateId}] ${msg}`); };
  const byId = new Map(fl.nodes.map((n) => [n.nodeId, n]));
  if (byId.size !== fl.nodes.length) fail('nodeId duplicado');
  const outs = new Map(); const errorOuts = new Map(); const ins = new Map(); const back = new Map();
  for (const c of fl.connections) {
    if (!byId.has(c.sourceNodeId) || !byId.has(c.targetNodeId)) fail(`ligação ${c.connectionId} aponta para etapa inexistente`);
    if (c.onError) {
      errorOuts.set(c.sourceNodeId, [...(errorOuts.get(c.sourceNodeId) ?? []), c]);
    } else {
      outs.set(c.sourceNodeId, [...(outs.get(c.sourceNodeId) ?? []), c]);
    }
    ins.set(c.targetNodeId, (ins.get(c.targetNodeId) ?? 0) + 1);
    back.set(c.targetNodeId, [...(back.get(c.targetNodeId) ?? []), c.sourceNodeId]);
  }
  const starts = fl.nodes.filter((n) => n.nodeType === 'START' || n.nodeType === 'MESSAGE_START_EVENT');
  if (starts.length !== 1) fail('precisa de exatamente um início');
  const outputNames = new Set();
  for (const n of fl.nodes) {
    const o = outs.get(n.nodeId) ?? []; const i = ins.get(n.nodeId) ?? 0;
    const e = errorOuts.get(n.nodeId) ?? [];
    if (e.length > 0 && !(n.nodeType === 'SERVICE_TASK' && n.connectorConfig?.connectorType === 'REST')) fail(`${n.nodeId}: "Se falhar" só em integração REST`);
    if (e.length > 1 || e.some((c) => c.condition || c.isDefault)) fail(`${n.nodeId}: no máximo um "Se falhar", sem condição`);
    if (['START', 'MESSAGE_START_EVENT'].includes(n.nodeType) && (i !== 0 || o.length !== 1)) fail(`${n.nodeId}: início com entradas/saídas erradas`);
    if (['USER_TASK', 'SERVICE_TASK', 'RECEIVE_TASK'].includes(n.nodeType) && (i < 1 || o.length !== 1)) fail(`${n.nodeId}: precisa de entrada e exatamente uma saída`);
    if (n.nodeType === 'END' && (i < 1 || o.length !== 0)) fail(`${n.nodeId}: fim com saída ou sem entrada`);
    if (n.nodeType === 'GATEWAY') {
      if (i < 1 || o.length !== 2) fail(`${n.nodeId}: decisão precisa de dois caminhos`);
      if (o.filter((c) => c.isDefault).length !== 1) fail(`${n.nodeId}: decisão precisa de um caminho padrão`);
      if (o.some((c) => !c.isDefault && !c.condition)) fail(`${n.nodeId}: caminho sem condição`);
    }
    for (const rule of n.connectorConfig?.config?.outputMapping ?? []) {
      if (outputNames.has(rule.name)) fail(`saída "${rule.name}" repetida`);
      outputNames.add(rule.name);
    }
    for (const v of n.startVariables ?? []) {
      if (outputNames.has(v.name)) fail(`variável de entrada "${v.name}" repetida`);
      outputNames.add(v.name);
    }
  }
  // Nenhum Fim alcançável voltando só por REST, sem uma pausa (tela, espera ou publicação) no meio.
  // REST em segundo plano vira job: o motor pausa ali, então não conta como chamada síncrona.
  const isRest = (n) => n.nodeType === 'SERVICE_TASK' && n.connectorConfig?.connectorType === 'REST' && n.connectorConfig.config?.background !== true;
  const isPause = (n) => n.nodeType === 'USER_TASK' || n.nodeType === 'RECEIVE_TASK' || (n.nodeType === 'SERVICE_TASK' && !isRest(n));
  for (const end of fl.nodes.filter((n) => n.nodeType === 'END')) {
    const seen = new Set([end.nodeId]); const queue = [end.nodeId];
    while (queue.length) {
      const node = byId.get(queue.shift());
      if (isRest(node)) fail(`${end.nodeId} é alcançado logo depois de uma chamada REST, sem pausa`);
      if (isPause(node)) continue;
      for (const prev of back.get(node.nodeId) ?? []) if (!seen.has(prev)) { seen.add(prev); queue.push(prev); }
    }
  }
  for (const a of fl.annotations) for (const id of a.linkedNodeIds) if (!byId.has(id)) fail(`nota liga a etapa inexistente ${id}`);
  const grouped = new Set();
  for (const sec of fl.sections ?? []) for (const id of sec.nodeIds) {
    if (!byId.has(id)) fail(`seção "${sec.name}" com etapa inexistente ${id}`);
    if (grouped.has(id)) fail(`etapa ${id} em mais de uma seção`);
    grouped.add(id);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const file of readdirSync(OUT_DIR)) if (file.endsWith('.json')) rmSync(OUT_DIR + file);
TEMPLATES.forEach((t, index) => {
  const fl = { ...t.build(), sections: sectionsOf(t.templateId) };
  selfCheck(t, fl);
  const { build, ...meta } = t;
  const file = `${String(index + 1).padStart(2, '0')}-${t.templateId}.json`;
  writeFileSync(OUT_DIR + file, `${JSON.stringify({ ...meta, flow: fl }, null, 2)}\n`);
  console.log(file, '—', fl.nodes.length, 'etapas,', fl.annotations.length, 'notas,', fl.sections.length, 'seções');
});
console.log(`${TEMPLATES.length} templates gravados em ${OUT_DIR}`);
