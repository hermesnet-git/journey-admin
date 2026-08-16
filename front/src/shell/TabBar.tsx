import { X, Sun, Moon } from 'lucide-react';
import type { KnownSkinName } from '@telefonica/mistica';
import type { Tab } from './types';
import { useAppTheme } from './theme';
import { FilterDropdown } from '../products/ui';

const SKIN_OPTIONS: { value: KnownSkinName; label: string }[] = [
  { value: 'Blau', label: 'Blau' },
  { value: 'Movistar', label: 'Movistar' },
  { value: 'Vivo', label: 'Vivo' },
  { value: 'Vivo-evolution', label: 'Vivo Evolution' },
  { value: 'O2', label: 'O2' },
  { value: 'Telefonica', label: 'Telefónica' },
  { value: 'Esimflag', label: 'Esimflag' },
];

interface TabBarProps {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onSelect, onClose }: TabBarProps) {
  const { dark, colors: c, toggle, skinName, setSkinName } = useAppTheme();
  const themeBtnBase =
    'w-[30px] h-[30px] mb-2 rounded-md border-0 flex items-center justify-center cursor-pointer transition-colors';

  return (
    <div className="flex items-end justify-between gap-3 border-b px-3 pt-2" style={{ background: c.surface, borderColor: c.border }}>
      <div className="flex items-end gap-[2px] min-w-0 flex-1">
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <div
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className="flex items-center gap-2 px-3 py-[9px] rounded-t-md text-[13px] cursor-pointer select-none transition-colors overflow-hidden"
              style={{
                background: active ? c.bg : 'transparent',
                color: active ? c.textPrimary : c.textMuted,
                fontWeight: active ? 700 : 400,
                boxShadow: active ? '0 -1px 6px rgba(0,0,0,.05)' : 'none',
                borderBottom: active ? `3px solid ${c.accent}` : '3px solid transparent',
                flex: '0 1 auto',
                minWidth: 0,
                maxWidth: 200,
              }}
            >
              <span className="min-w-0 truncate">{tab.title}</span>
              {tab.closable && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.key);
                  }}
                  className="rounded-sm p-[1px] opacity-50 hover:opacity-100 shrink-0"
                >
                  <X size={12} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 mb-2">
        <FilterDropdown
          label="Skin"
          options={SKIN_OPTIONS}
          value={skinName}
          onChange={(value) => setSkinName(value as KnownSkinName)}
        />
        <div className="flex items-center gap-1">
        <button
          onClick={() => dark && toggle()}
          title="Tema claro"
          className={themeBtnBase}
          style={{ background: !dark ? c.activeBg : 'transparent', color: !dark ? c.accent : c.textMuted }}
        >
          <Sun size={16} />
        </button>
        <button
          onClick={() => !dark && toggle()}
          title="Tema escuro"
          className={themeBtnBase}
          style={{ background: dark ? c.activeBg : 'transparent', color: dark ? c.accent : c.textMuted }}
        >
          <Moon size={16} />
        </button>
        </div>
      </div>
    </div>
  );
}
