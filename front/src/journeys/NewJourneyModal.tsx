import { useEffect, useRef, useState } from 'react';
import { Check, FilePlus2, GitBranch, Sparkles } from 'lucide-react';
import { Modal } from '../products/Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { ChannelTypeChecklist } from '../products/ChannelTypeChecklist';
import { listProducts, type ChannelType, type Product } from '../api/products';
import { createJourney, listJourneyTemplates, type Journey, type JourneyTemplate } from '../api/journeys';
import { generateFlow, updateFlow } from '../api/flows';
import { layoutFlowNodes } from '../flow-designer/model';
import { ApiClientError } from '../api/client';
import { useAppTheme } from '../shell/theme';

interface NewJourneyModalProps {
  onClose: () => void;
  onCreated: (journey: Journey) => void;
}

type StartMode = 'blank' | 'template' | 'ai';

interface AiLogEntry {
  text: string;
  error?: boolean;
}

// Cor de marca (Mística/Vivo) usada só no botão dos cards de template, pra reproduzir de perto o
// visual de referência (wf-designer) — o resto do modal continua no accent azul padrão do admin.
const TEMPLATE_ACCENT = '#8A05BE';

const TABS: { mode: StartMode; label: string }[] = [
  { mode: 'blank', label: 'Dados da jornada' },
  { mode: 'template', label: 'Template' },
  { mode: 'ai', label: 'IA' },
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

// TEMP (só teste visual): mesmos nome/descrição dos templates do wf-designer, sem fluxo real por
// trás — só pra ver a grade com várias opções antes de decidir quais valem virar template de verdade
// no backend. Remover quando isso for decidido.
const VISUAL_TEST_TEMPLATES: JourneyTemplate[] = [
  {
    templateId: '__test_cadastro',
    name: 'Integração de Cadastro',
    description: 'Cadastra o cliente via API e trata falhas de integração.',
  },
  {
    templateId: '__test_fila',
    name: 'Processamento em Fila',
    description: 'Publica uma mensagem em uma fila para processamento assíncrono.',
  },
  {
    templateId: '__test_autoatendimento',
    name: 'Autoatendimento: Falha na Internet Fixa',
    description: 'Portal de relacionamento verifica pendências, manutenções e diagnostica a rede antes de abrir um BD.',
  },
  {
    templateId: '__test_reclamacao',
    name: 'Resolução de Reclamação Multicanal',
    description: 'Triagem de reclamações com verificação de histórico, escalonamento e compensação ao cliente.',
  },
  {
    templateId: '__test_tecnico_campo',
    name: 'Manutenção de Fibra em Campo',
    description: 'Passo a passo guiado para o técnico atender, diagnosticar e reparar internet de fibra na casa do cliente.',
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se a geração falhar depois que a jornada em branco já foi criada, reaproveita a mesma jornada
  // na tentativa seguinte em vez de criar uma nova a cada clique em "Gerar e criar".
  const createdJourneyRef = useRef<Journey | null>(null);
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
    setSaving(true);
    setError(null);
    try {
      if (mode === 'ai') {
        const journey =
          createdJourneyRef.current ??
          (await createJourney({ productId, channelTypes, name, description }));
        createdJourneyRef.current = journey;
        const flow = await generateFlow(journey.journeyId, aiPrompt, (message) =>
          setAiLog((log) => [...log, { text: message }]),
        );
        await updateFlow(journey.journeyId, {
          name: flow.name,
          nodes: layoutFlowNodes(flow.nodes, flow.connections),
          connections: flow.connections,
          annotations: flow.annotations,
        });
        onCreated(journey);
        return;
      }
      const journey = await createJourney({
        productId,
        channelTypes,
        name,
        description,
        templateId: mode === 'template' ? templateId ?? undefined : undefined,
      });
      onCreated(journey);
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

  const baseFieldsValid = !!productId && channelTypes.length > 0 && !!name.trim() && !!description.trim();
  const canSubmit =
    mode === 'template'
      ? baseFieldsValid && !!templateId
      : mode === 'ai'
        ? baseFieldsValid && !!aiPrompt.trim()
        : baseFieldsValid;

  return (
    <Modal
      title="Nova jornada"
      subtitle="Defina os dados da jornada e escolha como começar: em branco, a partir de um exemplo ou com uma geração por IA."
      width={mode === 'ai' ? 640 : 460}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!canSubmit}>
            {mode === 'ai' ? 'Gerar e criar jornada' : 'Criar jornada'}
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
        <div className={`flex flex-col${mode === 'ai' ? ' flex-1 min-h-0' : ''}`}>
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
            <div className="mt-3 flex flex-col gap-3">
              <div className="text-[12.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                O fluxo já vem montado a partir do modelo escolhido, em uma versão Rascunho pronta pra você ajustar no editor.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...templates, ...VISUAL_TEST_TEMPLATES].map((template) => {
                  const selected = templateId === template.templateId;
                  return (
                    <button
                      key={template.templateId}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTemplateId(template.templateId)}
                      className="min-h-[112px] rounded-xl p-4 text-left cursor-pointer flex flex-col gap-[10px]"
                      style={{
                        border: `1px solid ${selected ? TEMPLATE_ACCENT : c.border}`,
                        outline: selected ? `2px solid ${TEMPLATE_ACCENT}` : 'none',
                        outlineOffset: -1,
                        background: selected ? c.accentSoft : c.surface,
                        color: c.textPrimary,
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[14.5px] font-bold">{template.name}</span>
                        {selected && <Check size={16} style={{ color: TEMPLATE_ACCENT, flexShrink: 0 }} />}
                      </span>
                      <span className="text-[12.5px] leading-[1.4] flex-1" style={{ color: c.textSecondary }}>
                        {template.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {templatesLoading && (
                <div className="mt-2 text-[11.5px]" style={{ color: c.textMuted }}>
                  Carregando modelos...
                </div>
              )}
              {templatesError && (
                <div className="mt-2 text-[11.5px]" style={{ color: c.warning }}>
                  {templatesError}
                </div>
              )}
              {!templatesLoading && !templatesError && templates.length === 0 && (
                <div className="mt-2 text-[11.5px]" style={{ color: c.textMuted }}>
                  Nenhum modelo disponível no momento.
                </div>
              )}
            </div>
          )}

          {mode === 'ai' && (
            <div className="mt-3 flex-1 min-h-0 flex flex-col gap-2">
              <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                Descreva a jornada em linguagem natural. O fluxo é gerado e já criado junto com a jornada.
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
                style={{ flex: 1, minHeight: 140, resize: 'none' }}
              />
              {aiLog.length > 0 && (
                <div
                  ref={logRef}
                  className="rounded-lg px-3 py-2 text-[12px] font-mono max-h-[160px] overflow-y-auto flex flex-col gap-[3px]"
                  style={{ background: c.chipBg, border: `1px solid ${c.border}`, color: c.textSecondary }}
                >
                  {aiLog.map((line, i) => (
                    <div key={i} style={line.error ? { color: c.danger, fontWeight: 600 } : undefined}>
                      {line.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
