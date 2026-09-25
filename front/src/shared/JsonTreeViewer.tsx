import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Search, X } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { highlightText } from './textHighlight';

// Paleta mínima que cada tela já tem no seu próprio sistema de tema (skinVars da Mística em
// execution/diagnostics, AppColors em journeys/, FlowColors no flow-designer) — o viewer nunca
// hardcoda cor, só recebe o mapeamento do chamador, pra caber nos três sistemas de tema convivendo
// no app sem criar um quarto. `surface` é o fundo do modal/card que envolve a árvore (distinto do
// fundo "recuado" do campo de busca e da caixa da árvore) — usado só por shared/JsonModal.
export interface JsonViewerColors {
  surface: string;
  background: string;
  backgroundAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  keyColor: string;
  stringColor: string;
  numberColor: string;
}

// Mapeamento pronto pra qualquer tela que já usa skinVars (execution/, diagnostics/) — mesmos papéis
// de cor usados no resto dessas telas (brand pra chave, success pra string, warning pra número).
export const skinVarsJsonColors: JsonViewerColors = {
  surface: skinVars.colors.backgroundContainer,
  background: skinVars.colors.background,
  backgroundAlt: skinVars.colors.backgroundAlternative,
  border: skinVars.colors.border,
  textPrimary: skinVars.colors.textPrimary,
  textSecondary: skinVars.colors.textSecondary,
  keyColor: skinVars.colors.brand,
  stringColor: skinVars.colors.success,
  numberColor: skinVars.colors.warning,
};

const MATCH_ROW_BG = 'rgba(249, 115, 22, 0.16)';

function matchId(instanceId: string, path: string) {
  return `json-match-${instanceId}-${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Caminha o JSON na mesma ordem em que a árvore renderiza (chaves de objeto na ordem de inserção,
// itens de array por índice) e registra o `path` de cada nó cujo nome de propriedade OU valor
// primitivo contém a busca — usado tanto pra contar/navegar resultados quanto pra saber quais
// containers precisam abrir sozinhos pra revelar um match escondido.
function collectMatches(value: unknown, query: string, path: string, keyLabel: string | undefined, out: string[]) {
  const matchesHere =
    (keyLabel !== undefined && keyLabel.toLowerCase().includes(query)) ||
    (value !== null && value !== undefined && typeof value !== 'object' && String(value).toLowerCase().includes(query));
  if (matchesHere) out.push(path);
  if (value !== null && typeof value === 'object') {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    for (const [k, v] of entries) {
      collectMatches(v, query, Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`, k, out);
    }
  }
}

