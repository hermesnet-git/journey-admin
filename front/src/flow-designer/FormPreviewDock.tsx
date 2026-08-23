import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Pencil } from 'lucide-react';
import { useFlowTheme } from './theme';
import { FormPreview } from '../forms/FormBuilderPage';
import type { Form } from '../api/forms';

interface Props {
  nodeName: string;
  form: Form;
  onEdit: () => void;
}

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 640;
const DEFAULT_HEIGHT = 320;

// Painel "Preview" ancorado ao fundo do canvas (dentro do wrapper relative do ReactFlow, nunca
// sobre a paleta/PropertiesDock) — substitui o antigo rodapé "nome do formulário" que ficava dentro
// do próprio card da User Task. Segue a seleção diretamente (ver previewNode em
// JourneyDesignerPage): aparece assim que uma User Task com formulário é selecionada, some ao
// selecionar qualquer outra coisa — sem botão de fechar manual, não tem estado próprio pra fechar.
// O botão "Editar formulário" chama o mesmo onOpenForm que o link antigo chamava.
// Redimensionável só na vertical (arrasta a borda superior), espelhando o resize do PropertiesDock.
export function FormPreviewDock({ nodeName, form, onEdit }: Props) {
  const { c } = useFlowTheme();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startHeight: height };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e: PointerEvent) {
    if (!dragState.current) return;
    // Dock ancorado no fundo: arrastar a borda superior pra cima aumenta a altura.
    const next = dragState.current.startHeight - (e.clientY - dragState.current.startY);
    setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next)));
  }

  function onResizeEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-[1000] w-screen h-screen flex flex-col animate-[modal-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{ background: c.cardBg }}
      >
        <div
          className="shrink-0 px-6 py-[10px] flex items-center justify-between gap-3"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <div className="min-w-0 max-w-[720px] mx-auto w-full">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textSecondary }}>
              Preview
            </div>
            <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
              {nodeName}
            </div>
          </div>
          <button
            onClick={() => setExpanded(false)}
            title="Sair da tela cheia"
            className="shrink-0 w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <Minimize2 size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3">
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

  if (collapsed) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 w-full z-20 flex items-center justify-between gap-3 px-6 py-[10px]"
        style={{ background: c.cardBg, borderTop: `1px solid ${c.border}` }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textSecondary }}>
            Preview
          </div>
          <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
            {nodeName}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir preview"
          className="shrink-0 w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'transparent', color: c.textSecondary }}
        >
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 w-full z-20 flex flex-col"
      style={{
        height,
        background: c.cardBg,
        borderTop: `1px solid ${c.border}`,
        boxShadow: '0 -12px 32px -12px rgba(0,0,0,.3)',
      }}
    >
      <div
        onPointerDown={onResizeStart}
        title="Arrastar para redimensionar"
        className="absolute -top-[3px] left-0 right-0 h-[6px] cursor-row-resize z-10"
      />
      <div
        className="shrink-0 px-6 py-[10px] flex items-center justify-between gap-3"
        style={{ borderBottom: `1px solid ${c.border}` }}
      >
        <div className="min-w-0 max-w-[720px] mx-auto w-full">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textSecondary }}>
            Preview
          </div>
          <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
            {nodeName}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher preview"
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => setExpanded(true)}
            title="Expandir para tela cheia"
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center cursor-pointer border-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-3">
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
