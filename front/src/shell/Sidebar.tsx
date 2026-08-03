import { useState } from 'react';
import {
  GitBranch,
  ListChecks,
  Boxes,
  Route,
  Clock,
  CheckSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppTheme } from './theme';

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'workflows', label: 'Workflows', icon: <ListChecks size={16} /> },
  { key: 'produtos', label: 'Produtos', icon: <Boxes size={16} /> },
  { key: 'jornadas', label: 'Jornadas', icon: <Route size={16} /> },
  { key: 'execucoes', label: 'Execuções', icon: <Clock size={16} /> },
  { key: 'aprovacoes', label: 'Aprovações', icon: <CheckSquare size={16} /> },
  { key: 'configuracoes', label: 'Configurações', icon: <Settings size={16} /> },
];

interface SidebarProps {
  activeKey: string;
  onNavigate: (key: string) => void;
}

export function Sidebar({ activeKey, onNavigate }: SidebarProps) {
  const { colors: c } = useAppTheme();
  const [collapsed, setCollapsed] = useState(false);

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
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={item.label}
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
            title="Hermes González"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0 cursor-pointer border-0"
            style={{ background: c.accent }}
          >
            HG
          </button>
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
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="flex items-center gap-[10px] px-[10px] py-2 rounded-md text-[13px] text-left cursor-pointer border-0"
              style={{
                background: active ? c.activeBg : 'transparent',
                color: active ? c.accent : c.textMuted,
                fontWeight: active ? 500 : 400,
              }}
            >
              <span style={{ color: active ? c.accent : c.textMuted }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-[2px] pt-2">
        <button
          onClick={() => onNavigate('ajuda')}
          className="flex items-center gap-[10px] px-[10px] py-2 rounded-md text-[12.5px] cursor-pointer border-0 bg-transparent text-left"
          style={{ color: c.textSecondary }}
        >
          <HelpCircle size={15} />
          Ajuda e suporte
        </button>
        <div
          className="flex items-center justify-between gap-[10px] p-[10px] border-t mt-[6px] cursor-pointer"
          style={{ borderColor: c.border }}
        >
          <div className="flex items-center gap-[10px] min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0" style={{ background: c.accent }}>
              HG
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textPrimary }}>
                Hermes González
              </div>
              <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: c.textMuted }}>
                Admin de Workflows
              </div>
            </div>
          </div>
          <ChevronDown size={14} className="shrink-0" style={{ color: c.textMuted }} />
        </div>
        <div className="text-center text-[10px] pt-2" style={{ color: c.textMuted }}>
          Elastic Journey · v1.2.0
        </div>
      </div>
    </div>
  );
}
