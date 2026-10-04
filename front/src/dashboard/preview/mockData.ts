// Dados de exemplo da prévia do novo Dashboard. Nada aqui vem do back nem do motor: é só para
// visualizar e testar as visões propostas. Números, pessoas e jornadas são ilustrativos.

export type Kind = 'negocio' | 'sustentacao';

export type ViewId = 'mapa' | 'monitoramento' | 'governanca';

export interface ViewMeta {
  id: ViewId;
  num: number;
  title: string;
  tab: string;
  kind: Kind;
  summary: string;
  steps: string[];
  have: string;
  need: string;
}

export const VIEWS: ViewMeta[] = [
  {
    id: 'mapa',
    num: 2,
    title: 'Mapa do portfólio',
    tab: 'Mapa',
    kind: 'negocio',
    summary: 'Todas as jornadas numa tela: o tamanho é o volume de execuções e a cor é a taxa de sucesso.',
    steps: [
      'Escolha agrupar por produto ou por time, e colorir por sucesso ou por variação contra a semana anterior.',
      'Clique no bloco que chama atenção para ver o resumo da jornada ao lado.',
      '"Abrir no Diagnóstico" leva às instâncias daquela jornada.',
    ],
    have: 'o volume de execuções por jornada, que o Dashboard já lê do motor.',
    need: 'dizer o que é sucesso: marcar cada Fim, no editor, como Sucesso, Adiado ou Falha.',
  },
  {
    id: 'monitoramento',
    num: 3,
    title: 'Monitoramento e impacto',
    tab: 'Monitoramento',
    kind: 'sustentacao',
    summary: 'Regras de alerta escritas como frase, saúde das integrações e o impacto de uma integração fora do ar.',
    steps: [
      'Crie uma regra completando a frase: o quê, de quem, o limite, por quanto tempo e quem avisar.',
      'A plataforma verifica as regras a cada minuto; quando uma dispara, o time dono é avisado.',
      'Clique numa integração para ver quais jornadas dependem dela e quantas instâncias estão paradas.',
    ],
    have: 'falhas, incidentes e instâncias paradas, que vêm do motor; quais integrações cada jornada usa.',
    need: 'o verificador de regras em segundo plano e o envio dos avisos (e-mail, Teams).',
  },
  {
    id: 'governanca',
    num: 4,
    title: 'Governança do ciclo de vida',
    tab: 'Governança',
    kind: 'sustentacao',
    summary: 'Esteira de publicação, fila de aprovação com prazo, versões antigas com clientes e nota de saúde de cada jornada.',
    steps: [
      'Clique numa etapa da esteira para listar as jornadas dela.',
      'Aprove ou devolva versões direto na fila, ordenada por tempo de espera.',
      'Encerre as instâncias de versões antigas que ficaram para trás.',
      'A nota de A a E de cada jornada é recalculada todo dia, com o motivo ao lado.',
    ],
    have: 'jornadas, versões, aprovações, auditoria e encerrar instância.',
    need: 'só a regra da nota de saúde.',
  },
];

export const VIEW_BY_ID = Object.fromEntries(VIEWS.map((v) => [v.id, v])) as Record<ViewId, ViewMeta>;

// ---------------------------------------------------------------- jornadas

export type Product = 'Móvel' | 'Fibra' | 'Empresas' | 'Atendimento';
export const PRODUCTS: Product[] = ['Móvel', 'Fibra', 'Empresas', 'Atendimento'];
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export type Stage = 'aquisicao' | 'ativacao' | 'uso' | 'cobranca' | 'retencao';
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'aquisicao', label: 'Aquisição' },
  { id: 'ativacao', label: 'Ativação' },
  { id: 'uso', label: 'Uso' },
  { id: 'cobranca', label: 'Cobrança' },
  { id: 'retencao', label: 'Retenção' },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((x) => [x.id, x.label])) as Record<Stage, string>;

export interface JourneyStat {
  id: string;
  name: string;
  product: Product;
  team: string;
  executions: number;
  success: number; // %
  deltaPp: number; // variação do sucesso contra a semana anterior, em pontos percentuais
  version: number;
  grade: Grade;
  gradeReason: string;
  stage: Stage;
}

