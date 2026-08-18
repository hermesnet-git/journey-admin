import { useState } from 'react';
import { JourneySearch } from './JourneySearch';
import { ExecutionWorkspace } from './ExecutionWorkspace';
import type { FlowBundle, JourneySummary, StepResponse } from './api';

interface RunningExecution {
  processInstanceId: string;
  businessKey: string;
  journey: JourneySummary;
  flow: FlowBundle;
  step: StepResponse;
}

interface Props {
  active: boolean;
}

export function ExecutionsPage({ active }: Props) {
  const [running, setRunning] = useState<RunningExecution | null>(null);

  if (running) {
    return (
      <ExecutionWorkspace
        processInstanceId={running.processInstanceId}
        businessKey={running.businessKey}
        journey={running.journey}
        flow={running.flow}
        initialStep={running.step}
        onRestart={() => setRunning(null)}
      />
    );
  }

  return (
    <JourneySearch
      active={active}
      onStarted={(processInstanceId, businessKey, journey, flow, step) =>
        setRunning({ processInstanceId, businessKey, journey, flow, step })
      }
    />
  );
}
