import { createContext, useContext } from 'react';
import type { NodeType } from './model';
import type { Form } from '../api/forms';

export interface WorkflowActions {
  onEdit: (nodeId: string) => void;
  onQuickAdd: (nodeId: string, type: NodeType) => void;
  onDelete: (nodeId: string) => void;
  onOpenForm: (formId: string) => void;
  getFormName: (formId: string) => string | undefined;
  getForm: (formId: string) => Form | undefined;
  onUpdateAnnotationText: (annotationId: string, text: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onUnlinkAnnotation: (annotationId: string, nodeId: string) => void;
  getNodeName: (nodeId: string) => string | undefined;
}

export const WorkflowActionsContext = createContext<WorkflowActions | null>(null);

export function useWorkflowActions() {
  const ctx = useContext(WorkflowActionsContext);
  if (!ctx) throw new Error('useWorkflowActions must be used within WorkflowActionsContext');
  return ctx;
}
