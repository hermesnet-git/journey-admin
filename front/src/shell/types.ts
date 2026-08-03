export type TabKind = 'dashboard' | 'detail' | 'placeholder' | 'products' | 'journeys' | 'forms';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  workflowId?: string;
  closable: boolean;
}
