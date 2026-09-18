// Telegram companion: chat->account resolution, /watches scoping and
// formatting, callback pause/resume/stop with web-identical authorization,
// /recent scoping, /start variants, webhook secret/callback discipline.
// Stubbed transport only; test secrets/addresses only.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DB_BASE = `clinch-telegram-companion-${process.pid}`;
let dbIndex = 0;
function nextDb() {
  dbIndex += 1;
  process.env.SQLITE_PATH = join(tmpdir(), `${DB_BASE}-${dbIndex}.db`);
}
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_BOT_USERNAME = "ClinchhBot";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
process.env.SESSION_PEPPER = "telegram-companion-test-pepper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any;

let telegramCalls: { url: string; body: Record<string, unknown> }[] = [];

function stubTransport() {
  telegramCalls = [];
  vi.stubGlobal("fetch", (async (url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.includes("api.telegram.org")) {
      telegramCalls.push({ url: target, body: JSON.parse(String(init?.body ?? "{}")) });
      return { status: 200, ok: true, json: async () => ({ ok: true, result: { message_id: 11 } }) };
    }
    return { status: 200, ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch);
}

function webhookReq(body: unknown, secret: string | null = "test-webhook-secret") {
  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret !== null ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

const hook = (body: unknown, secret: string | null = "test-webhook-secret") =>
  import("@/app/api/telegram/webhook/route").then((m: AnyMod) => m.POST(webhookReq(body, secret)));

const sentTexts = () => telegramCalls
  .filter((c) => c.url.includes("/sendMessage"))
  .map((c) => String(c.body.text ?? ""));
const ackedIds = () => telegramCalls
  .filter((c) => c.url.includes("/answerCallbackQuery"))
  .map((c) => String(c.body.callback_query_id ?? ""));
function cb(chatId: number, data: string, id = "cb-1") {
  return { callback_query: { id, from: { id: chatId }, message: { message_id: 9, chat: { id: chatId, type: "private" } }, data } };
}
function msg(chatId: number, text: string) {
  return { message: { text, chat: { id: chatId, type: "private" } } };
}

async function seedAccount(chatId: number, userId: string, watchCount = 1) {
  const dbMod: AnyMod = await import("@/server/watch-db");
  const store = await dbMod.getWatchStore();
  await store.upsertConnection({ accountUserId: userId, channel: "TELEGRAM", address: String(chatId), status: "CONNECTED" });
  const { compileWatchPlan } = await import("@/domain/watch");
  const ids: string[] = [];
  for (let i = 0; i < watchCount; i += 1) {
    const plan = compileWatchPlan({
      asset: "TSLA", action: "wait", currentRead: "wait",
      hinge: { topic: "structure-direction", question: "Is the drift exhausted?" },
      completedFamily: "spot-structure",
      facts: { spot: { last: 350 + i, spreadWide: false } },
      changeTriggers: [], futureRechecks: [],
    });
    const id = randomUUID();
    await store.createWatch({
      id, accountUserId: userId, sourceSessionId: randomUUID(), assetLabel: "TSLA",
      realityTicker: "RTSLAUSDT", perpTicker: null, originalQuestion: `Should I wait on TSLA ${i}?`,
      hinge: "structure-direction", humanKeyQuestion: plan.humanKeyQuestion,
      researchFamily: "spot-structure", startingRead: "wait", currentRead: "wait",
      targetRead: "enter-now", status: "ACTIVE", notificationChannel: "TELEGRAM",
      plan, snapshot: plan.baseline, stateVersion: 0,
      nextCheckAt: new Date(Date.now() + 600_000).toISOString(),
      lastCheckedAt: null, triggeredAt: null, leaseOwner: null, leaseExpiresAt: null, lastAttemptAt: null,
    });
    ids.push(id);
  }
  // NOTE: never close here: server/watch-db caches this instance per module
  // and the route under test shares it. Closing is only safe at test end.
  return ids;
}

async function seedResearch(userId: string, decision: string, read: string) {
  const dbMod: AnyMod = await import("@/server/db");
  const store = await dbMod.getStore();
  const id = randomUUID();
  await store.createSession({
    id, ownerVerifier: "test-verifier", accountUserId: userId, intent: { decisionQuestion: decision },
    state: { dilemma: decision, intent: { decisionQuestion: decision }, spotSymbol: "RTSLAUSDT" },
    status: "stopped", read, logicVersion: "test", idempotencyKey: `companion-${id}`,
    stateVersion: 0, brief: null,
  });
  return id;
}

beforeEach(() => {
  vi.resetModules();
  nextDb();
  stubTransport();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Telegram account resolution", () => {
  it("linked chat reaches its own account; unlinked chat gets no private data", async () => {
    await seedAccount(111, "user-A");
    const res = await hook(msg(111, "/watches"));
    expect(res.status).toBe(200);
    expect(sentTexts().join("\n")).toContain("TSLA");
    telegramCalls.length = 0;
    const stranger = await hook(msg(999, "/watches"));
    expect(stranger.status).toBe(200);
    const text = sentTexts().join("\n");
    expect(text).toContain("not linked");
    expect(text).not.toContain("TSLA");
  });

  it("a foreign chat cannot read another account's watches", async () => {
    await seedAccount(111, "user-A");
    await seedAccount(222, "user-B");
    const res = await hook(msg(222, "/watches"));
    expect(res.status).toBe(200);
    const text = sentTexts().join("\n");
    expect(text).toContain("TSLA");
  });
});

describe("/watches output", () => {
  it("lists only own watches with status-aware controls", async () => {
    const [id] = await seedAccount(111, "user-A", 2);
    await hook(msg(111, "/watches"));
    const bodies = telegramCalls.filter((c) => c.url.includes("/sendMessage"));
    expect(bodies.length).toBe(1);
    const markup = bodies[0].body.reply_markup as { inline_keyboard: { text: string; callback_data?: string }[][] };
    const callbacks = markup.inline_keyboard.flat().map((b) => b.callback_data).filter(Boolean);
    expect(callbacks.some((c) => c === `w:detail:${id}`)).toBe(true);
  });

  it("shows an empty state with no watches", async () => {
    const dbMod: AnyMod = await import("@/server/watch-db");
    const store = await dbMod.getWatchStore();
    await store.upsertConnection({ accountUserId: "user-A", channel: "TELEGRAM", address: "111", status: "CONNECTED" });
    await hook(msg(111, "/watches"));
    expect(sentTexts().join("\n")).toContain("no Decision Watches");
    await store.close();
  });
});

describe("watch callback actions", () => {
  it("pauses and resumes an owned watch with identical web rules", async () => {
    const [id] = await seedAccount(111, "user-A");
    expect((await hook(cb(111, `w:pause:${id}`, "cb-p"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-p");
    const dbMod: AnyMod = await import("@/server/watch-db");
    const store = await dbMod.getWatchStore();
    expect((await store.getWatch(id))?.status).toBe("PAUSED");
    expect((await hook(cb(111, `w:pause:${id}`, "cb-p2"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-p2");
    expect((await hook(cb(111, `w:resume:${id}`, "cb-r"))).status).toBe(200);
    expect((await store.getWatch(id))?.status).toBe("ACTIVE");
    await store.close();
  });

  it("stops an owned watch and refuses completed ones", async () => {
    const [id] = await seedAccount(111, "user-A");
    expect((await hook(cb(111, `w:stop:${id}`, "cb-s"))).status).toBe(200);
    const dbMod: AnyMod = await import("@/server/watch-db");
    const store = await dbMod.getWatchStore();
    expect((await store.getWatch(id))?.status).toBe("CANCELLED");
    await store.close();
  });

  it("rejects foreign and nonexistent watches without mutation", async () => {
    const [id] = await seedAccount(111, "user-A");
    await seedAccount(222, "user-B");
    expect((await hook(cb(222, `w:pause:${id}`, "cb-f"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-f");
    const dbMod: AnyMod = await import("@/server/watch-db");
    const store = await dbMod.getWatchStore();
    expect((await store.getWatch(id))?.status).toBe("ACTIVE");
    expect((await hook(cb(111, `w:pause:${randomUUID()}`, "cb-x"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-x");
    await store.close();
  });

  it("acks unknown callbacks without side effects", async () => {
    await seedAccount(111, "user-A");
    const sendsBefore = telegramCalls.filter((c) => c.url.includes("/sendMessage")).length;
    expect((await hook(cb(111, "whatever-nonsense", "cb-u"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-u");
    expect(telegramCalls.filter((c) => c.url.includes("/sendMessage")).length).toBe(sendsBefore);
  });
});

describe("/recent output", () => {
  it("returns only the requesting account's research", async () => {
    await seedAccount(111, "user-A");
    const mine = await seedResearch("user-A", "Should I wait on TSLA?", "wait");
    await seedResearch("user-B", "Other account private decision", "wait");
    await hook(msg(111, "/recent"));
    const text = sentTexts().join("\n");
    expect(text).toContain("Should I wait on TSLA?");
    expect(text).not.toContain("Other account private decision");
    const openUrls = JSON.stringify(telegramCalls.map((c) => c.body));
    expect(openUrls).toContain(mine);
  });
});

describe("/start variants", () => {
  it("linked chat gets home; unlinked chat gets the secure linking path", async () => {
    await seedAccount(111, "user-A");
    await hook(msg(111, "/start"));
    const homeButtons = JSON.stringify(telegramCalls.map((c) => c.body));
    expect(sentTexts().join("\n")).toContain("Research the decision");
    expect(homeButtons).toContain("My Watches");
    telegramCalls.length = 0;
    await hook(msg(999, "/start"));
    const text = sentTexts().join("\n");
    const buttons = JSON.stringify(telegramCalls.map((c) => c.body));
    expect(text).toContain("not linked");
    expect(buttons).toContain("Link CLINCH account");
    expect(text).not.toContain("TSLA");
  });

  it("expired and replayed link tokens cannot bind", async () => {
    const dbMod: AnyMod = await import("@/server/watch-db");
    const store = await dbMod.getWatchStore();
    const { hashConnectionToken } = await import("@/persistence/watch");
    await store.createConnectionToken({
      tokenHash: hashConnectionToken("expiredtoken1234567890"),
      accountUserId: "user-A", channel: "TELEGRAM",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await hook(msg(111, "/start expiredtoken1234567890"));
    expect((await store.getConnection("user-A", "TELEGRAM"))).toBeNull();
    await store.close();
  });
});

describe("webhook discipline", () => {
  it("rejects missing and wrong secrets", async () => {
    const body = msg(111, "/watches");
    expect((await hook(body, null)).status).toBe(401);
    expect((await hook(body, "wrong-secret")).status).toBe(401);
    expect(telegramCalls.length).toBe(0);
  });

  it("accepts callbacks and always acknowledges", async () => {
    await seedAccount(111, "user-A");
    expect((await hook(cb(111, "home:help", "cb-h"))).status).toBe(200);
    expect(ackedIds()).toContain("cb-h");
    expect(sentTexts().join("\n")).toContain("/watches");
  });
});
