import { useEffect, useState } from 'react';
import { Box, ButtonPrimary, ButtonSecondary, ButtonLayout, Callout, Stack, Text, skinVars } from '@telefonica/mistica';
import { getFlow, startInstance, type InstanceResponse, type JourneySummary } from './api';

interface Props {
  journey: JourneySummary;
  onStarted: (instance: InstanceResponse) => void;
  onCancel: () => void;
}

// Tela de variáveis de início — só aparece quando o nó START declara alguma. Sem
// manualKafkaControl nem MESSAGE_START_EVENT: um canal real só inicia por START comum (REQ-03.12.003).
export function StartVariablesForm({ journey, onStarted, onCancel }: Props) {
  const [startVariables, setStartVariables] = useState<{ name: string; type: string }[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFlow(journey.journeyId)
      .then((flow) => {
        if (cancelled) return;
        const start = flow.flowNodes.find((n) => n.type === 'START');
        const declared = start?.startVariables ?? [];
        if (declared.length === 0) {
          handleStart(undefined);
        } else {
          setStartVariables(declared);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro inesperado.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey.journeyId]);

  async function handleStart(variables: Record<string, unknown> | undefined) {
    setStarting(true);
    setError(null);
    try {
      const instance = await startInstance(journey.journeyId, variables);
      onStarted(instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setStarting(false);
    }
  }

  function handleSubmit() {
    const declarations = startVariables ?? [];
    const payload: Record<string, unknown> = {};
    declarations.forEach((v) => {
      const raw = values[v.name] ?? '';
      if (v.type === 'number') payload[v.name] = raw === '' ? null : Number(raw);
      else if (v.type === 'boolean') payload[v.name] = raw === 'true';
      else payload[v.name] = raw;
    });
    handleStart(payload);
  }

  const missingRequired = (startVariables ?? []).some((v) => v.type !== 'boolean' && !values[v.name]);

  if (startVariables === null) {
    // Ainda buscando o flow (ou já iniciando direto, quando não há variável declarada).
    return (
      <Box padding={24}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Stack space={16}>
            {error ? <Callout variant="default" title="Não foi possível iniciar" description={error} /> : (
              <Text color={skinVars.colors.textSecondary}>Iniciando jornada...</Text>
            )}
            {error && (
              <ButtonLayout align="full-width" primaryButton={<ButtonSecondary onPress={onCancel}>Voltar</ButtonSecondary>} />
            )}
          </Stack>
        </div>
      </Box>
    );
  }

  return (
    <Box padding={24}>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <Stack space={24}>
          <Stack space={2}>
            <Text size={18} weight="bold" color={skinVars.colors.textPrimary}>
              {journey.name}
            </Text>
            <Text size={13} color={skinVars.colors.textSecondary}>
              Preencha as variáveis de início
            </Text>
          </Stack>

          {error && <Callout variant="default" title="Não foi possível iniciar" description={error} />}

          <Stack space={12}>
            {startVariables.map((v) =>
              v.type === 'boolean' ? (
                <label key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={values[v.name] === 'true'}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: String(e.target.checked) }))}
                  />
                  <Text size={13} color={skinVars.colors.textPrimary}>
                    {v.name}
                  </Text>
                </label>
              ) : (
                <div key={v.name}>
                  <Text size={12} color={skinVars.colors.textSecondary}>
                    {v.name}
                  </Text>
                  <input
                    type={inputTypeFor(v.type)}
                    value={values[v.name] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      fontSize: 13,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${skinVars.colors.border}`,
                      background: skinVars.colors.background,
                      color: skinVars.colors.textPrimary,
                    }}
                  />
                </div>
              ),
            )}
          </Stack>

          <ButtonLayout
            align="full-width"
            primaryButton={
              <ButtonPrimary onPress={handleSubmit} disabled={missingRequired} showSpinner={starting}>
                Executar
              </ButtonPrimary>
            }
            secondaryButton={<ButtonSecondary onPress={onCancel}>Voltar</ButtonSecondary>}
          />
        </Stack>
      </div>
    </Box>
  );
}

function inputTypeFor(type: string): string {
  if (type === 'number') return 'number';
  if (type === 'date') return 'date';
  if (type === 'datetime') return 'datetime-local';
  return 'text';
}
