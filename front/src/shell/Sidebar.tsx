import { useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  LayoutDashboard,
  Boxes,
  Route,
  FileText,
  PlayCircle,
  CheckSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Info,
  LogOut,
  Plug,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppTheme } from './theme';
import { useAuth } from '../auth/AuthContext';
import type { AuthSession } from '../api/auth';
import { APP_NAME, APP_VERSION } from './appInfo';
import { ConfirmDialog } from '../products/ConfirmDialog';

interface NavChild {
  key: string;
  label: string;
  icon: ReactNode;
}

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { key: 'produtos', label: 'Produtos', icon: <Boxes size={16} /> },
  { key: 'jornadas', label: 'Jornadas', icon: <Route size={16} /> },
  { key: 'formularios', label: 'Formulários', icon: <FileText size={16} /> },
  { key: 'execucoes', label: 'Execução & Diagnóstico', icon: <PlayCircle size={16} /> },
  { key: 'aprovacoes', label: 'Aprovações', icon: <CheckSquare size={16} /> },
  {
    key: 'configuracoes',
    label: 'Configurações',
    icon: <Settings size={16} />,
    children: [{ key: 'integracoes', label: 'Integrações', icon: <Plug size={14} /> }],
  },
];

const AUDIT_NAV_ITEM: NavItem = { key: 'auditoria', label: 'Auditoria', icon: <ShieldCheck size={16} /> };

interface SidebarProps {
  activeKey: string;
  onNavigate: (key: string) => void;
}

