import { useFlowTheme } from './theme';
import { ChannelScreenFrame } from './ChannelScreenFrame';
import { FieldMisticaPreview } from './FormScreenCanvas';
import { groupFieldsBySections, resolveWebPosition, FALLBACK_ROW_HEIGHT } from './formScreenModel';
import type { FormField } from '../api/forms';
import type { ChannelType } from '../api/products';

// Visão somente-leitura da tela — mesma renderização Mística que o canvas de edição
// (FormScreenCanvas/FieldMisticaPreview), só sem a moldura de arrastar/selecionar/remover, pra dar
// a sensação de estar olhando a tela final do canal, não o editor. WEB usa posição livre (x/y) —
// os demais canais mantêm o agrupamento por seção de sempre.
export function FormScreenPreview({
  fields,
  channelType,
  canvasWidth,
  canvasHeight,
  mobileWidth,
  mobileHeight,
}: {
  fields: FormField[];
  channelType: ChannelType;
  /** Resolução escolhida no seletor da prancheta (WEB) — mantém o preview com o mesmo tamanho que
   * o Build, em vez do padrão fixo de sempre. */
  canvasWidth: number;
  canvasHeight: number;
  /** Proporção do celular escolhida no seletor (MOBILE) — mesma ideia, preview com o mesmo tamanho
   * que o Build. */
  mobileWidth: number;
  mobileHeight: number;
}) {
  const { c } = useFlowTheme();
  const width = channelType === 'WEB' ? canvasWidth : channelType === 'MOBILE' ? mobileWidth : undefined;
  const height = channelType === 'WEB' ? canvasHeight : channelType === 'MOBILE' ? mobileHeight : undefined;

  return (
    <div className="flex-1 overflow-auto p-4" style={{ background: c.canvasBg }}>
      <ChannelScreenFrame channelType={channelType} width={width} height={height}>
        {fields.length === 0 ? (
          <div className="text-[12.5px] text-center py-8" style={{ color: c.textSecondary }}>
            Nenhum componente na tela ainda.
          </div>
        ) : channelType === 'WEB' ? (
          <WebPositionedPreview fields={fields} />
        ) : (
          <div className="flex flex-col gap-3">
            {groupFieldsBySections(fields).map((block, i) => (
              <div
                key={block.section?.name ?? `root-${i}`}
                className="flex flex-col gap-2 rounded-lg"
                style={block.section ? { border: `1px solid ${c.border}`, background: c.hoverBg, padding: '10px 12px' } : undefined}
              >
                {block.section && <FieldMisticaPreview field={block.section} />}
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.section?.columns ?? 1}, minmax(0,1fr))` }}>
                  {block.children.map((field) => (
                    <FieldMisticaPreview key={field.name} field={field} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ChannelScreenFrame>
    </div>
  );
}

// SECTION não existe mais em telas WEB (ver formScreenModel.ts) — filtra fora um marcador legado
// em vez de tentar desenhar como campo posicionado.
function WebPositionedPreview({ fields }: { fields: FormField[] }) {
  const positioned = fields.filter((f) => f.type !== 'SECTION');
  // Sem piso em canvasHeight aqui: o frame (ChannelScreenFrame) já é quem mantém o tamanho fixo da
  // resolução por fora — se esse cálculo também usasse canvasHeight como mínimo, o padding do
  // frame por cima disso sempre passava do tamanho fixo e o scroll aparecia até com 1 campo só.
  const maxBottom = positioned.reduce((max, f, i) => {
    const { y, height } = resolveWebPosition(f, i);
    return Math.max(max, y + (height ?? FALLBACK_ROW_HEIGHT) + 40);
  }, 0);
  // width:'100%' (não um pixel fixo igual canvasWidth) — se o scroll vertical aparecer, a barra
  // nativa come uma faixa da largura disponível; um valor fixo continuaria assumindo a largura
  // cheia e estourava por cima dela, disparando um scroll horizontal à toa.
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: maxBottom }}>
      {positioned.map((field, i) => {
        const { x, y, width, height } = resolveWebPosition(field, i);
        return (
          <div
            key={field.name}
            style={{ position: 'absolute', left: x, top: y, width, height: height ?? undefined }}
          >
            <FieldMisticaPreview field={field} />
          </div>
        );
      })}
    </div>
  );
}
