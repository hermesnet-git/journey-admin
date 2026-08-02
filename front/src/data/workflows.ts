export type WorkflowStatus = 'draft' | 'review' | 'published';
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'paused';
export type StepStatus = 'completed' | 'failed' | 'running';

export interface ExecutionStep {
  name: string;
  status: StepStatus;
  duration: string;
  error?: string;
}

export interface Execution {
  id: string;
  startedAt: string;
  duration: string;
  status: ExecutionStatus;
  owner: string;
  steps: ExecutionStep[];
}

export interface ExecutionStats {
  processing: number;
  completed: number;
  errors: number;
  paused: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  owner: string;
  lastRun: string;
  avgDuration: string;
  tasksCount: number;
  executionStats?: ExecutionStats;
  executions: Execution[];
}

export const EXEC_STATUS_META: Record<ExecutionStatus, { label: string; fg: string; bg: string; border: string }> = {
  running: { label: 'Em execução', fg: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  completed: { label: 'Concluído', fg: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  failed: { label: 'Falhou', fg: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  paused: { label: 'Pausado', fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
};

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, { label: string; fg: string; bg: string; border: string }> = {
  draft: { label: 'Rascunho', fg: '#71717a', bg: '#f4f4f5', border: '#e4e4e7' },
  review: { label: 'Em Aprovação', fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  published: { label: 'Publicado', fg: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
};

export const AGG_META: Record<keyof ExecutionStats, { label: string; fg: string; bg: string }> = {
  processing: { label: 'Em processamento', fg: '#1d4ed8', bg: '#eff6ff' },
  completed: { label: 'Concluídas', fg: '#15803d', bg: '#f0fdf4' },
  errors: { label: 'Erros', fg: '#b91c1c', bg: '#fef2f2' },
  paused: { label: 'Pausadas', fg: '#b45309', bg: '#fffbeb' },
};

export const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'w1', name: 'Onboarding de Colaborador', description: 'Admissão de novos funcionários',
    status: 'published', owner: 'Ana Souza', lastRun: 'Hoje, 09:12', avgDuration: '6m 40s', tasksCount: 3,
    executionStats: { processing: 34, completed: 12480, errors: 96, paused: 8 },
    executions: [
      { id: 'w1e1', startedAt: 'Hoje, 09:12', duration: '6m 40s', status: 'completed', owner: 'Ana Souza',
        steps: [ { name: 'Dados pessoais', status: 'completed', duration: '1m 10s' }, { name: 'Documentos', status: 'completed', duration: '3m 05s' }, { name: 'Aprovação do gestor', status: 'completed', duration: '2m 25s' } ] },
      { id: 'w1e2', startedAt: 'Ontem, 14:03', duration: '8m 12s', status: 'completed', owner: 'Carlos Lima',
        steps: [ { name: 'Dados pessoais', status: 'completed', duration: '1m 40s' }, { name: 'Documentos', status: 'completed', duration: '4m 02s' }, { name: 'Aprovação do gestor', status: 'completed', duration: '2m 30s' } ] },
      { id: 'w1e3', startedAt: '15 jul, 11:20', duration: '2m 51s', status: 'failed', owner: 'Marina Alves',
        steps: [ { name: 'Dados pessoais', status: 'completed', duration: '1m 05s' }, { name: 'Documentos', status: 'failed', duration: '1m 46s', error: 'Falha ao validar formato do arquivo enviado (PDF esperado).' }, { name: 'Aprovação do gestor', status: 'completed', duration: '—' } ] },
    ],
  },
  {
    id: 'w2', name: 'Aprovação de Reembolso', description: 'Reembolso de despesas de colaboradores',
    status: 'published', owner: 'Carlos Lima', lastRun: 'Hoje, 08:40', avgDuration: '4m 12s', tasksCount: 3,
    executionStats: { processing: 21, completed: 8340, errors: 142, paused: 3 },
    executions: [
      { id: 'w2e1', startedAt: 'Hoje, 08:40', duration: '1m 55s', status: 'failed', owner: 'Carlos Lima',
        steps: [ { name: 'Dados da despesa', status: 'completed', duration: '0m 40s' }, { name: 'Comprovante', status: 'failed', duration: '1m 15s', error: 'Falha ao validar CNPJ do fornecedor na nota fiscal.' }, { name: 'Decisão financeira', status: 'completed', duration: '—' } ] },
      { id: 'w2e2', startedAt: 'Ontem, 17:22', duration: '5m 03s', status: 'completed', owner: 'Marina Alves',
        steps: [ { name: 'Dados da despesa', status: 'completed', duration: '0m 50s' }, { name: 'Comprovante', status: 'completed', duration: '2m 30s' }, { name: 'Decisão financeira', status: 'completed', duration: '1m 43s' } ] },
      { id: 'w2e3', startedAt: '14 jul, 09:00', duration: '5m 38s', status: 'completed', owner: 'Ana Souza',
        steps: [ { name: 'Dados da despesa', status: 'completed', duration: '1m 00s' }, { name: 'Comprovante', status: 'completed', duration: '2m 50s' }, { name: 'Decisão financeira', status: 'completed', duration: '1m 48s' } ] },
    ],
  },
  {
    id: 'w3', name: 'Abertura de Chamado de TI', description: 'Solicitação de suporte técnico',
    status: 'draft', owner: 'Equipe de Suporte', lastRun: '—', avgDuration: '—', tasksCount: 3,
    executions: [],
  },
  {
    id: 'w4', name: 'Solicitação de Compra', description: 'Requisição de compra de materiais',
    status: 'review', owner: 'Marina Alves', lastRun: '12 jul, 10:15', avgDuration: '4m 50s', tasksCount: 3,
    executions: [
      { id: 'w4e1', startedAt: '12 jul, 10:15', duration: '4m 50s', status: 'completed', owner: 'Marina Alves',
        steps: [ { name: 'Item solicitado', status: 'completed', duration: '1m 20s' }, { name: 'Justificativa', status: 'completed', duration: '2m 00s' }, { name: 'Aprovação de compra', status: 'completed', duration: '1m 30s' } ] },
    ],
  },
];
