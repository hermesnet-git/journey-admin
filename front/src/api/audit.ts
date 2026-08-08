import { apiGet } from './client';

export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditEvent {
  auditEventId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: AuditResult;
  correlationId: string | null;
  previousValue: string | null;
  newValue: string | null;
  occurredAt: string;
}

export interface AuditEventPage {
  items: AuditEvent[];
  totalElements: number;
  page: number;
  size: number;
}

export interface AuditEventFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  from?: string;
  to?: string;
  correlationId?: string;
  page?: number;
  size?: number;
}

export function listAuditEvents(filters: AuditEventFilters = {}): Promise<AuditEventPage> {
  const query = new URLSearchParams();
  if (filters.userId) query.set('userId', filters.userId);
  if (filters.action) query.set('action', filters.action);
  if (filters.resourceType) query.set('resourceType', filters.resourceType);
  if (filters.resourceId) query.set('resourceId', filters.resourceId);
  if (filters.result) query.set('result', filters.result);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.correlationId) query.set('correlationId', filters.correlationId);
  query.set('page', String(filters.page ?? 0));
  query.set('size', String(filters.size ?? 20));
  return apiGet<AuditEventPage>(`/audit-events?${query.toString()}`);
}
