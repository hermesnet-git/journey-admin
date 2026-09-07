export interface SimpleUiMessage {
  id: string;
  type: 'text' | 'image' | 'interactive_button' | 'interactive_list' | 'interactive_cta' | string;
  payload?: Record<string, unknown>;
}

export interface StoredMessage {
  id: string;
  direction: 'in' | 'out';
  data: SimpleUiMessage;
  timestamp: string;
}

export interface WceReply {
  type: 'text' | 'button_reply' | 'list_reply';
  contextMessageId?: string;
  payload: Record<string, unknown>;
}

export interface ReplyButton {
  id: string;
  title: string;
}

export interface ListRow extends ReplyButton {
  description?: string;
}
