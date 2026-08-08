export type TabKind = 'placeholder' | 'products' | 'journeys' | 'forms';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
}
