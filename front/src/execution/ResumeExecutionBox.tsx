import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import { ExecutionApiError, resumeInstance, type ResumeInstanceResponse } from './api';

interface Props {
  onResumed: (response: ResumeInstanceResponse) => void;
}

// Ação secundária da tela inicial da Execução — a busca de jornada (JourneySearchBox) continua
// sendo o fluxo principal (REQ-05.07.001). Reabre uma instância ACTIVE já em andamento, achada por
// processInstanceId ou business key, sem passar pelo Diagnóstico (busca própria desta tela, não
// reaproveita a busca do Diagnóstico por design — REQ-15.04.002).
export function ResumeExecutionBox({ onResumed }: Props) {
  const [query, setQuery] = useState('');
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    const value = query.trim();
    if (!value || resuming) return;
    setResuming(true);
    setError(null);
    try {
      const response = await resumeInstance(value);
      onResumed(response);
    } catch (e) {
      if (e instanceof ExecutionApiError && e.status === 404) {
        setError('Nenhuma execução encontrada para esse valor.');
      } else if (e instanceof ExecutionApiError && e.status === 409) {
        setError('Essa execução já foi concluída ou encerrada — consulte-a pelo Diagnóstico.');
      } else {
        setError(e instanceof Error ? e.message : 'Erro ao retomar execução.');
      }
    } finally {
      setResuming(false);
    }
  }

  return (
    <div>
      <Text size={12} weight="medium" color={skinVars.colors.textSecondary}>
        Retomar uma execução em andamento
      </Text>
      <div className="flex gap-2 mt-2 flex-wrap items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleResume()}
          placeholder="ID da instância ou business key..."
          aria-label="ID da instância ou business key"
          autoComplete="off"
          className="flex-1 min-w-[220px] max-w-[360px] py-[8px] px-3 rounded-md text-[12.5px] font-mono outline-none box-border"
          style={{ border: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.background, color: skinVars.colors.textPrimary }}
        />
        <button
          type="button"
          onClick={handleResume}
          disabled={!query.trim() || resuming}
          className="h-9 px-3 rounded-lg text-[13px] font-medium cursor-pointer border-0 shrink-0 flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: skinVars.colors.buttonPrimaryBackground, color: skinVars.colors.textButtonPrimary }}
        >
          <RotateCcw size={14} />
          {resuming ? 'Retomando…' : 'Retomar'}
        </button>
      </div>
      {error && (
        <Text size={12} color={skinVars.colors.error}>
          {error}
        </Text>
      )}
    </div>
  );
}
