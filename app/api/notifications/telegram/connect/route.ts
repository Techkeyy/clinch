import { randomBytes } from "node:crypto";
import { getWatchStore, } from "@/server/watch-db";
import { hashConnectionToken } from "@/persistence/watch";
import { currentAccountUserId } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!botUsername || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: "TELEGRAM_SETUP_REQUIRED" }, { status: 503 });
  }
  const token = randomBytes(32).toString("base64url");
  const store = await getWatchStore();
  await store.createConnectionToken({
    tokenHash: hashConnectionToken(token),
    accountUserId,
    channel: "TELEGRAM",
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  return Response.json({ deepLink: "https://t.me/" + botUsername + "?start=" + token, expiresInSeconds: 600 });
}
