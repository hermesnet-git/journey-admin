import { useFlowTheme } from './theme';
import { PropertyGrid, PropertyRow, gridInputStyle } from './PropertyGrid';
import type { ChannelType } from '../api/products';

export function JourneyMetaBar({
  journeyId,
  productName,
  channelTypes,
  onEditChannels,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  journeyId: string;
  productName: string;
  channelTypes: ChannelType[];
  onEditChannels: () => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const { c } = useFlowTheme();

  return (
    <PropertyGrid>
      <PropertyRow label="ID" first>
        <div style={{ color: c.textSecondary, fontFamily: 'monospace', fontSize: 11.5, wordBreak: 'break-all' }}>
          {journeyId}
        </div>
      </PropertyRow>
      <PropertyRow label="Produto">
        <div style={{ color: c.textSecondary }}>{productName || '—'}</div>
      </PropertyRow>
      <PropertyRow label="Canais">
        <div className="flex items-center justify-between gap-2">
          <div style={{ color: c.textSecondary }}>
            {channelTypes.length > 0 ? channelTypes.join(', ') : '—'}
          </div>
          <button
            type="button"
            onClick={onEditChannels}
            className="border-0 bg-transparent cursor-pointer underline shrink-0"
            style={{ color: c.accent, fontSize: 11.5, padding: 0 }}
          >
            Editar
          </button>
        </div>
      </PropertyRow>
      <PropertyRow label="Nome">
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome da jornada"
          style={gridInputStyle(c)}
        />
      </PropertyRow>
      <PropertyRow label="Descrição">
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Descrição da jornada"
          rows={4}
          style={{ ...gridInputStyle(c), height: 'auto', minHeight: 50, resize: 'vertical', padding: '4px 6px' }}
        />
      </PropertyRow>
    </PropertyGrid>
  );
}
