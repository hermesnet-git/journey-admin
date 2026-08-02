import { X } from 'lucide-react';
import type { Tab } from './types';

interface TabBarProps {
  tabs: Tab[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onSelect, onClose }: TabBarProps) {
  return (
    <div className="flex items-end gap-[2px] border-b border-[#e4e4e7] bg-white px-3 pt-2 overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className="flex items-center gap-2 px-3 py-[9px] rounded-t-md text-[13px] cursor-pointer select-none whitespace-nowrap transition-colors"
            style={{
              background: active ? '#fafafa' : 'transparent',
              color: active ? '#1a1a1a' : '#a1a1aa',
              fontWeight: active ? 700 : 400,
              boxShadow: active ? '0 -1px 6px rgba(0,0,0,.05)' : 'none',
              borderBottom: active ? '3px solid #019DF4' : '3px solid transparent',
            }}
          >
            {tab.title}
            {tab.closable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.key);
                }}
                className="rounded-sm p-[1px] opacity-50 hover:opacity-100 hover:bg-[#e4e4e7]"
              >
                <X size={12} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
