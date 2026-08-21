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
import { FormsPage } from './forms/FormsPage';
import { ExecutionsPage } from './execution/ExecutionsPage';
import { AuditPage } from './audit/AuditPage';
import { AppThemeContext, LIGHT_APP_COLORS, DARK_APP_COLORS } from './shell/theme';
import type { Tab } from './shell/types';
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
const FORMS_TAB: Tab = { key: 'formularios', title: 'Formulários', kind: 'forms', closable: true };
const EXECUCOES_TAB: Tab = { key: 'execucoes', title: 'Executar', kind: 'execution', closable: true };
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

  // Fecha uma aba efêmera de edição de formulário (aberta via openForm/openNewFormScreen abaixo) e
  // devolve o foco pra aba que estava ativa quando ela foi aberta — o designer de jornada, na
  // prática, já que é o único chamador — em vez do fallback genérico "última aba restante" do
  // closeTab.
  function closeFormTab(key: string, returnToKey: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.key !== key);
      // returnToKey pode ela mesma ter sido fechada nesse meio tempo (ex.: o usuário fechou a aba
      // Jornadas enquanto a aba de edição de formulário criada a partir dela ainda estava aberta) —
      // cai no mesmo fallback "última aba restante" que o closeTab usa abaixo.
      setActiveKey(next.some((t) => t.key === returnToKey) ? returnToKey : (next[next.length - 1]?.key ?? 'dashboard'));
      return next;
    });
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
    if (navKey === 'formularios') {
      openTab(FORMS_TAB);
      return;
    }
    if (navKey === 'execucoes') {
      openTab(EXECUCOES_TAB);
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

  // Só é aberto de dentro do designer de jornada (formulário vinculado a uma User Task, ou "novo
  // formulário"). Reaproveita a aba Formulários se ela estiver livre; se o usuário já tiver aberto
  // ali navegando/editando outra coisa, cria uma aba dedicada em vez de mexer na que já existe.
  function openFormEditTab(data: { formId?: string; openNew?: boolean }) {
    const returnToKey = activeKey;
    const reuseSlot = !tabs.some((t) => t.key === FORMS_TAB.key);
    openTab({
      ...FORMS_TAB,
      key: reuseSlot ? FORMS_TAB.key : `formularios-${Date.now()}`,
      ...data,
      returnToKey,
    });
  }

  function openForm(formId: string) {
    openFormEditTab({ formId });
  }

  function openNewFormScreen() {
    openFormEditTab({ openNew: true });
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
            : activeTab.kind === 'forms'
            ? 'formularios'
            : activeTab.kind === 'execution'
              ? 'execucoes'
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
                  {tab.kind === 'dashboard' && <DashboardPage />}
                  {tab.kind === 'products' && <ProductsPage />}
                  {tab.kind === 'catalog' && <CatalogPage />}
                  {tab.kind === 'journeys' && <JourneysPage onOpenForm={openForm} onOpenNewForm={openNewFormScreen} />}
                  {tab.kind === 'forms' && (
                    <FormsPage
                      formId={tab.formId}
                      openNew={tab.openNew}
                      onExit={tab.returnToKey ? () => closeFormTab(tab.key, tab.returnToKey!) : undefined}
                    />
                  )}
                  {tab.kind === 'execution' && <ExecutionsPage active={tab.key === activeKey} />}
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
