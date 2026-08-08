import { apiGet, apiPost } from './client';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  role: Role;
}

export function login(username: string, password: string): Promise<AuthSession> {
  return apiPost<AuthSession>('/auth/login', { username, password });
}

export function logout(): Promise<void> {
  return apiPost<void>('/auth/logout');
}

export function getCurrentUser(): Promise<AuthSession> {
  return apiGet<AuthSession>('/auth/me');
}
