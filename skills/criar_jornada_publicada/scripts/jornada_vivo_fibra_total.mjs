// Jornada "hero" pro site institucional do produto Laboratório: contratação do combo Vivo Fibra +
// Total (internet fibra + linhas móveis + streaming), simulando a maior operadora do Brasil. Usa
// todos os 7 tipos de nó do fluxo (START, USER_TASK, SERVICE_TASK, RECEIVE_TASK, GATEWAY, END — só
// MESSAGE_START_EVENT fica de fora, é mutuamente exclusivo com START) e 18 dos 19 componentes do
// catálogo SDUI v1 (ui.image fica de fora: exigiria uma URL externa fabricada, e a screen já não
// precisa dele pra ficar rica). Dois GATEWAYs, três caminhos, três finais diferentes, integrações
// REST e Kafka de verdade (mock, domínio example.com) e visibilidade condicional por canal
// (WEB/MOBILE/WHATSAPP) e por resposta do próprio formulário.
//
// Rode com: node jornada_vivo_fibra_total.mjs

import {
  login, ensureProduct, ensureJourney, publishNewFlow,
  startNode, endNode, userTaskNode, gatewayNode, serviceTaskNode, receiveTaskNode, connection,
  text, textInput, textArea, select, checkbox, datePicker, submitButton,
  icon, divider, container, stack, card, alert, progress, link,
} from './sdui_helpers.mjs';

// Layout manual em árvore (dois GATEWAYs ramificando) — layoutRow só cobre fluxo linear. Centro
// vertical por "raia": tronco principal em 300, ramo aprovado sobe pra 180, ramo alternativo desce
// pra 460, e o GATEWAY dentro do ramo alternativo reabre em 380 (revisão manual) e 560 (pré-pago).
// positionX/Y é sempre o canto superior-esquerdo — half da largura de cada tipo (START/END=52,
// GATEWAY=50, USER_TASK/SERVICE_TASK/RECEIVE_TASK=78), igual à convenção de layoutRow.
const pos = (x, centerY, half) => [x, Math.round(centerY - half)];

const POS = {
  Node_Start: pos(80, 300, 26),
  Node_BoasVindas: pos(222, 300, 39),
  Node_ConsultaCredito: pos(390, 300, 39),
  Node_Decisao: pos(558, 300, 25),

  Node_EscolhaPlano: pos(698, 180, 39),
  Node_Endereco: pos(866, 180, 39),
  Node_Pagamento: pos(1034, 180, 39),
  Node_ProcessarPedido: pos(1202, 180, 39),
  Node_AguardaConfirmacao: pos(1370, 180, 39),
  Node_Sucesso: pos(1538, 180, 39),
  Node_End_Sucesso: pos(1706, 180, 26),

  Node_OfertaAlternativa: pos(698, 460, 39),
  Node_Decisao2: pos(866, 460, 25),
  Node_RevisaoManual: pos(1034, 380, 39),
  Node_ResultadoRevisao: pos(1202, 380, 39),
  Node_End_Revisao: pos(1370, 380, 26),
  Node_PlanoAlternativo: pos(1034, 560, 39),
  Node_End_Alternativo: pos(1202, 560, 26),
};

const UF_OPTIONS = [
  { label: 'São Paulo', value: 'SP' }, { label: 'Rio de Janeiro', value: 'RJ' },
  { label: 'Minas Gerais', value: 'MG' }, { label: 'Outro estado', value: 'outro' },
];
const PLANO_OPTIONS = [
  { label: 'Fibra 300 Mega + Controle', value: 'fibra_300_controle' },
  { label: 'Fibra 500 Mega + Pós Vivo Total', value: 'fibra_500_pos_total' },
  { label: 'Fibra Giga + Família Vivo', value: 'fibra_giga_familia' },
];
const VELOCIDADE_OPTIONS = [
  { label: '300 Mega', value: '300' }, { label: '500 Mega', value: '500' },
  { label: '700 Mega', value: '700' }, { label: '1 Giga', value: '1000' },
];
const FORMA_PAGAMENTO_OPTIONS = [
  { label: 'Cartão de crédito', value: 'cartao' },
  { label: 'Débito em conta', value: 'debito' },
  { label: 'Boleto bancário', value: 'boleto' },
];
const DECISAO_CLIENTE_OPTIONS = [
  { label: 'Quero ativar agora um plano Vivo Pré', value: 'aceitar_alternativa' },
  { label: 'Prefiro pedir revisão manual do meu cadastro', value: 'revisao' },
];
const PLANO_PRE_OPTIONS = [
  { label: 'Vivo Pré Turbo 20GB', value: 'pre_turbo_20gb' },
  { label: 'Vivo Pré Turbo 50GB', value: 'pre_turbo_50gb' },
];