export function Sidebar({ activeKey, onNavigate }: SidebarProps) {
  const { colors: c } = useAppTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const initials = user ? user.username.slice(0, 2).toUpperCase() : '';
  // Audit log access is ADMIN-only (the API rejects everyone else), so the nav entry
  // is only shown to admins — matches the backend's @PreAuthorize("hasRole('ADMIN')").
  const navItems = user?.role === 'ADMIN' ? [...NAV_ITEMS, AUDIT_NAV_ITEM] : NAV_ITEMS;

  if (collapsed) {
    return (
      <div
        className="w-[64px] shrink-0 border-r flex flex-col items-center p-[18px_8px] box-border"
        style={{ background: c.surface, borderColor: c.border }}
      >
        <div className="w-[30px] h-[30px] shrink-0 rounded-lg flex items-center justify-center mb-[22px]" style={{ background: c.accent }}>
          <GitBranch size={17} color="#fff" strokeWidth={2} />
        </div>

        <nav className="flex flex-col gap-[2px] w-full items-center">
          {navItems.map((item) => {
            // Sem espaço pra um flyout de submenu na barra recolhida — com só um filho hoje, vai
            // direto pra ele; reconsiderar se "Configurações" ganhar mais de uma seção.
            const targetKey = item.children?.[0]?.key ?? item.key;
            const active = targetKey === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(targetKey)}
                title={item.children ? `${item.label} · ${item.children[0].label}` : item.label}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-md cursor-pointer border-0"
                style={{
                  background: active ? c.activeBg : 'transparent',
                  color: active ? c.accent : c.textMuted,
                }}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-[6px] pt-2 w-full">
          <button
            onClick={() => onNavigate('ajuda')}
            title="Ajuda e suporte"
            className="flex items-center justify-center w-[36px] h-[36px] rounded-md cursor-pointer border-0 bg-transparent"
            style={{ color: c.textSecondary }}
          >
            <HelpCircle size={15} />
          </button>
          <button
            onClick={() => onNavigate('sobre')}
            title={`Sobre · ${APP_NAME} · ${APP_VERSION}`}
            className="flex items-center justify-center w-[36px] h-[36px] rounded-md cursor-pointer border-0 bg-transparent"
            style={{ color: c.textSecondary }}
          >
            <Info size={15} />
          </button>
          <UserMenu collapsed user={user} logout={logout} initials={initials} />
          <button
            onClick={() => setCollapsed(false)}
            title="Expandir menu"
            className="flex items-center justify-center w-[36px] h-[36px] rounded-md cursor-pointer border-0 bg-transparent mt-[6px]"
            style={{ color: c.textSecondary }}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[220px] shrink-0 border-r flex flex-col p-[18px_12px] box-border"
      style={{ background: c.surface, borderColor: c.border }}
    >
      <div className="flex items-start gap-[9px] px-2 pt-2 pb-[22px]">
        <div className="w-[30px] h-[30px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: c.accent }}>
          <GitBranch size={17} color="#fff" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 flex items-center justify-between h-[30px]">
          <div className="text-[18px] font-bold tracking-[-0.02em] leading-none" style={{ color: c.textPrimary }}>
            Elastic Journey
          </div>
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher menu"
            className="flex items-center justify-center w-[24px] h-[24px] rounded-md cursor-pointer border-0 bg-transparent shrink-0"
            style={{ color: c.textMuted }}
          >
            <ChevronsLeft size={15} />
          </button>
        </div>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {navItems.map((item) => {
          const childActive = item.children?.some((child) => child.key === activeKey) ?? false;
          const active = item.key === activeKey || childActive;
          const isOpen = item.key === openKey || childActive;
          return (
            <div key={item.key}>
              <button
                onClick={() =>
                  item.children ? setOpenKey((k) => (k === item.key ? null : item.key)) : onNavigate(item.key)
                }
                className="flex items-center gap-[10px] px-[10px] py-2 rounded-md text-[13px] text-left cursor-pointer border-0 w-full"
                style={{
                  background: active && !item.children ? c.activeBg : 'transparent',
                  color: active ? c.accent : c.textMuted,
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span style={{ color: active ? c.accent : c.textMuted }}>{item.icon}</span>
                {item.label}
                {item.children && (
                  <ChevronDown
                    size={13}
                    className="ml-auto transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                  />
                )}
              </button>
              {item.children && isOpen && (
                <div className="flex flex-col gap-[2px] mt-[2px]">
                  {item.children.map((child) => {
                    const childIsActive = child.key === activeKey;
                    return (
                      <button
                        key={child.key}
                        onClick={() => onNavigate(child.key)}
                        className="flex items-center gap-[10px] rounded-md text-[13px] text-left cursor-pointer border-0"
                        style={{
                          padding: '8px 10px 8px 34px',
                          background: childIsActive ? c.activeBg : 'transparent',
                          color: childIsActive ? c.accent : c.textMuted,
                          fontWeight: childIsActive ? 500 : 400,
                        }}
                      >
                        <span style={{ color: childIsActive ? c.accent : c.textMuted }}>{child.icon}</span>
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-[2px] pt-2">
        <button
          onClick={() => onNavigate('ajuda')}
          className="flex items-center justify-center gap-[10px] px-[10px] py-2 rounded-md text-[12.5px] cursor-pointer border-0 bg-transparent"
          style={{ color: c.textSecondary }}
        >
          <HelpCircle size={15} />
          Ajuda e suporte
        </button>
        <UserMenu user={user} logout={logout} initials={initials} />
        <button
          onClick={() => onNavigate('sobre')}
          className="text-center text-[10px] pt-2 cursor-pointer border-0 bg-transparent"
          style={{ color: c.textMuted }}
        >
          <span style={{ color: c.accent }}>Sobre</span> · {APP_NAME} · {APP_VERSION}
        </button>
      </div>
    </div>
  );
}

// Clicar no avatar/linha do usuário não desloga mais direto — abre um pequeno
// menu (mesmo padrão de popover + clique-fora do FilterDropdown) com uma única
// ação "Sair", que aí sim pede confirmação antes de deslogar de verdade.
// Segue o padrão de apps tipo Slack/Notion/Linear, que colocam o logout atrás
// de um menu + confirmação em vez de um único clique acidental.
function UserMenu({
  collapsed = false,
  user,
  logout,
  initials,
}: {
  collapsed?: boolean;
  user: AuthSession | null;
  logout: () => void;
  initials: string;
}) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {collapsed ? (
        <button
          onClick={() => setOpen((o) => !o)}
          title={user ? `${user.username} (${user.role})` : undefined}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0 cursor-pointer border-0"
          style={{ background: c.accent }}
        >
          {initials}
        </button>
      ) : (
        <div
          className="flex items-center justify-between gap-[10px] p-[10px] border-t mt-[6px] cursor-pointer rounded-md"
          style={{ borderColor: c.border, background: open ? c.activeBg : 'transparent' }}
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-[10px] min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0" style={{ background: c.accent }}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textPrimary }}>
                {user?.username}
              </div>
              <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textMuted }}>
                {user?.role}
              </div>
            </div>
          </div>
          <ChevronDown
            size={14}
            className="shrink-0 transition-transform"
            style={{ color: c.textMuted, transform: open ? 'rotate(180deg)' : undefined }}
          />
        </div>
      )}

      {open && (
        <div
          className="absolute z-30 w-[200px] rounded-lg p-1 flex flex-col"
          style={{
            background: c.surface,
            border: `1px solid ${c.border}`,
            boxShadow: `0 12px 32px -8px ${c.shadow}`,
            ...(collapsed ? { left: 'calc(100% + 8px)', bottom: 0 } : { left: 0, right: 0, bottom: 'calc(100% + 6px)' }),
          }}
        >
          <div className="px-[10px] py-[8px] min-w-0">
            <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textPrimary }}>
              {user?.username}
            </div>
            <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textMuted }}>
              {user?.role}
            </div>
          </div>
          <div className="h-px my-1" style={{ background: c.border }} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
            className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-md text-[13px] text-left cursor-pointer border-0 bg-transparent"
            style={{ color: c.danger }}
            onMouseEnter={(e) => (e.currentTarget.style.background = c.dangerSoft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Sair da conta"
          message="Tem certeza que deseja sair? Você será desconectado e precisará entrar novamente para continuar."
          confirmLabel="Sair"
          cancelLabel="Cancelar"
          onConfirm={() => {
            setConfirming(false);
            logout();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
