export type TabKind = 'placeholder' | 'dashboard' | 'products' | 'journeys' | 'forms' | 'execution' | 'audit' | 'help' | 'sobre' | 'catalog';

export interface Tab {
  key: string;
  title: string;
  kind: TabKind;
  closable: boolean;
  // Abas 'forms' abertas a partir do designer de jornada (via formulário vinculado a uma User Task,
  // ou "novo formulário") vão direto pro modo de edição de um formulário em vez da lista, e se
  // fecham voltando pra `returnToKey` ao salvar/cancelar em vez de cair de volta na lista.
  formId?: string;
  openNew?: boolean;
  returnToKey?: string;
}
