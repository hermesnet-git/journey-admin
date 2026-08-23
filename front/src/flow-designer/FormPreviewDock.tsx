import { Pencil } from 'lucide-react';
import { useFlowTheme } from './theme';
import { FormPreview } from '../forms/FormBuilderPage';
import type { Form } from '../api/forms';

interface Props {
  nodeName: string;
  form: Form;
  onEdit: () => void;
}

// Painel "Preview" ancorado ao fundo do canvas (dentro do wrapper relative do ReactFlow, nunca
// sobre a paleta/PropertiesDock) — substitui o antigo rodapé "nome do formulário" que ficava dentro
// do próprio card da User Task. Segue a seleção diretamente (ver previewNode em
// JourneyDesignerPage): aparece assim que uma User Task com formulário é selecionada, some ao
// selecionar qualquer outra coisa — sem botão de fechar manual, não tem estado próprio pra fechar.
// O botão "Editar formulário" chama o mesmo onOpenForm que o link antigo chamava.
export function FormPreviewDock({ nodeName, form, onEdit }: Props) {
  const { c } = useFlowTheme();
  return (
    <div
      className="absolute bottom-0 left-0 right-0 w-full z-20 flex flex-col"
      style={{
        maxHeight: '45%',
        background: c.cardBg,
        borderTop: `1px solid ${c.border}`,
        boxShadow: '0 -12px 32px -12px rgba(0,0,0,.3)',
      }}
    >
      <div className="shrink-0 px-6 py-[10px]" style={{ borderBottom: `1px solid ${c.border}` }}>
        <div className="min-w-0 max-w-[720px] mx-auto w-full">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textSecondary }}>
            Preview
          </div>
          <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
            {nodeName}
          </div>
        </div>
      </div>
      <div className="overflow-y-auto px-6 py-3">
        <div className="max-w-[720px] mx-auto">
          <FormPreview name={form.name} description={form.description ?? ''} fields={form.fields} />
        </div>
      </div>
      <div className="shrink-0 px-6 py-[10px]" style={{ borderTop: `1px solid ${c.border}` }}>
        <div className="max-w-[720px] mx-auto">
          <button
            onClick={onEdit}
            className="flex items-center gap-[6px] text-[12.5px] font-semibold border-0 bg-transparent cursor-pointer"
            style={{ color: c.accent }}
          >
            <Pencil size={12} /> Editar formulário
          </button>
        </div>
      </div>
    </div>
  );
}
