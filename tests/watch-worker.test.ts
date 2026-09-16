import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { compileWatchPlan } from "../domain/watch";
import { openWatchStore, type WatchRow, type WatchStore } from "../persistence/watch";
import { runWatchWorker } from "../server/watch-runner";

let stores: WatchStore[] = [];

beforeEach(() => {
  vi.stubEnv("SQLITE_PATH", ":memory:");
});

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
  vi.unstubAllEnvs();
});

function baseWatch(id: string, nextCheckAt: string): Omit<WatchRow, "createdAt" | "updatedAt"> {
  const plan = compileWatchPlan({
    asset: "NVDA",
    action: "wait",
    currentRead: "wait",
    completedFamily: "spot-structure",
    hinge: { topic: "structure-direction", question: "Has structure improved?" },
    facts: { spot: { last: 100, movePct24h: -2, spreadWide: false } },
  });
  return {
    id,
    accountUserId: "account-a",
    sourceSessionId: "11111111-1111-4111-8111-111111111111",
    assetLabel: "NVDA",
    realityTicker: "RNVDAUSDT",
    perpTicker: null,
    originalQuestion: "Should I wait?",
    hinge: plan.hingeTopic,
    humanKeyQuestion: plan.humanKeyQuestion,
    researchFamily: plan.family,
    startingRead: plan.baseline.read,
    currentRead: plan.baseline.read,
    targetRead: plan.targetRead,
    status: "ACTIVE",
    notificationChannel: "TELEGRAM",
    plan,
    snapshot: plan.baseline,
    stateVersion: 0,
    nextCheckAt,
    lastCheckedAt: null,
    triggeredAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastAttemptAt: null,
  };
}

describe("Decision Watch VPS worker", () => {
  it("claims due rows once and allows a new worker after lease expiry", async () => {
    const store = openWatchStore();
    stores.push(store);
    const now = new Date("2026-01-01T00:00:00.000Z");
    await store.createWatch(baseWatch("11111111-1111-4111-8111-111111111111", now.toISOString()));

    const first = await store.claimDueWatches("worker-a", now, 60_000, 10);
    expect(first).toHaveLength(1);
    expect(first[0].leaseOwner).toBe("worker-a");
    expect(await store.claimDueWatches("worker-b", now, 60_000, 10)).toEqual([]);

    const second = await store.claimDueWatches("worker-b", new Date(now.getTime() + 61_000), 60_000, 10);
    expect(second).toHaveLength(1);
    expect(second[0].leaseOwner).toBe("worker-b");
    expect(await store.releaseLease(second[0].id, "worker-b", second[0].stateVersion)).not.toBeNull();
  });

  it("records startup and cycle heartbeats for a worker with no due rows", async () => {
    const store = openWatchStore();
    stores.push(store);
    const heartbeatRows: string[] = [];
    const heartbeatStore = {
      ...store,
      async recordWorkerHeartbeat(row: Parameters<WatchStore["recordWorkerHeartbeat"]>[0]) {
        heartbeatRows.push(row.workerId + ":" + row.lastCycleClaimed + ":" + row.lastCycleProcessed);
        return { ...row, updatedAt: new Date().toISOString() };
      },
    } as WatchStore;
    await runWatchWorker(heartbeatStore, {
      workerId: "worker-test",
      maxCycles: 1,
      sleep: async () => {},
    });
    expect(heartbeatRows).toEqual(["worker-test:0:0", "worker-test:0:0"]);
  });

  it("has no Vercel Workflow trigger or build wrapper left in the watch runtime", () => {
    const route = readFileSync(new URL("../app/api/watches/route.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    expect(route).not.toMatch(/workflow/i);
    expect(config).not.toMatch(/workflow/i);
    expect(existsSync(new URL("../app/workflows/decision-watch.ts", import.meta.url))).toBe(false);
  });
});
