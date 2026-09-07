import { readPath, type RuntimeContext } from './path.js';

const PLACEHOLDER = /\{\{\s*((?:form|data|session|route|computed)\.[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*)\s*\}\}/g;

export function interpolateText(text: string, context: RuntimeContext, missingValue = ''): string {
  return text.replace(PLACEHOLDER, (_placeholder, path: string) => {
    const resolved = readPath(context, path);
    if (!resolved.found || resolved.value == null) return missingValue;
    if (typeof resolved.value === 'object') return missingValue;
    return String(resolved.value);
  });
}

