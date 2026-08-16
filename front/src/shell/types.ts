export type TabKind = 'placeholder' | 'products' | 'journeys' | 'forms' | 'simulation' | 'audit' | 'help' | 'sobre';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
}
