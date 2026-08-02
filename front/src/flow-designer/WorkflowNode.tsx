import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { NODE_WIDTH, TYPE_COLOR, type NodeType, type WFNode } from './model';

const ICON: Record<NodeType, typeof Play> = { start: Play, userTask: ClipboardList, end: CheckCircle2 };

export function WorkflowNode({ id, data, selected, type }: NodeProps<WFNode>) {
  const nodeType = type as NodeType;
  const actions = useWorkflowActions();
  const Icon = ICON[nodeType];
  const hasInput = nodeType !== 'start';
  const hasOutput = nodeType !== 'end';

  return (
    <div
      onDoubleClick={() => actions.onEdit(id)}
      style={{ width: NODE_WIDTH }}
      className={`rounded-xl border bg-white px-[14px] py-3 cursor-grab select-none ${
        selected ? 'border-[#019DF4] ring-4 ring-[#019DF4]/15' : 'border-[#e4e4e7]'
      }`}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-[10px] !h-[10px] !bg-[#a1a1aa] !border-2 !border-[#a1a1aa]"
        />
      )}
      <div className="flex items-center gap-[10px]">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${TYPE_COLOR[nodeType]}22` }}
        >
          <Icon size={16} color={TYPE_COLOR[nodeType]} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#1a1a1a] truncate">{data.name}</div>
          <div className="text-[11.5px] text-[#71717a] truncate">{data.description}</div>
        </div>
      </div>
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-[10px] !h-[10px] !bg-[#a1a1aa] !border-2 !border-[#a1a1aa]"
        />
      )}
    </div>
  );
}
