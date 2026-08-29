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
  // Abas 'execution' abertas a partir do Dashboard (card "Execuções recentes") já nascem em modo
  // Histórico mostrando esta instância — cada clique ganha sua própria aba dedicada (nunca reaproveita
  // a aba "Execução & Diagnóstico" principal), pra não atrapalhar uma execução ao vivo em andamento
  // ali nem perder outro diagnóstico já aberto.
  initialHistoryInstanceId?: string;
}
