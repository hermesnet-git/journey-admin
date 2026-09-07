import { randomUUID } from 'node:crypto';

export interface SimpleUiMessage {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
}

export interface WceReply {
  type: string;
  contextMessageId?: string;
  payload: Record<string, unknown>;
}

export interface StoredMessage {
  id: string;
  direction: 'in' | 'out';
  data: SimpleUiMessage;
  timestamp: string;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseWhatsAppPayload(payload: Record<string, unknown>): SimpleUiMessage {
  const id = `wamid-${randomUUID()}`;
  const type = String(payload.type ?? '');
  if (type === 'text') {
    return { id, type: 'text', payload: { body: String(record(payload.text).body ?? '') } };
  }
  if (type === 'image') {
    const image = record(payload.image);
    return { id, type: 'image', payload: { link: String(image.link ?? ''), ...(image.caption ? { caption: String(image.caption) } : {}) } };
  }
  if (type === 'interactive') {
    const interactive = record(payload.interactive);
    const interactiveType = String(interactive.type ?? '');
    const header = record(interactive.header).text;
    const body = String(record(interactive.body).text ?? '');
    const footer = record(interactive.footer).text;
    const action = record(interactive.action);
    if (interactiveType === 'button') {
      return {
        id,
        type: 'interactive_button',
        payload: {
          ...(header ? { header: String(header) } : {}),
          body,
          ...(footer ? { footer: String(footer) } : {}),
          buttons: list(action.buttons).map((button) => {
            const reply = record(record(button).reply);
            return { id: String(reply.id ?? ''), title: String(reply.title ?? '') };
          }),
        },
      };
    }
    if (interactiveType === 'list') {
      return {
        id,
        type: 'interactive_list',
        payload: {
          ...(header ? { header: String(header) } : {}),
          body,
          ...(footer ? { footer: String(footer) } : {}),
          buttonText: String(action.button ?? 'Ver opções'),
          sections: list(action.sections).map((sectionValue) => {
            const section = record(sectionValue);
            return {
              ...(section.title ? { title: String(section.title) } : {}),
              rows: list(section.rows).map((rowValue) => {
                const row = record(rowValue);
                return {
                  id: String(row.id ?? ''),
                  title: String(row.title ?? ''),
                  ...(row.description ? { description: String(row.description) } : {}),
                };
              }),
            };
          }),
        },
      };
    }
    if (interactiveType === 'cta_url') {
      const parameters = record(action.parameters);
      return {
        id,
        type: 'interactive_cta',
        payload: {
          ...(header ? { header: String(header) } : {}),
          body,
          ...(footer ? { footer: String(footer) } : {}),
          displayText: String(parameters.display_text ?? 'Abrir'),
          url: String(parameters.url ?? ''),
        },
      };
    }
  }
  throw new Error(`Tipo de mensagem WhatsApp não suportado pelo WCE Bridge: ${type || '(ausente)'}.`);
}

export function replyAsDisplayMessage(reply: WceReply): SimpleUiMessage {
  if (reply.type === 'button_reply' || reply.type === 'list_reply') {
    return { id: `reply-${randomUUID()}`, type: 'text', payload: { body: `✓ ${String(reply.payload.title ?? '')}` } };
  }
  if (reply.type === 'text') {
    return { id: `reply-${randomUUID()}`, type: 'text', payload: { body: String(reply.payload.body ?? '') } };
  }
  return { id: `reply-${randomUUID()}`, type: reply.type, payload: reply.payload };
}

export function constructWebhookPayload(reply: WceReply, from: string, displayPhoneNumber: string): Record<string, unknown> {
  const message: Record<string, unknown> = {
    from,
    id: `wamid-${randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: reply.type === 'button_reply' || reply.type === 'list_reply' ? 'interactive' : reply.type,
  };
  if (reply.type === 'text') message.text = { body: String(reply.payload.body ?? '') };
  else if (reply.type === 'button_reply') {
    message.interactive = { type: 'button_reply', button_reply: { id: reply.payload.id, title: reply.payload.title } };
  } else if (reply.type === 'list_reply') {
    message.interactive = {
      type: 'list_reply',
      list_reply: { id: reply.payload.id, title: reply.payload.title, ...(reply.payload.description ? { description: reply.payload.description } : {}) },
    };
  } else {
    message[reply.type] = reply.payload;
  }
  if (reply.contextMessageId) message.context = { id: reply.contextMessageId };
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'ELASTIC_JOURNEY_WCE',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: displayPhoneNumber, phone_number_id: 'WCE_PHONE_NUMBER_ID' },
          contacts: [{ profile: { name: 'Usuário WCE' }, wa_id: from }],
          messages: [message],
        },
      }],
    }],
  };
}
