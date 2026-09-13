// Exemplo de uso de sdui_helpers.mjs — reproduz a jornada "Laboratório de Variáveis" (produto
// "Laboratorio"): variáveis iniciais da instância (START, REQ-03.12.001) + uma tela rica de
// cadastro completo + quatro telas de revisão que vão reeditando parte dos dados — pra exercitar a
// timeline de variáveis do Diagnóstico com ~12 variáveis, várias com múltiplos valores ao longo da
// jornada. Rode com: node example_laboratorio_variaveis.mjs
//
// Não cria produto/jornada duplicados se já existirem com o mesmo nome (ensureProduct/ensureJourney
// buscam por nome antes de criar) — seguro rodar de novo pra só republicar uma versão nova do fluxo.

import {
  login, ensureProduct, ensureJourney, publishNewFlow,
  startNode, endNode, userTaskNode, connection, layoutRow,
  text, textInput, textArea, select, checkbox, datePicker, submitButton,
} from './sdui_helpers.mjs';

// Uma linha só, na ordem visual esquerda→direita — layoutRow alinha o centro vertical de todos
// (START/END são menores que USER_TASK no canvas) e espaça uniformemente no eixo X.
const LAYOUT = layoutRow([
  { nodeId: 'Node_Start', nodeType: 'START' },
  { nodeId: 'Node_Cadastro', nodeType: 'USER_TASK' },
  { nodeId: 'Node_Revisao1', nodeType: 'USER_TASK' },
  { nodeId: 'Node_Revisao2', nodeType: 'USER_TASK' },
  { nodeId: 'Node_Revisao3', nodeType: 'USER_TASK' },
  { nodeId: 'Node_Revisao4', nodeType: 'USER_TASK' },
  { nodeId: 'Node_End', nodeType: 'END' },
]);
const posOf = (nodeId) => [LAYOUT.get(nodeId).positionX, LAYOUT.get(nodeId).positionY];

