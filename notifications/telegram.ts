import type {
  ConnectionConfirmationEvent,
  DecisionChangedEvent,
  DeliveryFailure,
  DeliveryResult,
  NotificationChannel,
  NotificationDestination,
} from "./channel";

const TELEGRAM_API = "https://api.telegram.org";

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

function formatRead(read: string): string {
  const labels: Record<string, string> = {
    "enter-now": "Slightly favorable",
    "leaning-in": "Slightly favorable",
    wait: "Better to wait",
    "stand-aside": "No clear advantage",
    "cannot-resolve": "Not enough evidence yet",
    undecided: "Not enough evidence yet",
  };
  return labels[read] ?? read;
}

async function sendMessage(chatId: string, message: string, fetchImpl: typeof fetch = fetch): Promise<DeliveryResult> {
  const botToken = token();
  if (!botToken) return { accepted: false, retryable: false, reason: "TELEGRAM_NOT_CONFIGURED" };
  let response: Response;
  try {
    response = await fetchImpl(TELEGRAM_API + "/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    });
  } catch {
    return { accepted: false, retryable: true, reason: "TELEGRAM_NETWORK_FAILURE" };
  }
  let body: { ok?: boolean; result?: { message_id?: number } } = {};
  try { body = await response.json() as typeof body; } catch { /* handled below */ }
  if (!response.ok || body.ok !== true) {
    const retryable = response.status === 429 || response.status >= 500;
    return { accepted: false, retryable, reason: "TELEGRAM_HTTP_" + response.status };
  }
  return { accepted: true, retryable: false, providerMessageId: body.result?.message_id ? String(body.result.message_id) : undefined };
}

export class TelegramChannel implements NotificationChannel {
  readonly id = "TELEGRAM" as const;

  async canDeliver(destination: NotificationDestination): Promise<{ ok: boolean; reason?: string }> {
    if (destination.channel !== this.id) return { ok: false, reason: "CHANNEL_MISMATCH" };
    return token() ? { ok: true } : { ok: false, reason: "TELEGRAM_NOT_CONFIGURED" };
  }

  async sendDecisionChanged(destination: NotificationDestination, event: DecisionChangedEvent): Promise<DeliveryResult> {
    return sendMessage(destination.address,
      "Your CLINCH read changed for " + event.assetLabel + ".\n\n" +
      formatRead(event.previousRead) + " -> " + formatRead(event.nextRead) +
      "\n\nWhat changed:\n" + event.whatChanged.join("\n") + "\n\nCLINCH does not place trades.");
  }

  async sendConnectionConfirmation(destination: NotificationDestination, event: ConnectionConfirmationEvent): Promise<DeliveryResult> {
    return sendMessage(destination.address, "CLINCH notifications are connected for this account via " + event.channel + ".");
  }

  handleDeliveryFailure(failure: DeliveryFailure): { pauseWatch: boolean; retry: boolean } {
    if (!failure.retryable) return { pauseWatch: true, retry: false };
    return { pauseWatch: false, retry: true };
  }
}
