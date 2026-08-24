// Extrator dot-path simples pras opções/paginação do dataSource de um campo de formulário — não é
// JSONPath completo (sem filtro/wildcard), cobre o caso real de uma API devolvendo
// {items: [...], nextCursor: "..."}. Ver decisão registrada em memória de projeto: o backend não
// avalia JSONPath em lugar nenhum hoje (outputMapping do conector REST também é só declarativo),
// então uma lib nova só pra isso seria over-engineering — trocar por uma real é upgrade isolado se
// algum dia precisar de filtro/wildcard.

export interface DataSourceOptionsConfig {
  optionsPath?: string | null;
  labelField?: string | null;
  valueField?: string | null;
  nextCursorPath?: string | null;
}

export interface ExtractedOption {
  label: string;
  value: string;
}

export interface ExtractOptionsResult {
  options: ExtractedOption[];
  nextCursor: string | null;
  error?: string;
}

function getByDotPath(root: unknown, path: string | null | undefined): unknown {
  if (!path) return root;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, root);
}

export function extractOptions(bodyText: string, config: DataSourceOptionsConfig): ExtractOptionsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { options: [], nextCursor: null, error: 'Resposta não é um JSON válido.' };
  }
  const rawOptions = getByDotPath(parsed, config.optionsPath);
  if (!Array.isArray(rawOptions)) {
    return { options: [], nextCursor: null, error: `"${config.optionsPath || '(raiz)'}" não é uma lista.` };
  }
  const labelField = config.labelField || 'label';
  const valueField = config.valueField || 'value';
  const options = rawOptions.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return { label: String(record[labelField] ?? ''), value: String(record[valueField] ?? '') };
  });
  const cursorRaw = getByDotPath(parsed, config.nextCursorPath);
  const nextCursor = cursorRaw == null || cursorRaw === '' ? null : String(cursorRaw);
  return { options, nextCursor };
}
