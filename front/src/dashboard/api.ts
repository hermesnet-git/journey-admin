// Dashboard é uma funcionalidade do admin/back (não da Simulação) — usa o mesmo cliente autenticado
// do resto do portal, não o cliente à parte do ms-espec-registry.
import { apiDelete, apiGet } from '../api/client';

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
  trend: DashboardTrend;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>('/dashboard/overview');
}

export function terminateInstance(processInstanceId: string): Promise<void> {
  return apiDelete<void>(`/dashboard/instances/${processInstanceId}`);
}