export const JOURNEYS: JourneyStat[] = [
  { id: 'fatura', name: 'Segunda via de fatura', product: 'Móvel', team: 'Faturamento', executions: 18240, success: 93, deltaPp: 1, version: 5, grade: 'A', gradeReason: '93% de sucesso · sem incidente há 60 dias', stage: 'cobranca' },
  { id: 'portab', name: 'Portabilidade', product: 'Móvel', team: 'Aquisição', executions: 9410, success: 64, deltaPp: -11, version: 7, grade: 'D', gradeReason: 'piorou 11 p.p. depois da v7', stage: 'aquisicao' },
  { id: 'plano', name: 'Troca de plano', product: 'Móvel', team: 'Aquisição', executions: 5120, success: 84, deltaPp: 2, version: 9, grade: 'B', gradeReason: 'estável · revisada há 20 dias', stage: 'uso' },
  { id: 'desbl', name: 'Desbloqueio de linha', product: 'Móvel', team: 'Suporte Móvel', executions: 1930, success: 77, deltaPp: 0, version: 3, grade: 'C', gradeReason: 'sem revisão há 120 dias', stage: 'cobranca' },
  { id: 'agend', name: 'Agendamento técnico', product: 'Fibra', team: 'Field Ops', executions: 11930, success: 81, deltaPp: 3, version: 12, grade: 'B', gradeReason: 'depende da Agenda de campo, fora do ar agora', stage: 'ativacao' },
  { id: 'upgrade', name: 'Upgrade de velocidade', product: 'Fibra', team: 'Aquisição', executions: 6210, success: 90, deltaPp: 1, version: 4, grade: 'A', gradeReason: '90% de sucesso · todas as integrações com "Se falhar"', stage: 'uso' },
  { id: 'endereco', name: 'Mudança de endereço', product: 'Fibra', team: 'Field Ops', executions: 3880, success: 69, deltaPp: -4, version: 6, grade: 'D', gradeReason: 'integração sem "Se falhar" · caiu 4 p.p.', stage: 'uso' },
  { id: 'wifi', name: 'Wi-Fi', product: 'Fibra', team: 'Suporte Fibra', executions: 1410, success: 82, deltaPp: 1, version: 2, grade: 'B', gradeReason: 'v2 aguardando aprovação há 20 h', stage: 'uso' },
  { id: 'bds', name: 'Gestão de BDs v2', product: 'Empresas', team: 'Field Ops', executions: 4380, success: 78, deltaPp: 2, version: 14, grade: 'C', gradeReason: '78% de sucesso · sem time dono', stage: 'uso' },
  { id: 'onboard', name: 'Onboarding PJ', product: 'Empresas', team: 'Empresas', executions: 3960, success: 91, deltaPp: 2, version: 4, grade: 'A', gradeReason: '91% de sucesso · revisada há 9 dias', stage: 'ativacao' },
  { id: 'linhas', name: 'Linhas adicionais', product: 'Empresas', team: 'Empresas', executions: 2740, success: 86, deltaPp: 0, version: 3, grade: 'B', gradeReason: 'estável', stage: 'aquisicao' },
  { id: 'contest', name: 'Contestação de cobrança', product: 'Empresas', team: 'Empresas', executions: 1120, success: 70, deltaPp: -1, version: 2, grade: 'D', gradeReason: '30% terminam em "Tentar mais tarde"', stage: 'cobranca' },
  { id: 'chamado', name: 'Abertura de chamado', product: 'Atendimento', team: 'Atendimento', executions: 7050, success: 85, deltaPp: 1, version: 3, grade: 'B', gradeReason: 'estável', stage: 'uso' },
  { id: 'pesquisa', name: 'Pesquisa de satisfação', product: 'Atendimento', team: 'Atendimento', executions: 5300, success: 96, deltaPp: 0, version: 2, grade: 'A', gradeReason: '96% de sucesso', stage: 'uso' },
  { id: 'cancel', name: 'Cancelamento', product: 'Atendimento', team: 'Retenção', executions: 2950, success: 58, deltaPp: -7, version: 8, grade: 'E', gradeReason: '58% de sucesso · 2 integrações sem "Se falhar"', stage: 'retencao' },
];

export const JOURNEY_BY_ID = Object.fromEntries(JOURNEYS.map((j) => [j.id, j])) as Record<string, JourneyStat>;
export const TEAMS = [...new Set(JOURNEYS.map((j) => j.team))];