async function main() {
  const token = await login();

  const product = await ensureProduct(token, {
    name: 'Laboratorio',
    description: 'Produto de laboratório para testar recursos do portal (multicanal: Web, Mobile e WhatsApp).',
    channelTypes: ['WEB', 'MOBILE', 'WHATSAPP'],
  });

  const journey = await ensureJourney(token, {
    productId: product.productId,
    channelTypes: ['WEB', 'MOBILE', 'WHATSAPP'],
    name: 'Vivo Fibra + Total — Contratação',
    description: 'Jornada de referência (hero do site institucional): contratação do combo Vivo Fibra + Total, com simulação de crédito, decisão automática, ativação por integração e caminho alternativo de revisão manual. Usa os 7 tipos de etapa e quase todo o catálogo de componentes SDUI.',
  });

  const nodes = [
    startNode('Node_Start', 'Início', ...POS.Node_Start, 'Início da jornada de contratação', [
      { name: 'canalOrigem', type: 'string' },
      { name: 'campanhaId', type: 'string' },
    ]),

    userTaskNode('Node_BoasVindas', 'Boas-vindas e identificação', 'Coleta dados pessoais e consentimento LGPD.', ...POS.Node_BoasVindas, 'boas-vindas', 'Contrate o combo Vivo Fibra + Total', [
      text('text_bv_titulo', 'Contrate o combo Vivo Fibra + Total em poucos passos', 'title'),
      text('text_bv_subtitulo', 'A maior operadora do Brasil leva internet fibra, celular e streaming pra sua casa numa jornada só — e você acompanha cada etapa por aqui.', 'body'),
      divider('div_bv_topo'),
      alert('alert_bv_whatsapp', 'informative', 'Prefere continuar por aqui mesmo? A gente segue com você sem precisar trocar de canal.', {
        title: 'Atendimento também pelo WhatsApp',
        visibility: { path: 'session.channel', rule: 'equals', value: 'WHATSAPP' },
      }),
      card('card_bv_dados', [
        stack('stack_bv_dados', [
          textInput('input_bv_cpf', 'CPF', 'cpf', { placeholder: '000.000.000-00', inputMode: 'number' }),
          textInput('input_bv_nome', 'Nome completo', 'nomeCompleto', { placeholder: 'Digite seu nome completo' }),
          datePicker('date_bv_nascimento', 'Data de nascimento', 'dataNascimento'),
          textInput('input_bv_telefone', 'Celular com DDD', 'telefone', { placeholder: '(11) 90000-0000', inputMode: 'tel' }),
          textInput('input_bv_email', 'E-mail', 'email', { placeholder: 'voce@exemplo.com', inputMode: 'email' }),
        ]),
      ], { variant: 'highlighted' }),
      stack('stack_bv_lgpd', [
        icon('icon_bv_seguranca', 'shield-check', 'Seus dados protegidos pela LGPD'),
        text('text_bv_lgpd', 'Seus dados são protegidos conforme a LGPD e usados só para esta contratação.', 'caption'),
      ], { direction: 'horizontal', alignment: 'center' }),
      checkbox('checkbox_bv_termos', 'Li e aceito os Termos de Uso e a Política de Privacidade da Vivo', 'aceitaTermosLGPD', { required: true }),
      submitButton('button_bv_continuar', 'Consultar minha elegibilidade'),
    ]),

    serviceTaskNode('Node_ConsultaCredito', 'Consulta de elegibilidade', 'Simula a análise de crédito do CPF informado.', ...POS.Node_ConsultaCredito,
      'REST', {
        method: 'POST',
        url: 'http://localhost:8084/v1/credito/score',
        headers: { 'Content-Type': 'application/json' },
        // {{form_nome}}, não {{nome}}: nome real da variável no motor (namespace form_/data_,
        // ver engineVariableToken no front e VariableConversion no ms-espec-registry) — é o que o
        // assistente de configuração de conector insere hoje pelo botão "{}".
        body: { cpf: '{{form_cpf}}', nomeCompleto: '{{form_nomeCompleto}}', dataNascimento: '{{form_dataNascimento}}' },
        outputMapping: [
          { name: 'scoreAprovado', jsonPath: '$.aprovado', type: 'boolean' },
          { name: 'scoreValor', jsonPath: '$.score', type: 'number' },
          { name: 'limiteCreditoSugerido', jsonPath: '$.limiteSugerido', type: 'number' },
        ],
      }),

    gatewayNode('Node_Decisao', 'Cliente elegível?', ...POS.Node_Decisao, 'Decide entre a contratação automática e a oferta alternativa, conforme o resultado da simulação de crédito.'),

    // --- Ramo A: aprovado — contratação completa -------------------------------------------
    userTaskNode('Node_EscolhaPlano', 'Escolha do plano', 'Plano, velocidade e linhas móveis.', ...POS.Node_EscolhaPlano, 'escolha-plano', 'Escolha seu plano Vivo Fibra + Total', [
      text('text_ep_titulo', 'Escolha seu plano Vivo Fibra + Total', 'title'),
      progress('progress_ep', 0.3, { label: 'Etapa 2 de 5 — Escolha do plano', showValue: true }),
      alert('alert_ep_app', 'informative', 'Compare a velocidade ideal pro seu Wi-Fi visualmente no app Vivo.', {
        title: 'Dica',
        visibility: { path: 'session.channel', rule: 'notIn', value: ['WHATSAPP'] },
      }),
      select('select_ep_plano', 'Plano', 'planoEscolhido', PLANO_OPTIONS),
      select('select_ep_velocidade', 'Velocidade da internet', 'velocidadeInternet', VELOCIDADE_OPTIONS),
      textInput('input_ep_linhas', 'Quantas linhas móveis você quer incluir?', 'linhasMoveis', { inputMode: 'number', placeholder: 'Ex.: 2' }),
      checkbox('checkbox_ep_streaming', 'Adicionar pacote de streaming (Premiere, Telecine e HBO Max)', 'adicionarStreaming', { required: false }),
      divider('div_ep'),
      stack('stack_ep_5g', [
        icon('icon_ep_5g', 'wifi', '5G incluso'),
        text('text_ep_5g', '5G incluso sem custo extra em todos os planos Fibra + Total.', 'caption'),
      ], { direction: 'horizontal', alignment: 'center' }),
      submitButton('button_ep_continuar', 'Continuar'),
    ]),

    userTaskNode('Node_Endereco', 'Endereço de instalação', 'Endereço onde a fibra será instalada.', ...POS.Node_Endereco, 'endereco', 'Onde vamos instalar sua fibra?', [
      text('text_end_titulo', 'Onde vamos instalar sua fibra?', 'title'),
      progress('progress_end', 0.5, { label: 'Etapa 3 de 5 — Endereço', showValue: true }),
      textInput('input_end_cep', 'CEP', 'cep', { placeholder: '00000-000' }),
      textInput('input_end_logradouro', 'Rua / Avenida', 'logradouro', { placeholder: 'Nome da rua' }),
      textInput('input_end_numero', 'Número', 'numero', { inputMode: 'number', placeholder: 'Ex.: 123' }),
      textInput('input_end_complemento', 'Complemento', 'complemento', { required: false, placeholder: 'Apto, bloco...' }),
      textInput('input_end_cidade', 'Cidade', 'cidade', { placeholder: 'Sua cidade' }),
      select('select_end_uf', 'UF', 'uf', UF_OPTIONS),
      checkbox('checkbox_end_cobranca', 'Usar este endereço também para cobrança', 'usarComoCobranca', { required: false }),
      submitButton('button_end_continuar', 'Continuar'),
    ]),

    userTaskNode('Node_Pagamento', 'Forma de pagamento', 'Forma de pagamento e aceite do contrato.', ...POS.Node_Pagamento, 'pagamento', 'Forma de pagamento', [
      text('text_pag_titulo', 'Forma de pagamento', 'title'),
      progress('progress_pag', 0.7, { label: 'Etapa 4 de 5 — Pagamento', showValue: true }),
      select('select_pag_forma', 'Como você quer pagar?', 'formaPagamento', FORMA_PAGAMENTO_OPTIONS),
      textInput('input_pag_cartao', 'Número do cartão', 'numeroCartao', {
        placeholder: '0000 0000 0000 0000', inputMode: 'number',
        visibility: { path: 'form.formaPagamento', rule: 'equals', value: 'cartao' },
      }),
      alert('alert_pag_seguro', 'positive', 'Pagamento 100% seguro e criptografado, dentro do ambiente oficial Vivo.', { title: 'Ambiente seguro' }),
      checkbox('checkbox_pag_contrato', 'Li e aceito o contrato de prestação de serviços', 'aceitaContrato', { required: true }),
      link('link_pag_contrato', 'Ver o contrato completo', { emphasis: 'medium', params: { target: 'contrato-completo' } }),
      submitButton('button_pag_finalizar', 'Finalizar contratação'),
    ]),

    serviceTaskNode('Node_ProcessarPedido', 'Ativação do pedido', 'Envia o pedido para ativação nos sistemas da Vivo.', ...POS.Node_ProcessarPedido,
      'REST', {
        method: 'POST',
        url: 'http://localhost:8084/v1/pedidos',
        headers: { 'Content-Type': 'application/json' },
        body: {
          cpf: '{{form_cpf}}', plano: '{{form_planoEscolhido}}', velocidade: '{{form_velocidadeInternet}}',
          cep: '{{form_cep}}', formaPagamento: '{{form_formaPagamento}}',
        },
        outputMapping: [
          { name: 'numeroPedido', jsonPath: '$.numeroPedido', type: 'string' },
          { name: 'dataAtivacaoPrevista', jsonPath: '$.dataAtivacaoPrevista', type: 'date' },
        ],
      }),

    // Sem outputMapping de propósito: KafkaConnectorWorker.buildVariables (ms-runtime-camunda) já
    // promove todo campo de payload.data pra uma variável data_<nome> automaticamente — o jsonPath do
    // outputMapping de Kafka é avaliado contra o ENVELOPE inteiro (correlationId/messageName/payload),
    // não contra payload.data (diferente do REST, onde o jsonPath lê a resposta crua da API). Uma
    // regra "statusAtivacao" ← "$.status" nunca resolveria, e falha travando a instância pra sempre
    // (a mensagem Kafka já foi consumida quando o erro estoura). Basta a mensagem de teste ter
    // {"statusAtivacao": "..."} no corpo pra {{data_statusAtivacao}} funcionar em telas seguintes.
    // Tópico e cluster reais do ambiente local (Kafka Local, 192.168.15.4:9092) — só existem
    // "eljy.eventos.entrada"/"eljy.eventos.saida" de verdade nesse cluster, um nome inventado
    // (ex.: "vivo.pedidos.ativacao.confirmada") estoura UnknownTopicOrPartitionException ao publicar.
    // Correlação usa businessKey (não o tópico), então os dois RECEIVE_TASK da jornada podem
    // compartilhar o mesmo tópico de entrada sem ambiguidade — cada instância só espera em um.
    receiveTaskNode('Node_AguardaConfirmacao', 'Aguarda confirmação de ativação', 'Aguarda o evento de confirmação publicado pelo provisionamento.', ...POS.Node_AguardaConfirmacao,
      'KAFKA', { operation: 'CONSUME', topic: 'eljy.eventos.entrada', clusterId: '6590dbdc-6ab8-433f-9baf-0c271486157b' }, 'teste'),

    userTaskNode('Node_Sucesso', 'Confirmação', 'Tela final de sucesso da contratação.', ...POS.Node_Sucesso, 'sucesso', 'Combo contratado com sucesso!', [
      icon('icon_suc_check', 'check-circle', 'Pedido confirmado'),
      text('text_suc_titulo', 'Combo contratado com sucesso!', 'title'),
      text('text_suc_pedido', 'Seu pedido {{data.numeroPedido}} foi confirmado. A instalação está prevista para {{data.dataAtivacaoPrevista}}.', 'body'),
      alert('alert_suc_status', 'positive', 'Status atual: {{data.statusAtivacao}}.', { title: 'Ativação' }),
      divider('div_suc'),
      text('text_suc_acompanhamento', 'Fique de olho no WhatsApp e no app Vivo para acompanhar o técnico no dia da instalação.', 'caption'),
      submitButton('button_suc_concluir', 'Concluir'),
    ]),

    endNode('Node_End_Sucesso', 'Fim — contratado', ...POS.Node_End_Sucesso, 'Combo contratado com sucesso'),

    // --- Ramo B: não aprovado automaticamente — oferta alternativa ou revisão manual -------
    userTaskNode('Node_OfertaAlternativa', 'Oferta alternativa', 'Cliente escolhe entre plano pré-pago ou revisão manual.', ...POS.Node_OfertaAlternativa, 'oferta-alternativa', 'Ainda não conseguimos aprovar automaticamente', [
      text('text_oa_titulo', 'Ainda não conseguimos aprovar automaticamente', 'title'),
      text('text_oa_corpo', 'Sem problemas — você pode ativar agora um plano pré-pago Vivo, ou pedir que nossa equipe revise seu cadastro manualmente.', 'body'),
      alert('alert_oa_motivo', 'warning', 'Isso não significa que seu crédito foi negado — só precisamos confirmar alguns dados.', { title: 'Por que isso aconteceu?' }),
      select('select_oa_decisao', 'O que você prefere fazer?', 'decisaoCliente', DECISAO_CLIENTE_OPTIONS),
      submitButton('button_oa_continuar', 'Continuar'),
    ]),

    gatewayNode('Node_Decisao2', 'Alternativa ou revisão?', ...POS.Node_Decisao2, 'Decide entre a ativação do plano pré-pago e a revisão manual, conforme a escolha do cliente.'),

    // Sem outputMapping — mesmo motivo do Node_AguardaConfirmacao acima: basta a mensagem de teste
    // ter {"resultadoRevisao": "..."} no corpo.
    receiveTaskNode('Node_RevisaoManual', 'Aguarda revisão manual', 'Aguarda o resultado da análise manual feita pela equipe de crédito.', ...POS.Node_RevisaoManual,
      'KAFKA', { operation: 'CONSUME', topic: 'eljy.eventos.entrada', clusterId: '6590dbdc-6ab8-433f-9baf-0c271486157b' }, 'teste'),

    userTaskNode('Node_ResultadoRevisao', 'Resultado da revisão', 'Mostra o resultado da análise manual.', ...POS.Node_ResultadoRevisao, 'resultado-revisao', 'Resultado da sua revisão', [
      text('text_rr_titulo', 'Resultado da sua revisão', 'title'),
      text('text_rr_corpo', 'Nossa equipe analisou seu cadastro. Resultado: {{data.resultadoRevisao}}.', 'body'),
      alert('alert_rr_contato', 'informative', 'Você pode falar com a gente pelo WhatsApp Vivo a qualquer momento para tirar dúvidas.', { title: 'Precisa de ajuda?' }),
      submitButton('button_rr_concluir', 'Concluir'),
    ]),

    endNode('Node_End_Revisao', 'Fim — revisão manual', ...POS.Node_End_Revisao, 'Encaminhado para revisão manual'),

    userTaskNode('Node_PlanoAlternativo', 'Ativação do plano pré-pago', 'Confirmação do plano pré-pago escolhido.', ...POS.Node_PlanoAlternativo, 'plano-alternativo', 'Combo Vivo Pré', [
      text('text_pa_titulo', 'Combo Vivo Pré ativado', 'title'),
      select('select_pa_plano', 'Plano pré-pago', 'planoEscolhido', PLANO_PRE_OPTIONS),
      checkbox('checkbox_pa_termos', 'Li e aceito os Termos de Uso e a Política de Privacidade da Vivo', 'aceitaTermosLGPD', { required: true }),
      submitButton('button_pa_ativar', 'Ativar agora'),
    ]),

    endNode('Node_End_Alternativo', 'Fim — pré-pago ativado', ...POS.Node_End_Alternativo, 'Plano pré-pago ativado'),
  ];

  const connections = [
    connection('Flow_Start_BoasVindas', 'Node_Start', 'Node_BoasVindas'),
    connection('Flow_BoasVindas_Consulta', 'Node_BoasVindas', 'Node_ConsultaCredito'),
    connection('Flow_Consulta_Decisao', 'Node_ConsultaCredito', 'Node_Decisao'),
    connection('Flow_Decisao_EscolhaPlano', 'Node_Decisao', 'Node_EscolhaPlano', { condition: '{{data_scoreAprovado}} == true' }),
    connection('Flow_Decisao_OfertaAlternativa', 'Node_Decisao', 'Node_OfertaAlternativa', { isDefault: true }),

    connection('Flow_EscolhaPlano_Endereco', 'Node_EscolhaPlano', 'Node_Endereco'),
    connection('Flow_Endereco_Pagamento', 'Node_Endereco', 'Node_Pagamento'),
    connection('Flow_Pagamento_ProcessarPedido', 'Node_Pagamento', 'Node_ProcessarPedido'),
    connection('Flow_ProcessarPedido_AguardaConfirmacao', 'Node_ProcessarPedido', 'Node_AguardaConfirmacao'),
    connection('Flow_AguardaConfirmacao_Sucesso', 'Node_AguardaConfirmacao', 'Node_Sucesso'),
    connection('Flow_Sucesso_EndSucesso', 'Node_Sucesso', 'Node_End_Sucesso'),

    connection('Flow_OfertaAlternativa_Decisao2', 'Node_OfertaAlternativa', 'Node_Decisao2'),
    connection('Flow_Decisao2_RevisaoManual', 'Node_Decisao2', 'Node_RevisaoManual', { condition: '{{form_decisaoCliente}} == "revisao"' }),
    connection('Flow_Decisao2_PlanoAlternativo', 'Node_Decisao2', 'Node_PlanoAlternativo', { isDefault: true }),

    connection('Flow_RevisaoManual_ResultadoRevisao', 'Node_RevisaoManual', 'Node_ResultadoRevisao'),
    connection('Flow_ResultadoRevisao_EndRevisao', 'Node_ResultadoRevisao', 'Node_End_Revisao'),

    connection('Flow_PlanoAlternativo_EndAlternativo', 'Node_PlanoAlternativo', 'Node_End_Alternativo'),
  ];

  const published = await publishNewFlow(
    token, journey.journeyId,
    { name: 'Fluxo Vivo Fibra + Total', nodes, connections },
    'Jornada hero: 18 nós, 2 decisões, 3 finais, integrações REST + Kafka, 3 canais — vitrine do catálogo SDUI completo',
  );
  console.log('Publicado:', published.status, 'v' + published.versionNumber, '— journeyId:', journey.journeyId);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
