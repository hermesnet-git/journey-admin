import { useMemo, useState, type ReactNode } from 'react';
import { Check, Info, MessageCircle, Monitor, Search, Smartphone, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CHANNEL_TYPE_LABELS, type ChannelType } from '../api/products';
import type { JourneyTemplate, JourneyTemplateTrack } from '../api/journeys';
import { FlowDiagramViewer } from '../execution/FlowDiagramViewer';
import type { FlowConnectionInfo, FlowNodeInfo } from '../execution/api';
import { useAppTheme, type AppColors } from '../shell/theme';

// Cor de identidade de cada trilha — só em pontos e fundos bem diluídos, legível nos dois temas.
const TRACKS: { id: JourneyTemplateTrack; label: string; short: string; color: string }[] = [
  { id: 'primeiros-passos', label: 'Primeiros passos', short: 'Primeiros passos', color: '#10b981' },
  { id: 'integracoes', label: 'Integrações', short: 'Integração', color: '#6366f1' },
  { id: 'canais', label: 'Canais', short: 'Canais', color: '#0ea5e9' },
  { id: 'negocio', label: 'Jornadas de negócio', short: 'Negócio', color: '#8A05BE' },
  { id: 'arquitetura', label: 'Padrões avançados', short: 'Avançado', color: '#f59e0b' },
];
const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<JourneyTemplateTrack, (typeof TRACKS)[number]>;

const CHANNEL_ICON: Record<ChannelType, LucideIcon> = { WEB: Monitor, MOBILE: Smartphone, WHATSAPP: MessageCircle };

interface TemplateGalleryProps {
  templates: JourneyTemplate[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (templateId: string) => void;
  // Canais escolhidos em "Dados da jornada" — avisa quando o modelo foi pensado para outro canal.
  journeyChannels: ChannelType[];
}

export function TemplateGallery({ templates, loading, error, selectedId, onSelect, journeyChannels }: TemplateGalleryProps) {
  const { colors: c } = useAppTheme();
  const [track, setTrack] = useState<JourneyTemplateTrack | null>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return templates.filter(
      (t) =>
        (!track || t.track === track) &&
        (!q || normalize([t.name, t.description, t.area ?? '', ...t.capabilities, ...t.highlights].join(' ')).includes(q)),
    );
  }, [templates, track, query]);

  const selected = templates.find((t) => t.templateId === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-3 min-h-0" style={{ height: 'min(640px, 66vh)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div role="group" aria-label="Filtrar por trilha" className="flex items-center gap-1 flex-wrap">
          <TrackButton active={track === null} label="Todos" count={templates.length} onClick={() => setTrack(null)} c={c} />
          {TRACKS.map((t) => (
            <TrackButton
              key={t.id}
              active={track === t.id}
              label={t.label}
              color={t.color}
              count={templates.filter((x) => x.track === t.id).length}
              onClick={() => setTrack(t.id)}
              c={c}
            />
          ))}
        </div>
        <label
          className="ml-auto flex items-center gap-2 h-[34px] px-3 rounded-lg min-w-[220px]"
          style={{ border: `1px solid ${c.border}`, background: c.surface }}
        >
          <Search size={14} style={{ color: c.textMuted }} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, área ou recurso"
            aria-label="Buscar modelos"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[12.5px]"
            style={{ color: c.textPrimary }}
          />
        </label>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 -mr-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-[148px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
              ))}
            </div>
          ) : error ? (
            <div className="text-[12.5px]" style={{ color: c.warning }}>
              {error}
            </div>
          ) : visible.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[12.5px]" style={{ color: c.textMuted }}>
              {templates.length === 0 ? 'Nenhum modelo disponível no momento.' : 'Nenhum modelo encontrado com esse filtro.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-1">
              {visible.map((t) => (
                <TemplateCard key={t.templateId} template={t} selected={t.templateId === selectedId} onSelect={() => onSelect(t.templateId)} c={c} />
              ))}
            </div>
          )}
        </div>

        <aside
          className="w-[380px] shrink-0 rounded-xl overflow-y-auto flex flex-col"
          style={{ border: `1px solid ${c.border}`, background: c.bg }}
          aria-live="polite"
        >
          {selected ? (
            <TemplateDetails template={selected} journeyChannels={journeyChannels} c={c} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <div className="text-[13.5px] font-semibold" style={{ color: c.textPrimary }}>
                Escolha um modelo
              </div>
              <div className="text-[12.5px] leading-[1.5]" style={{ color: c.textSecondary }}>
                Veja aqui o desenho do fluxo, o que o exemplo mostra e o que fica para você configurar.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TrackButton({
  active,
  label,
  count,
  color,
  onClick,
  c,
}: {
  active: boolean;
  label: string;
  count: number;
  color?: string;
  onClick: () => void;
  c: AppColors;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="h-[30px] px-3 rounded-full text-[12px] font-semibold flex items-center gap-[6px] cursor-pointer transition-colors"
      style={{
        border: `1px solid ${active ? c.textPrimary : c.border}`,
        background: active ? c.textPrimary : c.surface,
        color: active ? c.surface : c.textSecondary,
      }}
    >
      {color && <span className="w-[7px] h-[7px] rounded-full" style={{ background: color }} aria-hidden />}
      {label}
      <span className="tabular-nums" style={{ opacity: 0.6 }}>
        {count}
      </span>
    </button>
  );
}

function TemplateCard({ template, selected, onSelect, c }: { template: JourneyTemplate; selected: boolean; onSelect: () => void; c: AppColors }) {
  const track = TRACK_BY_ID[template.track];
  const stats = flowStats(template);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="relative h-full min-h-[148px] rounded-xl p-4 text-left cursor-pointer flex flex-col gap-2 transition-[border-color,box-shadow,background-color] duration-150"
      style={{
        border: `1px solid ${selected ? c.accent : c.border}`,
        boxShadow: selected ? `0 0 0 1px ${c.accent}` : 'none',
        background: selected ? c.accentSoft : c.surface,
        color: c.textPrimary,
      }}
    >
      <span className="flex items-center gap-[6px] text-[11px] font-semibold" style={{ color: c.textSecondary }}>
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: track.color }} aria-hidden />
        {track.short}
        {template.area && <span style={{ color: c.textMuted }}>· {template.area}</span>}
        {selected && <Check size={15} className="ml-auto shrink-0" style={{ color: c.accent }} aria-hidden />}
      </span>
      <span className="text-[14px] font-bold leading-[1.3]">{template.name}</span>
      <span className="text-[12.5px] leading-[1.45] line-clamp-2" style={{ color: c.textSecondary }}>
        {template.description}
      </span>
      <span className="mt-auto pt-1 flex items-center gap-2 text-[11.5px]" style={{ color: c.textMuted }}>
        <ChannelIcons channels={template.channelTypes} c={c} />
        <span>{stats.steps} etapas</span>
        {template.pendingSetup.length > 0 && (
          <span className="ml-auto flex items-center gap-1" style={{ color: c.warning }} title="Itens para configurar antes de publicar">
            <Wrench size={12} aria-hidden />
            {template.pendingSetup.length}
          </span>
        )}
      </span>
    </button>
  );
}

