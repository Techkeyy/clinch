// Telegram account-linking flow through the REAL routes: connect mints a
// hashed single-use token + deep link; the webhook verifies the shared
// secret, consumes the token once, upserts the CONNECTED chat association,
// and sends a confirmation. Stubbed transport only; test secrets only.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";

const DB = join(tmpdir(), `clinch-telegram-link-${process.pid}.db`);
process.env.SQLITE_PATH = DB;
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_BOT_USERNAME = "ClinchhBot";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
try { unlinkSync(DB); } catch { /* fresh */ }

const testState = { accountUserId: null as string | null };

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return { ...actual, currentAccountUserId: async () => testState.accountUserId };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any;
let telegramCalls: { url: string; body: unknown }[] = [];

function stubTransport() {
  telegramCalls = [];
  vi.stubGlobal("fetch", (async (url: string, init?: RequestInit) => {
    if (String(url).includes("api.telegram.org")) {
      telegramCalls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
      return { status: 200, ok: true, json: async () => ({ ok: true, result: { message_id: 3 } }) };
    }
    return { status: 200, ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch);
}

function webhookReq(body: unknown, secret: string | null) {
  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret !== null ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  try { unlinkSync(DB); } catch { /* isolated store per test */ }
  stubTransport();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Telegram account linking", () => {
  it("connect requires auth and mints a single-use deep link for the account", async () => {
    const connectMod: AnyMod = await import("@/app/api/notifications/telegram/connect/route");
    testState.accountUserId = null;
    const anon = await connectMod.POST(new Request("http://localhost/api/notifications/telegram/connect", { method: "POST" }));
    expect(anon.status).toBe(401);
    testState.accountUserId = "user-A";
    const res = await connectMod.POST(new Request("http://localhost/api/notifications/telegram/connect", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { deepLink?: string; expiresInSeconds?: number };
    expect(body.deepLink).toMatch(/^https:\/\/t\.me\/ClinchhBot\?start=[A-Za-z0-9_-]+$/);
    expect(body.expiresInSeconds).toBe(600);
    expect(telegramCalls.length).toBe(0);
  });

  it("webhook rejects a missing or wrong secret without touching state", async () => {
    const hookMod: AnyMod = await import("@/app/api/telegram/webhook/route");
    const update = { message: { text: "/start abcdefghijklmnopqrst", chat: { id: 1, type: "private" } } };
    expect((await hookMod.POST(webhookReq(update, null))).status).toBe(401);
    expect((await hookMod.POST(webhookReq(update, "wrong-secret"))).status).toBe(401);
  });

  it("a /start token links the chat, confirms, and cannot be replayed", async () => {
    const connectMod: AnyMod = await import("@/app/api/notifications/telegram/connect/route");
    const hookMod: AnyMod = await import("@/app/api/telegram/webhook/route");
    const dbMod: AnyMod = await import("@/server/watch-db");
    testState.accountUserId = "user-A";
    const connected = await connectMod.POST(new Request("http://localhost/api/notifications/telegram/connect", { method: "POST" }));
    const token = ((await connected.json()) as { deepLink: string }).deepLink.split("?start=")[1];
    expect(token.length).toBeGreaterThanOrEqual(20);

    const update = { message: { text: `/start ${token}`, chat: { id: 987654, type: "private" } } };
    const first = await hookMod.POST(webhookReq(update, "test-webhook-secret"));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true });

    const store = await dbMod.getWatchStore();
    const link = await store.getConnection("user-A", "TELEGRAM");
    expect(link?.status).toBe("CONNECTED");
    expect(link?.address).toBe("987654");
    expect(telegramCalls.length).toBe(1);
    const confirmation = telegramCalls[0].body as { chat_id?: string; text?: string };
    expect(confirmation.chat_id).toBe("987654");
    expect(confirmation.text).toContain("connected");

    const replay = await hookMod.POST(webhookReq(update, "test-webhook-secret"));
    expect(replay.status).toBe(200);
    expect(telegramCalls.length).toBe(1);

    const unknown = await hookMod.POST(webhookReq(
      { message: { text: "/start aaaaaaaaaaaaaaaaaaaa", chat: { id: 987654, type: "private" } } },
      "test-webhook-secret",
    ));
    expect(unknown.status).toBe(200);
    expect(telegramCalls.length).toBe(1);
    await store.close();
  });

  it("non-link traffic is acknowledged without side effects", async () => {
    const hookMod: AnyMod = await import("@/app/api/telegram/webhook/route");
    const secret = "test-webhook-secret";
    for (const body of [
      { message: { text: "hello", chat: { id: 1, type: "private" } } },
      { message: { text: "/start", chat: { id: 1, type: "private" } } },
      { edited_message: { text: "/start abcdefghijklmnopqrst", chat: { id: 1, type: "private" } } },
    ]) {
      const res = await hookMod.POST(webhookReq(body, secret));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    }
    expect(telegramCalls.length).toBe(0);
  });
});
