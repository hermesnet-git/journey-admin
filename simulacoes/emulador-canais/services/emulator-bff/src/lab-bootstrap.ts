import { randomUUID } from 'node:crypto';

export const LAB_TARGETS = [
  'react.web',
  'react.mobile',
  'flutter.web',
  'flutter.mobile',
] as const;

export type LabTarget = (typeof LAB_TARGETS)[number];

export interface LabBootstrap {
  token: string;
  journeyId: string;
  target: LabTarget;
  variables: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export class LabBootstrapStore {
  private readonly entries = new Map<string, LabBootstrap>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 500) {}

  create(journeyId: string, target: LabTarget, variables: Record<string, unknown>): LabBootstrap {
    this.prune();
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    const now = Date.now();
    const entry: LabBootstrap = {
      token: randomUUID(),
      journeyId,
      target,
      variables: structuredClone(variables),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMs).toISOString(),
    };
    this.entries.set(entry.token, entry);
    return entry;
  }

  get(token: string): LabBootstrap | null {
    this.prune();
    const entry = this.entries.get(token);
    return entry ? { ...entry, variables: structuredClone(entry.variables) } : null;
  }

  private prune(): void {
    const now = Date.now();
    for (const [token, entry] of this.entries) {
      if (Date.parse(entry.expiresAt) <= now) this.entries.delete(token);
    }
  }
}
