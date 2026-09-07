export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

export interface WhatsAppImageMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'image';
  image: { link: string; caption?: string };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list' | 'cta_url';
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: Record<string, unknown>;
  };
}

export type WhatsAppOutboundMessage = WhatsAppTextMessage | WhatsAppImageMessage | WhatsAppInteractiveMessage;

export interface WceReply {
  type: 'text' | 'button_reply' | 'list_reply' | 'location' | 'image' | 'video' | 'document';
  contextMessageId?: string;
  payload: Record<string, unknown>;
}

export interface ConversationDiagnostic {
  code: string;
  nodeId: string;
  message: string;
}