function ChannelIcons({ channels, c }: { channels: ChannelType[]; c: AppColors }) {
  return (
    <span className="flex items-center gap-[5px]" aria-label={channels.map((ch) => CHANNEL_TYPE_LABELS[ch]).join(', ')}>
      {channels.map((ch) => {
        const Icon = CHANNEL_ICON[ch];
        return <Icon key={ch} size={13} style={{ color: c.textSecondary }} aria-hidden />;
      })}
    </span>
  );
}

function TemplateDetails({ template, journeyChannels, c }: { template: JourneyTemplate; journeyChannels: ChannelType[]; c: AppColors }) {
  const track = TRACK_BY_ID[template.track];
  const stats = flowStats(template);
  const { nodes, connections } = useMemo(() => toViewerFlow(template), [template]);
  const missingChannels = template.channelTypes.filter((ch) => !journeyChannels.includes(ch));
  const outsideJourney = missingChannels.length === template.channelTypes.length;

  return (
    <div className="flex flex-col">
      <div className="h-[210px] shrink-0 border-b" style={{ borderColor: c.border }}>
        <FlowDiagramViewer key={template.templateId} flowNodes={nodes} flowConnections={connections} currentNodeId={null} visitedNodeIds={[]} staticView compact />
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-[6px]">
          <span className="flex items-center gap-[6px] text-[11px] font-semibold" style={{ color: c.textSecondary }}>
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: track.color }} aria-hidden />
            {track.label}
            {template.area && <span style={{ color: c.textMuted }}>· {template.area}</span>}
          </span>
          <h3 className="m-0 text-[16px] font-bold leading-[1.3]" style={{ color: c.textPrimary }}>
            {template.name}
          </h3>
          <p className="m-0 text-[12.5px] leading-[1.5]" style={{ color: c.textSecondary }}>
            {template.description}
          </p>
        </div>

        <div className="grid grid-cols-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          <Stat value={stats.screens} label={stats.screens === 1 ? 'tela' : 'telas'} c={c} />
          <Stat value={stats.integrations} label={stats.integrations === 1 ? 'integração' : 'integrações'} c={c} divider />
          <Stat value={stats.decisions} label={stats.decisions === 1 ? 'decisão' : 'decisões'} c={c} divider />
        </div>

        <Section title="O que este modelo mostra" c={c}>
          <ul className="m-0 p-0 list-none flex flex-col gap-[7px]">
            {template.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-[12.5px] leading-[1.45]" style={{ color: c.textPrimary }}>
                <Check size={14} className="shrink-0 mt-[2px]" style={{ color: c.success }} aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Recursos usados" c={c}>
          <div className="flex flex-wrap gap-[6px]">
            {template.capabilities.map((cap) => (
              <span key={cap} className="px-2 py-[3px] rounded-md text-[11.5px] font-medium" style={{ background: c.chipBg, color: c.textSecondary }}>
                {cap}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Canais" c={c}>
          <div className="flex flex-wrap gap-[6px]">
            {template.channelTypes.map((ch) => {
              const Icon = CHANNEL_ICON[ch];
              return (
                <span key={ch} className="flex items-center gap-[5px] px-2 py-[3px] rounded-md text-[11.5px] font-medium" style={{ background: c.chipBg, color: c.textSecondary }}>
                  <Icon size={12} aria-hidden />
                  {CHANNEL_TYPE_LABELS[ch]}
                </span>
              );
            })}
          </div>
          {outsideJourney && (
            <p className="m-0 mt-2 flex items-start gap-[6px] text-[12px] leading-[1.45]" style={{ color: c.textSecondary }}>
              <Info size={13} className="shrink-0 mt-[2px]" aria-hidden />
              Pensado para {joinLabels(template.channelTypes)}, que não está entre os canais desta jornada: as telas foram escritas para esse canal.
            </p>
          )}
        </Section>

        {template.pendingSetup.length > 0 && (
          <div className="rounded-lg px-3 py-3 flex flex-col gap-2" style={{ background: c.warningSoft, border: `1px solid ${c.warningBorder}` }}>
            <div className="flex items-center gap-[6px] text-[12.5px] font-semibold" style={{ color: c.warning }}>
              <Wrench size={13} aria-hidden />
              Antes de publicar, escolha
            </div>
            <ul className="m-0 pl-4 flex flex-col gap-1 text-[12px] leading-[1.45]" style={{ color: c.textPrimary }}>
              {template.pendingSetup.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="text-[11.5px] leading-[1.45]" style={{ color: c.textSecondary }}>
              Essas partes dependem do seu ambiente e vêm em branco. As notas no editor indicam onde ajustar.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, c }: { title: string; children: ReactNode; c: AppColors }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0 text-[11.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
        {title}
      </h4>
      {children}
    </section>
  );
}

function Stat({ value, label, divider, c }: { value: number; label: string; divider?: boolean; c: AppColors }) {
  return (
    <div className="px-3 py-[10px] flex flex-col" style={{ background: c.surface, borderLeft: divider ? `1px solid ${c.border}` : undefined }}>
      <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: c.textPrimary }}>
        {value}
      </span>
      <span className="mt-1 text-[11.5px]" style={{ color: c.textSecondary }}>
        {label}
      </span>
    </div>
  );
}

function flowStats(template: JourneyTemplate) {
  const types = template.preview.nodes.map((n) => n.nodeType);
  const count = (...wanted: string[]) => types.filter((t) => wanted.includes(t)).length;
  return {
    steps: count('USER_TASK', 'SERVICE_TASK', 'RECEIVE_TASK', 'GATEWAY', 'MESSAGE_START_EVENT'),
    screens: count('USER_TASK'),
    integrations: count('SERVICE_TASK', 'RECEIVE_TASK', 'MESSAGE_START_EVENT'),
    decisions: count('GATEWAY'),
  };
}

function toViewerFlow(template: JourneyTemplate): { nodes: FlowNodeInfo[]; connections: FlowConnectionInfo[] } {
  return {
    nodes: template.preview.nodes.map((n) => ({
      id: n.nodeId,
      type: n.nodeType,
      name: n.name,
      positionX: n.positionX,
      positionY: n.positionY,
      connectorConfig: n.connectorType ? { connectorType: n.connectorType, config: null } : null,
      startVariables: null,
    })),
    connections: template.preview.connections.map((cn) => ({
      id: cn.connectionId,
      sourceNodeId: cn.sourceNodeId,
      targetNodeId: cn.targetNodeId,
      condition: cn.condition,
      isDefault: cn.isDefault,
      onError: cn.onError,
    })),
  };
}

function joinLabels(channels: ChannelType[]) {
  const labels = channels.map((ch) => CHANNEL_TYPE_LABELS[ch]);
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}` : labels[0];
}

// Busca sem acento e sem caixa: "integracao" acha "Integração".
function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