const UF_OPTIONS = [
  { label: 'São Paulo', value: 'SP' }, { label: 'Rio de Janeiro', value: 'RJ' },
  { label: 'Minas Gerais', value: 'MG' }, { label: 'Outro', value: 'outro' },
];
const ESTADO_CIVIL_OPTIONS = [
  { label: 'Solteiro(a)', value: 'solteiro' }, { label: 'Casado(a)', value: 'casado' },
  { label: 'Divorciado(a)', value: 'divorciado' }, { label: 'Viúvo(a)', value: 'viuvo' },
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
    name: 'Laboratório de Variáveis',
    description: 'Jornada de referência para validar a timeline de variáveis do Diagnóstico: variáveis iniciais da instância mais um cadastro completo revisado em várias etapas.',
  });

  const nodes = [
    // Variáveis iniciais da instância (REQ-03.12.001) — não vêm de nenhuma tela, são fornecidas por
    // quem inicia a execução (painel "Iniciar" da Execução, ou o canal digital/BFF).
    startNode('Node_Start', 'Início', ...posOf('Node_Start'), 'Início da jornada', [
      { name: 'canalOrigem', type: 'string' },
      { name: 'campanhaId', type: 'string' },
    ]),
    userTaskNode('Node_Cadastro', 'Cadastro completo', 'Dados pessoais completos — 10 variáveis coletadas de uma vez.', ...posOf('Node_Cadastro'), 'cadastro', 'Cadastro completo', [
      text('text_cadastro_titulo', 'Seus dados'),
      textInput('input_nome', 'Nome completo', 'nomeCompleto', { placeholder: 'Digite seu nome' }),
      textInput('input_cpf', 'CPF', 'cpf', { placeholder: '000.000.000-00' }),
      datePicker('date_nascimento', 'Data de nascimento', 'dataNascimento'),
      textInput('input_email', 'E-mail', 'email', { placeholder: 'voce@exemplo.com', inputMode: 'email' }),
      textInput('input_telefone', 'Telefone', 'telefone', { placeholder: '(11) 90000-0000', inputMode: 'tel' }),
      textInput('input_cep', 'CEP', 'cep', { placeholder: '00000-000' }),
      textInput('input_cidade', 'Cidade', 'cidade', { placeholder: 'Sua cidade' }),
      select('select_uf', 'UF', 'uf', UF_OPTIONS),
      select('select_estado_civil', 'Estado civil', 'estadoCivil', ESTADO_CIVIL_OPTIONS),
      checkbox('checkbox_termos', 'Aceito os termos de uso', 'aceitaTermos', { required: true }),
      submitButton('button_cadastro_continuar', 'Continuar'),
    ]),
    // REUSO PROPOSITAL (REQ-03.09.011, 2026-09-12): cada revisão reedita um subconjunto dos campos
    // já coletados no Cadastro completo, mesmo nome técnico — é o padrão de releitura-e-edição do
    // vínculo twoWay (catálogo SDUI v1, seção 8.1), pensado exatamente pra alimentar a timeline.
    userTaskNode('Node_Revisao1', 'Revisão 1', 'Revisa nome e e-mail.', ...posOf('Node_Revisao1'), 'revisao1', 'Revisão 1 — Contato', [
      text('text_revisao1_titulo', 'Revise seu contato'),
      textInput('input_nome_r1', 'Nome completo', 'nomeCompleto', { placeholder: 'Digite seu nome' }),
      textInput('input_email_r1', 'E-mail', 'email', { placeholder: 'voce@exemplo.com', inputMode: 'email' }),
      submitButton('button_revisao1_continuar', 'Continuar'),
    ]),
    userTaskNode('Node_Revisao2', 'Revisão 2', 'Revisa endereço.', ...posOf('Node_Revisao2'), 'revisao2', 'Revisão 2 — Endereço', [
      text('text_revisao2_titulo', 'Revise seu endereço'),
      textInput('input_cep_r2', 'CEP', 'cep', { placeholder: '00000-000' }),
      textInput('input_cidade_r2', 'Cidade', 'cidade', { placeholder: 'Sua cidade' }),
      select('select_uf_r2', 'UF', 'uf', UF_OPTIONS),
      submitButton('button_revisao2_continuar', 'Continuar'),
    ]),
    userTaskNode('Node_Revisao3', 'Revisão 3', 'Revisa estado civil e telefone.', ...posOf('Node_Revisao3'), 'revisao3', 'Revisão 3 — Dados pessoais', [
      text('text_revisao3_titulo', 'Revise seus dados pessoais'),
      select('select_estado_civil_r3', 'Estado civil', 'estadoCivil', ESTADO_CIVIL_OPTIONS),
      textInput('input_telefone_r3', 'Telefone', 'telefone', { placeholder: '(11) 90000-0000', inputMode: 'tel' }),
      submitButton('button_revisao3_continuar', 'Continuar'),
    ]),
    // 'nomeCompleto' muda pela terceira vez e 'aceitaTermos' pela segunda — confirmação final.
    userTaskNode('Node_Revisao4', 'Revisão 4', 'Confirmação final do nome e dos termos.', ...posOf('Node_Revisao4'), 'revisao4', 'Revisão 4 — Confirmação final', [
      text('text_revisao4_titulo', 'Confirmação final'),
      textInput('input_nome_r4', 'Nome completo', 'nomeCompleto', { placeholder: 'Digite seu nome' }),
      checkbox('checkbox_termos_r4', 'Aceito os termos de uso', 'aceitaTermos', { required: true }),
      submitButton('button_revisao4_finalizar', 'Finalizar'),
    ]),
    endNode('Node_End', 'Fim', ...posOf('Node_End')),
  ];

  const connections = [
    connection('Flow_Start_Cadastro', 'Node_Start', 'Node_Cadastro'),
    connection('Flow_Cadastro_Revisao1', 'Node_Cadastro', 'Node_Revisao1'),
    connection('Flow_Revisao1_Revisao2', 'Node_Revisao1', 'Node_Revisao2'),
    connection('Flow_Revisao2_Revisao3', 'Node_Revisao2', 'Node_Revisao3'),
    connection('Flow_Revisao3_Revisao4', 'Node_Revisao3', 'Node_Revisao4'),
    connection('Flow_Revisao4_End', 'Node_Revisao4', 'Node_End'),
  ];

  const published = await publishNewFlow(
    token, journey.journeyId,
    { name: 'Fluxo Laboratório de Variáveis', nodes, connections },
    'Variáveis iniciais + cadastro completo + 4 revisões — timeline rica de ~12 variáveis',
  );
  console.log('Publicado:', published.status, 'v' + published.versionNumber, '— journeyId:', journey.journeyId);
}

main().catch((err) => { console.error('FALHOU:', err.message); process.exit(1); });