export const TOTAL_EXECUTIONS = JOURNEYS.reduce((sum, j) => sum + j.executions, 0);
export const WEIGHTED_SUCCESS = Math.round(JOURNEYS.reduce((sum, j) => sum + j.success * j.executions, 0) / TOTAL_EXECUTIONS);

// Sucesso (%) por produto × canal.
export const CHANNELS = ['WhatsApp', 'Web', 'App'] as const;
export const SUCCESS_BY_CHANNEL: Record<Product, [number, number, number]> = {
  Móvel: [71, 86, 92],
  Fibra: [83, 80, 77],
  Empresas: [76, 90, 85],
  Atendimento: [59, 84, 93],
};

// Execuções por hora: faixa esperada (mesma hora nas últimas 4 semanas) e hoje até agora.
export const HOURLY_EXPECTED_LOW = [120, 80, 60, 50, 50, 90, 220, 480, 760, 900, 940, 920, 880, 900, 930, 910, 860, 780, 640, 520, 400, 300, 220, 160];
export const HOURLY_EXPECTED_HIGH = HOURLY_EXPECTED_LOW.map((v) => Math.round(v * 1.25 + 40));
export const HOURLY_TODAY = [140, 95, 70, 60, 58, 100, 240, 510, 800, 930, 960, 940, 900, 920, 950, 610, 560];

// ---------------------------------------------------------------- integrações

export type Health = 'ok' | 'degradada' | 'fora';

export interface IntegrationStat {
  id: string;
  name: string;
  health: Health;
  p95Ms: number | null;
  failurePct: number;
  journeyIds: string[];
  // Instâncias paradas esperando esta integração, por jornada (só quando degradada ou fora).
  stuck: Record<string, number>;
  costPerCall: number; // R$ por chamada cobrada pelo parceiro
  callsPerMonth: number;
}

export const INTEGRATIONS: IntegrationStat[] = [
  { id: 'agenda', name: 'Agenda de campo', health: 'fora', p95Ms: null, failurePct: 100, journeyIds: ['agend', 'endereco', 'upgrade', 'bds'], stuck: { agend: 612, endereco: 318, upgrade: 251, bds: 131 }, costPerCall: 0.12, callsPerMonth: 98000 },
  { id: 'abr', name: 'Portabilidade ABR', health: 'degradada', p95Ms: 2400, failurePct: 6.2, journeyIds: ['portab', 'plano'], stuck: { portab: 86, plano: 12 }, costPerCall: 0.35, callsPerMonth: 41000 },
  { id: 'cliente', name: 'Consulta de cliente', health: 'ok', p95Ms: 410, failurePct: 0.3, journeyIds: JOURNEYS.map((j) => j.id), stuck: {}, costPerCall: 0, callsPerMonth: 340000 },
  { id: 'faturas', name: 'Faturas', health: 'ok', p95Ms: 380, failurePct: 0.1, journeyIds: ['fatura', 'contest', 'cancel'], stuck: {}, costPerCall: 0.02, callsPerMonth: 92000 },
  { id: 'tickets', name: 'Tickets', health: 'ok', p95Ms: 620, failurePct: 0.8, journeyIds: ['chamado', 'bds', 'endereco'], stuck: {}, costPerCall: 0.05, callsPerMonth: 61000 },
];

export interface AlertRule {
  id: string;
  metric: string;
  scope: string;
  comparator: 'abaixo de' | 'acima de';
  threshold: string;
  window: string;
  notify: string;
  via: string;
  firing: boolean;
}

export const INITIAL_RULES: AlertRule[] = [
  { id: 'r1', metric: 'disponibilidade', scope: 'qualquer integração', comparator: 'abaixo de', threshold: '95%', window: '5 minutos', notify: 'o time dono', via: 'Teams', firing: true },
  { id: 'r2', metric: 'sucesso', scope: 'qualquer jornada de Fibra', comparator: 'abaixo de', threshold: '75%', window: '30 minutos', notify: 'o time dono', via: 'Teams', firing: false },
  { id: 'r3', metric: 'tempo p95', scope: 'Portabilidade ABR', comparator: 'acima de', threshold: '2 s', window: '15 minutos', notify: 'Aquisição', via: 'e-mail', firing: false },
];

