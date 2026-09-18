import { getStore } from "@/server/db";
import { getWatchStore } from "@/server/watch-db";
import { hashConnectionToken } from "@/persistence/watch";
import { notificationChannel } from "@/notifications";
import { answerCallbackQuery, sendTelegramText } from "@/notifications/telegram";
import {
  helpMessage, homeMessage, linkRequiredMessage,
  parseWatchCallback, recentMessage, watchesMessage, watchDetailMessage,
  type RecentResearchItem, type TelegramMessage,
} from "@/server/telegram-menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_TOKEN_RE = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{20,128})$/;
const COMMAND_RE = /^\/(start|watches|recent|help)(?:@[A-Za-z0-9_]+)?\s*$/;

interface TelegramChat { id?: unknown; type?: unknown }
interface TelegramInboundMessage { text?: unknown; chat?: TelegramChat }
interface TelegramCallback { id?: unknown; data?: unknown; message?: { message_id?: unknown; chat?: TelegramChat } }

function privateChatId(value: { chat?: TelegramChat } | undefined): string | null {
  const chat = value?.chat;
  if (!chat || chat.type !== "private") return null;
  if (typeof chat.id !== "string" && typeof chat.id !== "number") return null;
  return String(chat.id);
}

async function send(chatId: string, message: TelegramMessage): Promise<void> {
  try {
    await sendTelegramText(chatId, message.text, message.reply_markup ?? null);
  } catch { /* transport failures must never break the webhook contract */ }
}

async function recentItems(accountUserId: string): Promise<RecentResearchItem[]> {
  const sessionStore = await getStore();
  const rows = await sessionStore.listByAccountUserId(accountUserId);
  return rows.slice(0, 5).map((row) => {
    const state = row.state as { intent?: { decisionQuestion?: string }; spotSymbol?: string };
    return {
      id: row.id,
      asset: typeof state.spotSymbol === "string" ? state.spotSymbol : null,
      decision: String(state.intent?.decisionQuestion ?? "Research session").slice(0, 100),
      read: row.read,
      updatedAt: row.updatedAt,
    };
  });
}

async function handleWatchAction(accountUserId: string, chatId: string, callbackId: string, action: "detail" | "pause" | "resume" | "stop", id: string): Promise<void> {
  const store = await getWatchStore();
  const watch = await store.getWatch(id);
  if (!watch || watch.accountUserId !== accountUserId) {
    await answerCallbackQuery(callbackId, "That watch is no longer available.");
    return;
  }
  if (action === "detail") {
    await answerCallbackQuery(callbackId);
    await send(chatId, watchDetailMessage(watch));
    return;
  }
  const target = action === "pause" ? "PAUSED" : action === "resume" ? "ACTIVE" : "CANCELLED";
  if (watch.status === target) {
    await answerCallbackQuery(callbackId, target === "PAUSED" ? "Already paused." : target === "ACTIVE" ? "Already active." : "Already stopped.");
    return;
  }
  if (watch.status === "TRIGGERED" || watch.status === "ERROR") {
    await answerCallbackQuery(callbackId, "This watch already completed.");
    return;
  }
  const patch: Parameters<typeof store.updateWatch>[2] =
    target === "ACTIVE" ? { status: target, nextCheckAt: new Date().toISOString() } : { status: target };
  const updated = await store.updateWatch(watch.id, watch.stateVersion, patch);
  if (!updated) {
    await answerCallbackQuery(callbackId, "Changed elsewhere — here is the current state.");
    const current = await store.getWatch(watch.id);
    if (current && current.accountUserId === accountUserId) await send(chatId, watchDetailMessage(current));
    return;
  }
  await answerCallbackQuery(callbackId, target === "PAUSED" ? "Paused." : target === "ACTIVE" ? "Resumed — checking now." : "Stopped.");
  await send(chatId, watchDetailMessage(updated));
}

