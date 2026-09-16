import { getWatchStore } from "@/server/watch-db";
import { hashConnectionToken } from "@/persistence/watch";
import { notificationChannel } from "@/notifications";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const supplied = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!webhookSecret) return Response.json({ error: "TELEGRAM_SETUP_REQUIRED" }, { status: 503 });
  if (!supplied || supplied !== webhookSecret) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const message = (body as { message?: { text?: unknown; chat?: { id?: string | number; type?: string } } }).message;
  if (!message?.chat || message.chat.type !== "private" || typeof message.chat.id !== "string" && typeof message.chat.id !== "number") {
    return Response.json({ ok: true });
  }
  if (typeof message.text !== "string") return Response.json({ ok: true });
  const match = message.text.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{20,128})$/);
  if (!match) return Response.json({ ok: true });
  if (!process.env.TELEGRAM_BOT_TOKEN) return Response.json({ error: "TELEGRAM_SETUP_REQUIRED" }, { status: 503 });
  const store = await getWatchStore();
  const token = await store.consumeConnectionToken(hashConnectionToken(match[1]), new Date());
  if (!token) return Response.json({ ok: true });
  if (token.channel !== "TELEGRAM") return Response.json({ ok: true });
  await store.upsertConnection({ accountUserId: token.accountUserId, channel: "TELEGRAM", address: String(message.chat.id), status: "CONNECTED" });
  const channel = notificationChannel("TELEGRAM");
  if (channel) {
    await channel.sendConnectionConfirmation(
      { accountUserId: token.accountUserId, channel: "TELEGRAM", address: String(message.chat.id) },
      { eventType: "connection_confirmation", channel: "TELEGRAM", accountUserId: token.accountUserId },
    );
  }
  return Response.json({ ok: true });
}
