import { CheckCircle2, Clock, Radio } from 'lucide-react';
import { Box, Boxed, ButtonLayout, ButtonPrimary, Callout, Stack, Text, TextLink, skinVars } from '@telefonica/mistica';
import type { ConnectorConfigInfo, StepResponse } from './api';
import { SduiFormRenderer } from './SduiFormRenderer';
import { PhoneFrame } from './PhoneFrame';
import { SendTestMessagePanel } from './SendTestMessagePanel';

interface Props {
  channelType: string;
  step: StepResponse;
  busy: boolean;
  connectorConfig: ConnectorConfigInfo | null;
  businessKey: string;
  onCompleteTask: (answers: Record<string, unknown>) => void;
  onSkipStep: () => void;
  onSendTestMessage: (nodeId: string, payload: Record<string, unknown>) => Promise<void>;
}

const NODE_TYPE_LABEL: Record<string, string> = {
  SERVICE_TASK: 'Tarefa de serviço (integração)',
  RECEIVE_TASK: 'Tarefa de recebimento (aguardando mensagem)',
};

export function DevicePreview({
  channelType,
  step,
  busy,
  connectorConfig,
  businessKey,
  onCompleteTask,
  onSkipStep,
  onSendTestMessage,
}: Props) {
  // Só Kafka tem worker automático (produtor) ou faz sentido testar via mensagem real (consumidor)
  // — REST e "sem conector" continuam exatamente como antes, com o botão "Pular etapa".
  const isKafka = connectorConfig?.connectorType === 'KAFKA';
  const kafkaTopic = isKafka && typeof connectorConfig.config?.topic === 'string' ? connectorConfig.config.topic : null;

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

        {step.type === 'WAITING' && isKafka && kafkaTopic && step.nodeType === 'SERVICE_TASK' && (
          <Stack space={12}>
            <Callout
              variant="brand"
              asset={<Radio size={26} color={skinVars.colors.textPrimaryBrand} />}
              title={step.nodeName ?? 'Publicando no Kafka'}
              description={`Aguardando o worker publicar de verdade no tópico "${kafkaTopic}" e concluir — nenhuma ação necessária aqui, a tela avança sozinha.`}
            />
            <BypassLink onPress={onSkipStep} disabled={busy} />
          </Stack>
        )}

        {step.type === 'WAITING' && isKafka && kafkaTopic && step.nodeType === 'RECEIVE_TASK' && step.nodeId && (
          <Stack space={12}>
            <SendTestMessagePanel
              topic={kafkaTopic}
              initialPayload={{ businessKey }}
              description={`${step.nodeName ?? 'Esta etapa'} espera uma mensagem real nesse tópico para seguir — edite o payload e envie um teste.`}
              onSend={(payload) => onSendTestMessage(step.nodeId!, payload)}
            />
            <BypassLink onPress={onSkipStep} disabled={busy} />
          </Stack>
        )}

        {step.type === 'WAITING' && (!isKafka || !kafkaTopic) && (
          <Stack space={16}>
            <Callout
              variant="brand"
              asset={<Clock size={26} color={skinVars.colors.textPrimaryBrand} />}
              title={step.nodeName ?? 'Aguardando etapa automática'}
              description={
                (step.nodeType ? (NODE_TYPE_LABEL[step.nodeType] ?? step.nodeType) : '') +
                ' — esta etapa normalmente seria concluída por uma integração externa. Pule a etapa para seguir.'
              }
            />
            <ButtonLayout
              align="right"
              primaryButton={
                <ButtonPrimary onPress={onSkipStep} showSpinner={busy}>
                  Pular etapa
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

// Alternativa manual secundária à publicação/consumo Kafka real (REQ-05.09.009) — fabrica o
// resultado a partir do outputMapping, mesmo mecanismo do botão "Pular etapa" do caso sem conector,
// só que discreta: o caminho real é o principal, isto é o escape hatch (broker fora do ar, pressa em demo).
function BypassLink({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-center">
      <TextLink onPress={onPress} disabled={disabled} underline="always">
        <Text size={12.5} color={skinVars.colors.textSecondary}>
          Pular etapa
        </Text>
      </TextLink>
    </div>
  );
}
