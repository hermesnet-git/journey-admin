import { useMemo, useState } from 'react';
import { Search, Mail, HelpCircle } from 'lucide-react';
import { useAppTheme } from './theme';

interface FaqItem {
  topic: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    topic: 'produtos',
    question: 'Como cadastro um produto e seus canais?',
    answer:
      'Na tela Produtos, use "Novo produto" para criar o produto e, dentro dele, adicione os canais de atendimento (WEB, MOBILE, WHATSAPP, URA, CONTACT_CENTER ou OTHER).',
  },
  {
    topic: 'produtos',
    question: 'Posso remover um produto ou canal?',
    answer:
      'Produtos e canais não são removidos, apenas desativados. A desativação preserva jornadas e publicações já existentes.',
  },
  {
    topic: 'jornadas',
    question: 'O que é uma jornada?',
    answer:
      'Uma jornada representa o fluxo específico de um canal dentro de um produto, com seu próprio desenho de tela e formulários, publicada de forma independente das demais.',
  },
  {
    topic: 'jornadas',
    question: 'Consigo excluir uma jornada?',
    answer:
      'Somente jornadas que nunca foram publicadas podem ser excluídas fisicamente. Jornadas com histórico de publicação só podem ser desativadas.',
  },
  {
    topic: 'modelagem',
    question: 'Como funciona o editor visual de fluxo?',
    answer:
      'Arraste elementos da paleta para o canvas e conecte-os para montar o caminho da jornada. Todo fluxo precisa de exatamente um elemento inicial e um nó de término (END).',
  },
  {
    topic: 'modelagem',
    question: 'O que são as versões de uma jornada?',
    answer:
      'Cada alteração relevante pode gerar uma nova versão. Uma versão publicada é imutável; para levar mudanças ao ar, publique uma nova versão a partir do botão "Versões" no editor.',
  },
  {
    topic: 'formularios',
    question: 'Como associo um formulário a uma etapa da jornada?',
    answer:
      'Ao editar uma User Task no fluxo, selecione um formulário existente ou crie um novo sem sair do editor.',
  },
  {
    topic: 'formularios',
    question: 'Um formulário pode ser reutilizado em várias jornadas?',
    answer: 'Sim. O mesmo formulário pode ser associado a diferentes User Tasks, em diferentes jornadas.',
  },
];

const TOPIC_LABELS: Record<string, string> = {
  produtos: 'Produtos e Canais',
  jornadas: 'Jornadas',
  modelagem: 'Modelagem Visual e Versões',
  formularios: 'Formulários',
};

const SUPPORT_EMAIL = 'sustentacao@telefonica.com';

export function HelpPage() {
  const { colors: c } = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, FaqItem[]>();
    for (const item of filtered) {
      groups.set(item.topic, [...(groups.get(item.topic) ?? []), item]);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Ajuda e suporte
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Perguntas frequentes sobre o uso do Admin Portal
        </p>
      </div>

      <div className="relative w-full max-w-[380px] mb-6">
        <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
        <input
          aria-label="Buscar na ajuda"
          placeholder="Buscar dúvida..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
          style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
        />
      </div>

      <div className="flex flex-col gap-8 max-w-[720px]">
        {[...grouped.entries()].map(([topicKey, items]) => (
          <div key={topicKey}>
            <h2 className="m-0 mb-3 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
              {TOPIC_LABELS[topicKey] ?? topicKey}
            </h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.question} className="rounded-lg p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
                  <div className="text-[13.5px] font-semibold mb-1" style={{ color: c.textPrimary }}>
                    {item.question}
                  </div>
                  <div className="text-[13px] leading-[19px]" style={{ color: c.textSecondary }}>
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-[13px]" style={{ color: c.textMuted }}>
            Nenhuma dúvida encontrada para essa busca.
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-3 mt-8 p-4 rounded-lg max-w-[720px]"
        style={{ border: `1px solid ${c.border}`, background: c.chipBg }}
      >
        <HelpCircle size={18} style={{ color: c.textMuted }} />
        <div className="flex-1 text-[13px]" style={{ color: c.textSecondary }}>
          Não encontrou o que precisava? Entre em contato com o time de sustentação.
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-[6px] text-[13px] font-medium no-underline shrink-0"
          style={{ color: c.accent }}
        >
          <Mail size={15} />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
