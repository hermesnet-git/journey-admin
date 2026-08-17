// Só pra registrar, na auditoria do admin/back, que uma execução foi iniciada — a execução em si
// roda contra o ms-espec-registry (sem sessão do portal, ver ./api.ts), então isso precisa do
// cliente autenticado normal, não do cliente dedicado ao ms-espec-registry.
import { apiPost } from '../api/client';

export function recordExecutionStart(journeyId: string, journeyName: string, processInstanceId: string): Promise<void> {
  return apiPost<void>('/execution-audit/started', { journeyId, journeyName, processInstanceId });
}
