import { useFlowTheme } from './theme';
import { ChannelScreenFrame } from './ChannelScreenFrame';
import { FieldMisticaPreview } from './FormScreenCanvas';
import { groupFieldsBySections } from './formScreenModel';
import type { FormField } from '../api/forms';
import type { ChannelType } from '../api/products';

// Visão somente-leitura da tela — mesma renderização Mística e mesmo agrupamento por seção que o
// canvas de edição (FormScreenCanvas/FieldMisticaPreview), só sem a moldura de arrastar/selecionar/
// remover, pra dar a sensação de estar olhando a tela final do canal, não o editor.
export function FormScreenPreview({ fields, channelType }: { fields: FormField[]; channelType: ChannelType }) {
  const { c } = useFlowTheme();

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: c.canvasBg }}>
      <ChannelScreenFrame channelType={channelType}>
        {fields.length === 0 ? (
          <div className="text-[12.5px] text-center py-8" style={{ color: c.textSecondary }}>
            Nenhum componente na tela ainda.
          </div>
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
