import {
  WhatsAppSduiConversation,
  type WhatsAppOutboundMessage,
  type WceReply,
} from '@elastic-journey/renderer-whatsapp';
import {
  JourneyClient,
  type JourneyInstance,
  type JourneyStep,
} from '@elastic-journey/journey-client';

interface WhatsAppSession {
  from: string;
  journeyId: string;
  instance: JourneyInstance;
  conversation: WhatsAppSduiConversation | null;
}

export interface StartWhatsAppSessionRequest {
  journeyId: string;
  from: string;
  variables?: Record<string, unknown>;
}

export interface WhatsAppSessionSummary {
  from: string;
  journeyId: string;
  processInstanceId: string;
  stepType: JourneyStep['type'];
  taskId: string | null;
}

class WceBridgeClient {
  constructor(private readonly baseUrl: string, private readonly timeoutMs: number) {}

  async send(message: WhatsAppOutboundMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/send-to-emulator`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new Error('Não foi possível acessar o WCE Bridge.');
    }
    if (!response.ok) throw new Error(`WCE Bridge respondeu HTTP ${response.status}.`);
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(to: string, body: string): WhatsAppOutboundMessage {
  return { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
}

function sessionSummary(session: WhatsAppSession): WhatsAppSessionSummary {
  return {
    from: session.from,
    journeyId: session.journeyId,
    processInstanceId: session.instance.processInstanceId,
    stepType: session.instance.step.type,
    taskId: session.instance.step.taskId,
  };
}

function inboundMessage(webhook: Record<string, unknown>): { from: string; reply: WceReply } | null {
  const entry = record(array(webhook.entry)[0]);
  const change = record(array(entry.changes)[0]);
  const value = record(change.value);
  const message = record(array(value.messages)[0]);
  const from = String(message.from ?? '');
  if (!from) return null;
  const type = String(message.type ?? '');
  if (type === 'text') {
    return { from, reply: { type: 'text', payload: { body: String(record(message.text).body ?? '') } } };
  }
  if (type === 'interactive') {
    const interactive = record(message.interactive);
    if (interactive.type === 'button_reply') {
      const reply = record(interactive.button_reply);
      return { from, reply: { type: 'button_reply', contextMessageId: String(record(message.context).id ?? ''), payload: { id: String(reply.id ?? ''), title: String(reply.title ?? '') } } };
    }
    if (interactive.type === 'list_reply') {
      const reply = record(interactive.list_reply);
      return { from, reply: { type: 'list_reply', contextMessageId: String(record(message.context).id ?? ''), payload: { id: String(reply.id ?? ''), title: String(reply.title ?? ''), ...(reply.description ? { description: String(reply.description) } : {}) } } };
    }
  }
  return null;
}

function startCommand(body: string): StartWhatsAppSessionRequest | null {
  const match = /^\/start\s+([^\s]+)(?:\s+(.+))?$/i.exec(body.trim());
  if (!match?.[1]) return null;
  let variables: Record<string, unknown> = {};
  if (match[2]) {
    try {
      const parsed = JSON.parse(match[2]) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) variables = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return { journeyId: match[1], from: '', variables };
}

export class WhatsAppSessionManager {
  private readonly sessions = new Map<string, WhatsAppSession>();
  private readonly bridge: WceBridgeClient;

  constructor(
    private readonly journey: JourneyClient,
    bridgeBaseUrl: string,
    bridgeTimeoutMs: number,
  ) {
    this.bridge = new WceBridgeClient(bridgeBaseUrl, bridgeTimeoutMs);
  }

  async start(request: StartWhatsAppSessionRequest): Promise<WhatsAppSessionSummary> {
    const existing = this.sessions.get(request.from);
    if (existing) {
      await this.journey.stopInstance(existing.instance.processInstanceId).catch(() => undefined);
      this.sessions.delete(request.from);
    }
    const instance = await this.journey.startJourney(request.journeyId, 'WHATSAPP', request.variables ?? {});
    const session: WhatsAppSession = {
      from: request.from,
      journeyId: request.journeyId,
      instance,
      conversation: null,
    };
    this.sessions.set(request.from, session);
    await this.activateStep(session, instance.step);
    return sessionSummary(session);
  }

  async stop(from: string): Promise<void> {
    const session = this.sessions.get(from);
    if (!session) return;
    await this.journey.stopInstance(session.instance.processInstanceId);
    this.sessions.delete(from);
    await this.bridge.send(text(from, 'Jornada encerrada.'));
  }

  async receiveWebhook(webhook: Record<string, unknown>): Promise<void> {
    const inbound = inboundMessage(webhook);
    if (!inbound) return;
    const body = inbound.reply.type === 'text' ? String(inbound.reply.payload.body ?? '').trim() : '';
    const command = startCommand(body);
    if (command) {
      await this.start({ ...command, from: inbound.from });
      return;
    }
    if (/^\/start\b/i.test(body)) {
      await this.bridge.send(text(inbound.from, 'Use: /start <journeyId> {"variavel":"valor"}'));
      return;
    }
    if (/^\/(sair|stop)$/i.test(body)) {
      await this.stop(inbound.from);
      return;
    }
    const session = this.sessions.get(inbound.from);
    if (!session) {
      await this.bridge.send(text(inbound.from, 'Nenhuma jornada ativa. Use /start <journeyId> para iniciar.'));
      return;
    }
    if (session.instance.step.type === 'WAITING') {
      if (!/^\/?atualizar$/i.test(body)) {
        await this.bridge.send(text(inbound.from, 'A jornada ainda está aguardando. Digite atualizar para consultar novamente.'));
        return;
      }
      const step = await this.journey.getCurrentStep(session.instance.processInstanceId);
      await this.activateStep(session, step);
      return;
    }
    if (!session.conversation) {
      await this.bridge.send(text(inbound.from, 'A jornada não possui uma interação ativa.'));
      return;
    }
    await this.sendAll(await session.conversation.receive(inbound.reply));
  }

  private async activateStep(session: WhatsAppSession, step: JourneyStep): Promise<void> {
    session.instance = { ...session.instance, step };
    session.conversation = null;
    if (step.type === 'WAITING') {
      await this.bridge.send(text(session.from, `⏳ Jornada aguardando: ${step.nodeName ?? step.nodeType ?? 'processamento externo'}.\nDigite atualizar para consultar novamente.`));
      return;
    }
    if (step.type === 'ENDED') {
      await this.bridge.send(text(session.from, '✅ Jornada concluída.'));
      return;
    }
    if (!step.form) {
      await this.bridge.send(text(session.from, 'Não há formulário disponível para o passo atual.'));
      return;
    }
    try {
      const conversation = new WhatsAppSduiConversation({
        document: step.form.sdui,
        recipient: session.from,
        context: { session: { channel: 'WHATSAPP', locale: 'pt-BR' } },
        handlers: {
          submit: async (answers) => {
            const taskId = session.instance.step.taskId;
            if (!taskId) return;
            const next = await this.journey.completeTask(session.instance.processInstanceId, taskId, { answers });
            await this.activateStep(session, next);
          },
          navigate: async (params) => this.bridge.send(text(session.from, `Navegação solicitada: ${String(params.route ?? params.destination ?? '')}`)),
          openUrl: async (params) => {
            const url = String(params.url ?? '');
            if (/^https?:\/\//.test(url)) await this.bridge.send(text(session.from, url));
          },
          track: async () => undefined,
        },
      });
      session.conversation = conversation;
      await this.sendAll(conversation.initialMessages());
    } catch (error) {
      await this.bridge.send(text(session.from, error instanceof Error ? error.message : 'SDUI incompatível com o canal WhatsApp.'));
    }
  }

  private async sendAll(messages: WhatsAppOutboundMessage[]): Promise<void> {
    for (const message of messages) await this.bridge.send(message);
  }
}
