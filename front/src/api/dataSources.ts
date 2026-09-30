import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Fonte de dados de referência do catálogo de integrações (ADR-002): consulta REST GET que uma tela
// declara e o serviço de telas executa ao montá-la. params = marcadores {nome} da URL.
export interface DataSource {
  dataSourceId: string;
  name: string;
  description: string | null;
  url: string;
  params: string[];
  timeoutMs: number;
  itemsPath: string;
  exposedFields: string[];
  credentialRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataSourceInput {
  name: string;
  description: string | null;
  url: string;
  timeoutMs: number;
  itemsPath: string;
  exposedFields: string[];
  credentialRef: string | null;
}

export interface DataSourceTestResult {
  status: number;
  durationMs: number;
  items: Record<string, unknown>[];
  message: string | null;
}

export function listDataSources(): Promise<DataSource[]> {
  return apiGet('/data-sources');
}

export function createDataSource(input: DataSourceInput): Promise<DataSource> {
  return apiPost('/data-sources', input);
}

export function updateDataSource(id: string, input: DataSourceInput): Promise<DataSource> {
  return apiPut(`/data-sources/${id}`, input);
}

export function deleteDataSource(id: string): Promise<void> {
  return apiDelete(`/data-sources/${id}`);
}

export function testDataSource(id: string, params: Record<string, string>): Promise<DataSourceTestResult> {
  return apiPost(`/data-sources/${id}/test`, { params });
}
