import type { ClarificationQuestion } from '../api/flows';
import { useAppTheme } from '../shell/theme';

// Resposta do usuário a uma pergunta da IA: uma das respostas prontas (a primeira é a recomendada) ou o
// texto que ele escreveu no lugar.
export interface AiAnswer {
  choice: number | 'other';
  other: string;
}

// Uma decisão já tomada pelo usuário: a pergunta da IA e a resposta escolhida (ou escrita).
export interface AiDecision {
  question: string;
  answer: string;
  recommended: boolean;
}

export function currentDecisions(questions: ClarificationQuestion[], answers: AiAnswer[]): AiDecision[] {
  return questions.map((q, i) => ({
    question: q.question,
    answer: answerText(q, answers[i]),
    recommended: answers[i]?.choice === 0,
  }));
}

export function initialAnswers(questions: ClarificationQuestion[]): AiAnswer[] {
  // A resposta recomendada já vem marcada: aceitar tudo é só continuar.
  return questions.map(() => ({ choice: 0, other: '' }));
}

export function answerText(question: ClarificationQuestion, answer: AiAnswer): string {
  return answer.choice === 'other' ? answer.other.trim() : question.options[answer.choice]?.label ?? '';
}

export function answersComplete(questions: ClarificationQuestion[], answers: AiAnswer[]): boolean {
  return questions.every((q, i) => !!answers[i] && answerText(q, answers[i]) !== '');
}

// O que a IA recebe a cada chamada depois das perguntas: o pedido de antes mais todas as decisões, de todas as
// rodadas. A tela de resumo mostra exatamente isto, para o usuário ver o que será enviado.
export function buildEnrichedPrompt(original: string, decisions: AiDecision[]): string {
  const lines = decisions.map((d) => `- ${d.question} ${d.answer}`).join('\n');
  return `${original.trim()}\n\nDecisões do usuário:\n${lines}`;
}

interface FormProps {
  questions: ClarificationQuestion[];
  answers: AiAnswer[];
  onChange: (next: AiAnswer[]) => void;
  disabled?: boolean;
}

export function ClarificationForm({ questions, answers, onChange, disabled }: FormProps) {
  const { colors: c } = useAppTheme();
  const update = (index: number, patch: Partial<AiAnswer>) =>
    onChange(answers.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
        A IA precisa de mais informações para montar a jornada. A primeira resposta de cada pergunta é a recomendada;
        escolha outra ou escreva a sua.
      </div>
      {questions.map((q, qi) => {
        const answer = answers[qi] ?? { choice: 0, other: '' };
        return (
          <fieldset
            key={qi}
            className="rounded-lg p-3 flex flex-col gap-2 m-0"
            style={{ border: `1px solid ${c.border}`, background: c.surface }}
            disabled={disabled}
          >
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
              {q.header || `Pergunta ${qi + 1}`}
            </legend>
            <div className="text-[13px] font-semibold" style={{ color: c.textPrimary }}>
              {q.question}
            </div>
            {q.options.map((option, oi) => (
              <label key={oi} className="flex items-start gap-2 cursor-pointer text-[13px]" style={{ color: c.textPrimary }}>
                <input
                  type="radio"
                  name={`ai-question-${qi}`}
                  className="mt-[3px]"
                  checked={answer.choice === oi}
                  onChange={() => update(qi, { choice: oi })}
                />
                <span>
                  {option.label}
                  {oi === 0 && (
                    <span
                      className="ml-2 text-[10.5px] font-semibold px-2 py-[1px] rounded-full"
                      style={{ background: c.accentSoft, color: c.accent }}
                    >
                      Recomendada
                    </span>
                  )}
                  {option.description && (
                    <span className="block text-[12px]" style={{ color: c.textSecondary }}>
                      {option.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: c.textPrimary }}>
              <input
                type="radio"
                name={`ai-question-${qi}`}
                checked={answer.choice === 'other'}
                onChange={() => update(qi, { choice: 'other' })}
              />
              <span>Outra resposta</span>
              <input
                type="text"
                value={answer.other}
                maxLength={200}
                placeholder="Escreva aqui"
                onFocus={() => update(qi, { choice: 'other' })}
                onChange={(e) => update(qi, { choice: 'other', other: e.target.value })}
                className="flex-1 min-w-0 rounded-md px-2 py-1 text-[13px]"
                style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
              />
            </label>
          </fieldset>
        );
      })}
    </div>
  );
}

interface SummaryProps {
  original: string;
  decisions: AiDecision[];
}

export function ClarificationSummary({ original, decisions }: SummaryProps) {
  const { colors: c } = useAppTheme();
  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
        Este é o resumo do que será enviado à IA. Confira e gere; depois você revisa a jornada no editor antes de salvar.
      </div>
      <div className="rounded-lg p-3 flex flex-col gap-3" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
            Seu pedido
          </div>
          <div className="text-[13px] whitespace-pre-wrap" style={{ color: c.textPrimary }}>
            {original.trim()}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
            Suas decisões
          </div>
          <ul className="m-0 pl-5 text-[13px] flex flex-col gap-1" style={{ color: c.textPrimary }}>
            {decisions.map((d, i) => (
              <li key={i}>
                <span style={{ color: c.textSecondary }}>{d.question}</span> <strong>{d.answer}</strong>
                {d.recommended && (
                  <span className="ml-2 text-[10.5px] font-semibold px-2 py-[1px] rounded-full" style={{ background: c.accentSoft, color: c.accent }}>
                    Recomendada
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
