import { useEffect, useRef, useState } from 'react';
import type { ListRow, ReplyButton, SimpleUiMessage, StoredMessage, WceReply } from './types.js';

const BRIDGE_URL = import.meta.env.VITE_WCE_BRIDGE_URL ?? 'http://127.0.0.1:13001';

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function MessageContent({ message, onReply }: { message: SimpleUiMessage; onReply: (reply: WceReply) => void }) {
  const payload = message.payload ?? {};
  if (message.type === 'text') return <p className="message-text">{String(payload.body ?? '')}</p>;
  if (message.type === 'image') {
    return <figure className="message-media"><img src={String(payload.link ?? '')} alt={String(payload.caption ?? 'Imagem')} />{payload.caption ? <figcaption>{String(payload.caption)}</figcaption> : null}</figure>;
  }
  if (message.type === 'interactive_button') {
    const buttons = array(payload.buttons).map(object) as unknown as ReplyButton[];
    return <InteractiveBody payload={payload} actions={buttons.map((button) => (
      <button key={button.id} onClick={() => onReply({ type: 'button_reply', contextMessageId: message.id, payload: { id: button.id, title: button.title } })}>{button.title}</button>
    ))} />;
  }
  if (message.type === 'interactive_list') {
    const rows = array(payload.sections).flatMap((section) => array(object(section).rows).map(object)) as unknown as ListRow[];
    return <InteractiveBody payload={payload} actions={[
      <details className="option-list" key="options">
        <summary>{String(payload.buttonText ?? 'Ver opções')}</summary>
        <div>{rows.map((row) => <button key={row.id} onClick={() => onReply({ type: 'list_reply', contextMessageId: message.id, payload: { id: row.id, title: row.title, ...(row.description ? { description: row.description } : {}) } })}><strong>{row.title}</strong>{row.description ? <small>{row.description}</small> : null}</button>)}</div>
      </details>,
    ]} />;
  }
  if (message.type === 'interactive_cta') {
    const url = String(payload.url ?? '');
    return <InteractiveBody payload={payload} actions={[
      <a key="cta" href={url} target="_blank" rel="noreferrer">{String(payload.displayText ?? 'Abrir link')} ↗</a>,
    ]} />;
  }
  return <p className="message-text">Mensagem não suportada pelo WCE Web UI: {message.type}</p>;
}

function InteractiveBody({ payload, actions }: { payload: Record<string, unknown>; actions: React.ReactNode[] }) {
  return <div className="interactive">
    {payload.header ? <strong>{String(payload.header)}</strong> : null}
    <p className="message-text">{String(payload.body ?? '')}</p>
    {payload.footer ? <small>{String(payload.footer)}</small> : null}
    <div className="interactive-actions">{actions}</div>
  </div>;
}

export function App() {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const refresh = async (): Promise<void> => {
      try {
        const response = await fetch(`${BRIDGE_URL}/messages`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const history = await response.json() as StoredMessage[];
        if (active) { setMessages(history); setConnected(true); setError(''); }
      } catch {
        if (active) { setConnected(false); setError('WCE Bridge indisponível.'); }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 750);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const end = endRef.current;
    if (typeof end?.scrollIntoView === 'function') end.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const reply = async (value: WceReply): Promise<void> => {
    if (!connected) {
      setError('WCE Bridge indisponível.');
      return;
    }
    try {
      const response = await fetch(`${BRIDGE_URL}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || `WCE Bridge respondeu HTTP ${response.status}.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a resposta.');
    }
  };

  const send = (): void => {
    const body = input.trim();
    if (!body) return;
    void reply({ type: 'text', payload: { body } });
    setInput('');
  };

  const clear = async (): Promise<void> => {
    if (!window.confirm('Limpar o histórico desta simulação?')) return;
    await fetch(`${BRIDGE_URL}/messages`, { method: 'DELETE' });
  };

  return <main className="page">
    <section className="phone" aria-label="Emulador WhatsApp">
      <div className="statusbar"><span>WCE Web UI</span><span className={connected ? 'online' : 'offline'}>{connected ? '● conectado' : '● bridge offline'}</span></div>
      <header className="chat-header">
        <div className="avatar">EJ</div>
        <div><h1>Elastic Journey</h1><p>conta comercial</p></div>
        <button className="clear" onClick={clear} title="Limpar conversa" aria-label="Limpar conversa">⌫</button>
      </header>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <div className="messages" aria-live="polite">
        {messages.length === 0 ? <div className="empty"><strong>WhatsApp Cloud Emulator</strong><span>Envie <code>/start journeyId</code> ou inicie uma sessão pelo Channel Lab.</span></div> : null}
        {messages.map((item) => <article key={item.id} className={`bubble ${item.direction === 'in' ? 'user' : 'bot'}`}>
          <MessageContent message={item.data} onReply={reply} />
          <time>{new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{item.direction === 'in' ? ' ✓✓' : ''}</time>
        </article>)}
        <div ref={endRef} />
      </div>
      <footer className="composer">
        <button disabled aria-label="Anexar">＋</button>
        <textarea value={input} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Mensagem" rows={1} />
        <button className="send" disabled={!connected || !input.trim()} onClick={send} aria-label="Enviar">➤</button>
      </footer>
    </section>
    <aside className="technical"><strong>wce.web · :15173</strong><span>Bridge: {BRIDGE_URL}</span><span>A interface não interpreta jornadas nem SDUI.</span></aside>
  </main>;
}
