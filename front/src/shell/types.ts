export type TabKind = 'placeholder' | 'dashboard' | 'products' | 'journeys' | 'forms' | 'simulation' | 'audit' | 'help' | 'sobre';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
}
