import { useFlowTheme } from './theme';
import { PropertyGrid, PropertyRow, gridInputStyle } from './PropertyGrid';

export function JourneyMetaBar({
  productName,
  channelName,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  productName: string;
  channelName: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const { c } = useFlowTheme();

  return (
    <PropertyGrid>
      <PropertyRow label="Produto" first>
        <div style={{ color: c.textSecondary }}>{productName || '—'}</div>
      </PropertyRow>
      <PropertyRow label="Canal">
        <div style={{ color: c.textSecondary }}>{channelName || '—'}</div>
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
