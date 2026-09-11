// Cliente da funcionalidade de Diagnóstico (FT-15) — busca e detalhe histórico de qualquer
// instância, ativa ou já terminada, via admin/back (porta 8081, InstanceHistoryController
// migrado do antigo ms-espec-registry). Reaproveita o client HTTP de Execução (apiGet: retry,
// autenticação, log de integrações) em vez de duplicá-lo — Diagnóstico depende de Execução, nunca
// o contrário (REQ-15.04.001: funcionalidades separadas, mas o motor por trás é o mesmo).

import { apiGet, type FlowBundle, type NodeIODetail } from '../execution/api';

export interface HistoricInstanceSummary {
  id: string;
  businessKey: string;
  journeyName: string;
  // processDefinitionVersion do Camunda — usado só pra agrupar por versão de jornada na tela
  // Diagnóstico, não é necessariamente o mesmo número da versão de negócio (versionTag).
  version: number | null;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  state: string;
  // Canal (WEB/MOBILE/WHATSAPP) declarado ao iniciar a instância — null pra execuções de antes do
  // conceito multicanal existir.
  channel: string | null;
}

export interface InstanceHistoryResponse {
  processInstanceId: string;
  businessKey: string;
  journeyId: string;
  journeyName: string;
  versionNumber: number | null;
  state: string;
  startTime: string;
  endTime: string | null;
  durationMillis: number | null;
  flow: FlowBundle;
  steps: NodeIODetail[];
}

export interface InstanceHistorySearchFilters {
  journeyId?: string;
  businessKey?: string;
  finished?: boolean;
  // Datas soltas ("AAAA-MM-DD", direto de um <input type="date">) — o backend espera um
  // java.time.Instant completo, então viram início/fim do dia (hora local) antes de ir pra query.
  startedFrom?: string;
  startedTo?: string;
}

function startOfDayInstant(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function endOfDayInstant(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export function searchInstanceHistory(filters: InstanceHistorySearchFilters): Promise<HistoricInstanceSummary[]> {
  const params = new URLSearchParams();
  if (filters.journeyId) params.set('journeyId', filters.journeyId);
  if (filters.businessKey) params.set('businessKey', filters.businessKey);
  if (filters.finished !== undefined) params.set('finished', String(filters.finished));
  if (filters.startedFrom) params.set('startedFrom', startOfDayInstant(filters.startedFrom));
  if (filters.startedTo) params.set('startedTo', endOfDayInstant(filters.startedTo));
  const qs = params.toString();
  return apiGet(`/instances/search${qs ? `?${qs}` : ''}`);
}

export function getInstanceHistory(processInstanceId: string): Promise<InstanceHistoryResponse> {
  return apiGet(`/instances/${processInstanceId}/history`);
}
