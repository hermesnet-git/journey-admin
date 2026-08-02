import { GitBranch, ListChecks, Boxes, Route, Clock, CheckSquare, Settings, HelpCircle, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

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
  return (
    <div className="w-[220px] shrink-0 bg-white border-r border-[#e4e4e7] flex flex-col p-[18px_12px] box-border">
      <div className="flex items-start gap-[9px] px-2 pt-2 pb-[22px]">
        <div className="w-[30px] h-[30px] shrink-0 rounded-lg bg-[#019DF4] flex items-center justify-center">
          <GitBranch size={17} color="#fff" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex items-center h-[30px]">
          <div className="text-[18px] font-bold tracking-[-0.02em] text-[#1a1a1a] leading-none">Elastic Journey</div>
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
                background: active ? '#f4f4f5' : 'transparent',
                color: active ? '#019DF4' : '#a1a1aa',
                fontWeight: active ? 500 : 400,
              }}
            >
              <span style={{ color: active ? '#019DF4' : '#a1a1aa' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-[2px] pt-2">
        <button
          onClick={() => onNavigate('ajuda')}
          className="flex items-center gap-[10px] px-[10px] py-2 rounded-md text-[12.5px] text-[#71717a] cursor-pointer border-0 bg-transparent text-left hover:bg-[#f4f4f5]"
        >
          <HelpCircle size={15} />
          Ajuda e suporte
        </button>
        <div className="flex items-center justify-between gap-[10px] p-[10px] border-t border-[#e4e4e7] mt-[6px] cursor-pointer hover:bg-[#f4f4f5]">
          <div className="flex items-center gap-[10px] min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#019DF4] flex items-center justify-center text-[12px] font-semibold text-white shrink-0">
              HG
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-[#1a1a1a] whitespace-nowrap overflow-hidden text-ellipsis">
                Hermes González
              </div>
              <div className="text-[11px] text-[#a1a1aa] whitespace-nowrap overflow-hidden text-ellipsis">
                Admin de Workflows
              </div>
            </div>
          </div>
          <ChevronDown size={14} className="shrink-0 text-[#a1a1aa]" />
        </div>
        <div className="text-center text-[10px] text-[#c4c4c8] pt-2">Elastic Journey · v1.2.0</div>
      </div>
    </div>
  );
}
