import { useState } from 'react';
import { ButtonLayout, ButtonPrimary, ButtonSecondary, Callout, Stack, Text, skinVars } from '@telefonica/mistica';

interface Props {
  topic: string;
  description: string;
  onSend: (payload?: Record<string, unknown>) => Promise<void>;
  // Resolve, sem publicar nada, o mesmo payload que "Gerar automaticamente" enviaria — usado só pra
  // pré-preencher a caixa de "Inserir manualmente" com um JSON válido de partida, em vez de abrir
  // em branco e depender do usuário escrever o formato esperado de cor (ver conversa: chaves sem
  // aspas digitadas do zero não são JSON válido).
  onPreview: () => Promise<unknown>;
}

/** Publica de verdade no tópico Kafka do Service Task atual, com o usuário decidindo se o corpo é
 * digitado na mão ou gerado igual ao worker automático faria — só aparece quando a execução foi
 * iniciada com "controlar mensagens Kafka manualmente" (StartPanel), o que tira
 * essa task do piloto automático do KafkaBridgeScheduler enquanto a instância existir. */
export function KafkaManualSendPanel({ topic, description, onSend, onPreview }: Props) {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose');
  const [text, setText] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnterManual() {
    setMode('manual');
    try {
      const preview = await onPreview();
      setText(JSON.stringify(preview ?? {}, null, 2));
    } catch {
      // Falha ao pré-carregar não deve travar a digitação — a caixa fica com o valor atual ('{}').
    }
  }

  async function send(payload?: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      await onSend(payload);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao publicar a mensagem.');
    } finally {
      setBusy(false);
    }
  }

  function handleManualSend() {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      setError('Payload não é um JSON válido.');
      return;
    }
    send(payload);
  }

  return (
    <Stack space={16}>
      <Callout variant="brand" title="Controle manual do Kafka" description={description} />

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

      {mode === 'manual' && (
        <Stack space={4}>
          <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
            Payload (JSON)
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
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${skinVars.colors.border}`,
              background: skinVars.colors.background,
              color: skinVars.colors.textPrimary,
              resize: 'vertical',
            }}
          />
        </Stack>
      )}

      {error && <Callout variant="default" title="Não foi possível publicar" description={error} />}
      {sent && !error && (
        <Callout variant="brand" title="Mensagem publicada" description="Aguardando o motor processar — a tela avança sozinha." />
      )}

      {mode === 'choose' ? (
        <ButtonLayout
          align="right"
          primaryButton={
            <ButtonPrimary onPress={() => send(undefined)} showSpinner={busy}>
              Gerar automaticamente
            </ButtonPrimary>
          }
          secondaryButton={
            <ButtonSecondary onPress={handleEnterManual} disabled={busy}>
              Inserir manualmente
            </ButtonSecondary>
          }
        />
      ) : (
        <ButtonLayout
          align="right"
          primaryButton={
            <ButtonPrimary onPress={handleManualSend} showSpinner={busy}>
              Enviar mensagem
            </ButtonPrimary>
          }
          secondaryButton={
            <ButtonSecondary
              onPress={() => {
                setMode('choose');
                setError(null);
              }}
              disabled={busy}
            >
              Voltar
            </ButtonSecondary>
          }
        />
      )}
    </Stack>
  );
}
