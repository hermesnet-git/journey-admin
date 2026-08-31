import { useState } from 'react';
import { ButtonLayout, ButtonPrimary, Callout, Stack, Text, skinVars } from '@telefonica/mistica';
import type { TestMessageInput } from './api';

interface Props {
  topic: string;
  initialCorrelationId: string;
  initialData: Record<string, unknown>;
  description: string;
  onSend: (message: TestMessageInput) => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${skinVars.colors.border}`,
  background: skinVars.colors.background,
  color: skinVars.colors.textPrimary,
};

/** Publica de verdade no tópico Kafka do nó, pra testar RECEIVE_TASK/MESSAGE_START_EVENT sem
 * precisar de um produtor externo real — o consumo em si acontece pelo bridge automático de
 * sempre (KafkaBridgeScheduler), este painel só publica a mensagem. correlationId é obrigatório:
 * é o que o worker Kafka usa pra correlacionar a mensagem (ou como businessKey da nova instância,
 * no caso de MESSAGE_START_EVENT) — mesmo envelope (EventMessageDTO) que o worker automático usa. */
export function SendTestMessagePanel({ topic, initialCorrelationId, initialData, description, onSend }: Props) {
  const [correlationId, setCorrelationId] = useState(initialCorrelationId);
  const [messageName, setMessageName] = useState('');
  const [text, setText] = useState(() => JSON.stringify(initialData, null, 2));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!correlationId.trim()) {
      setError('correlationId é obrigatório.');
      return;
    }
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      setError('Payload não é um JSON válido.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSend({ correlationId: correlationId.trim(), messageName: messageName.trim() || undefined, data });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar a mensagem.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack space={16}>
      <Callout variant="brand" title="Enviar mensagem de teste" description={description} />

      <Stack space={4}>
        <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
          Tópico Kafka
        </Text>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            padding: '8px 10px',
            borderRadius: 8,
            background: skinVars.colors.backgroundAlternative,
            color: skinVars.colors.textPrimary,
          }}
        >
          {topic}
        </div>
      </Stack>

      <Stack space={4}>
        <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
          correlationId (obrigatório)
        </Text>
        <input
          value={correlationId}
          onChange={(e) => {
            setCorrelationId(e.target.value);
            setSent(false);
          }}
          disabled={busy}
          className="w-full box-border"
          style={inputStyle}
        />
      </Stack>

      <Stack space={4}>
        <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
          messageName (opcional)
        </Text>
        <input
          value={messageName}
          onChange={(e) => {
            setMessageName(e.target.value);
            setSent(false);
          }}
          disabled={busy}
          className="w-full box-border"
          style={inputStyle}
        />
      </Stack>

      <Stack space={4}>
        <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
          Payload (JSON) — vira payload.data no envelope
        </Text>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSent(false);
          }}
          rows={6}
          disabled={busy}
          className="w-full box-border"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Stack>

      {error && <Callout variant="default" title="Não foi possível enviar" description={error} />}
      {sent && !error && (
        <Callout variant="brand" title="Mensagem publicada" description="Aguardando o motor processar — a tela avança sozinha." />
      )}

      <ButtonLayout
        align="right"
        primaryButton={
          <ButtonPrimary onPress={handleSend} showSpinner={busy}>
            Enviar mensagem
          </ButtonPrimary>
        }
      />
    </Stack>
  );
}