async function handleCallback(query: TelegramCallback): Promise<void> {
  const callbackId = typeof query.id === "string" ? query.id : null;
  const chatId = privateChatId(query.message);
  const data = typeof query.data === "string" ? query.data : "";
  if (!callbackId || !chatId) return;
  try {
    const store = await getWatchStore();
    const connection = await store.findConnectionByAddress("TELEGRAM", chatId);
    if (!connection || connection.status !== "CONNECTED") {
      await answerCallbackQuery(callbackId, "Link your CLINCH account first.");
      await send(chatId, linkRequiredMessage());
      return;
    }
    const accountUserId = connection.accountUserId;
    if (data === "home:watches") {
      await answerCallbackQuery(callbackId);
      await send(chatId, watchesMessage(await store.listWatches(accountUserId)));
      return;
    }
    if (data === "home:recent") {
      await answerCallbackQuery(callbackId);
      await send(chatId, recentMessage(await recentItems(accountUserId)));
      return;
    }
    if (data === "home:help" || data === "home:home") {
      await answerCallbackQuery(callbackId);
      await send(chatId, data === "home:help" ? helpMessage() : homeMessage());
      return;
    }
    const parsed = parseWatchCallback(data);
    if (!parsed) {
      await answerCallbackQuery(callbackId, "Unknown action.");
      return;
    }
    await handleWatchAction(accountUserId, chatId, callbackId, parsed.action, parsed.id);
  } catch {
    try { await answerCallbackQuery(callbackId, "Something didn't work. Try again."); } catch { /* ack-only */ }
  }
}

async function handleCommand(chatId: string, text: string): Promise<void> {
  const store = await getWatchStore();
  const tokenMatch = text.match(START_TOKEN_RE);
  if (tokenMatch) {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    const token = await store.consumeConnectionToken(hashConnectionToken(tokenMatch[1]), new Date());
    if (!token) {
      const existing = await store.findConnectionByAddress("TELEGRAM", chatId);
      await send(chatId, existing && existing.status === "CONNECTED" ? homeMessage() : linkRequiredMessage());
      return;
    }
    if (token.channel !== "TELEGRAM") return;
    await store.upsertConnection({ accountUserId: token.accountUserId, channel: "TELEGRAM", address: chatId, status: "CONNECTED" });
    const channel = notificationChannel("TELEGRAM");
    if (channel) {
      await channel.sendConnectionConfirmation(
        { accountUserId: token.accountUserId, channel: "TELEGRAM", address: chatId },
        { eventType: "connection_confirmation", channel: "TELEGRAM", accountUserId: token.accountUserId },
      );
    }
    await send(chatId, homeMessage());
    return;
  }
  const command = text.match(COMMAND_RE)?.[1] ?? null;
  if (command === "help") {
    await send(chatId, helpMessage());
    return;
  }
  const connection = await store.findConnectionByAddress("TELEGRAM", chatId);
  const linked = Boolean(connection && connection.status === "CONNECTED");
  if (!linked) {
    await send(chatId, linkRequiredMessage());
    return;
  }
  const accountUserId = (connection as NonNullable<typeof connection>).accountUserId;
  if (command === "watches" || command === "start") {
    if (command === "start") {
      await send(chatId, homeMessage());
      return;
    }
    await send(chatId, watchesMessage(await store.listWatches(accountUserId)));
    return;
  }
  if (command === "recent") {
    await send(chatId, recentMessage(await recentItems(accountUserId)));
    return;
  }
  await send(chatId, homeMessage());
}

export async function POST(req: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const supplied = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!webhookSecret) return Response.json({ error: "TELEGRAM_SETUP_REQUIRED" }, { status: 503 });
  if (!supplied || supplied !== webhookSecret) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const callback = (body as { callback_query?: TelegramCallback }).callback_query;
  if (callback && typeof callback === "object") {
    await handleCallback(callback);
    return Response.json({ ok: true });
  }
  const message = (body as { message?: TelegramInboundMessage }).message;
  const chatId = message && typeof message === "object" ? privateChatId(message) : null;
  if (!chatId) return Response.json({ ok: true });
  if (typeof message?.text !== "string") return Response.json({ ok: true });
  await handleCommand(chatId, message.text.trim());
  return Response.json({ ok: true });
}
