import { useEffect, useState } from 'react';
import { FilePlus2, GitBranch } from 'lucide-react';
import { Modal } from '../products/Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { ChannelTypeChecklist } from '../products/ChannelTypeChecklist';
import { listProducts, type ChannelType, type Product } from '../api/products';
import { createJourney, listJourneyTemplates, type Journey, type JourneyTemplate } from '../api/journeys';
import { useAppTheme } from '../shell/theme';

interface NewJourneyModalProps {
  onClose: () => void;
  onCreated: (journey: Journey) => void;
}

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
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts({ status: 'ACTIVE' }).then(setProducts);
    listJourneyTemplates()
      .then(setTemplates)
      .catch(() => setTemplatesError('Não foi possível carregar os modelos. A criação em branco continua disponível.'))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const selectedProduct = products.find((p) => p.productId === productId) ?? null;

  useEffect(() => {
    setChannelTypes([]);
  }, [productId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const journey = await createJourney({
        productId,
        channelTypes,
        name,
        description,
        templateId: templateId ?? undefined,
      });
      onCreated(journey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar jornada');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nova jornada"
      subtitle="Informe os dados da jornada antes de desenhar o fluxo"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton
            onClick={submit}
            loading={saving}
            disabled={!productId || channelTypes.length === 0 || !name.trim() || !description.trim()}
          >
            Criar jornada
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
        className="flex flex-col gap-4"
      >
        <Field label="Como deseja começar?" helperText="O modelo preenche somente o fluxo. Os dados da jornada continuam sendo os informados abaixo.">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={templateId === null}
              onClick={() => setTemplateId(null)}
              className="min-h-[108px] rounded-xl p-3 text-left cursor-pointer flex flex-col gap-2"
              style={{
                border: `1px solid ${templateId === null ? c.accent : c.border}`,
                background: templateId === null ? c.accentSoft : c.surface,
                color: c.textPrimary,
              }}
            >
              <FilePlus2 size={18} style={{ color: templateId === null ? c.accent : c.textSecondary }} />
              <span className="text-[13px] font-semibold">Em branco</span>
              <span className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
                Comece com o canvas vazio e adicione cada etapa manualmente.
              </span>
            </button>
            {templates.map((template) => {
              const selected = templateId === template.templateId;
              return (
                <button
                  key={template.templateId}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTemplateId(template.templateId)}
                  className="min-h-[108px] rounded-xl p-3 text-left cursor-pointer flex flex-col gap-2"
                  style={{
                    border: `1px solid ${selected ? c.accent : c.border}`,
                    background: selected ? c.accentSoft : c.surface,
                    color: c.textPrimary,
                  }}
                >
                  <GitBranch size={18} style={{ color: selected ? c.accent : c.textSecondary }} />
                  <span className="text-[13px] font-semibold">{template.name}</span>
                  <span className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
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
        </Field>
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
        <Field label="Canais" helperText="A jornada roda o mesmo fluxo e as mesmas telas em todos os canais marcados.">
          {selectedProduct ? (
            <ChannelTypeChecklist options={selectedProduct.channelTypes} selected={channelTypes} onChange={setChannelTypes} />
          ) : (
            <div style={{ fontSize: 13 }}>Selecione um produto primeiro.</div>
          )}
        </Field>
        <Field label="Nome da jornada">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Descrição">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
