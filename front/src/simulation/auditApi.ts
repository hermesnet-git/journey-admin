// Só pra registrar, na auditoria do admin/back, que uma simulação foi iniciada — a simulação em si
// roda contra o ms-espec-registry (sem sessão do portal, ver ./api.ts), então isso precisa do
// cliente autenticado normal, não do cliente dedicado ao ms-espec-registry.
import { apiPost } from '../api/client';

export function recordSimulationStart(journeyId: string, journeyName: string, processInstanceId: string): Promise<void> {
  return apiPost<void>('/simulation-audit/started', { journeyId, journeyName, processInstanceId });
}
