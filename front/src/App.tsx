import { useEffect, useState } from 'react';
import { ThemeContextProvider, getSkinByName } from '@telefonica/mistica';
import type { KnownSkinName } from '@telefonica/mistica';
import { Sidebar } from './shell/Sidebar';
import { TabBar } from './shell/TabBar';
import { PlaceholderPanel } from './shell/PlaceholderPanel';
import { DashboardPage } from './dashboard/DashboardPage';
import { ProductsPage } from './products/ProductsPage';
import { CatalogPage } from './catalog/CatalogPage';
import { JourneysPage } from './journeys/JourneysPage';
import { ExecutionsPage } from './execution/ExecutionsPage';
import { DiagnosticoPage } from './diagnostics/DiagnosticoPage';
import { AuditPage } from './audit/AuditPage';
import { AppThemeContext, LIGHT_APP_COLORS, DARK_APP_COLORS } from './shell/theme';
import type { Tab } from './shell/types';
import type { JourneySummary } from './execution/api';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { HelpPage } from './shell/HelpPage';
import { SobrePage } from './shell/SobrePage';
import { APP_VERSION } from './shell/appInfo';
import { AppErrorBoundary } from './shell/AppErrorBoundary';

const DASHBOARD_TAB: Tab = { key: 'dashboard', title: 'Dashboard', kind: 'dashboard', closable: false };
const JOURNEYS_TAB: Tab = { key: 'jornadas', title: 'Jornadas', kind: 'journeys', closable: true };
const PRODUCTS_TAB: Tab = { key: 'produtos', title: 'Produtos', kind: 'products', closable: true };
const CATALOG_TAB: Tab = { key: 'integracoes', title: 'Catálogo de Integrações', kind: 'catalog', closable: true };
const EXECUCOES_TAB: Tab = { key: 'execucoes', title: 'Execução', kind: 'execution', closable: true };
const DIAGNOSTICO_TAB: Tab = { key: 'diagnostico', title: 'Diagnóstico', kind: 'diagnostico', closable: true };
const AUDIT_TAB: Tab = { key: 'auditoria', title: 'Auditoria', kind: 'audit', closable: true };
const HELP_TAB: Tab = { key: 'ajuda', title: 'Ajuda e suporte', kind: 'help', closable: true };
const SOBRE_TAB: Tab = { key: 'sobre', title: `Sobre ${APP_VERSION}`, kind: 'sobre', closable: true };

