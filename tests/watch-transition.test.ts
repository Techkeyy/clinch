// Decision Watch transition + dispatch proof through the REAL production path:
// sqlite store (contract parity), REAL processClaimedWatch / dispatcher /
// Telegram adapter, REAL captured Bitget response shapes, stubbed transport.
// No network, no production data, no secrets.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DB_BASE = `clinch-watch-transition-${process.pid}`;
let dbIndex = 0;
function nextDb() {
  dbIndex += 1;
  process.env.SQLITE_PATH = join(tmpdir(), `${DB_BASE}-${dbIndex}.db`);
}
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";

import { compileWatchPlan } from "@/domain/watch";
import { processClaimedWatch, runWatchWorkerCycle } from "@/server/watch-runner";
import { dispatchDecisionChanged } from "@/notifications/dispatcher";
import { openWatchStore } from "@/persistence/watch";
import type { DecisionChangedEvent } from "@/notifications/channel";

const TICKER_BASE = {
  category: "SPOT", symbol: "RNVDAUSDT", ts: "1789167781492",
  lastPrice: "219.10", openPrice24h: "219.30", highPrice24h: "220.01", lowPrice24h: "218.05",
  ask1Price: "219.12", bid1Price: "219.08", bid1Size: "0.9", ask1Size: "1.2",
  price24hPcnt: "-0.005", volume24h: "100.0", turnover24h: "21910.0",
};
const RISING_CANDLES = [
  ["1789149600000", "220.00", "221.00", "219.90", "220.60", "1000.0", "220600.0"],
  ["1789153200000", "220.60", "222.20", "220.40", "221.80", "1100.0", "244000.0"],
  ["1789156800000", "221.80", "223.10", "221.90", "222.50", "1200.0", "267000.0"],
];
const DEPTH = { a: [["219.14", 1.2]], b: [["219.08", 0.9]], ts: "1789167781492" };

let telegramCalls: { url: string; body: unknown }[] = [];
let tickerRow: Record<string, string> = { ...TICKER_BASE };

function stubTransport() {
  telegramCalls = [];
  vi.stubGlobal("fetch", (async (url: string, init?: RequestInit) => {
    if (url.includes("api.telegram.org")) {
      telegramCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return { status: 200, ok: true, json: async () => ({ ok: true, result: { message_id: 7 } }) };
    }
    if (url.includes("/tickers?category=SPOT")) {
      return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: [tickerRow] }) };
    }
    if (url.includes("/candles?")) {
      return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: RISING_CANDLES }) };
    }
    if (url.includes("/orderbook?")) {
      return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: DEPTH }) };
    }
    return { status: 200, json: async () => ({ code: "40404", msg: "Request URL NOT FOUND" }) };
  }) as unknown as typeof fetch);
}

const BASELINE_FACTS = {
  spot: {
    last: 219.10, movePct24h: -0.5, spreadBps: 0.9, spreadWide: false,
    topBidSize: 0.9, topAskSize: 1.2, windowMovePcnt: -1.1,
    supportLevel: 218.65, resistanceLevel: 222.00, lastVolume: 6610618,
  },
};

async function seedWatch() {
  const store = openWatchStore();
  const plan = compileWatchPlan({
    asset: "NVDA", action: "enter-now", currentRead: "wait",
    hinge: { topic: "structure-direction", question: "Is this drift exhausted or a new leg down?" },
    completedFamily: "spot-structure", facts: BASELINE_FACTS, changeTriggers: [], futureRechecks: [],
  });
  const id = randomUUID();
  await store.upsertConnection({ accountUserId: "user-A", channel: "TELEGRAM", address: "424242", status: "CONNECTED" });
  const row = await store.createWatch({
    id, accountUserId: "user-A", sourceSessionId: randomUUID(), assetLabel: "NVDA",
    realityTicker: "RNVDAUSDT", perpTicker: null, originalQuestion: "Should I enter NVDA?",
    hinge: "structure-direction", humanKeyQuestion: plan.humanKeyQuestion,
    researchFamily: "spot-structure", startingRead: "wait", currentRead: "wait",
    targetRead: "enter-now", status: "ACTIVE", notificationChannel: "TELEGRAM",
    plan, snapshot: plan.baseline, stateVersion: 0,
    nextCheckAt: new Date(Date.now() - 60_000).toISOString(),
    lastCheckedAt: null, triggeredAt: null, leaseOwner: null, leaseExpiresAt: null, lastAttemptAt: null,
  });
  return { store, row };
}

