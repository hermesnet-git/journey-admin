import { useState } from 'react';
import { useFlowTheme } from './theme';
import { Section } from './PropertiesSection';
import { JourneyMetaBar } from './JourneyMetaBar';

// Content only — PropertiesDock owns the panel chrome. Shown whenever no
// node is targeted: the canvas background represents the journey itself, so
// the dock falls back to the journey's own data (name/description/product/
// channel) instead of a node's.
export function JourneyPropertiesPanel({
  journeyId,
  productName,
  channelName,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  journeyId: string;
  productName: string;
  channelName: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const { c } = useFlowTheme();
  const [dataOpen, setDataOpen] = useState(true);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: c.textSecondary, marginBottom: 14 }}>Jornada</div>
      <Section title="Dados da jornada" open={dataOpen} onToggle={() => setDataOpen((o) => !o)}>
        <JourneyMetaBar
          journeyId={journeyId}
          productName={productName}
          channelName={channelName}
          name={name}
          onNameChange={onNameChange}
          description={description}
          onDescriptionChange={onDescriptionChange}
        />
      </Section>
    </div>
  );
}
