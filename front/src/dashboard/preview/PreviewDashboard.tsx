import { useState } from 'react';
import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react';
import { useAppTheme } from '../../shell/theme';
import { STAGES, STAGE_LABEL, VIEWS, VIEW_BY_ID, type Kind, type ViewId } from './mockData';
import { PreviewStoreProvider, usePreviewStore, type Board, type WidgetSize } from './store';
import { Tabs, TextField, usePreviewFonts } from './kit';
import { KIND_COLOR, KindTag, ToastProvider } from './ui';
import { WIDGETS, widgetByKey, type WidgetDef } from './widgets';
import { MapaView } from './views/MapaView';
import { MonitoramentoView } from './views/MonitoramentoView';
import { GovernancaView } from './views/GovernancaView';

export type DashboardVisual = 'atual' | 'novo';

// Interruptor entre o Dashboard de hoje e a prévia do novo visual. Aparece no cabeçalho dos dois.
export function VisualToggle({ value, onChange }: { value: DashboardVisual; onChange: (next: DashboardVisual) => void }) {
  const { dark } = useAppTheme();
  return (
    <div className={`dpv${dark ? ' dark' : ''}`} style={{ background: 'transparent', display: 'inline-flex' }}>
      <div className="seg" role="group" aria-label="Visual do Dashboard">
        <button type="button" className={value === 'atual' ? 'on' : ''} aria-pressed={value === 'atual'} onClick={() => onChange('atual')}>
          Visual atual
        </button>
        <button type="button" className={value === 'novo' ? 'on' : ''} aria-pressed={value === 'novo'} onClick={() => onChange('novo')}>
          Novo visual (prévia)
        </button>
      </div>
    </div>
  );
}

const DRAG_KEY = 'text/x-dash-widget-key';
const DRAG_UID = 'text/x-dash-widget-uid';

function renderView(id: ViewId) {
  switch (id) {
    case 'mapa':
      return <MapaView />;
    case 'monitoramento':
      return <MonitoramentoView />;
    case 'governanca':
      return <GovernancaView />;
  }
}

// ---------------------------------------------------------------- cartão de widget

