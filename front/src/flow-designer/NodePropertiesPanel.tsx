import { X } from 'lucide-react';
import { Field, TextInput, TextArea } from '../products/ui';
import { useFlowTheme } from './theme';
import { NODE_META, type WFNode, type WFNodeData } from './model';

export function NodePropertiesPanel({
  node,
  canDelete,
  onClose,
  onUpdate,
  onDelete,
}: {
  node: WFNode;
  canDelete: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onDelete: () => void;
}) {
  const { c } = useFlowTheme();

  return (
    <div className="w-[320px] shrink-0 border-l flex flex-col" style={{ background: c.cardBg, borderColor: c.border }}>
      <div className="flex items-center justify-between px-4 py-[14px] border-b" style={{ borderColor: c.border }}>
        <div>
          <div className="text-[15px] font-semibold" style={{ color: c.textPrimary }}>
            Propriedades
          </div>
          <div className="text-[12px]" style={{ color: c.textSecondary }}>
            {NODE_META[node.type as keyof typeof NODE_META].title}
          </div>
        </div>
        <button onClick={onClose} className="bg-transparent border-0 cursor-pointer" style={{ color: c.textSecondary }}>
          <X size={18} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4 flex-1 overflow-auto">
        <Field label="Nome">
          <TextInput value={node.data.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </Field>
        <Field label="Descrição" optional>
          <TextArea value={node.data.description} onChange={(e) => onUpdate({ description: e.target.value })} />
        </Field>
      </div>
      {canDelete && (
        <div className="p-4 border-t" style={{ borderColor: c.border }}>
          <button
            onClick={onDelete}
            className="w-full py-[10px] rounded-lg font-semibold text-[13.5px] border-0 cursor-pointer"
            style={{ background: c.dangerSoft, color: c.danger }}
          >
            Excluir nó
          </button>
        </div>
      )}
    </div>
  );
}
