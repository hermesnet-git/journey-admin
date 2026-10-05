import { useEffect, useRef, useState } from 'react';
import { FilePlus2, GitBranch, Sparkles } from 'lucide-react';
import { FigmaIcon } from '../shared/FigmaIcon';
import { Modal } from '../products/Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { ChannelTypeChecklist } from '../products/ChannelTypeChecklist';
import { listProducts, type ChannelType, type Product } from '../api/products';
import { createJourney, deleteJourney, listJourneyTemplates, type Journey, type JourneyTemplate } from '../api/journeys';
import { generateFlow, type ClarificationQuestion, type Flow } from '../api/flows';
import { layoutFlowNodes, placeAnnotations } from '../flow-designer/layout';
import { readNodeDisplayMode } from '../flow-designer/nodeMode';
import { ApiClientError } from '../api/client';
import { useAppTheme } from '../shell/theme';
import { FigmaImportTab, type FigmaImportSelection } from './FigmaImportTab';
import {
  ClarificationForm,
  ClarificationSummary,
  answersComplete,
  buildEnrichedPrompt,
  currentDecisions,
  initialAnswers,
  type AiAnswer,
  type AiDecision,
} from './AiClarification';
import { TemplateGallery } from './TemplateGallery';
import { markTourPending } from '../flow-designer/notes';
import { buildFigmaFlow } from '../api/figma';

interface NewJourneyModalProps {
  onClose: () => void;
  // A jornada nasce no servidor, mas só vale depois do Salvar no editor: `draft` é o fluxo gerado (IA ou
  // Figma) que o editor abre como alteração ainda não salva.
  onCreated: (journey: Journey, draft?: Flow) => void;
}

type StartMode = 'blank' | 'template' | 'ai' | 'figma';

// Quando falta um dado decisivo, a IA pergunta, o usuário responde e confere o resumo; se ainda faltar algo, ela
// pergunta de novo (quantas rodadas forem necessárias, até um limite no servidor), e só então gera.
type AiStage = 'prompt' | 'questions' | 'summary';

interface AiLogEntry {
  text: string;
  error?: boolean;
}

// Cor por tipo de linha do log da IA: sucesso (verde), problema apontado pelo validador (âmbar), pedido de correção
// (azul), erro (vermelho) e andamento normal (cinza).
function logTone(line: AiLogEntry, c: ReturnType<typeof useAppTheme>['colors']): { color: string; fontWeight?: number } {
  if (line.error) return { color: c.danger, fontWeight: 600 };
  if (/jornada válida/.test(line.text)) return { color: c.success, fontWeight: 600 };
  if (/^Pedindo correção/.test(line.text)) return { color: c.accent, fontWeight: 600 };
  if (/^Tentativa d+: /.test(line.text) && !/(resposta recebida|montando a jornada)/.test(line.text)) return { color: c.warning };
  return { color: c.textSecondary };
}

// O log ocupa o espaço que sobra do modal (o campo do pedido tem a altura que o usuário definir).
function AiLogBox({ entries, logRef }: { entries: AiLogEntry[]; logRef: React.RefObject<HTMLDivElement | null> }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      ref={logRef}
      className="rounded-lg px-3 py-2 text-[12px] font-mono overflow-y-auto flex flex-col gap-[3px] flex-1 min-h-[80px]"
      style={{ background: c.chipBg, border: `1px solid ${c.border}` }}
    >
      {entries.map((line, i) => (
        <div key={i} style={logTone(line, c)}>
          {line.text}
        </div>
      ))}
    </div>
  );
}

const TABS: { mode: StartMode; label: string }[] = [
  { mode: 'blank', label: 'Dados da jornada' },
  { mode: 'template', label: 'Template' },
  { mode: 'ai', label: 'IA' },
  { mode: 'figma', label: 'Figma' },
];

const AI_PROMPT_EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: 'Simples',
    prompt:
      'Consulta de fatura: solicita CPF/CNPJ e código do contrato, busca a fatura em aberto via API de billing e exibe valor e data de vencimento ao cliente.',
  },
  {
    label: 'Média',
    prompt:
      'Troca de plano: consulta o plano atual do cliente via API, lista os planos disponíveis para upgrade ou downgrade, exige aprovação de um atendente quando o novo plano custa mais que o atual, e confirma a alteração chamando a API de contratação.',
  },
  {
    label: 'Alta',
    prompt:
      'Diagnóstico de falha na internet fixa: identifica o cliente pelo CPF/CNPJ e contrato, verifica pendências financeiras, checa manutenção programada ou preventiva na região, executa diagnóstico remoto de sinal e equipamento, e conforme o resultado abre um bilhete de defeito com prazo estimado ou confirma a normalização diretamente com o cliente.',
  },
];

