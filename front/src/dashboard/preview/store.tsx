import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_OLD_VERSIONS,
  INITIAL_RULES,
  VIEWS,
  type AlertRule,
  type OldVersion,
  type ViewId,
  type Stage,
} from './mockData';

// Estado da prévia. As ações (encerrar versões antigas, ligar regras…) só mudam a tela: nada sai do navegador.
// Abas e painéis montados ficam guardados no navegador; o resto volta ao exemplo ao recarregar.

export type WidgetSize = 1 | 2 | 4;
export interface PlacedWidget {
  uid: string;
  key: string;
  size: WidgetSize;
}
export interface Board {
  id: string;
  name: string;
  widgets: PlacedWidget[];
}

interface Layout {
  addedViews: ViewId[];
  boards: Board[];
  activeTab: string; // 'geral' | ViewId | id de painel
}

const STORAGE_KEY = 'dashboard.preview.layout.v2';

const DEFAULT_LAYOUT: Layout = {
  addedViews: VIEWS.map((view) => view.id),
  boards: [
    {
      id: 'b-sust',
      name: 'Meu painel de sustentação',
      widgets: [
        { uid: 'w1', key: 'governanca.notas', size: 2 },
        { uid: 'w2', key: 'monitoramento.integracoes', size: 2 },
        { uid: 'w3', key: 'governanca.esteira', size: 4 },
      ],
    },
  ],
  activeTab: 'geral',
};

function readLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Layout;
    if (!Array.isArray(parsed.addedViews) || !Array.isArray(parsed.boards)) return DEFAULT_LAYOUT;
    // Painéis salvos antes da remoção das visões 5 a 13: some só o que ficou sem tela, e a
    // Caixa de ações e Fila de aprovação passam a ser as Piores notas de saúde, para o painel continuar com o mesmo desenho.
    return {
      ...parsed,
      addedViews: parsed.addedViews.filter((id) => VIEWS.some((view) => view.id === id)),
      boards: parsed.boards.map((b) => ({ ...b, widgets: b.widgets.map((w) => (w.key === 'acoes.caixa' || w.key === 'governanca.aprovacoes' ? { ...w, key: 'governanca.notas' } : w)) })),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}


interface PreviewState {
  layout: Layout;
  oldVersions: OldVersion[];
  rules: AlertRule[];
  agendaDown: boolean;
  // Recortes que valem para todas as visões que os entendem.
  stage: Stage | null;
}

interface PreviewActions {
  setActiveTab: (tab: string) => void;
  addView: (id: ViewId) => void;
  removeView: (id: ViewId) => void;
  addBoard: (name: string) => string;
  renameBoard: (id: string, name: string) => void;
  removeBoard: (id: string) => void;
  addWidget: (boardId: string, key: string, size: WidgetSize, beforeUid?: string | null) => void;
  removeWidget: (boardId: string, uid: string) => void;
  resizeWidget: (boardId: string, uid: string) => void;
  moveWidget: (boardId: string, uid: string, beforeUid: string | null) => void;
  resetLayout: () => void;
  terminateOldVersion: (oldVersionId: string) => void;
  recoverAgenda: () => void;
  addRule: (rule: Omit<AlertRule, 'id' | 'firing'>) => void;
  removeRule: (id: string) => void;
  setStage: (stage: Stage | null) => void;
}

const Ctx = createContext<(PreviewState & PreviewActions) | null>(null);

export function usePreviewStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePreviewStore fora do PreviewStoreProvider');
  return ctx;
}

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const nextSize = (size: WidgetSize): WidgetSize => (size === 1 ? 2 : size === 2 ? 4 : 1);

export function PreviewStoreProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayout] = useState<Layout>(readLayout);
  const [oldVersions, setOldVersions] = useState(INITIAL_OLD_VERSIONS);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [agendaDown, setAgendaDown] = useState(true);
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // sem armazenamento: o layout vale só até recarregar
    }
  }, [layout]);

  const updateBoard = useCallback((boardId: string, fn: (b: Board) => Board) => {
    setLayout((l) => ({ ...l, boards: l.boards.map((b) => (b.id === boardId ? fn(b) : b)) }));
  }, []);

  const actions: PreviewActions = useMemo(
    () => ({
      setActiveTab: (tab) => setLayout((l) => ({ ...l, activeTab: tab })),
      addView: (id) => setLayout((l) => (l.addedViews.includes(id) ? l : { ...l, addedViews: VIEWS.map((x) => x.id).filter((x) => x === id || l.addedViews.includes(x)), activeTab: id })),
      removeView: (id) => setLayout((l) => ({ ...l, addedViews: l.addedViews.filter((x) => x !== id), activeTab: l.activeTab === id ? 'geral' : l.activeTab })),
      addBoard: (name) => {
        const id = uid('b');
        setLayout((l) => ({ ...l, boards: [...l.boards, { id, name, widgets: [] }], activeTab: id }));
        return id;
      },
      renameBoard: (id, name) => updateBoard(id, (b) => ({ ...b, name })),
      removeBoard: (id) => setLayout((l) => ({ ...l, boards: l.boards.filter((b) => b.id !== id), activeTab: l.activeTab === id ? 'geral' : l.activeTab })),
      addWidget: (boardId, key, size, beforeUid) =>
        updateBoard(boardId, (b) => {
          const w = { uid: uid('w'), key, size };
          const at = beforeUid ? b.widgets.findIndex((x) => x.uid === beforeUid) : -1;
          return { ...b, widgets: at < 0 ? [...b.widgets, w] : [...b.widgets.slice(0, at), w, ...b.widgets.slice(at)] };
        }),
      removeWidget: (boardId, wid) => updateBoard(boardId, (b) => ({ ...b, widgets: b.widgets.filter((w) => w.uid !== wid) })),
      resizeWidget: (boardId, wid) => updateBoard(boardId, (b) => ({ ...b, widgets: b.widgets.map((w) => (w.uid === wid ? { ...w, size: nextSize(w.size) } : w)) })),
      moveWidget: (boardId, wid, beforeUid) =>
        updateBoard(boardId, (b) => {
          const moving = b.widgets.find((w) => w.uid === wid);
          if (!moving || wid === beforeUid) return b;
          const rest = b.widgets.filter((w) => w.uid !== wid);
          const at = beforeUid ? rest.findIndex((w) => w.uid === beforeUid) : -1;
          if (at < 0) return { ...b, widgets: [...rest, moving] };
          return { ...b, widgets: [...rest.slice(0, at), moving, ...rest.slice(at)] };
        }),
      resetLayout: () => setLayout(DEFAULT_LAYOUT),
      terminateOldVersion: (id) => {
        setOldVersions((o) => o.filter((x) => x.id !== id));
      },
      recoverAgenda: () => {
        setAgendaDown(false);
        setRules((rs) => rs.map((r) => ({ ...r, firing: false })));
      },
      addRule: (rule) => setRules((rs) => [...rs, { ...rule, id: uid('r'), firing: false }]),
      removeRule: (id) => setRules((rs) => rs.filter((r) => r.id !== id)),
      setStage,
    }),
    [updateBoard],
  );

  const value = { layout, oldVersions, rules, agendaDown, stage, ...actions };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
