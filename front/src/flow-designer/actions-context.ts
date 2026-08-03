import { createContext, useContext } from 'react';
import type { NodeType } from './model';

export interface WorkflowActions {
  onEdit: (nodeId: string) => void;
  onQuickAdd: (nodeId: string, type: NodeType) => void;
  onDelete: (nodeId: string) => void;
}

export const WorkflowActionsContext = createContext<WorkflowActions | null>(null);

export function useWorkflowActions() {
  const ctx = useContext(WorkflowActionsContext);
  if (!ctx) throw new Error('useWorkflowActions must be used within WorkflowActionsContext');
  return ctx;
}