export function NewJourneyModal({ onClose, onCreated }: NewJourneyModalProps) {
  const { colors: c } = useAppTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<JourneyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<StartMode>('blank');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLog, setAiLog] = useState<AiLogEntry[]>([]);
  const [aiStage, setAiStage] = useState<AiStage>('prompt');
  const [aiQuestions, setAiQuestions] = useState<ClarificationQuestion[]>([]);
  const [aiAnswers, setAiAnswers] = useState<AiAnswer[]>([]);
  // Decisões das rodadas anteriores (as da rodada em andamento ficam em aiAnswers) e quantas rodadas já foram respondidas.
  const [aiHistory, setAiHistory] = useState<AiDecision[]>([]);
  const [aiRounds, setAiRounds] = useState(0);
  const [figmaSelection, setFigmaSelection] = useState<FigmaImportSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se a geração falhar depois que a jornada em branco já foi criada, reaproveita a mesma jornada
  // na tentativa seguinte em vez de criar uma nova a cada clique em "Gerar e criar". Se o modal for
  // fechado sem a jornada ter sido entregue ao editor, ela é excluída: criar e cancelar não deixa rastro.
  const createdJourneyRef = useRef<Journey | null>(null);

  function handleClose() {
    const abandoned = createdJourneyRef.current;
    createdJourneyRef.current = null;
    if (abandoned) {
      deleteJourney(abandoned.journeyId).catch(() => undefined);
    }
    onClose();
  }

  // Entrega a jornada ao editor: deste ponto em diante quem decide entre salvar e descartar é ele.
  function deliver(journey: Journey, draft?: Flow) {
    createdJourneyRef.current = null;
    onCreated(journey, draft);
  }
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProducts({ status: 'ACTIVE' }).then(setProducts);
    listJourneyTemplates()
      .then(setTemplates)
      .catch(() => setTemplatesError('Não foi possível carregar os modelos. A criação em branco continua disponível.'))
      .finally(() => setTemplatesLoading(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [aiLog]);

  const selectedProduct = products.find((p) => p.productId === productId) ?? null;

  useEffect(() => {
    setChannelTypes([]);
  }, [productId]);

  function selectMode(next: StartMode) {
    setMode(next);
    setError(null);
  }

  async function submit() {
    if (mode === 'ai' && aiStage === 'questions') {
      setAiStage('summary');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === 'figma' && figmaSelection) {
        const built = await buildFigmaFlow({
          nodeIds: figmaSelection.scopes.map((scope) => scope.nodeId),
          // Com um trecho só, o nome dele já diz do que a jornada trata; com vários, o nome que o
          // usuário deu à jornada é mais fiel do que emendar os nomes dos trechos.
          name: figmaSelection.scopes.length === 1 ? figmaSelection.scopes[0].name : name,
          mergeRepeated: figmaSelection.mergeRepeated,
          includeScreens: figmaSelection.includeScreens,
          file: figmaSelection.file,
          fileKey: figmaSelection.fileKey,
          token: figmaSelection.token,
        });
        // Mesmo caminho da geração por IA: a jornada nasce vazia e o fluxo montado abre no editor como
        // alteração ainda não salva, que o usuário revisa e confirma no Salvar.
        const journey =
          createdJourneyRef.current ?? (await createJourney({ productId, channelTypes, name, description }));
        createdJourneyRef.current = journey;
        deliver(journey, {
          flowId: '',
          journeyId: journey.journeyId,
          name: built.name,
          // Organiza igual à geração por IA. As posições que vêm do desenho são fiéis a ele, mas
          // numa escala que o editor não comporta: um desenho se espalha por dezenas de milhares
          // de pixels, e trazer isso vira um canvas vazio e grande demais para navegar.
          nodes: await layoutFlowNodes(built.nodes, built.connections, readNodeDisplayMode('editor')),
          connections: built.connections,
          annotations: [],
          sections: [],
          layoutMode: readNodeDisplayMode('editor'),
        });
        return;
      }
      if (mode === 'ai') {
        const journey =
          createdJourneyRef.current ??
          (await createJourney({ productId, channelTypes, name, description }));
        createdJourneyRef.current = journey;
        const confirming = aiStage === 'summary';
        const decisions = confirming ? [...aiHistory, ...currentDecisions(aiQuestions, aiAnswers)] : [];
        const rounds = confirming ? aiRounds + 1 : 0;
        const outcome = await generateFlow(
          journey.journeyId,
          confirming ? buildEnrichedPrompt(aiPrompt, decisions) : aiPrompt,
          (message) => setAiLog((log) => [...log, { text: message }]),
          rounds,
        );
        if (outcome.kind === 'questions') {
          // Ainda falta algo: as decisões até aqui entram no histórico e a próxima rodada de perguntas aparece.
          setAiHistory(decisions);
          setAiRounds(rounds);
          setAiQuestions(outcome.questions);
          setAiAnswers(initialAnswers(outcome.questions));
          setAiStage('questions');
          setAiLog([]);
          setSaving(false);
          return;
        }
        const flow = outcome.flow;
        const laidOut = await layoutFlowNodes(flow.nodes, flow.connections, readNodeDisplayMode('editor'), flow.sections);
        deliver(journey, {
          flowId: '',
          journeyId: journey.journeyId,
          name: flow.name,
          nodes: laidOut,
          connections: flow.connections,
          annotations: placeAnnotations(flow.annotations, laidOut),
          sections: flow.sections,
          layoutMode: readNodeDisplayMode('editor'),
        });
        return;
      }
      const journey = await createJourney({
        productId,
        channelTypes,
        name,
        description,
        templateId: mode === 'template' ? templateId ?? undefined : undefined,
      });
      if (mode === 'template' && templateId) markTourPending(journey.journeyId);
      deliver(journey);
    } catch (err) {
      // Erro na geração por IA fica no log inline (a jornada em branco já criada é reaproveitada
      // na próxima tentativa); qualquer outro erro usa o banner padrão do formulário.
      if (mode === 'ai') {
        const messages =
          err instanceof ApiClientError && err.details?.length
            ? err.details.map((d) => d.message)
            : [err instanceof Error ? err.message : 'Erro ao gerar fluxo.'];
        setAiLog((log) => [...log, ...messages.map((text) => ({ text, error: true }))]);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar jornada');
      }
      setSaving(false);
    }
  }

  function goBackInAiFlow() {
    if (aiStage === 'summary') {
      setAiStage('questions');
      return;
    }
    // Voltar ao pedido recomeça a conversa: as decisões antigas eram sobre o pedido de antes.
    setAiHistory([]);
    setAiRounds(0);
    setAiStage('prompt');
  }

  const baseFieldsValid = !!productId && channelTypes.length > 0 && !!name.trim() && !!description.trim();
  const canSubmit =
    mode === 'template'
      ? baseFieldsValid && !!templateId
      : mode === 'figma'
        ? baseFieldsValid && !!figmaSelection
        : mode === 'ai'
          ? baseFieldsValid && !!aiPrompt.trim() && (aiStage !== 'questions' || answersComplete(aiQuestions, aiAnswers))
          : baseFieldsValid;

  return (
    <Modal
      title="Nova jornada"
      subtitle="Defina os dados da jornada e escolha como começar: em branco, a partir de um exemplo, com uma geração por IA ou a partir de um arquivo de design."
      width={mode === 'template' ? 1120 : mode === 'ai' || mode === 'figma' ? 640 : 460}
      onClose={handleClose}
      footer={
        <>
          <SecondaryButton onClick={handleClose}>Cancelar</SecondaryButton>
          {mode === 'ai' && aiStage !== 'prompt' && (
            <SecondaryButton onClick={goBackInAiFlow}>
              {aiStage === 'summary' ? 'Voltar às perguntas' : 'Editar pedido'}
            </SecondaryButton>
          )}
          <PrimaryButton onClick={submit} loading={saving} disabled={!canSubmit}>
            {mode === 'ai'
              ? aiStage === 'questions'
                ? 'Continuar'
                : 'Gerar e criar jornada'
              : mode === 'figma'
                ? 'Importar e criar jornada'
                : 'Criar jornada'}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4 flex-1 min-h-0"
      >
        <div className={`flex flex-col${mode !== 'blank' ? ' flex-1 min-h-0' : ''}`}>
          <div className="flex gap-1 border-b" style={{ borderColor: c.border }}>
            {TABS.map((tab) => {
              const active = mode === tab.mode;
              const disabled = tab.mode !== 'blank' && !baseFieldsValid;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={disabled}
                  title={disabled ? 'Preencha produto, nome, descrição e canais em "Dados da jornada" primeiro' : undefined}
                  onClick={() => selectMode(tab.mode)}
                  className="px-3 py-[8px] text-[13px] font-semibold bg-transparent border-0 border-b-2 -mb-px flex items-center gap-[6px] disabled:cursor-not-allowed"
                  style={{
                    borderBottomColor: active ? c.accent : 'transparent',
                    color: active ? c.accent : c.textSecondary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  {tab.mode === 'blank' && <FilePlus2 size={14} />}
                  {tab.mode === 'template' && <GitBranch size={14} />}
                  {tab.mode === 'ai' && <Sparkles size={14} />}
                  {tab.mode === 'figma' && <FigmaIcon size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {mode === 'blank' && (
            <div className="mt-3 flex flex-col gap-4">
              <div className="text-[12.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                O fluxo começa vazio com uma versão Rascunho e você desenha cada etapa no editor.
              </div>
              <Field label="Produto">
                <SelectInput value={productId} onChange={(e) => setProductId(e.target.value)} autoFocus>
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Nome da jornada">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
              </Field>
              <Field label="Descrição">
                <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field label="Canais" helperText="A jornada roda o mesmo fluxo e as mesmas telas em todos os canais marcados.">
                {selectedProduct ? (
                  <ChannelTypeChecklist options={selectedProduct.channelTypes} selected={channelTypes} onChange={setChannelTypes} />
                ) : (
                  <div style={{ fontSize: 13 }}>Selecione um produto primeiro.</div>
                )}
              </Field>
            </div>
          )}

          {mode === 'template' && (
            <div className="mt-3 flex-1 min-h-0 flex flex-col gap-3">
              <div className="text-[12.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                Comece a partir de um exemplo completo: o fluxo, as telas e as integrações já vêm montados numa versão Rascunho, com notas no editor explicando cada parte.
              </div>
              <TemplateGallery
                templates={templates}
                loading={templatesLoading}
                error={templatesError}
                selectedId={templateId}
                onSelect={setTemplateId}
                journeyChannels={channelTypes}
              />
            </div>
          )}

          {/* Fica montado mesmo fora da aba ativa: o que já foi lido do arquivo sobrevive a uma ida
              e volta em "Dados da jornada", sem obrigar a ler tudo de novo. */}
          <div hidden={mode !== 'figma'} className="flex-1 min-h-0 flex flex-col">
            <FigmaImportTab disabled={saving} channelOptions={channelTypes} onChange={setFigmaSelection} />
          </div>

          {mode === 'ai' && aiStage === 'questions' && (
            <div className="mt-3 flex-1 min-h-0 flex flex-col">
              <ClarificationForm questions={aiQuestions} answers={aiAnswers} onChange={setAiAnswers} disabled={saving} />
            </div>
          )}
          {mode === 'ai' && aiStage === 'summary' && (
            <div className="mt-3 flex-1 min-h-0 flex flex-col gap-2">
              <ClarificationSummary original={aiPrompt} decisions={[...aiHistory, ...currentDecisions(aiQuestions, aiAnswers)]} />
              {aiLog.length > 0 && <AiLogBox entries={aiLog} logRef={logRef} />}
            </div>
          )}
          {mode === 'ai' && aiStage === 'prompt' && (
            <div className="mt-3 flex-1 min-h-0 flex flex-col gap-2">
              <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                Descreva a jornada em linguagem natural. A IA monta as etapas, as telas e as integrações, e a jornada já nasce em Rascunho para você revisar. O que depende do ambiente, como mensageria e endereços de API, fica anotado no editor.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11.5px]" style={{ color: c.textMuted }}>
                  Exemplos pra usar ou se inspirar:
                </span>
                {AI_PROMPT_EXAMPLES.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    disabled={saving}
                    onClick={() => setAiPrompt(example.prompt)}
                    className="px-[10px] py-[4px] rounded-full text-[11.5px] font-semibold cursor-pointer disabled:cursor-not-allowed"
                    style={{ border: `1px solid ${c.border}`, color: c.textSecondary, background: c.surface }}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
              <TextArea
                disabled={saving}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex.: jornada de abertura de conta digital, com formulário de dados pessoais, validação de documento via serviço REST e uma etapa de aprovação com dois caminhos (aprovado/reprovado)."
                className="placeholder:text-[inherit] placeholder:opacity-100"
                style={{ height: 140, minHeight: 80, flexShrink: 0, resize: 'vertical', color: c.textSecondary }}
              />
              {aiLog.length > 0 && <AiLogBox entries={aiLog} logRef={logRef} />}
            </div>
          )}
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
