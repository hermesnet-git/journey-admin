import { useState } from 'react';
import { JourneySearch } from './JourneySearch';
import { SimulationWorkspace } from './SimulationWorkspace';
import type { FlowBundle, JourneySummary, StepResponse } from './api';

interface RunningSimulation {
  processInstanceId: string;
  journey: JourneySummary;
  flow: FlowBundle;
  step: StepResponse;
}

export function SimulationsPage() {
  const [running, setRunning] = useState<RunningSimulation | null>(null);

  if (running) {
    return (
      <SimulationWorkspace
        processInstanceId={running.processInstanceId}
        journey={running.journey}
        flow={running.flow}
        initialStep={running.step}
        onRestart={() => setRunning(null)}
      />
    );
  }

  return (
    <JourneySearch
      onStarted={(processInstanceId, journey, flow, step) => setRunning({ processInstanceId, journey, flow, step })}
    />
  );
}