function JsonNode({
  value,
  keyLabel,
  path,
  depth,
  query,
  matchPaths,
  matchIndexByPath,
  activePath,
  instanceId,
  colors,
}: {
  value: unknown;
  keyLabel?: string;
  path: string;
  depth: number;
  query: string;
  matchPaths: string[];
  matchIndexByPath: Map<string, number>;
  activePath?: string;
  instanceId: string;
  colors: JsonViewerColors;
}) {
  const [open, setOpen] = useState(true);
  const isMatch = matchIndexByPath.has(path);
  const isActive = path === activePath;
  const rowId = isMatch ? matchId(instanceId, path) : undefined;
  const rowStyle = isActive ? { background: MATCH_ROW_BG, borderRadius: 4 } : undefined;
  const keyNode =
    keyLabel !== undefined ? <span style={{ color: colors.keyColor }}>{highlightText(`"${keyLabel}"`, query, isActive)}</span> : null;

  if (value === null || value === undefined) {
    return (
      <div id={rowId} style={{ paddingLeft: depth * 14 + 14, ...rowStyle }}>
        {keyNode}
        {keyNode && ': '}
        <span style={{ color: colors.textSecondary, fontStyle: 'italic' }}>null</span>
      </div>
    );
  }

  if (typeof value !== 'object') {
    const isString = typeof value === 'string';
    return (
      <div id={rowId} style={{ paddingLeft: depth * 14 + 14, ...rowStyle }}>
        {keyNode}
        {keyNode && ': '}
        <span style={{ color: isString ? colors.stringColor : colors.numberColor }}>
          {isString ? <>"{highlightText(String(value), query, isActive)}"</> : highlightText(String(value), query, isActive)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
  const [openBrace, closeBrace] = isArray ? ['[', ']'] : ['{', '}'];
  const hasDescendantMatch = query !== '' && matchPaths.some((p) => p !== path && (p.startsWith(`${path}.`) || p.startsWith(`${path}[`)));
  const effectiveOpen = open || hasDescendantMatch;

  if (entries.length === 0) {
    return (
      <div id={rowId} style={{ paddingLeft: depth * 14 + 14, ...rowStyle }}>
        {keyNode}
        {keyNode && ': '}
        <span style={{ color: colors.textSecondary }}>
          {openBrace}
          {closeBrace}
        </span>
      </div>
    );
  }

  return (
    <div id={rowId} style={rowStyle}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-start gap-1 w-full text-left border-0 bg-transparent cursor-pointer p-0"
        style={{ paddingLeft: depth * 14, fontFamily: 'inherit' }}
      >
        {effectiveOpen ? (
          <ChevronDown size={11} style={{ marginTop: 3, color: colors.textSecondary }} />
        ) : (
          <ChevronRight size={11} style={{ marginTop: 3, color: colors.textSecondary }} />
        )}
        <span>
          {keyNode}
          {keyNode && ': '}
          <span style={{ color: colors.textSecondary }}>
            {openBrace}
            {!effectiveOpen && ` ${entries.length} ${isArray ? 'itens' : 'chaves'} `}
            {!effectiveOpen && closeBrace}
          </span>
        </span>
      </button>
      {effectiveOpen && (
        <>
          {entries.map(([k, v]) => (
            <JsonNode
              key={k}
              value={v}
              keyLabel={isArray ? undefined : k}
              path={isArray ? `${path}[${k}]` : `${path}.${k}`}
              depth={depth + 1}
              query={query}
              matchPaths={matchPaths}
              matchIndexByPath={matchIndexByPath}
              activePath={activePath}
              instanceId={instanceId}
              colors={colors}
            />
          ))}
          <div style={{ paddingLeft: depth * 14 + 14, color: colors.textSecondary }}>{closeBrace}</div>
        </>
      )}
    </div>
  );
}

let nextInstanceId = 0;

// Busca + árvore JSON recolhível — o "mesmo formato" reaproveitado em toda tela que lista JSON
// (Log de execução, snapshot de publicação/versão de jornada, e outras que vierem a usar):
// preenche a altura do pai (`h-full flex flex-col`), busca com contador e navegação Enter/Shift+Enter
// igual à busca da lista de log, e auto-expande só os containers no caminho de um resultado.
export function JsonTreeViewer({
  data,
  colors,
  searchPlaceholder = 'Buscar no JSON...',
}: {
  data: unknown;
  colors: JsonViewerColors;
  searchPlaceholder?: string;
}) {
  const [instanceId] = useState(() => String(nextInstanceId++));
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const q = query.trim().toLowerCase();
  const matchPaths = useMemo(() => {
    if (!q) return [] as string[];
    const out: string[] = [];
    collectMatches(data, q, 'root', undefined, out);
    return out;
  }, [data, q]);
  const matchIndexByPath = useMemo(() => new Map(matchPaths.map((p, i) => [p, i])), [matchPaths]);
  const wrappedIndex = matchPaths.length > 0 ? ((activeIndex % matchPaths.length) + matchPaths.length) % matchPaths.length : 0;
  const activePath = matchPaths[wrappedIndex];

  useEffect(() => setActiveIndex(0), [q]);

  useEffect(() => {
    if (!activePath) return;
    requestAnimationFrame(() => {
      document.getElementById(matchId(instanceId, activePath))?.scrollIntoView({ block: 'center' });
    });
  }, [activePath, instanceId]);

  function nav(delta: number) {
    if (matchPaths.length === 0) return;
    setActiveIndex((i) => i + delta);
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 flex items-center gap-2 pb-2">
        <div className="relative flex-1 min-w-0 max-w-[280px]">
          <Search
            size={12.5}
            color={colors.textSecondary}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              nav(e.shiftKey ? -1 : 1);
            }}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="w-full h-7 box-border rounded-md outline-none"
            style={{
              padding: query ? '0 24px 0 26px' : '0 8px 0 26px',
              fontSize: 12.5,
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.textPrimary,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Limpar busca"
              className="cursor-pointer border-0 bg-transparent flex items-center justify-center"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }}
            >
              <X size={13} />
            </button>
          )}
        </div>
        {query && (
          <>
            <span style={{ fontSize: 11.5, color: colors.textSecondary }}>
              {matchPaths.length > 0 ? `${wrappedIndex + 1}/${matchPaths.length}` : '0/0'}
            </span>
            <button
              type="button"
              onClick={() => nav(-1)}
              disabled={matchPaths.length === 0}
              title="Resultado anterior (Shift+Enter)"
              className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
              style={{ color: colors.textSecondary, background: 'transparent' }}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => nav(1)}
              disabled={matchPaths.length === 0}
              title="Próximo resultado (Enter)"
              className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
              style={{ color: colors.textSecondary, background: 'transparent' }}
            >
              <ChevronDown size={14} />
            </button>
          </>
        )}
      </div>
      <div
        className="flex-1 min-h-0 overflow-auto rounded-lg p-3"
        style={{
          background: colors.backgroundAlt,
          border: `1px solid ${colors.border}`,
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <JsonNode
          value={data}
          path="root"
          depth={0}
          query={q}
          matchPaths={matchPaths}
          matchIndexByPath={matchIndexByPath}
          activePath={activePath}
          instanceId={instanceId}
          colors={colors}
        />
      </div>
    </div>
  );
}
