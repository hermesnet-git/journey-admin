import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ButtonPrimary } from '@telefonica/mistica';
import { useAppTheme } from '../shell/theme';
import { SecondaryButton, TextArea } from '../products/ui';

// error: true pinta a linha na cor de perigo (ex.: a geração falhou) em vez da cor neutra de
// progresso — fica no próprio log do modal em vez de estourar um ErrorModal por cima.
export interface GenerateLogEntry {
  text: string;
  error?: boolean;
}

export function GeneratePromptModal({
  generating,
  log,
  onGenerate,
  onCancel,
}: {
  generating: boolean;
  log: GenerateLogEntry[];
  onGenerate: (prompt: string) => void;
  onCancel: () => void;
}) {
  const { colors: c } = useAppTheme();
  const [prompt, setPrompt] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  // Selecionar texto dentro do modal (ex.: arrastar pra selecionar no textarea) e soltar o botão do
  // mouse fora do painel dispara um evento click no próprio backdrop — não é um clique de verdade
  // nele, é só onde o mouseup calhou de acontecer. Só fecha se o mousedown também começou no backdrop.
  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, generating]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 animate-[modal-backdrop-in_180ms_ease-out]"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={() => {
        if (backdropMouseDownRef.current && !generating) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 flex flex-col gap-4 box-border animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
            <Sparkles size={17} color={c.accent} />
          </div>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold" style={{ color: c.textPrimary }}>
              Gerar fluxo com IA
            </h2>
            <p className="m-0 mt-[6px] text-[13px]" style={{ color: c.textSecondary }}>
              Descreva a jornada em linguagem natural. O fluxo gerado substitui o canvas atual como
              rascunho — nada é salvo até você clicar em Salvar.
            </p>
          </div>
        </div>
        <TextArea
          autoFocus
          disabled={generating}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: jornada de abertura de conta digital, com formulário de dados pessoais, validação de documento via serviço REST e uma etapa de aprovação com dois caminhos (aprovado/reprovado)."
          style={{ minHeight: 300 }}
        />
        {log.length > 0 && (
          <div
            ref={logRef}
            className="rounded-lg px-3 py-2 text-[12px] font-mono max-h-[220px] overflow-y-auto flex flex-col gap-[3px]"
            style={{ background: c.chipBg, border: `1px solid ${c.border}`, color: c.textSecondary }}
          >
            {log.map((line, i) => (
              <div key={i} style={line.error ? { color: c.danger, fontWeight: 600 } : undefined}>
                {line.text}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <SecondaryButton onClick={onCancel} disabled={generating}>
            Cancelar
          </SecondaryButton>
          <ButtonPrimary small onPress={() => onGenerate(prompt)} disabled={generating || !prompt.trim()} showSpinner={generating}>
            {generating ? 'Gerando...' : 'Gerar'}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