function WidgetCard({
  def,
  size,
  onNavigate,
  edit,
}: {
  def: WidgetDef;
  size: WidgetSize;
  onNavigate: (tab: string) => void;
  edit?: { uid: string; onRemove: () => void; onResize: () => void; onDropBefore: (e: React.DragEvent) => void };
}) {
  const [over, setOver] = useState(false);
  const iconBtn: React.CSSProperties = { border: 0, background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex', color: 'var(--muted)' };
  return (
    <div
      style={{ gridColumn: `span ${size}`, minWidth: 0, outline: over ? '2px dashed var(--accent)' : 'none', outlineOffset: 3, borderRadius: 12 }}
      onDragOver={edit ? (e) => (e.preventDefault(), setOver(true)) : undefined}
      onDragLeave={edit ? () => setOver(false) : undefined}
      onDrop={
        edit
          ? (e) => {
              setOver(false);
              edit.onDropBefore(e);
            }
          : undefined
      }
    >
      <div className="w" style={{ height: '100%', gap: 12 }}>
        <div
          draggable={!!edit}
          onDragStart={edit ? (e) => e.dataTransfer.setData(DRAG_UID, edit.uid) : undefined}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', cursor: edit ? 'grab' : 'default' }}
        >
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {edit && <GripVertical size={14} color="var(--muted)" />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{def.title}</span>
            {def.kind && <KindTag kind={def.kind} />}
          </span>
          {edit && (
            <span style={{ display: 'inline-flex', gap: 2 }}>
              <button type="button" style={iconBtn} onClick={edit.onResize} title="Mudar a largura (1, 2 ou 4 colunas)" aria-label="Mudar a largura">
                {size === 4 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button type="button" style={iconBtn} onClick={edit.onRemove} title="Tirar do painel" aria-label="Tirar do painel">
                <X size={15} />
              </button>
            </span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>{def.render({ onNavigate })}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- visão geral

function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { layout } = usePreviewStore();
  const added = new Set<string>(['geral', ...layout.addedViews]);
  const keys: [string, WidgetSize][] = [
    ['geral.kpis', 4],
    ['mapa.treemap', 4],
    ['geral.ciclo', 2],
    ['governanca.aprovacoes', 2],
    ['monitoramento.integracoes', 4],
    ['geral.ranking', 4],
  ];
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      {keys
        .map(([k, size]) => [widgetByKey(k), size] as const)
        .filter(([def]) => def && added.has(def.source))
        .map(([def, size]) => (
          <WidgetCard key={def!.key} def={def!} size={size} onNavigate={onNavigate} />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------- montador de painel

function BoardEditor({ board, onNavigate }: { board: Board; onNavigate: (tab: string) => void }) {
  const store = usePreviewStore();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board.name);
  const [endOver, setEndOver] = useState(false);
  const available = WIDGETS.filter((w) => w.source === 'geral' || store.layout.addedViews.includes(w.source as ViewId));
  const groups: { title: string; kind: Kind | null; items: WidgetDef[] }[] = [
    { title: 'Indicadores gerais', kind: null, items: available.filter((w) => w.source === 'geral') },
    ...store.layout.addedViews.map((id) => ({ title: VIEW_BY_ID[id].title, kind: VIEW_BY_ID[id].kind, items: available.filter((w) => w.source === id) })),
  ].filter((g) => g.items.length > 0);

  const dropAt = (e: React.DragEvent, beforeUid: string | null) => {
    e.preventDefault();
    const key = e.dataTransfer.getData(DRAG_KEY);
    const moving = e.dataTransfer.getData(DRAG_UID);
    if (key) {
      const def = widgetByKey(key);
      if (def) store.addWidget(board.id, key, def.size, beforeUid);
    } else if (moving) {
      store.moveWidget(board.id, moving, beforeUid);
    }
  };

  return (
    <div className="frame">
      <div className="fbar">
        {renaming ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 260 }}>
              <TextField name="nome-painel" label="Nome do painel" value={name} onChangeValue={setName} />
            </div>
            <button
              type="button"
              className="btn primary"
              disabled={!name.trim()}
              onClick={() => {
                store.renameBoard(board.id, name.trim());
                setRenaming(false);
              }}
            >
              Salvar
            </button>
            <button
              type="button"
              className="btn link"
              onClick={() => {
                setName(board.name);
                setRenaming(false);
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="title">
            {board.name} <small>· painel montado por você · {board.widgets.length} widgets</small>
          </div>
        )}
        <div className="actions">
          {!renaming && (
            <button type="button" className="btn" onClick={() => setRenaming(true)}>
              Renomear
            </button>
          )}
          <button type="button" className="btn danger" onClick={() => store.removeBoard(board.id)}>
            Excluir painel
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)' }}>
        <aside style={{ borderRight: '1px solid var(--line)', padding: 14, display: 'grid', gap: 8, alignContent: 'start', background: 'var(--surface-2)' }}>
          <span className="lbl">Widgets</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Arraste para a grade ou clique. Só aparecem os das visões adicionadas.</span>
          {groups.map((g) => (
            <div key={g.title} style={{ display: 'grid', gap: 4, marginTop: 6 }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="lbl">{g.title}</span>
                {g.kind && <KindTag kind={g.kind} />}
              </span>
              {g.items.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_KEY, w.key)}
                  onClick={() => store.addWidget(board.id, w.key, w.size)}
                  title="Clique para adicionar ou arraste para a grade"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '16px 1fr',
                    gap: 6,
                    alignItems: 'center',
                    padding: 6,
                    borderRadius: 8,
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: 'var(--ink)',
                    cursor: 'grab',
                    textAlign: 'left',
                    font: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <GripVertical size={13} color="var(--muted)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{w.title}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div
          style={{
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            alignContent: 'start',
            backgroundImage: 'radial-gradient(var(--grid) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            minWidth: 0,
          }}
        >
          {board.widgets.map((w) => {
            const def = widgetByKey(w.key);
            if (!def) return null;
            return (
              <WidgetCard
                key={w.uid}
                def={def}
                size={w.size}
                onNavigate={onNavigate}
                edit={{
                  uid: w.uid,
                  onRemove: () => store.removeWidget(board.id, w.uid),
                  onResize: () => store.resizeWidget(board.id, w.uid),
                  onDropBefore: (e) => dropAt(e, w.uid),
                }}
              />
            );
          })}
          <div
            onDragOver={(e) => (e.preventDefault(), setEndOver(true))}
            onDragLeave={() => setEndOver(false)}
            onDrop={(e) => {
              setEndOver(false);
              dropAt(e, null);
            }}
            style={{
              gridColumn: 'span 4',
              minHeight: 120,
              border: '2px dashed var(--accent)',
              background: endOver ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--accent-soft) 60%, transparent)',
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--accent)',
              fontWeight: 600,
              padding: 18,
            }}
          >
            <span>
              {board.widgets.length ? 'Solte aqui · vai para o fim do painel' : 'Painel vazio · arraste widgets da lista ao lado para cá'}
              <br />
              <span style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--muted)' }}>Herda os recortes do topo</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- adicionar visão

function AddViewPanel({ onClose }: { onClose: () => void }) {
  const { layout, addView, removeView } = usePreviewStore();
  const column = (kind: Kind) => (
    <div
      style={{
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10,
        alignContent: 'start',
        background: kind === 'negocio' ? 'var(--biz-soft)' : 'var(--ops-soft)',
      }}
    >
      <h3 style={{ fontSize: 17, color: kind === 'negocio' ? 'var(--biz)' : 'var(--ops)' }}>{kind === 'negocio' ? 'Negócio' : 'Sustentação'}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
        {kind === 'negocio' ? 'Dono de produto, gestor, diretoria. As jornadas estão entregando resultado?' : 'Suporte, operação, administradores. O que está quebrado e o que preciso fazer?'}
      </p>
      {VIEWS.filter((view) => view.kind === kind).map((view) => {
        const added = layout.addedViews.includes(view.id);
        return (
          <div
            key={view.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '26px 1fr auto',
              gap: 8,
              alignItems: 'start',
              background: 'var(--surface)',
              borderRadius: 10,
              padding: '9px 10px',
              fontSize: 13.5,
              border: `1px solid ${added ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            <span style={{ fontFamily: 'var(--f-data)', fontSize: 12, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 5, textAlign: 'center', lineHeight: '20px' }}>
              {view.num}
            </span>
            <span>
              {view.title}
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>{view.summary}</small>
            </span>
            {added ? (
              <button type="button" className="btn link" onClick={() => removeView(view.id)}>
                Remover
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => addView(view.id)}>
                Adicionar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="frame">
      <div className="fbar">
        <div className="title">
          Visões disponíveis <small>· cada visão adicionada vira uma aba e libera os seus widgets</small>
        </div>
        <button type="button" className="btn link" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="fbody" style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        {column('negocio')}
        {column('sustentacao')}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- recortes

function FilterBar() {
  const { stage, setStage } = usePreviewStore();
  return (
    <div className="frame" style={{ boxShadow: 'none' }}>
      <div className="chips" style={{ borderBottom: 0 }}>
        <span className="lbl">Recortes</span>
        <span className="chip on" style={{ cursor: 'default' }}>
          <em>Período</em> Últimos 7 dias
        </span>
        <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
        <span className="lbl">Etapa do ciclo</span>
        <button type="button" className={`chip${stage === null ? ' on' : ''}`} onClick={() => setStage(null)}>
          Todas
        </button>
        {STAGES.map((st) => (
          <button key={st.id} type="button" className={`chip${stage === st.id ? ' on' : ''}`} onClick={() => setStage(stage === st.id ? null : st.id)}>
            {st.label}
          </button>
        ))}
      </div>
      {stage && (
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'var(--muted)' }}>
          Etapa {STAGE_LABEL[stage]}: vale para o Mapa do portfólio e o ranking.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- página

function PreviewContent({ visual, onVisualChange }: { visual: DashboardVisual; onVisualChange: (next: DashboardVisual) => void }) {
  const store = usePreviewStore();
  const { layout } = store;
  const { dark } = useAppTheme();
  usePreviewFonts();
  const [showAdd, setShowAdd] = useState(false);
  const tabIds = ['geral', ...layout.addedViews, ...layout.boards.map((b) => b.id)];
  const active = tabIds.includes(layout.activeTab) ? layout.activeTab : 'geral';
  const tabs = [
    { text: 'Visão geral' },
    ...layout.addedViews.map((id) => ({ text: VIEW_BY_ID[id].tab, dot: KIND_COLOR[VIEW_BY_ID[id].kind] })),
    ...layout.boards.map((b) => ({ text: b.name })),
  ];
  const navigate = (tab: string) => {
    if (VIEW_BY_ID[tab as ViewId] && !layout.addedViews.includes(tab as ViewId)) store.addView(tab as ViewId);
    store.setActiveTab(tab);
  };
  const board = layout.boards.find((b) => b.id === active);
  const view = VIEW_BY_ID[active as ViewId];

  return (
    <div className={`dpv${dark ? ' dark' : ''}`} style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 40px 72px', display: 'grid', gap: 22, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
            <span className="eyebrow">Dynamic Journey · Dashboard administrativo</span>
            <h1 style={{ fontSize: 'clamp(30px, 4vw, 42px)', lineHeight: 1.05 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Prévia do novo visual. Produtos, jornadas, pessoas e números são <b style={{ color: 'var(--ink)' }}>ilustrativos</b>, e as ações só mudam esta tela.
            </p>
          </div>
          <VisualToggle value={visual} onChange={onVisualChange} />
        </header>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Tabs selectedIndex={Math.max(0, tabIds.indexOf(active))} onChange={(i) => store.setActiveTab(tabIds[i])} tabs={tabs} />
          </div>
          <div className="actions" style={{ paddingBottom: 8 }}>
            <button type="button" className="btn" onClick={() => setShowAdd((s) => !s)}>
              + Adicionar visão
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                store.addBoard(`Meu painel ${layout.boards.length + 1}`);
              }}
            >
              + Novo painel
            </button>
          </div>
        </div>

        {showAdd && <AddViewPanel onClose={() => setShowAdd(false)} />}

        <FilterBar />

        {view && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '6px 18px', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--f-data)', fontSize: 13, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '2px 7px', alignSelf: 'start', marginTop: 6 }}>
              {view.num}
            </span>
            <div style={{ display: 'grid', gap: 6 }}>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.15 }}>{view.title}</h2>
              <p style={{ color: 'var(--muted)', maxWidth: '70ch' }}>{view.summary}</p>
              <span>
                <KindTag kind={view.kind} />
              </span>
            </div>
            <button type="button" className="btn link" onClick={() => store.removeView(view.id)}>
              Remover esta aba
            </button>
          </div>
        )}

        {active === 'geral' && <Overview onNavigate={navigate} />}
        {view && renderView(view.id)}
        {board && <BoardEditor key={board.id} board={board} onNavigate={navigate} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn link" onClick={store.resetLayout}>
            Restaurar abas e painéis do exemplo
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewDashboard(props: { visual: DashboardVisual; onVisualChange: (next: DashboardVisual) => void }) {
  return (
    <PreviewStoreProvider>
      <ToastProvider>
        <PreviewContent {...props} />
      </ToastProvider>
    </PreviewStoreProvider>
  );
}
