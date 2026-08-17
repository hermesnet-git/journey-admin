import { CheckCircle2, Clock } from 'lucide-react';
import { Box, Boxed, ButtonLayout, ButtonPrimary, Callout, Stack, Text, skinVars } from '@telefonica/mistica';
import type { StepResponse } from './api';
import { SduiFormRenderer } from './SduiFormRenderer';
import { PhoneFrame } from './PhoneFrame';

interface Props {
  channelType: string;
  step: StepResponse;
  busy: boolean;
  onCompleteTask: (answers: Record<string, unknown>) => void;
  onSimulateStep: () => void;
}

const NODE_TYPE_LABEL: Record<string, string> = {
  SERVICE_TASK: 'Tarefa de serviço (integração)',
  RECEIVE_TASK: 'Tarefa de recebimento (aguardando mensagem)',
};

export function DevicePreview({ channelType, step, busy, onCompleteTask, onSimulateStep }: Props) {
  const content = (
    <Box padding={24}>
      <Stack space={16}>
        {step.type === 'USER_TASK' && step.form && (
          <Stack space={16}>
            <Stack space={2}>
              <Text size={12.5} color={skinVars.colors.textSecondary}>
                {step.nodeName}
              </Text>
              <Text size={17} weight="bold" color={skinVars.colors.textPrimary}>
                {step.form.name}
              </Text>
            </Stack>
            <SduiFormRenderer sdui={step.form.sdui} onSubmit={onCompleteTask} submitting={busy} />
          </Stack>
        )}

        {step.type === 'WAITING' && (
          <Stack space={16}>
            <Callout
              variant="brand"
              asset={<Clock size={26} color={skinVars.colors.textPrimaryBrand} />}
              title={step.nodeName ?? 'Aguardando etapa automática'}
              description={
                (step.nodeType ? (NODE_TYPE_LABEL[step.nodeType] ?? step.nodeType) : '') +
                ' — esta etapa normalmente seria concluída por uma integração externa. Simule a conclusão para seguir.'
              }
            />
            <ButtonLayout
              align="right"
              primaryButton={
                <ButtonPrimary onPress={onSimulateStep} showSpinner={busy}>
                  Simular conclusão
                </ButtonPrimary>
              }
            />
          </Stack>
        )}

        {step.type === 'ENDED' && (
          <Stack space={12}>
            <div className="flex justify-center">
              <CheckCircle2 size={32} color={skinVars.colors.success} />
            </div>
            <Text size={16} weight="bold" textAlign="center" color={skinVars.colors.textPrimary}>
              Jornada concluída
            </Text>
            <Text size={13.5} textAlign="center" color={skinVars.colors.textSecondary}>
              O processo chegou ao fim do fluxo com sucesso.
            </Text>
          </Stack>
        )}
      </Stack>
    </Box>
  );

  if (channelType === 'MOBILE') {
    return <PhoneFrame>{content}</PhoneFrame>;
  }

  return (
    <div className="max-w-[640px] mx-auto w-full">
      <Boxed>{content}</Boxed>
    </div>
  );
}