const NAV_LABELS: Record<string, string> = {
  aprovacoes: 'Aprovações',
};

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  // Padrão claro ao logar (pedido explícito) — sem persistência ainda (não tinha antes também: o
  // toggle nunca sobrevivia a um reload, só o valor inicial mudava).
  const [dark, setDark] = useState(false);
  const colors = dark ? DARK_APP_COLORS : LIGHT_APP_COLORS;
  const [skinName, setSkinName] = useState<KnownSkinName>('Blau');
  const skin = getSkinByName(skinName);
  const [tabs, setTabs] = useState<Tab[]>([DASHBOARD_TAB]);
  const [activeKey, setActiveKey] = useState('dashboard');

  // O AppShell continua montado entre logout/login (só a <LoginPage> troca de lugar), então sem
  // isso as abas abertas da sessão anterior — incluindo jornadas/formulários em edição — ficariam
  // ali pro próximo que logar. Deslogar deveria parecer que a sessão realmente terminou.
  useEffect(() => {
    if (!isAuthenticated) {
      setTabs([DASHBOARD_TAB]);
      setActiveKey('dashboard');
    }
  }, [isAuthenticated]);

  function openTab(tab: Tab) {
    setTabs((prev) => (prev.some((t) => t.key === tab.key) ? prev : [...prev, tab]));
    setActiveKey(tab.key);
  }

  function closeTab(key: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.key !== key);
      if (activeKey === key) {
        setActiveKey(next[next.length - 1]?.key ?? 'dashboard');
      }
      return next;
    });
  }

  function handleNavigate(navKey: string) {
    if (navKey === 'dashboard') {
      openTab(DASHBOARD_TAB);
      return;
    }
    if (navKey === 'produtos') {
      openTab(PRODUCTS_TAB);
      return;
    }
    if (navKey === 'integracoes') {
      openTab(CATALOG_TAB);
      return;
    }
    if (navKey === 'jornadas') {
      openTab(JOURNEYS_TAB);
      return;
    }
    if (navKey === 'execucoes') {
      openTab(EXECUCOES_TAB);
      return;
    }
    if (navKey === 'diagnostico') {
      openTab(DIAGNOSTICO_TAB);
      return;
    }
    if (navKey === 'auditoria') {
      openTab(AUDIT_TAB);
      return;
    }
    if (navKey === 'ajuda') {
      openTab(HELP_TAB);
      return;
    }
    if (navKey === 'sobre') {
      openTab(SOBRE_TAB);
      return;
    }
    openTab({ key: `nav-${navKey}`, title: NAV_LABELS[navKey], kind: 'placeholder', closable: true });
  }

  // Cada instância clicada no card "Execuções recentes" do Dashboard ganha sua própria aba nova de
  // Diagnóstico (chave por processInstanceId — clicar na MESMA instância de novo foca a aba já aberta
  // em vez de duplicar, mas instâncias diferentes sempre abrem abas diferentes).
  function openDiagnosticsTab(instance: { id: string; journeyName: string | null }) {
    openTab({
      key: `diagnostico-${instance.id}`,
      title: `Diagnóstico · ${instance.journeyName ?? instance.id.slice(0, 8)}`,
      kind: 'diagnostico',
      closable: true,
      initialInstanceId: instance.id,
    });
  }

  // Cada jornada com "Executar" clicado no grid de Jornadas ganha sua própria aba nova de Execução,
  // já com essa jornada selecionada (chave por journeyId — clicar na MESMA jornada de novo foca a
  // aba já aberta em vez de duplicar).
  function openExecuteJourneyTab(journey: JourneySummary) {
    openTab({
      key: `execucao-${journey.journeyId}`,
      title: `Execução · ${journey.name}`,
      kind: 'execution',
      closable: true,
      initialJourney: journey,
    });
  }

  const activeTab = tabs.find((t) => t.key === activeKey) ?? DASHBOARD_TAB;
  const activeNavKey =
    activeTab.kind === 'placeholder'
      ? activeTab.key.replace('nav-', '')
      : activeTab.kind === 'dashboard'
        ? 'dashboard'
        : activeTab.kind === 'products'
          ? 'produtos'
          : activeTab.kind === 'catalog'
            ? 'integracoes'
            : activeTab.kind === 'execution'
              ? 'execucoes'
              : activeTab.kind === 'diagnostico'
                ? 'diagnostico'
                : activeTab.kind === 'audit'
              ? 'auditoria'
              : activeTab.kind === 'help'
                ? 'ajuda'
                : activeTab.kind === 'sobre'
                  ? 'sobre'
                  : 'jornadas';

  return (
    <AppThemeContext.Provider value={{ dark, colors, toggle: () => setDark((d) => !d), skinName, setSkinName }}>
      <ThemeContextProvider
        theme={{ skin, colorScheme: dark ? 'dark' : 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}
      >
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
        <div
          className="flex h-screen w-full font-sans overflow-hidden box-border"
          style={{ background: colors.bg, color: colors.textPrimary }}
        >
          <Sidebar activeKey={activeNavKey} onNavigate={handleNavigate} />
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <TabBar tabs={tabs} activeKey={activeKey} onSelect={setActiveKey} onClose={closeTab} />
            <div className="flex-1 flex flex-col overflow-hidden">
              {tabs.map((tab) => (
                <div key={tab.key} className="flex-1 flex flex-col overflow-hidden" style={{ display: tab.key === activeKey ? 'flex' : 'none' }}>
                  {tab.kind === 'placeholder' && <PlaceholderPanel title={tab.title} />}
                  {tab.kind === 'dashboard' && <DashboardPage onOpenDiagnostics={openDiagnosticsTab} />}
                  {tab.kind === 'products' && <ProductsPage />}
                  {tab.kind === 'catalog' && <CatalogPage />}
                  {tab.kind === 'journeys' && (
                    <JourneysPage onExecuteJourney={openExecuteJourneyTab} />
                  )}
                  {tab.kind === 'execution' && (
                    <ExecutionsPage active={tab.key === activeKey} initialJourney={tab.initialJourney} />
                  )}
                  {tab.kind === 'diagnostico' && <DiagnosticoPage initialInstanceId={tab.initialInstanceId} />}
                  {tab.kind === 'audit' && <AuditPage />}
                  {tab.kind === 'help' && <HelpPage />}
                  {tab.kind === 'sobre' && <SobrePage />}
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </ThemeContextProvider>
    </AppThemeContext.Provider>
  );
}
