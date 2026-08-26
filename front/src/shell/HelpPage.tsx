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
      'Produtos e canais não são removidos, apenas desativados. A desativação preserva jornadas e publicações já existentes, e fica bloqueada enquanto alguma jornada tiver publicação ativa.',
  },
  {
    topic: 'produtos',
    question: 'Como sei quantos canais e jornadas um produto tem?',
    answer:
      'A listagem de Produtos mostra a quantidade de canais de cada produto, e a listagem de canais mostra a quantidade de jornadas de cada canal, sem precisar entrar em cada um.',
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
      'Somente jornadas que nunca foram publicadas podem ser excluídas fisicamente. Jornadas com histórico de publicação são desativadas automaticamente ao excluir, preservando o registro de publicação; uma jornada desativada não pode mais ser editada nem excluída de novo.',
  },
  {
    topic: 'jornadas',
    question: 'O que significam os status de uma versão (DRAFT, PUBLISHED, UNPUBLISHED)?',
    answer:
      'DRAFT é a versão em edição, ainda não publicada. PUBLISHED é a versão ativa no runtime — só pode existir uma por jornada, e é imutável. UNPUBLISHED foi despublicada, mas mantém seu conteúdo preservado e pode ser republicada depois, sem perder nada.',
  },
  {
    topic: 'jornadas',
    question: 'Se eu editar uma jornada já publicada, isso muda o que está no ar?',
    answer:
      'Não. A edição é registrada numa versão DRAFT separada; o que está publicado só muda quando essa nova versão for publicada, a partir do botão "Versões" no editor.',
  },
  {
    topic: 'modelagem',
    question: 'Como funciona o editor visual de fluxo?',
    answer:
      'Arraste elementos da paleta para o canvas e conecte-os para montar o caminho da jornada. Todo fluxo precisa de exatamente um elemento inicial e um nó de término (END).',
  },
  {
    topic: 'modelagem',
    question: 'Como configuro uma integração REST ou Kafka num passo do fluxo?',
    answer:
      'Ao editar um Service Task ou Receive Task, configure o conector no painel de propriedades ou pelo assistente em etapas — os dois editam a mesma configuração. Dá para testar a chamada REST direto na tela e gerar o mapeamento de saída automaticamente a partir da resposta.',
  },
  {
    topic: 'modelagem',
    question: 'Dá para o fluxo seguir caminhos diferentes conforme uma resposta?',
    answer:
      'Sim, usando um nó de Gateway com duas saídas: uma condicional, que compara uma variável do fluxo, e uma padrão, usada quando a condição não é satisfeita.',
  },
  {
    topic: 'modelagem',
    question: 'Consigo gerar um fluxo automaticamente a partir de uma descrição?',
    answer:
      'Sim. Ao descrever o fluxo desejado em linguagem natural, o sistema monta um rascunho editável no canvas, preservando o que já estava desenhado quando o pedido for pontual. É preciso ter uma credencial de IA cadastrada no Catálogo de Integrações.',
  },
  {
    topic: 'formularios',
    question: 'Como associo um formulário a uma etapa da jornada?',
    answer:
      'Ao selecionar uma User Task no fluxo, o editor de tela abre automaticamente ancorado à base do canvas. Você pode importar os campos de um formulário existente do catálogo como ponto de partida, ou desenhar a tela direto ali.',
  },
  {
    topic: 'formularios',
    question: 'Qual a diferença entre o formulário do catálogo e a tela de uma User Task?',
    answer:
      'O formulário do catálogo é só um modelo de partida: ao usá-lo numa User Task, os campos são copiados para a tela do nó, sem manter vínculo — alterar o formulário depois não muda telas já copiadas dele, e vice-versa.',
  },
  {
    topic: 'formularios',
    question: 'Quais tipos de campo posso usar numa tela?',
    answer:
      'Texto, campo de entrada (texto, número, e-mail, data), seleção simples/múltipla, upload de arquivo, seção, radio, switch, escala numérica, avaliação por estrelas, contador, busca com sugestão, além de título, imagem, divisor, card e aviso.',
  },
  {
    topic: 'execucao',
    question: 'Como executo uma jornada para testar?',
    answer:
      'Na tela Executar, busque a jornada publicada desejada (o número da versão v<N> aparece na listagem) e inicie a execução ali mesmo, sem trocar de tela. A pré-visualização se adapta ao canal — por exemplo, layout de dispositivo móvel para jornadas de canal App.',
  },
  {
    topic: 'execucao',
    question: 'A execução roda contra um motor de teste separado?',
    answer:
      'Não. A execução roda contra o motor de runtime real, por isso a jornada precisa estar publicada. Integrações REST são emuladas por um serviço de mock; integrações Kafka publicam e consomem de verdade num broker Kafka real.',
  },
  {
    topic: 'execucao',
    question: 'O que acontece se uma integração falhar durante a execução?',
    answer:
      'O nó que causou a falha é destacado no diagrama, a falha fica registrada no log cronológico da execução, e a mensagem de erro completa pode ser consultada sob demanda, sem aparecer de forma intrusiva na tela.',
  },
  {
    topic: 'execucao',
    question: 'Preciso publicar mensagens Kafka manualmente durante o teste?',
    answer:
      'Por padrão não — a publicação e o consumo acontecem automaticamente. Se quiser controle manual naquela execução, dá para ativar isso ao iniciar a instância; também é possível pular qualquer etapa Kafka em espera quando o broker estiver indisponível.',
  },
  {
    topic: 'dashboard',
    question: 'O que o Dashboard mostra?',
    answer:
      'Visão em tempo real do motor de runtime: instâncias ativas, tarefas pendentes, incidentes abertos, jornadas implantadas e instâncias concluídas no dia, além de gráficos de tendência (24h/7d/30d) e de volume por jornada. É a primeira tela ao entrar no portal.',
  },
  {
    topic: 'dashboard',
    question: 'Consigo encerrar uma instância travada pelo Dashboard?',
    answer:
      'Sim. A lista de instâncias ativas há mais tempo permite selecionar uma ou várias e encerrá-las manualmente, com confirmação. A ação é restrita aos papéis EDITOR e ADMIN e fica registrada na auditoria.',
  },
  {
    topic: 'dashboard',
    question: 'Os dados do Dashboard atualizam sozinhos?',
    answer:
      'Sim, há atualização automática periódica, que pode ser desligada, além de um botão para atualizar manualmente a qualquer momento. O horário da última atualização fica sempre visível.',
  },
  {
    topic: 'integracoes',
    question: 'O que é o Catálogo de Integrações?',
    answer:
      'Um cadastro central, em Configurações > Integrações, de clusters/brokers de mensageria corporativos (Kafka, Event Hubs, Service Bus) e das referências de credencial usadas para acessá-los, reaproveitado pelos conectores de mensageria das jornadas.',
  },
  {
    topic: 'integracoes',
    question: 'A plataforma guarda o valor do segredo da credencial?',
    answer:
      'Não. Cada credencial é só uma referência (URI do Azure Key Vault + nome do secret); o valor real nunca é lido nem exibido pelo Admin Portal. A única exceção é a credencial de IA usada na geração assistida de fluxo, guardada em texto plano como pendência conhecida antes de produção.',
  },
  {
    topic: 'integracoes',
    question: 'Quem pode cadastrar clusters e credenciais?',
    answer:
      'Só o papel ADMIN cria, edita ou desativa entradas do catálogo. EDITOR pode selecionar um cluster e uma credencial já cadastrados ao configurar um conector numa jornada, mas não administra o catálogo.',
  },
  {
    topic: 'integracoes',
    question: 'Dá para testar se uma credencial funciona antes de usar?',
    answer:
      'Sim, o catálogo oferece um teste de conexão por par cluster + credencial, que valida alcançabilidade e permissão sem publicar ou consumir nenhuma mensagem real.',
  },
  {
    topic: 'acesso',
    question: 'Como funciona o login?',
    answer:
      'Na versão atual, a autenticação é mockada: entre com o usuário admin e senha admin, papel ADMIN. Ainda não há integração real com um provedor externo.',
  },
  {
    topic: 'acesso',
    question: 'Quais papéis existem e o que cada um pode fazer?',
    answer:
      'VIEWER só consulta; EDITOR cria e edita jornadas e versões, e publica; ADMIN tem acesso administrativo completo, incluindo o Catálogo de Integrações e a Auditoria. A permissão é sempre validada no backend, não só escondida na tela.',
  },
  {
    topic: 'acesso',
    question: 'Minha sessão pode expirar sozinha?',
    answer: 'Sim, por inatividade, após um período configurável. Ao expirar, é preciso entrar novamente.',
  },
  {
    topic: 'auditoria',
    question: 'O que fica registrado na auditoria?',
    answer:
      'Eventos relevantes de autenticação (login, logout, expiração), autorização (acesso negado) e de negócio: criação, alteração e desativação de produtos, canais e jornadas, versionamento, publicação/despublicação e alterações no Catálogo de Integrações — sempre com usuário, ação, resultado e data.',
  },
  {
    topic: 'auditoria',
    question: 'Consigo editar ou apagar um registro de auditoria?',
    answer:
      'Não. Os registros não são editáveis nem removidos por operações normais do sistema, e nunca armazenam senha, token ou outro dado sensível.',
  },
  {
    topic: 'auditoria',
    question: 'Quem pode consultar a auditoria?',
    answer:
      'O menu Auditoria só aparece para o papel ADMIN. É possível filtrar por usuário, ação, recurso, resultado e período, e pesquisar por recurso ou correlação.',
  },
];

const TOPIC_LABELS: Record<string, string> = {
  produtos: 'Produtos e Canais',
  jornadas: 'Jornadas',
  modelagem: 'Modelagem Visual e Conectores',
  formularios: 'Formulários',
  execucao: 'Execução',
  dashboard: 'Dashboard',
  integracoes: 'Catálogo de Integrações',
  acesso: 'Acesso e Permissões',
  auditoria: 'Auditoria',
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
