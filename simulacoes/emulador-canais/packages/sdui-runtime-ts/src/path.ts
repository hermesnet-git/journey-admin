import type { BindingNamespace } from '@elastic-journey/sdui-contract';

export interface RuntimeContext {
  form: Record<string, unknown>;
  data: Record<string, unknown>;
  session: Record<string, unknown>;
  route: Record<string, unknown>;
  computed: Record<string, unknown>;
}

const NAMESPACES: ReadonlySet<string> = new Set(['form', 'data', 'session', 'route', 'computed']);
const SAFE_SEGMENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const FORBIDDEN_SEGMENTS: ReadonlySet<string> = new Set(['__proto__', 'prototype', 'constructor']);

export function emptyRuntimeContext(): RuntimeContext {
  return { form: {}, data: {}, session: {}, route: {}, computed: {} };
}

export function parseBindingPath(path: string): [BindingNamespace, ...string[]] | null {
  const parts = path.split('.');
  const namespace = parts.shift();
  if (!namespace || !NAMESPACES.has(namespace) || parts.length === 0) return null;
  if (parts.some((part) => !SAFE_SEGMENT.test(part) || FORBIDDEN_SEGMENTS.has(part))) return null;
  return [namespace as BindingNamespace, ...parts];
}

export function readPath(context: RuntimeContext, path: string): { found: boolean; value: unknown } {
  const parts = parseBindingPath(path);
  if (!parts) return { found: false, value: undefined };
  const [namespace, ...segments] = parts;
  let cursor: unknown = context[namespace];
  for (const segment of segments) {
    if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor) || !Object.hasOwn(cursor, segment)) {
      return { found: false, value: undefined };
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return { found: true, value: cursor };
}

export function writePath(context: RuntimeContext, path: string, value: unknown): boolean {
  const parts = parseBindingPath(path);
  if (!parts) return false;
  const [namespace, ...segments] = parts;
  let cursor = context[namespace];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!segment) return false;
    const next = cursor[segment];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cursor[segment] = {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const leaf = segments.at(-1);
  if (!leaf) return false;
  cursor[leaf] = value;
  return true;
}

