import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useFlowTheme } from './theme';
import type { GuideNote } from './notes';

interface Props {
  notes: GuideNote[];
  nodeName: (nodeId: string) => string | undefined;
  // Destaca a etapa (o resto do fluxo esmaece) — null tira o destaque.
  onHighlight: (nodeId: string | null) => void;
  // Centraliza a etapa na tela.
  onFocus: (nodeId: string) => void;
  // Jornada recém-criada a partir de um modelo: o tour abre sozinho uma vez.
  startTour: boolean;
}

// "Guia deste modelo": as anotações ligadas às etapas, em ordem do fluxo. Passar o mouse destaca a
// etapa, clicar leva até ela, e "Ver guia" percorre as anotações uma a uma (tour).
export function GuidePanel({ notes, nodeName, onHighlight, onFocus, startTour }: Props) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    if (!startTour || notes.length === 0) return;
    // Depois do enquadramento inicial do editor, que senão tiraria o primeiro passo do centro.
    const timer = setTimeout(() => setTourStep(0), 500);
    return () => clearTimeout(timer);
    // só na abertura do editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTour]);

  const step = tourStep !== null ? notes[tourStep] : undefined;
  useEffect(() => {
    if (!step) return;
    onFocus(step.nodeIds[0]);
    onHighlight(step.nodeIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  const closeTour = () => {
    setTourStep(null);
    onHighlight(null);
  };

  if (notes.length === 0) return null;

  const surface = { background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: '0 4px 14px rgba(0,0,0,.12)' };
  const names = (note: GuideNote) => note.nodeIds.map((id) => nodeName(id) ?? 'Etapa').join(', ');

  return (
    <>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 30 }}>
        {open ? (
          <div className="w-[280px] rounded-lg overflow-hidden" style={surface}>
            <div className="flex items-center gap-[6px] px-[12px] py-[8px]" style={{ borderBottom: `1px solid ${c.border}` }}>
              <BookOpen size={13} style={{ color: c.accent }} />
              <span className="text-[12.5px] font-semibold flex-1" style={{ color: c.textPrimary }}>
                Guia deste modelo
              </span>
              <button
                onClick={() => {
                  setOpen(false);
                  setTourStep(0);
                }}
                className="flex items-center gap-[4px] text-[11px] font-semibold px-[8px] py-[3px] rounded-md cursor-pointer border-0"
                style={{ background: c.accentSoft, color: c.accent }}
              >
                <Play size={10} /> Ver guia
              </button>
              <button onClick={() => setOpen(false)} title="Fechar" className="border-0 bg-transparent cursor-pointer p-[2px] flex" style={{ color: c.textSecondary }}>
                <X size={13} />
              </button>
            </div>
            <ol className="max-h-[360px] overflow-y-auto m-0 p-0 list-none">
              {notes.map((note) => (
                <li
                  key={note.id}
                  onMouseEnter={() => onHighlight(note.nodeIds[0])}
                  onMouseLeave={() => onHighlight(null)}
                  onClick={() => onFocus(note.nodeIds[0])}
                  className="flex gap-[8px] px-[12px] py-[8px] cursor-pointer"
                  style={{ borderBottom: `1px solid ${c.border}` }}
                  onMouseOver={(e) => (e.currentTarget.style.background = c.hoverBg)}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: '#fef3b8', color: '#713f12', border: '1.5px solid #eab308' }}
                  >
                    {note.number}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold truncate" style={{ color: c.textSecondary }}>
                      {names(note)}
                    </div>
                    <div className="text-[12px] leading-[1.4] whitespace-pre-wrap break-words" style={{ color: c.textPrimary }}>
                      {note.text || '—'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            title="Guia deste modelo"
            className="h-[28px] px-[10px] rounded-lg flex items-center gap-[6px] cursor-pointer text-[12px] font-semibold"
            style={{ ...surface, boxShadow: 'none', color: c.textPrimary }}
          >
            <BookOpen size={13} style={{ color: c.accent }} />
            Guia ({notes.length})
          </button>
        )}
      </div>

      {step && tourStep !== null && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
          <div className="w-[min(420px,calc(100vw-32px))] rounded-xl px-[16px] py-[12px]" style={{ ...surface, boxShadow: '0 10px 30px rgba(0,0,0,.18)' }}>
            <div className="flex items-center gap-[8px] mb-[6px]">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
                Passo {tourStep + 1} de {notes.length}
              </span>
              <span className="text-[11.5px] font-semibold truncate flex-1" style={{ color: c.textSecondary }}>
                {names(step)}
              </span>
              <button onClick={closeTour} title="Fechar guia" className="border-0 bg-transparent cursor-pointer p-[2px] flex" style={{ color: c.textSecondary }}>
                <X size={14} />
              </button>
            </div>
            <div className="text-[13px] leading-[1.5] whitespace-pre-wrap break-words mb-[10px]" style={{ color: c.textPrimary }}>
              {step.text || '—'}
            </div>
            <div className="flex items-center justify-end gap-[8px]">
              <button
                onClick={() => setTourStep(tourStep - 1)}
                disabled={tourStep === 0}
                className="flex items-center gap-[2px] text-[12px] px-[10px] py-[5px] rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-default"
                style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textPrimary }}
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              {tourStep < notes.length - 1 ? (
                <button
                  onClick={() => setTourStep(tourStep + 1)}
                  className="flex items-center gap-[2px] text-[12px] font-semibold px-[10px] py-[5px] rounded-md cursor-pointer border-0"
                  style={{ background: c.accent, color: '#fff' }}
                >
                  Próximo <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={closeTour}
                  className="text-[12px] font-semibold px-[12px] py-[5px] rounded-md cursor-pointer border-0"
                  style={{ background: c.accent, color: '#fff' }}
                >
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
