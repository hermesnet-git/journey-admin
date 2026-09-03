import type { JourneySummary } from '../execution/api';

export type TabKind =
  | 'placeholder'
  | 'dashboard'
  | 'products'
  | 'journeys'
  | 'forms'
  | 'execution'
  | 'diagnostico'
  | 'audit'
  | 'help'
  | 'sobre'
  | 'catalog';

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
  // Abas 'diagnostico' abertas a partir do card "Execuções recentes" do Dashboard já nascem
  // mostrando o detalhe desta instância, em vez da busca em branco — cada clique ganha sua própria
  // aba dedicada.
  initialInstanceId?: string;
  // Abas 'execution' abertas via "Executar jornada" no grid de Jornadas já nascem com essa jornada
  // selecionada (StartPanel visível, pronta pra clicar Executar), em vez da busca em branco — cada
  // clique ganha sua própria aba dedicada.
  initialJourney?: JourneySummary;
}
