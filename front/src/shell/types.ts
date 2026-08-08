export type TabKind = 'placeholder' | 'products' | 'journeys' | 'forms' | 'audit';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
}
