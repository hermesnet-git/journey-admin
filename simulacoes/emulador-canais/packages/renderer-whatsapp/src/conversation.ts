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

const INPUT_TYPES = new Set(['ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker', 'ui.selectList']);
// Limites do WhatsApp usados pela lista de seleção (ADR-002).
const LIST_MAX_ROWS = 10;
const LIST_TITLE_MAX = 24;
const LIST_DESCRIPTION_MAX = 72;
const BUTTON_TITLE_MAX = 20;

interface ListItem { value: string; title: string; description?: string; hint?: string; enabledActions: string[] }
interface ListAction { id: string; label: string }

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function listItems(node: SduiNode): ListItem[] {
  return Array.isArray(node.attributes.items) ? node.attributes.items as ListItem[] : [];
}

function listActions(node: SduiNode): ListAction[] {
  return Array.isArray(node.attributes.actions) ? node.attributes.actions as ListAction[] : [];
}
const WHATSAPP_RENDERER_VERSION = '1.0.0';

function versionAtLeast(current: string, minimum: string): boolean {
  const left = current.split('.').map(Number);
  const right = minimum.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index]! > right[index]!) return true;
    if (left[index]! < right[index]!) return false;
  }
  return true;
}

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
  if (!Array.isArray(node.attributes.options)) return [];
  return node.attributes.options
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
  if ((node.attributes.inputMode === 'number' || node.attributes.inputMode === 'decimal') && value !== '') {
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
  private readonly parents = new Map<string, SduiNode | null>();
  private readonly emittedContent = new Set<string>();
  private cursor = 0;
  // Página atual de cada lista de seleção ("Ver mais": o adaptador pagina sozinho, os itens já vieram todos).
  private readonly listPages = new Map<string, number>();

  constructor(options: WhatsAppConversationOptions) {
    const parsed = parseSduiDocument(options.document);
    if (!parsed.valid || !parsed.document) {
      const summary = parsed.diagnostics.map((item) => `${item.code} (${item.path})`).join(', ');
      throw new Error(`SDUI incompatível para WhatsApp: ${summary || 'documento ausente'}.`);
    }
    if ('supportedTargets' in parsed.document) {
      const minimum = parsed.document.minRendererVersion.whatsapp;
      if (!parsed.document.supportedTargets.includes('whatsapp')) throw new Error('A tela não foi publicada para o alvo whatsapp.');
      if (minimum && !versionAtLeast(WHATSAPP_RENDERER_VERSION, minimum)) throw new Error(`A tela exige adapter whatsapp ${minimum} ou superior; o canal possui ${WHATSAPP_RENDERER_VERSION}.`);
    }
    this.recipient = options.recipient;
    this.runtime = createSduiRuntime({
      document: parsed.document,
      context: options.context,
      handlers: options.handlers,
    });
    walkSdui(this.runtime.root, (node, parent) => {
      this.parents.set(node.id, parent);
      if (INPUT_TYPES.has(node.type)) this.inputs.push(node);
      if (
        (node.type === 'ui.button' || node.type === 'ui.link' || node.type === 'ui.alert')
        && node.events?.onPress
        && node.events.onPress.action !== 'action.openUrl'
      ) {
        this.actions.set(node.id, node);
      }
    });
  }

  private isAvailable(node: SduiNode): boolean {
    let current: SduiNode | null | undefined = node;
    while (current) {
      if (!this.runtime.isVisible(current) || !this.runtime.isActive(current)) return false;
      current = this.parents.get(current.id);
    }
    return true;
  }

  private isVisibleWithAncestors(node: SduiNode): boolean {
    let current: SduiNode | null | undefined = node;
    while (current) {
      if (!this.runtime.isVisible(current)) return false;
      current = this.parents.get(current.id);
    }
    return true;
  }

  initialMessages(): WhatsAppOutboundMessage[] {
    return [...this.visibleContentMessages(), ...this.nextPrompt()];
  }

  private visibleContentMessages(): WhatsAppOutboundMessage[] {
    const messages: WhatsAppOutboundMessage[] = [];
    walkSdui(this.runtime.root, (node) => {
      if (!this.isVisibleWithAncestors(node) || this.emittedContent.has(node.id)) return;
      const resolved = (value: unknown): string => this.runtime.resolveText(value);
      switch (node.type) {
        case 'ui.screen':
          if (resolved(node.attributes.title)) {
            messages.push(textMessage(this.recipient, `*${resolved(node.attributes.title)}*`));
            this.emittedContent.add(node.id);
          }
          break;
        case 'ui.text':
          if (resolved(this.runtime.getNodeAttribute(node, 'text'))) {
            messages.push(textMessage(this.recipient, resolved(this.runtime.getNodeAttribute(node, 'text'))));
            this.emittedContent.add(node.id);
          }
          break;
        case 'ui.image': {
          const link = resolved(this.runtime.getNodeAttribute(node, 'source'));
          if (link) {
            messages.push({
              messaging_product: 'whatsapp',
              to: this.recipient,
              type: 'image',
              image: { link, ...(resolved(this.runtime.getNodeAttribute(node, 'alt')) ? { caption: resolved(this.runtime.getNodeAttribute(node, 'alt')) } : {}) },
            });
            this.emittedContent.add(node.id);
          }
          break;
        }
        case 'ui.alert': {
          const severity = String(node.attributes.severity ?? 'informative');
          const prefix = severity === 'negative' ? '❌' : severity === 'warning' ? '⚠️' : severity === 'positive' ? '✅' : 'ℹ️';
          const title = resolved(this.runtime.getNodeAttribute(node, 'title'));
          const message = resolved(this.runtime.getNodeAttribute(node, 'message'));
          const body = `${prefix}${title ? ` *${title}*\n` : ' '}${message}`;
          if (node.attributes.dismissible === true && node.events.onDismiss && this.isAvailable(node)) {
            messages.push(interactiveMessage(this.recipient, body, {
              buttons: [{ type: 'reply', reply: { id: `action:${node.id}`, title: 'Dispensar' } }],
            }));
          } else {
            messages.push(textMessage(this.recipient, body));
          }
          this.emittedContent.add(node.id);
          break;
        }
        case 'ui.progress': {
          const boundValue = this.runtime.getNodeAttribute(node, 'value');
          const raw = typeof boundValue === 'number' ? boundValue : 0;
          const percent = Math.round(Math.min(100, Math.max(0, raw <= 1 ? raw * 100 : raw)));
          messages.push(textMessage(this.recipient, `${resolved(node.attributes.label) || 'Progresso'}: ${percent}%`));
          this.emittedContent.add(node.id);
          break;
        }
        case 'ui.loading':
          messages.push(textMessage(this.recipient, `⏳ ${resolved(node.attributes.label) || 'Aguarde...'}`));
          this.emittedContent.add(node.id);
          break;
        case 'ui.link': {
          const event = node.events?.onPress;
          const url = event?.action === 'action.openUrl' ? event.params?.url : null;
          if (typeof url === 'string' && /^https?:\/\//.test(url)) {
            messages.push(interactiveMessage(
              this.recipient,
              resolved(node.attributes.label),
              { parameters: { display_text: resolved(node.attributes.label), url } },
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
            code: 'SDUI_COMPONENT_OMITTED',
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
    const replyId = typeof reply.payload.id === 'string' ? reply.payload.id : '';
    if (replyId.startsWith('more:')) {
      const node = this.currentInput();
      if (!node || node.type !== 'ui.selectList') return [textMessage(this.recipient, 'Essa lista não está mais disponível.')];
      this.listPages.set(node.id, (this.listPages.get(node.id) ?? 0) + 1);
      return this.prompt(node);
    }
    if (replyId.startsWith('retry:')) {
      const node = this.currentInput();
      if (node) await this.runtime.dispatch({ ...node, events: { retry: { action: 'action.retry' } } }, 'retry');
      return [];
    }
    if (replyId.startsWith('listaction:')) {
      const [, nodeId, actionKey] = replyId.split(':');
      const node = this.inputs.find((candidate) => candidate.id === nodeId);
      if (!node || !this.isAvailable(node)) return [textMessage(this.recipient, 'Essa ação não está mais disponível.')];
      const result = await this.runtime.selectListAction(node, decodeURIComponent(actionKey ?? ''));
      if (!result.handled) return [textMessage(this.recipient, 'Essa ação não está liberada para o item escolhido.'), ...this.prompt(node)];
      if (result.errors.length > 0) {
        this.cursor = 0;
        return [textMessage(this.recipient, result.errors[0]?.message ?? 'Revise os dados informados.'), ...this.nextPrompt()];
      }
      return [];
    }
    const actionId = typeof reply.payload.id === 'string' && reply.payload.id.startsWith('action:')
      ? reply.payload.id.slice('action:'.length)
      : null;
    if (actionId) {
      const node = this.actions.get(actionId);
      if (!node || !this.isAvailable(node)) {
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
    if (node.type === 'ui.selectList' && listActions(node).length > 0) {
      return this.promptListActions(node, String(value));
    }
    this.cursor += 1;
    return [...this.visibleContentMessages(), ...this.nextPrompt()];
  }

  private currentInput(): SduiNode | null {
    while (this.cursor < this.inputs.length && !this.isAvailable(this.inputs[this.cursor]!)) this.cursor += 1;
    return this.inputs[this.cursor] ?? null;
  }

  private nextPrompt(): WhatsAppOutboundMessage[] {
    const input = this.currentInput();
    if (input) return this.prompt(input);
    const visibleActions = [...this.actions.values()].filter((node) => this.isAvailable(node));
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
      reply: { id: `action:${node.id}`, title: this.runtime.resolveText(node.attributes.label).slice(0, 20) || 'Continuar' },
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

  private promptListActions(node: SduiNode, value: string): WhatsAppOutboundMessage[] {
    const item = listItems(node).find((candidate) => candidate.value === value);
    const allowed = listActions(node).filter((action) => item?.enabledActions.includes(action.id));
    const hint = item?.hint ? `${item.hint}\n` : '';
    if (allowed.length === 0) {
      // Nenhuma ação liberada pra este item: explica e oferece a lista de novo.
      return [textMessage(this.recipient, `${hint}Este item não permite nenhuma ação agora. Escolha outro.`), ...this.prompt(node)];
    }
    return [interactiveMessage(this.recipient, `${hint}${item?.title ?? 'Item escolhido'} — o que deseja fazer?`, {
      buttons: allowed.slice(0, 3).map((action) => ({
        type: 'reply',
        reply: { id: `listaction:${node.id}:${encodeURIComponent(action.id)}`, title: truncate(action.label, BUTTON_TITLE_MAX) },
      })),
    })];
  }

  private promptSelectList(node: SduiNode, label: string, required: string): WhatsAppOutboundMessage[] {
    const loadError = node.attributes.loadError as { message?: string; required?: boolean } | undefined;
    if (loadError?.required) {
      return [interactiveMessage(this.recipient, `❌ ${loadError.message ?? 'Não foi possível carregar a lista.'}`, {
        buttons: [{ type: 'reply', reply: { id: `retry:${node.id}`, title: 'Tentar novamente' } }],
      })];
    }
    const items = listItems(node);
    if (items.length === 0) {
      // Lista vazia: informa e segue pra próxima etapa da conversa.
      this.cursor += 1;
      const empty = this.runtime.resolveText(node.attributes.emptyMessage) || 'Nenhum item para mostrar.';
      return [textMessage(this.recipient, loadError ? `${loadError.message}\n${empty}` : empty), ...this.nextPrompt()];
    }
    const pageSize = items.length > LIST_MAX_ROWS ? LIST_MAX_ROWS - 1 : LIST_MAX_ROWS;
    const page = this.listPages.get(node.id) ?? 0;
    const start = page * pageSize >= items.length ? 0 : page * pageSize;
    if (start === 0) this.listPages.set(node.id, 0);
    const pageItems = items.slice(start, start + pageSize);
    const rows: Array<Record<string, string>> = pageItems.map((item) => ({
      id: `field:${node.id}:${encodeURIComponent(item.value)}`,
      title: truncate(item.title, LIST_TITLE_MAX),
      ...(item.description ? { description: truncate(item.description, LIST_DESCRIPTION_MAX) } : {}),
    }));
    if (items.length > LIST_MAX_ROWS) {
      rows.push({ id: `more:${node.id}`, title: 'Ver mais', description: `Itens ${start + 1}–${start + pageItems.length} de ${items.length}` });
    }
    const total = typeof node.attributes.totalItems === 'number' && node.attributes.totalItems > items.length
      ? `\n_Mostrando ${items.length} de ${node.attributes.totalItems}._` : '';
    return [interactiveMessage(this.recipient, `${label}${required}${total}`, {
      button: 'Ver itens',
      sections: [{ title: truncate(label, LIST_TITLE_MAX), rows }],
    }, 'list')];
  }

  private prompt(node: SduiNode): WhatsAppOutboundMessage[] {
    const label = this.runtime.resolveText(node.attributes.label) || 'Informe o valor';
    const required = node.attributes.required === true ? ' (obrigatório)' : '';
    if (node.type === 'ui.selectList') return this.promptSelectList(node, label, required);
    if (node.type === 'ui.select') {
      const options = optionRecords(node);
      const loadError = node.attributes.loadError as { message?: string; required?: boolean } | undefined;
      if (loadError?.required) {
        return [interactiveMessage(this.recipient, `❌ ${loadError.message ?? 'Não foi possível carregar as opções.'}`, {
          buttons: [{ type: 'reply', reply: { id: `retry:${node.id}`, title: 'Tentar novamente' } }],
        })];
      }
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
      ? node.attributes.mode === 'time' ? 'Formato: HH:mm' : node.attributes.mode === 'dateTime' ? 'Formato: AAAA-MM-DD HH:mm' : 'Formato: AAAA-MM-DD'
      : this.runtime.resolveText(node.attributes.placeholder);
    return [textMessage(this.recipient, `${label}${required}${hint ? `\n_${hint}_` : ''}`)];
  }
}