export const RULE_OPTIONS = {
  metric: ['sucesso', 'taxa de falha', 'tempo p95', 'disponibilidade', 'volume de execuções'],
  scope: ['qualquer jornada', 'qualquer jornada de Fibra', 'qualquer jornada de Móvel', 'qualquer integração', 'Portabilidade', 'Agenda de campo'],
  comparator: ['abaixo de', 'acima de'] as const,
  threshold: ['5%', '75%', '80%', '95%', '2 s', '30% do esperado'],
  window: ['5 minutos', '15 minutos', '30 minutos', '1 hora'],
  notify: ['o time dono', 'Field Ops', 'Aquisição', 'Sustentação N2'],
  via: ['Teams', 'e-mail', 'webhook', 'abertura de chamado'],
};

// ---------------------------------------------------------------- governança

export interface Approval {
  id: string;
  journeyId: string;
  version: number;
  requestedBy: string;
  approver: string;
  waitingHours: number;
}

export const INITIAL_APPROVALS: Approval[] = [
  { id: 'ap1', journeyId: 'cancel', version: 9, requestedBy: 'Bruno', approver: 'Carla', waitingHours: 52 },
  { id: 'ap2', journeyId: 'onboard', version: 5, requestedBy: 'Diego', approver: 'Carla', waitingHours: 49 },
  { id: 'ap3', journeyId: 'wifi', version: 3, requestedBy: 'Elisa', approver: 'Fábio', waitingHours: 20 },
  { id: 'ap4', journeyId: 'linhas', version: 4, requestedBy: 'Gabriela', approver: 'Carla', waitingHours: 6 },
  { id: 'ap5', journeyId: 'contest', version: 3, requestedBy: 'Hugo', approver: 'Fábio', waitingHours: 2 },
];

export const DRAFTS = [
  { name: 'Recarga pré-paga', team: 'Faturamento', idleDays: 2 },
  { name: 'Troca de chip', team: 'Suporte Móvel', idleDays: 41 },
  { name: 'Reativação de linha', team: 'Retenção', idleDays: 33 },
  { name: 'Visita técnica PJ', team: 'Empresas', idleDays: 5 },
  { name: 'Segunda via de boleto PJ', team: 'Empresas', idleDays: 1 },
  { name: 'Mudança de titularidade', team: 'Atendimento', idleDays: 38 },
  { name: 'Agendamento de retirada', team: 'Field Ops', idleDays: 3 },
  { name: 'Contratação de TV', team: 'Aquisição', idleDays: 12 },
  { name: 'Bloqueio por roubo', team: 'Suporte Móvel', idleDays: 4 },
  { name: 'Débito automático', team: 'Faturamento', idleDays: 8 },
  { name: 'Portabilidade PJ', team: 'Empresas', idleDays: 15 },
  { name: 'Ouvidoria', team: 'Atendimento', idleDays: 6 },
];

export const UNPUBLISHED = [
  { name: 'Promoção de verão', activeInstances: 0 },
  { name: 'Troca de plano (antiga)', activeInstances: 14 },
  { name: 'Pesquisa NPS 2025', activeInstances: 0 },
  { name: 'Cadastro de dependente', activeInstances: 3 },
  { name: 'Migração 3G', activeInstances: 0 },
  { name: 'Agendamento piloto', activeInstances: 0 },
  { name: 'Teste de canal App', activeInstances: 0 },
];

export interface OldVersion {
  id: string;
  journeyId: string;
  version: number;
  current: number;
  instances: number;
  oldestDays: number;
}

export const INITIAL_OLD_VERSIONS: OldVersion[] = [
  { id: 'ov1', journeyId: 'portab', version: 6, current: 7, instances: 38, oldestDays: 4 },
  { id: 'ov2', journeyId: 'agend', version: 11, current: 12, instances: 6, oldestDays: 1 },
];

export const AUDIT_FEED = [
  { time: '16:39', text: 'Portabilidade v7 publicada por Ana' },
  { time: '15:02', text: 'Agenda de campo: tempo limite alterado de 5 s para 2 s por Rafael' },
  { time: '11:47', text: 'Cancelamento v9 enviada para aprovação por Bruno' },
  { time: '10:20', text: 'Integração "Faturas": nova tentativa configurada por Ígor' },
  { time: '09:15', text: 'Troca de plano (antiga) despublicada por Fábio' },
];

// ---------------------------------------------------------------- formatação

export const fmtInt = (n: number) => n.toLocaleString('pt-BR');
export const fmtMoney = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil` : `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
export const fmtThousands = (n: number) => `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
