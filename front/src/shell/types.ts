import type { JourneySummary } from '../execution/api';

export type TabKind =
  | 'placeholder'
  | 'dashboard'
  | 'products'
  | 'journeys'
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
  // Abas 'diagnostico' abertas a partir do card "Execuções recentes" do Dashboard já nascem
  // mostrando o detalhe desta instância, em vez da busca em branco — cada clique ganha sua própria
  // aba dedicada.
  initialInstanceId?: string;
  // Abas 'execution' abertas via "Executar jornada" no grid de Jornadas já nascem com essa jornada
  // selecionada (StartPanel visível, pronta pra clicar Executar), em vez da busca em branco — cada
  // clique ganha sua própria aba dedicada.
  initialJourney?: JourneySummary;
}
