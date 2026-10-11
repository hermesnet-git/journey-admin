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
  | 'catalog'
  | 'component-catalog';

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
  // Abas 'journeys': jornada aberta no editor desta aba (ausente = aba mostrando a lista). O menu
  // "Jornadas" reaproveita uma aba com a lista e uma jornada só fica aberta numa aba por vez.
  editingJourneyId?: string;
  // O que se perde ao fechar a aba: jornada nova ainda não salva ou alterações não salvas.
  unsaved?: 'new' | 'changes';
}
