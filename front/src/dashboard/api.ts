// Dashboard é uma funcionalidade do admin/back (não da Execução) — usa o mesmo cliente autenticado
// do resto do portal, não o cliente à parte do ms-espec-registry.
import { apiDelete, apiGet, ApiClientError } from '../api/client';

export interface DashboardKpis {
  runningInstances: number;
  pendingTasks: number;
  openIncidents: number;
  deployedJourneys: number;
  completedToday: number;
}

export interface ProcessDefinitionStat {
  definitionId: string;
  key: string;
  name: string;
  version: number;
  instances: number;
  incidents: number;
  failedJobs: number;
}

export interface IncidentEntry {
  id: string;
  processInstanceId: string;
  processDefinitionName: string;
  activityId: string | null;
  incidentType: string;
  message: string | null;
  timestamp: string;
}

export interface InstanceEntry {
  id: string;
  processDefinitionName: string;
  businessKey: string | null;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  state: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'EXTERNALLY_TERMINATED' | 'INTERNALLY_TERMINATED' | string;
}

export interface DailyCount {
  date: string;
  started: number;
  completed: number;
}

export interface HourlyCount {
  hour: string;
  started: number;
  completed: number;
}

export interface DashboardTrend {
  day: HourlyCount[];
  week: DailyCount[];
  month: DailyCount[];
}

export type TrendGranularity = keyof DashboardTrend;

export interface DashboardOverview {
  kpis: DashboardKpis;
  processDefinitions: ProcessDefinitionStat[];
  incidents: IncidentEntry[];
  // Mesmo formato de dado, ordenado ao contrário: pendingInstances (mais antigas primeiro) ajuda a
  // achar candidatas a abandonadas; executingRecently (mais novas primeiro) é o que está rodando agora.
  pendingInstances: InstanceEntry[];
  executingRecently: InstanceEntry[];
  // Diferente das duas acima: não filtra só ativas — são as últimas 10 de qualquer estado, o que
  // alimenta o card "Execuções recentes" (link pra Execução & Diagnóstico).
  recentInstances: InstanceEntry[];
  trend: DashboardTrend;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>('/dashboard/overview');
}

export function terminateInstance(processInstanceId: string): Promise<void> {
  return apiDelete<void>(`/dashboard/instances/${processInstanceId}`);
}

/** Busca por processInstanceId OU business key digitado à mão no card "Execuções recentes" (o
 * backend tenta os dois — business key é o único identificador que a própria UI mostra em algum
 * lugar). null (não erro) quando não acha de nenhum jeito, pra distinguir "não achei" de uma falha
 * de verdade. */
export async function findInstance(idOrBusinessKey: string): Promise<InstanceEntry | null> {
  try {
    return await apiGet<InstanceEntry>(`/dashboard/instances/${encodeURIComponent(idOrBusinessKey)}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) return null;
    throw e;
  }
}
