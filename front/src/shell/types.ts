export type TabKind = 'placeholder' | 'products' | 'journeys' | 'forms' | 'audit' | 'help';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
}
