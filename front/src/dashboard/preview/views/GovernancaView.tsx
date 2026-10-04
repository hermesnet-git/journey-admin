import { useState } from 'react';
import { ButtonDanger, Inline, Stack, Tag, Text1, Text2, Text6 } from '../kit';
import { AUDIT_FEED, DRAFTS, JOURNEYS, JOURNEY_BY_ID, UNPUBLISHED, VIEW_BY_ID, fmtInt } from '../mockData';
import { usePreviewStore } from '../store';
import { DataTable, GradeBadge, HowItWorks, Panel, colors as v, useToast } from '../ui';

type Stage = 'rascunho' | 'publicada' | 'despublicada';

export function PipelineStages({ selected, onSelect }: { selected?: Stage; onSelect?: (s: Stage) => void }) {
  const idleDrafts = DRAFTS.filter((d) => d.idleDays >= 30).length;
  const stages: { id: Stage; label: string; count: number; note: string; color: string }[] = [
    { id: 'rascunho', label: 'Rascunho', count: DRAFTS.length, note: `${idleDrafts} sem edição há 30 dias`, color: v.neutralMedium },
    { id: 'publicada', label: 'Publicada', count: JOURNEYS.length, note: '11 publicações na semana', color: v.success },
    { id: 'despublicada', label: 'Despublicada', count: UNPUBLISHED.length, note: `${UNPUBLISHED.filter((u) => u.activeInstances > 0).length} com instâncias ativas`, color: v.neutralHigh },
  ];
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
      {stages.map((s) => {
        const on = selected === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect?.(s.id)}
            className="text-left rounded-xl p-4 cursor-pointer flex flex-col gap-1"
            style={{ background: v.backgroundContainer, border: `${on ? 2 : 1}px solid ${on ? v.borderSelected : v.border}` }}
          >
            <Text1 medium color={v.textSecondary} transform="uppercase">
              {s.label}
            </Text1>
            <Text6>{fmtInt(s.count)}</Text6>
            <Text1 regular color={v.textSecondary}>
              {s.note}
            </Text1>
            <span className="h-[6px] rounded-full mt-1" style={{ background: s.color }} />
          </button>
        );
      })}
    </div>
  );
}

function StageList({ stage }: { stage: Stage }) {
  if (stage === 'rascunho')
    return (
      <DataTable
        head={['Jornada em rascunho', 'Time', 'Sem edição há']}
        align={['left', 'left', 'right']}
        rows={DRAFTS.map((d) => [d.name, d.team, <Text2 key="d" regular color={d.idleDays >= 30 ? v.warningHigh : v.textPrimary}>{`${d.idleDays} dias`}</Text2>])}
      />
    );
  if (stage === 'publicada')
    return (
      <DataTable
        head={['Jornada', 'Produto', 'Versão no ar', 'Time']}
        rows={JOURNEYS.map((j) => [j.name, j.product, `v${j.version}`, j.team])}
      />
    );
  return (
    <DataTable
      head={['Jornada despublicada', 'Instâncias ainda ativas']}
      align={['left', 'right']}
      rows={UNPUBLISHED.map((u) => [u.name, u.activeInstances ? <Tag key="t" type="warning" small>{String(u.activeInstances)}</Tag> : '0'])}
    />
  );
}


export function HealthGrades({ limit }: { limit?: number }) {
  const order = { E: 0, D: 1, C: 2, B: 3, A: 4 };
  const list = [...JOURNEYS].sort((a, b) => order[a.grade] - order[b.grade]).slice(0, limit);
  return (
    <DataTable
      head={['Nota', 'Jornada', 'Por quê']}
      rows={list.map((j) => [<GradeBadge key="g" grade={j.grade} />, j.name, <Text1 key="r" regular color={v.textSecondary}>{j.gradeReason}</Text1>])}
    />
  );
}

function OldVersions() {
  const { oldVersions, terminateOldVersion } = usePreviewStore();
  const toast = useToast();
  if (oldVersions.length === 0)
    return (
      <Text2 regular color={v.textSecondary}>
        Nenhuma versão antiga com clientes em andamento.
      </Text2>
    );
  return (
    <Stack space={8}>
      {oldVersions.map((o) => (
        <div key={o.id} className="flex items-center justify-between gap-3 flex-wrap py-2" style={{ borderBottom: `1px solid ${v.divider}` }}>
          <Stack space={2}>
            <Text2 medium>
              {JOURNEY_BY_ID[o.journeyId].name} · v{o.version}
            </Text2>
            <Text1 regular color={v.textSecondary}>
              v{o.current} já publicada · a instância mais antiga começou há {o.oldestDays} {o.oldestDays === 1 ? 'dia' : 'dias'}
            </Text1>
          </Stack>
          <Inline space={8} alignItems="center">
            <Tag type="warning" small>{`${o.instances} instâncias`}</Tag>
            <ButtonDanger
              small
              onPress={() => {
                terminateOldVersion(o.id);
                toast(`${o.instances} instâncias da v${o.version} encerradas (só na prévia).`);
              }}
            >
              Encerrar
            </ButtonDanger>
          </Inline>
        </div>
      ))}
    </Stack>
  );
}

export function AuditFeed() {
  return (
    <Stack space={12}>
      {AUDIT_FEED.map((a) => (
        <div key={a.time + a.text} className="grid gap-3" style={{ gridTemplateColumns: '48px 1fr' }}>
          <Text1 regular color={v.textSecondary}>
            {a.time}
          </Text1>
          <Text2 regular>{a.text}</Text2>
        </div>
      ))}
    </Stack>
  );
}

export function GovernancaView() {
  const [stage, setStage] = useState<Stage>('rascunho');
  return (
    <Stack space={16}>
      <HowItWorks view={VIEW_BY_ID.governanca} />
      <PipelineStages selected={stage} onSelect={setStage} />
      <Panel title="Jornadas nesta etapa">
        <StageList stage={stage} />
      </Panel>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <Panel title="Versões antigas com clientes em andamento">
          <OldVersions />
        </Panel>
        <Panel title="Nota de saúde por jornada" subtitle="Sucesso, incidentes, tempo desde a última revisão e boas práticas de desenho">
          <HealthGrades />
        </Panel>
        <Panel title="Últimas mudanças · auditoria">
          <AuditFeed />
        </Panel>
      </div>
    </Stack>
  );
}
