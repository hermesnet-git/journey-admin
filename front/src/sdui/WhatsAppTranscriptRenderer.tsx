import { AlertTriangle, Image as ImageIcon, List } from 'lucide-react';
import { useFlowTheme } from '../flow-designer/theme';
import type { SduiNode } from './model';
import { sduiToWhatsAppMessages, type WhatsAppMessage } from './whatsappMapping';

/** Simulação de conversa — não é um canvas de layout porque WhatsApp não tem um (sem container/card/
 * stack arbitrário). A árvore é achatada em mensagens por sduiToWhatsAppMessages; aqui só desenha as
 * bolhas. Somente leitura: edição continua acontecendo na árvore, via Build. */
export function WhatsAppTranscriptRenderer({
  root,
  selectedId,
  onSelect,
}: {
  root: SduiNode;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { c } = useFlowTheme();
  const messages = sduiToWhatsAppMessages(root);

  return (
    <div
      className="mx-auto flex flex-col gap-2 p-4 rounded-2xl"
      style={{ maxWidth: 340, background: '#e5ddd5', minHeight: 200 }}
    >
      {messages.length === 0 && (
        <div className="text-[11.5px] text-center py-6" style={{ color: '#3f4a4d' }}>
          Nenhuma mensagem representável ainda.
        </div>
      )}
      {messages.map((m) => (
        <Bubble key={m.id} message={m} selected={selectedId === m.id} onClick={() => onSelect?.(m.id)} accent={c.accent} />
      ))}
    </div>
  );
}

function Bubble({ message, selected, onClick, accent }: { message: WhatsAppMessage; selected: boolean; onClick: () => void; accent: string }) {
  if (message.kind === 'unsupported') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-[6px] px-3 py-2 rounded-lg cursor-pointer"
        style={{ border: `1px dashed ${selected ? accent : '#b7ada2'}`, background: 'rgba(255,255,255,.5)', color: '#7a6f63', fontSize: 11.5 }}
      >
        <AlertTriangle size={13} />
        <span>{message.text} — não representável em WhatsApp</span>
      </div>
    );
  }

  if (message.kind === 'buttons') {
    return (
      <button
        onClick={onClick}
        className="self-start px-4 py-[6px] rounded-full cursor-pointer border-0 text-[13px] font-medium"
        style={{ background: '#fff', color: '#008069', border: selected ? `2px solid ${accent}` : '1px solid #d5cec5' }}
      >
        {message.text}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="max-w-[85%] px-3 py-2 rounded-lg cursor-pointer"
      style={{ background: '#fff', border: selected ? `2px solid ${accent}` : '1px solid transparent', boxShadow: '0 1px 1px rgba(0,0,0,.1)' }}
    >
      {message.kind === 'media' && (
        <div className="flex items-center gap-1 mb-1" style={{ color: '#3f4a4d' }}>
          <ImageIcon size={13} />
          <span className="text-[10.5px]">Mídia</span>
        </div>
      )}
      <div className="text-[13.5px]" style={{ color: '#111b21' }}>
        {message.text}
      </div>
      {message.kind === 'list' && (
        <div className="mt-[6px] flex items-center gap-1 px-2 py-1 rounded" style={{ background: '#f0f2f1', color: '#008069', fontSize: 11.5 }}>
          <List size={12} />
          Ver opções ({message.options?.length ?? 0})
        </div>
      )}
    </div>
  );
}
