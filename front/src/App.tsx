import { useState } from 'react';
import { ThemeContextProvider, getBlauSkin } from '@telefonica/mistica';
import { Sidebar } from './shell/Sidebar';
import { TabBar } from './shell/TabBar';
import { PlaceholderPanel } from './shell/PlaceholderPanel';
import { WorkflowsDashboard } from './dashboard/WorkflowsDashboard';
import { WorkflowDetail } from './dashboard/WorkflowDetail';
import { ProductsPage } from './products/ProductsPage';
import { JourneysPage } from './journeys/JourneysPage';
import { FormsPage } from './forms/FormsPage';
import { AppThemeContext, LIGHT_APP_COLORS, DARK_APP_COLORS } from './shell/theme';
import type { Tab } from './shell/types';

const DASHBOARD_TAB: Tab = { key: 'dashboard', title: 'Dashboard', kind: 'dashboard', closable: false };
const PRODUCTS_TAB: Tab = { key: 'produtos', title: 'Produtos', kind: 'products', closable: true };
const JOURNEYS_TAB: Tab = { key: 'jornadas', title: 'Jornadas', kind: 'journeys', closable: true };
const FORMS_TAB: Tab = { key: 'formularios', title: 'Formulários', kind: 'forms', closable: true };

const NAV_LABELS: Record<string, string> = {
  execucoes: 'Execuções',
  aprovacoes: 'Aprovações',
  configuracoes: 'Configurações',
  ajuda: 'Ajuda e suporte',
};

const skin = getBlauSkin();

export function App() {
  const [dark, setDark] = useState(false);
  const colors = dark ? DARK_APP_COLORS : LIGHT_APP_COLORS;
  const [tabs, setTabs] = useState<Tab[]>([DASHBOARD_TAB]);
  const [activeKey, setActiveKey] = useState('dashboard');
  const [openFormId, setOpenFormId] = useState<string | null>(null);

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
    if (navKey === 'workflows') {
      setActiveKey('dashboard');
      return;
    }
    if (navKey === 'produtos') {
      openTab(PRODUCTS_TAB);
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
    openTab({ key: `nav-${navKey}`, title: NAV_LABELS[navKey], kind: 'placeholder', closable: true });
  }

  function openForm(formId: string) {
    setOpenFormId(formId);
    openTab(FORMS_TAB);
  }

  function handleOpenWorkflow(id: string, name: string) {
    openTab({ key: `wf-${id}`, title: name, kind: 'detail', workflowId: id, closable: true });
  }

  const activeTab = tabs.find((t) => t.key === activeKey) ?? DASHBOARD_TAB;
  const activeNavKey =
    activeTab.kind === 'placeholder'
      ? activeTab.key.replace('nav-', '')
      : activeTab.kind === 'products'
        ? 'produtos'
        : activeTab.kind === 'journeys'
          ? 'jornadas'
          : activeTab.kind === 'forms'
            ? 'formularios'
            : 'workflows';

  return (
    <AppThemeContext.Provider value={{ dark, colors, toggle: () => setDark((d) => !d) }}>
      <ThemeContextProvider
        theme={{ skin, colorScheme: dark ? 'dark' : 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}
      >
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
                  {tab.kind === 'dashboard' && <WorkflowsDashboard onOpenWorkflow={handleOpenWorkflow} />}
                  {tab.kind === 'detail' && tab.workflowId && (
                    <WorkflowDetail workflowId={tab.workflowId} onBack={() => setActiveKey('dashboard')} />
                  )}
                  {tab.kind === 'placeholder' && <PlaceholderPanel title={tab.title} />}
                  {tab.kind === 'products' && <ProductsPage />}
                  {tab.kind === 'journeys' && <JourneysPage onOpenForm={openForm} />}
                  {tab.kind === 'forms' && (
                    <FormsPage openFormId={openFormId} onOpenFormIdHandled={() => setOpenFormId(null)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ThemeContextProvider>
    </AppThemeContext.Provider>
  );
}
