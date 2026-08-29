import { useEffect, useState } from 'react';
import {
  Box,
  Boxed,
  ButtonLayout,
  ButtonPrimary,
  Callout,
  IconSuccess,
  IconWaitClockRegular,
  Stack,
  Text,
  TextLink,
  skinVars,
} from '@telefonica/mistica';
import { completeTask, getCurrentStep, stopInstance, type InstanceResponse, type StepResponse } from './api';
import { SduiFormRenderer } from './SduiFormRenderer';

const WAITING_POLL_MS = 2000;

interface Props {
  channelType: string;
  instance: InstanceResponse;
  onRestart: () => void;
}

// Núcleo da execução — reduzido de DevicePreview.tsx/ExecutionWorkspace.tsx (admin), sem os
// painéis de debug (Kafka manual, "pular etapa"): um canal real só renderiza a tela SDUI, aguarda
// etapas automáticas via polling, e mostra o fim.
export function ExecutionScreen({ channelType, instance, onRestart }: Props) {
  const [step, setStep] = useState<StepResponse>(instance.step);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step.type !== 'WAITING') return;
    let cancelled = false;
    const interval = setInterval(() => {
      getCurrentStep(instance.processInstanceId)
        .then((next) => {
          if (!cancelled) setStep(next);
        })
        .catch(() => {
          /* falha de polling não interrompe a tela — tenta de novo no próximo tick */
        });
    }, WAITING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step.type, instance.processInstanceId]);

  async function handleComplete(answers: Record<string, unknown>) {
    if (!step.taskId) return;
    setBusy(true);
    try {
      const next = await completeTask(instance.processInstanceId, step.taskId, answers);
      setStep(next);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    await stopInstance(instance.processInstanceId).catch(() => {
      /* instância pode já ter terminado sozinha — sem problema, o objetivo (sair da tela) é o mesmo */
    });
    onRestart();
  }

  const content = (
    <Box padding={24}>
      <Stack space={16}>
        {step.errorMessage && <Callout variant="default" title="Algo deu errado" description={step.errorMessage} />}

        {step.type === 'USER_TASK' && step.form && (
          <SduiFormRenderer
            key={step.taskId}
            sdui={step.form.sdui}
            channelType={channelType}
            submitting={busy}
            onSubmit={handleComplete}
          />
        )}

        {step.type === 'WAITING' && (
          <Callout
            variant="brand"
            asset={<IconWaitClockRegular size={26} color={skinVars.colors.textPrimaryBrand} />}
            title={step.nodeName ?? 'Processando'}
            description="Esta etapa está sendo concluída automaticamente — aguarde."
          />
        )}

        {step.type === 'ENDED' && (
          <Stack space={12}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <IconSuccess size={48} />
            </div>
            <Text size={16} weight="bold" textAlign="center" color={skinVars.colors.textPrimary}>
              Jornada concluída
            </Text>
            <ButtonLayout align="center" primaryButton={<ButtonPrimary onPress={onRestart}>Nova execução</ButtonPrimary>} />
          </Stack>
        )}

        {step.type !== 'ENDED' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TextLink onPress={handleCancel} underline="always">
              <Text size={12.5} color={skinVars.colors.textSecondary}>
                Cancelar
              </Text>
            </TextLink>
          </div>
        )}
      </Stack>
    </Box>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', overflowX: 'auto' }}>
      <Boxed>{content}</Boxed>
    </div>
  );
}
