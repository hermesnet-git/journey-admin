import { useState } from 'react';
import { ThemeContextProvider, getSkinByName } from '@telefonica/mistica';
import { JourneyList } from './JourneyList';
import { StartVariablesForm } from './StartVariablesForm';
import { ExecutionScreen } from './ExecutionScreen';
import type { InstanceResponse, JourneySummary } from './api';

const skin = getSkinByName('Vivo');
const CHANNEL_TYPE = 'WEB';

type Screen = { kind: 'catalog' } | { kind: 'start'; journey: JourneySummary } | { kind: 'running'; instance: InstanceResponse };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'catalog' });

  return (
    <ThemeContextProvider theme={{ skin, colorScheme: 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}>
      {screen.kind === 'catalog' && <JourneyList onSelect={(journey) => setScreen({ kind: 'start', journey })} />}
      {screen.kind === 'start' && (
        <StartVariablesForm
          journey={screen.journey}
          onStarted={(instance) => setScreen({ kind: 'running', instance })}
          onCancel={() => setScreen({ kind: 'catalog' })}
        />
      )}
      {screen.kind === 'running' && (
        <ExecutionScreen channelType={CHANNEL_TYPE} instance={screen.instance} onRestart={() => setScreen({ kind: 'catalog' })} />
      )}
    </ThemeContextProvider>
  );
}
