import { X } from 'lucide-react';
import { Field, TextInput, TextArea } from '../products/ui';
import { NODE_META, type WFNode, type WFNodeData } from './model';

export function NodePropertiesPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: {
  node: WFNode;
  onClose: () => void;
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onDelete: () => void;
}) {
  const canDelete = node.type !== 'start' && node.type !== 'end';

  return (
    <div className="w-[320px] shrink-0 border-l border-[#e4e4e7] bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-[14px] border-b border-[#f4f4f5]">
        <div>
          <div className="text-[15px] font-semibold">Propriedades</div>
          <div className="text-[12px] text-[#71717a]">{NODE_META[node.type as keyof typeof NODE_META].title}</div>
        </div>
        <button onClick={onClose} className="text-[#71717a] bg-transparent border-0 cursor-pointer">
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
        <div className="p-4 border-t border-[#f4f4f5]">
          <button
            onClick={onDelete}
            className="w-full py-[10px] rounded-lg bg-[#fef2f2] text-[#dc2626] font-semibold text-[13.5px] border-0 cursor-pointer"
          >
            Excluir nó
          </button>
        </div>
      )}
    </div>
  );
}
