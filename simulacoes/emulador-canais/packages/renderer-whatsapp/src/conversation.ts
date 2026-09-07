import {
  parseSduiDocument,
  walkSdui,
  type SduiDocument,
  type SduiNode,
} from '@elastic-journey/sdui-contract';
import {
  createSduiRuntime,
  validateNodeValue,
  type RuntimeContext,
  type RuntimeHandlers,
  type SduiRuntime,
} from '@elastic-journey/sdui-runtime';
import type {
  ConversationDiagnostic,
  WhatsAppInteractiveMessage,
  WhatsAppOutboundMessage,
  WceReply,
} from './types.js';

const INPUT_TYPES = new Set(['ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker']);

export interface WhatsAppConversationOptions {
  document: SduiDocument | unknown;
  recipient: string;
  context?: Partial<RuntimeContext>;
  handlers?: RuntimeHandlers;
}

function textMessage(to: string, body: string): WhatsAppOutboundMessage {
  return { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
}

function interactiveMessage(
  to: string,
  body: string,
  action: Record<string, unknown>,
  type: 'button' | 'list' | 'cta_url' = 'button',
  header?: string,
  footer?: string,
): WhatsAppInteractiveMessage {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type,
      ...(header ? { header: { type: 'text', text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action,
    },
  };
}

function optionRecords(node: SduiNode): Array<{ value: string; label: string; disabled: boolean }> {
  if (!Array.isArray(node.props.options)) return [];
  return node.props.options
    .filter((option): option is Record<string, unknown> => typeof option === 'object' && option !== null)
    .map((option) => ({
      value: String(option.value ?? ''),
      label: String(option.label ?? option.value ?? ''),
      disabled: option.disabled === true,
    }))
    .filter((option) => option.value && option.label && !option.disabled);
}

function boundPath(node: SduiNode): string | null {
  return node.bindings?.value?.path ?? null;
}

function inputValue(reply: WceReply): unknown {
  if (reply.type === 'button_reply' || reply.type === 'list_reply') return reply.payload.id;
  if (reply.type === 'text') return reply.payload.body;
  if (reply.type === 'location') return reply.payload;
  return reply.payload;
}

function normalizeValue(node: SduiNode, raw: unknown): unknown {
  const encoded = typeof raw === 'string' ? raw : '';
  const prefix = `field:${node.id}:`;
  const value = encoded.startsWith(prefix) ? decodeURIComponent(encoded.slice(prefix.length)) : raw;
  if (node.type === 'ui.checkbox') return value === true || value === 'true' || value === 'yes';
  if ((node.props.inputMode === 'number' || node.props.inputMode === 'decimal') && value !== '') {
    const numeric = Number(String(value).replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : value;
  }
  return value;
}

export class WhatsAppSduiConversation {
  readonly runtime: SduiRuntime;
  readonly recipient: string;
  readonly diagnostics: ConversationDiagnostic[] = [];
  private readonly inputs: SduiNode[] = [];
  private readonly actions = new Map<string, SduiNode>();
  private readonly emittedContent = new Set<string>();
  private cursor = 0;

  constructor(options: WhatsAppConversationOptions) {
    const parsed = parseSduiDocument(options.document);
    if (!parsed.valid || !parsed.document) {
      const summary = parsed.diagnostics.map((item) => `${item.code} (${item.path})`).join(', ');
      throw new Error(`SDUI incompatível para WhatsApp: ${summary || 'documento ausente'}.`);
    }
    this.recipient = options.recipient;
    this.runtime = createSduiRuntime({
      document: parsed.document,
      context: options.context,
      handlers: options.handlers,
    });
    walkSdui(this.runtime.root, (node) => {
      if (INPUT_TYPES.has(node.type)) this.inputs.push(node);
      if (
        (node.type === 'ui.button' || node.type === 'ui.link')
        && node.events?.onPress
        && node.events.onPress.action !== 'action.openUrl'
      ) {
        this.actions.set(node.id, node);
      }
    });
  }

  initialMessages(): WhatsAppOutboundMessage[] {
    return [...this.visibleContentMessages(), ...this.nextPrompt()];
  }

  private visibleContentMessages(): WhatsAppOutboundMessage[] {
    const messages: WhatsAppOutboundMessage[] = [];
    walkSdui(this.runtime.root, (node) => {
      if (!this.runtime.isVisible(node) || this.emittedContent.has(node.id)) return;
      const resolved = (value: unknown): string => this.runtime.resolveText(value);
      switch (node.type) {
        case 'ui.screen':
          if (resolved(node.props.title)) {
            messages.push(textMessage(this.recipient, `*${resolved(node.props.title)}*`));
            this.emittedContent.add(node.id);
          }
          break;
        case 'ui.text':
          if (resolved(node.props.text)) {
            messages.push(textMessage(this.recipient, resolved(node.props.text)));
            this.emittedContent.add(node.id);
          }
          break;
        case 'ui.image': {
          const link = resolved(node.props.source);
          if (link) {
            messages.push({
              messaging_product: 'whatsapp',
              to: this.recipient,
              type: 'image',
              image: { link, ...(resolved(node.props.alt) ? { caption: resolved(node.props.alt) } : {}) },
            });
            this.emittedContent.add(node.id);
          }
          break;
        }
        case 'ui.alert': {
          const severity = String(node.props.severity ?? 'informative');
          const prefix = severity === 'negative' ? '❌' : severity === 'warning' ? '⚠️' : severity === 'positive' ? '✅' : 'ℹ️';
          const title = resolved(node.props.title);
          const message = resolved(node.props.message);
          messages.push(textMessage(this.recipient, `${prefix}${title ? ` *${title}*\n` : ' '}${message}`));
          this.emittedContent.add(node.id);
          break;
        }
        case 'ui.progress': {
          const raw = typeof node.props.value === 'number' ? node.props.value : 0;
          const percent = Math.round(Math.min(100, Math.max(0, raw <= 1 ? raw * 100 : raw)));
          messages.push(textMessage(this.recipient, `${resolved(node.props.label) || 'Progresso'}: ${percent}%`));
          this.emittedContent.add(node.id);
          break;
        }
        case 'ui.loading':
          messages.push(textMessage(this.recipient, `⏳ ${resolved(node.props.label) || 'Aguarde...'}`));
          this.emittedContent.add(node.id);
          break;
        case 'ui.link': {
          const event = node.events?.onPress;
          const url = event?.action === 'action.openUrl' ? event.params?.url : null;
          if (typeof url === 'string' && /^https?:\/\//.test(url)) {
            messages.push(interactiveMessage(
              this.recipient,
              resolved(node.props.label),
              { parameters: { display_text: resolved(node.props.label), url } },
              'cta_url',
            ));
            this.emittedContent.add(node.id);
          }
          break;
        }
        case 'ui.icon':
        case 'ui.divider':
        case 'ui.spacer':
          this.diagnostics.push({
            code: 'VISUAL_ONLY_COMPONENT_OMITTED',
            nodeId: node.id,
            message: `${node.type} não gera mensagem própria no canal conversacional.`,
          });
          this.emittedContent.add(node.id);
          break;
      }
    });
    return messages;
  }

  async receive(reply: WceReply): Promise<WhatsAppOutboundMessage[]> {
    const actionId = typeof reply.payload.id === 'string' && reply.payload.id.startsWith('action:')
      ? reply.payload.id.slice('action:'.length)
      : null;
    if (actionId) {
      const node = this.actions.get(actionId);
      if (!node || !this.runtime.isVisible(node)) {
        return [textMessage(this.recipient, 'Essa ação não está mais disponível.')];
      }
      const result = await this.runtime.dispatch(node, 'onPress');
      if (result.errors.length > 0) {
        this.cursor = 0;
        return [textMessage(this.recipient, result.errors[0]?.message ?? 'Revise os dados informados.'), ...this.nextPrompt()];
      }
      return result.handled && !result.submitted
        ? [
            ...this.visibleContentMessages(),
            textMessage(this.recipient, 'Ação processada.'),
            ...this.nextPrompt(),
          ]
        : [];
    }

    const node = this.currentInput();
    if (!node) return [textMessage(this.recipient, 'Use uma das ações disponíveis para continuar.')];
    const value = normalizeValue(node, inputValue(reply));
    const path = boundPath(node);
    if (!path || !this.runtime.setNodeValue(node, value)) {
      return [textMessage(this.recipient, 'O campo atual não aceita resposta pelo canal WhatsApp.')];
    }
    const errors = validateNodeValue(node, path, value);
    if (errors.length > 0) {
      return [textMessage(this.recipient, errors[0]?.message ?? 'Resposta inválida.'), ...this.prompt(node)];
    }
    const changeResult = await this.runtime.dispatch(node, 'onChange');
    if (changeResult.submitted) return [];
    this.cursor += 1;
    return [...this.visibleContentMessages(), ...this.nextPrompt()];
  }

  private currentInput(): SduiNode | null {
    while (this.cursor < this.inputs.length && !this.runtime.isVisible(this.inputs[this.cursor]!)) this.cursor += 1;
    return this.inputs[this.cursor] ?? null;
  }

  private nextPrompt(): WhatsAppOutboundMessage[] {
    const input = this.currentInput();
    if (input) return this.prompt(input);
    const visibleActions = [...this.actions.values()].filter((node) => this.runtime.isVisible(node));
    if (visibleActions.length === 0) {
      this.diagnostics.push({
        code: 'CONVERSATION_WITHOUT_ACTION',
        nodeId: this.runtime.root.id,
        message: 'Não há ação visível para concluir o formulário.',
      });
      return [textMessage(this.recipient, 'Não há uma ação disponível para continuar esta jornada.')];
    }
    const buttons = visibleActions.slice(0, 3).map((node) => ({
      type: 'reply',
      reply: { id: `action:${node.id}`, title: this.runtime.resolveText(node.props.label).slice(0, 20) || 'Continuar' },
    }));
    if (visibleActions.length > 3) {
      this.diagnostics.push({
        code: 'WHATSAPP_ACTION_LIMIT',
        nodeId: this.runtime.root.id,
        message: 'O WhatsApp apresenta no máximo três ações de resposta rápida.',
      });
    }
    return [interactiveMessage(this.recipient, 'Como deseja continuar?', { buttons })];
  }

  private prompt(node: SduiNode): WhatsAppOutboundMessage[] {
    const label = this.runtime.resolveText(node.props.label) || 'Informe o valor';
    const required = node.props.required === true ? ' (obrigatório)' : '';
    if (node.type === 'ui.select') {
      const options = optionRecords(node);
      if (options.length <= 3) {
        return [interactiveMessage(this.recipient, `${label}${required}`, {
          buttons: options.map((option) => ({
            type: 'reply',
            reply: { id: `field:${node.id}:${encodeURIComponent(option.value)}`, title: this.runtime.resolveText(option.label).slice(0, 20) },
          })),
        })];
      }
      return [interactiveMessage(this.recipient, `${label}${required}`, {
        button: 'Ver opções',
        sections: [{
          title: label.slice(0, 24),
          rows: options.slice(0, 10).map((option) => ({
            id: `field:${node.id}:${encodeURIComponent(option.value)}`,
            title: this.runtime.resolveText(option.label).slice(0, 24),
          })),
        }],
      }, 'list')];
    }
    if (node.type === 'ui.checkbox') {
      return [interactiveMessage(this.recipient, `${label}${required}`, {
        buttons: [
          { type: 'reply', reply: { id: `field:${node.id}:true`, title: 'Sim' } },
          { type: 'reply', reply: { id: `field:${node.id}:false`, title: 'Não' } },
        ],
      })];
    }
    const hint = node.type === 'ui.datePicker'
      ? node.props.mode === 'time' ? 'Formato: HH:mm' : node.props.mode === 'dateTime' ? 'Formato: AAAA-MM-DD HH:mm' : 'Formato: AAAA-MM-DD'
      : this.runtime.resolveText(node.props.placeholder);
    return [textMessage(this.recipient, `${label}${required}${hint ? `\n_${hint}_` : ''}`)];
  }
}
