import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useFlowTheme } from './theme';
import { JourneyMetaBar } from './JourneyMetaBar';

interface JourneyMetaProps {
  productName: string;
  channelName: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function Palette({ journey }: { journey: JourneyMetaProps }) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(true);

  if (collapsed) {
    return (
      <div
        className="w-[52px] shrink-0 border-r flex flex-col items-center gap-2 pt-3"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir painel"
          className="w-[26px] h-[26px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-[240px] shrink-0 border-r flex flex-col overflow-auto"
      style={{ background: c.sidebarBg, borderColor: c.border }}
    >
      <div className="flex flex-col">
        <div
          className="relative flex items-center justify-center px-3 py-2 border-b border-l-[3px] cursor-pointer"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
          onClick={() => setJourneyOpen((o) => !o)}
        >
          <div className="text-[14px] font-semibold text-center" style={{ color: c.textPrimary }}>
            Dados da jornada
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setJourneyOpen((o) => !o);
            }}
            title={journeyOpen ? 'Recolher seção' : 'Expandir seção'}
            className="absolute left-2 w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            {journeyOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            title="Recolher painel"
            className="absolute right-2 w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronLeft size={15} />
          </button>
        </div>
        {journeyOpen && (
          <div className="p-3">
            <JourneyMetaBar {...journey} />
          </div>
        )}
      </div>
    </div>
  );
}
