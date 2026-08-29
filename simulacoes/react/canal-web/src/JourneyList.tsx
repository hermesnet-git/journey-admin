import { useEffect, useMemo, useState } from 'react';
import { Box, DataCard, IconSearchRegular, Stack, Text, TextFieldBase, skinVars } from '@telefonica/mistica';
import { listJourneys, type JourneySummary } from './api';

interface Props {
  onSelect: (journey: JourneySummary) => void;
}

export function JourneyList({ onSelect }: Props) {
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listJourneys()
      .then((result) => {
        if (!cancelled) setJourneys(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro inesperado.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return journeys ?? [];
    return (journeys ?? []).filter(
      (j) => j.name.toLowerCase().includes(normalized) || j.productName.toLowerCase().includes(normalized),
    );
  }, [journeys, query]);

  // Opções só aparecem com o campo em foco (REQ do usuário: sem listão sempre visível) —
  // onMouseDown com preventDefault em cada opção evita que o blur do campo (disparado antes do
  // click) esconda a lista no meio do clique, o que faria o onClick nunca chegar a disparar.
  const showOptions = focused && journeys != null && journeys.length > 0;

  return (
    <Box padding={24}>
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <Stack space={24}>
          <Stack space={4}>
            <Text size={20} weight="bold" color={skinVars.colors.textPrimary}>
              Dynamic Journey - Canal Web - Simulação
            </Text>
            <Text size={14} color={skinVars.colors.textSecondary}>
              Pesquise uma jornada para executar
            </Text>
          </Stack>

          {error && <Text color={skinVars.colors.error}>{error}</Text>}
          {!journeys && !error && <Text color={skinVars.colors.textSecondary}>Carregando...</Text>}
          {journeys && journeys.length === 0 && (
            <Text color={skinVars.colors.textSecondary}>Nenhuma jornada publicada para este canal.</Text>
          )}

          {journeys && journeys.length > 0 && (
            <TextFieldBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Pesquisar jornada..."
              startIcon={<IconSearchRegular size={18} color={skinVars.colors.textSecondary} />}
              fullWidth
            />
          )}

          {showOptions &&
            (filtered.length === 0 ? (
              <Text color={skinVars.colors.textSecondary}>Nenhuma jornada encontrada para "{query}".</Text>
            ) : (
              <Stack space={12}>
                {filtered.map((journey) => (
                  <div key={journey.journeyId} onMouseDown={(e) => e.preventDefault()}>
                    <DataCard
                      title={journey.name}
                      description={
                        journey.productName + (journey.publishedVersionNumber != null ? ` · v${journey.publishedVersionNumber}` : '')
                      }
                      onPress={() => onSelect(journey)}
                    />
                  </div>
                ))}
              </Stack>
            ))}
        </Stack>
      </div>
    </Box>
  );
}
