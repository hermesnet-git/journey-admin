import { ExternalLink, Image as ImageIcon, List } from 'lucide-react';
import type { SduiNode } from '../../sdui/model';
import { projectToWhatsApp, type WhatsAppPreviewItem } from './formPreviewProjection';

export function WhatsAppFormPreview({ root }: { root: SduiNode }) {
  const items = projectToWhatsApp(root);
  return (
    <div className="mx-auto w-[380px] max-w-full overflow-hidden rounded-2xl" style={{ border: '1px solid #c9c2b9', boxShadow: '0 10px 28px rgba(0,0,0,.14)' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#008069', color: '#fff' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[12px] font-bold">EJ</div>
        <div><div className="text-[13px] font-semibold">Jornada</div><div className="text-[10.5px] opacity-80">Preview da conversa</div></div>
      </div>
      <div className="flex min-h-[440px] flex-col gap-2 p-4" style={{ background: '#efeae2' }}>
        {items.length === 0 && <div className="py-10 text-center text-[12px]" style={{ color: '#667781' }}>Nenhuma mensagem para apresentar.</div>}
        {items.map((item) => <WhatsAppItem key={item.id} item={item} />)}
      </div>
      <div className="p-3" style={{ background: '#f0f2f5' }}><div className="rounded-full bg-white px-4 py-2 text-[12px]" style={{ color: '#8696a0' }}>Mensagem</div></div>
    </div>
  );
}

function WhatsAppItem({ item }: { item: WhatsAppPreviewItem }) {
  if (item.kind === 'action') {
    return <div className="self-start rounded-lg bg-white px-4 py-2 text-[12.5px] font-medium shadow-sm" style={{ color: '#008069' }}>{item.actionKind === 'link' && <ExternalLink size={12} className="mr-1 inline" />}{item.text}</div>;
  }
  return (
    <div className="max-w-[88%] self-start whitespace-pre-line rounded-lg bg-white px-3 py-2 text-[13px] shadow-sm" style={{ color: '#111b21' }}>
      {item.kind === 'media' && (
        item.source ? <img src={item.source} alt={item.text} className="mb-2 max-h-40 w-full rounded-md object-cover" /> : <div className="mb-2 flex h-24 items-center justify-center rounded-md" style={{ background: '#e9edef', color: '#667781' }}><ImageIcon size={22} /></div>
      )}
      <div style={{ fontWeight: item.kind === 'text' && item.emphasis ? 600 : 400 }}>{item.text}</div>
      {item.kind === 'question' && <div className="mt-2 rounded-md px-2 py-1.5 text-[11.5px]" style={{ background: '#f0f2f5', color: '#667781' }}>Resposta do usuário</div>}
      {item.kind === 'choices' && (
        <div className="mt-2 flex flex-col gap-1">
          {item.presentation === 'list' ? <div className="flex items-center gap-1 text-[11.5px]" style={{ color: '#008069' }}><List size={12} /> Ver opções ({item.choices.length})</div> : item.choices.map((choice) => <span key={choice} className="rounded-md px-2 py-1 text-center text-[11.5px]" style={{ border: '1px solid #d8dfdf', color: '#008069' }}>{choice}</span>)}
        </div>
      )}
    </div>
  );
}