beforeEach(() => {
  vi.resetModules();
  nextDb();
  stubTransport();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Decision Watch due/lease/transition/dispatch", () => {
  it("heartbeats without transition when nothing material changes", async () => {
    tickerRow = { ...TICKER_BASE }; // last 219.10, inside [218.65, 222.00], flat 24h move
    const { store } = await seedWatch();
    const result = await runWatchWorkerCycle(store, { workerId: "w-1", leaseMs: 300_000, batchSize: 10 });
    expect(result).toMatchObject({ claimed: 1, processed: 1, errors: [] });
    const [only] = await store.listWatches("user-A");
    expect(only.status).toBe("ACTIVE");
    expect(only.snapshot.evidenceVersion).toBe(0);
    expect(only.lastCheckedAt).toBeTruthy();
    expect(telegramCalls.length).toBe(0);
    await store.close();
  });

  it("leases a due watch exactly once until released", async () => {
    tickerRow = { ...TICKER_BASE };
    const { store, row } = await seedWatch();
    const first = await store.claimDueWatches("w-A", new Date(), 300_000, 10);
    expect(first.map((w) => w.id)).toContain(row.id);
    expect(await store.claimDueWatches("w-B", new Date(), 300_000, 10)).toEqual([]);
    await store.releaseLease(row.id, "w-A", first.find((w) => w.id === row.id)!.stateVersion);
    expect((await store.getWatch(row.id))?.leaseOwner).toBeNull();
    await store.close();
  });

  it("detects a legitimate transition and dispatches a state-change notification", async () => {
    tickerRow = { ...TICKER_BASE, lastPrice: "222.50", price24hPcnt: "0.008" }; // crosses 222.00 resistance
    const { store, row } = await seedWatch();
    const [claimed] = await store.claimDueWatches("w-1", new Date(), 300_000, 10);
    expect(claimed.id).toBe(row.id);
    const outcome = await processClaimedWatch(store, claimed, "w-1");
    expect(outcome).toBe("TRIGGERED");
    const after = (await store.getWatch(row.id))!;
    expect(after.status).toBe("TRIGGERED");
    expect(after.currentRead).toBe("enter-now");
    expect(after.snapshot.evidenceVersion).toBe(1);
    expect(after.triggeredAt).toBeTruthy();
    expect(after.leaseOwner).toBeNull();
    expect(telegramCalls.length).toBe(1);
    expect(telegramCalls[0].url).toContain("api.telegram.org");
    const sent = telegramCalls[0].body as { chat_id?: string; text?: string };
    expect(sent.chat_id).toBe("424242");
    expect(sent.text).toContain("NVDA");
    expect(sent.text).toContain("Slightly favorable");
    expect(sent.text).toContain("CLINCH does not place trades.");
    expect(sent.text).not.toMatch(/\bbuy\b/i);
    expect(sent.text).not.toMatch(/\bsell\b/i);
    // Repeat delivery of the same transition is deduped, never double-sent.
    const again = await dispatchDecisionChanged(store, after, {
      eventType: "decision_changed", watchId: after.id, assetLabel: after.assetLabel,
      originalQuestion: after.originalQuestion, previousRead: "wait", nextRead: "enter-now",
      whatChanged: ["resistance boundary changed"], evidenceVersion: 1,
    } satisfies DecisionChangedEvent);
    expect(again).toBe("deduped");
    expect(telegramCalls.length).toBe(1);
    await store.close();
  });

  it("reports unavailable without a linked channel and sends nothing", async () => {
    tickerRow = { ...TICKER_BASE, lastPrice: "222.50", price24hPcnt: "0.008" };
    const store = openWatchStore();
    const plan = compileWatchPlan({
      asset: "NVDA", action: "enter-now", currentRead: "wait",
      hinge: { topic: "structure-direction", question: "q" },
      completedFamily: "spot-structure", facts: BASELINE_FACTS, changeTriggers: [], futureRechecks: [],
    });
    const row = await store.createWatch({
      id: randomUUID(), accountUserId: "user-B", sourceSessionId: randomUUID(), assetLabel: "NVDA",
      realityTicker: "RNVDAUSDT", perpTicker: null, originalQuestion: "q", hinge: "structure-direction",
      humanKeyQuestion: plan.humanKeyQuestion, researchFamily: "spot-structure",
      startingRead: "wait", currentRead: "wait", targetRead: "enter-now", status: "ACTIVE",
      notificationChannel: "TELEGRAM", plan, snapshot: plan.baseline, stateVersion: 0,
      nextCheckAt: new Date(Date.now() - 60_000).toISOString(),
      lastCheckedAt: null, triggeredAt: null, leaseOwner: null, leaseExpiresAt: null, lastAttemptAt: null,
    });
    const [claimed] = await store.claimDueWatches("w-1", new Date(), 300_000, 10);
    const outcome = await processClaimedWatch(store, claimed.id === row.id ? claimed : row, "w-1");
    expect(outcome).toBe("PAUSED");
    expect(telegramCalls.length).toBe(0);
    await store.close();
  });
});
