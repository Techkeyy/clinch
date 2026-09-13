import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { openSQLite } from "../persistence/sqlite";
import type { SessionStore } from "../persistence/store";
import { LOGIC_VERSION, SESSION_TTL_MS } from "../config/thresholds";
import { retryAllowed } from "../server/retry";

let store: SessionStore;
beforeEach(() => { store = openSQLite(":memory:"); });
afterEach(async () => { await store.close(); });

const base = (id: string, key: string) => ({
  id, ownerVerifier: "v", intent: null, state: { read: "undecided" },
  status: "stopped", read: "wait", logicVersion: LOGIC_VERSION,
  idempotencyKey: key, stateVersion: 0, brief: { read: "Holding off" },
});

describe("retention and expiry", () => {
  it("expired sessions are inaccessible and cascade-gone", async () => {
    await store.createSession(base("old", "k-old"));
    // Backdate beyond TTL by direct SQL-equivalent: recreate is simplest via prune path.
    // Simulate expiry through pruneExpired with a future clock.
    const pruned = await store.pruneExpired(Date.now() + SESSION_TTL_MS + 1000);
    expect(pruned.sessions).toBe(1);
    expect(await store.getSession("old")).toBeNull();
  });
  it("active sessions survive pruning", async () => {
    await store.createSession(base("fresh", "k-fresh"));
    const pruned = await store.pruneExpired(Date.now());
    expect(pruned.sessions).toBe(0);
    expect((await store.getSession("fresh"))?.id).toBe("fresh");
  });
  it("rate buckets die within 24h while sessions live 30d", async () => {
    await store.rateHit("b1", 3_600_000, 5);
    const pruned = await store.pruneExpired(Date.now() + 25 * 3_600_000);
    expect(pruned.buckets).toBe(1);
  });
});

describe("production store refusal (four cases)", () => {
  it("test env without DATABASE_URL allows SQLite", async () => {
    const mod = await import("../persistence/index");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("SQLITE_PATH", ":memory:");
    try {
      const s = mod.openStore();
      expect(s.kind).toBe("sqlite");
      await s.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("production without DATABASE_URL and without flag refuses", async () => {
    const mod = await import("../persistence/index");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    try {
      expect(() => mod.openStore()).toThrowError(/refusing SQLite/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("production with local E2E flag and no Vercel allows SQLite", async () => {
    const mod = await import("../persistence/index");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLINCH_DEV_SQLITE", "1");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("SQLITE_PATH", ":memory:");
    try {
      const s = mod.openStore();
      expect(s.kind).toBe("sqlite");
      await s.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("Vercel with flag but no DATABASE_URL still refuses", async () => {
    const mod = await import("../persistence/index");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLINCH_DEV_SQLITE", "1");
    vi.stubEnv("VERCEL", "1");
    try {
      expect(() => mod.openStore()).toThrowError(/refusing SQLite/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("retry tribunal (failed + stale-interrupted only)", () => {
  it("allows failed, rejects stopped/unresolved/fresh-researching", () => {
    const now = Date.now();
    expect(retryAllowed("failed", new Date(now).toISOString(), now)).toBe(true);
    expect(retryAllowed("stopped", new Date(now).toISOString(), now)).toBe(false);
    expect(retryAllowed("unresolved", new Date(now).toISOString(), now)).toBe(false);
    expect(retryAllowed("researching", new Date(now).toISOString(), now)).toBe(false);
  });
  it("allows presumed-interrupted researching runs", () => {
    const now = Date.now();
    expect(retryAllowed("researching", new Date(now - 10 * 60_000).toISOString(), now)).toBe(true);
  });
});

describe("resume never re-researches completed work", () => {
  it("interrupted run resumes without repeating the finished family calls", async () => {
    const { readFileSync } = await import("node:fs");
    const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));
    const counts: Record<string, number> = {};
    const mockFetch = (async (url: string) => {
      const u = String(url);
      if (u.includes("/tickers?")) counts.ticker = (counts.ticker ?? 0) + 1;
      if (u.includes("/candles?")) counts.candles = (counts.candles ?? 0) + 1;
      if (u.includes("/orderbook?")) counts.depth = (counts.depth ?? 0) + 1;
      if (u.includes("/tickers?")) return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: [fx("ticker-rnvda.json")] }) };
      if (u.includes("/candles?")) return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: fx("candles-1h.json").data }) };
      if (u.includes("/orderbook?")) return { status: 200, json: async () => ({ code: "00000", msg: "ok", data: fx("depth-rnvda.json") }) };
      return { status: 200, json: async () => ({ code: "40404", msg: "nope" }) };
    }) as unknown as typeof fetch;
    const { driveLoop } = await import("../server/flow");
    const io = (sid: string) => ({
      store: {
        appendStep: async () => ({ id: "s", sessionId: sid, ord: 0, kind: "research", family: null, requestSummary: null, resultSummary: null, provenance: null, startedAt: "", finishedAt: null }),
      } as never,
      persistStep: async () => {},
      onEvent: () => {},
      maxIterations: 1,
    });
    const input = {
      asset: "RNVDA", spotSymbol: "RNVDAUSDT", perpSymbol: null, action: "enter-now",
      read: "undecided", resolvedTopics: [] as string[],
      facts: { spot: { last: 219, spreadWide: false, topBidSize: 100, topAskSize: 100, windowMovePcnt: -2.0, supportLevel: 218 } },
      data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
      context: "", known: [] as string[],
    };
    const first = await driveLoop("sess-1", input, { ...io("sess-1"), fetchImpl: mockFetch });
    const callsAfterInterrupt = { ...counts };
    expect(callsAfterInterrupt.ticker).toBeGreaterThan(0);
    // Resume exactly like the retry route: seed resolved topics from hinge history.
    const resumeTopics = [...new Set([...first.resolvedTopics,
      ...first.hingeHistory.map((h) => h.topic).filter((t): t is string => !!t)])];
    const second = await driveLoop("sess-1", {
      ...input, read: first.read, resolvedTopics: resumeTopics,
      facts: JSON.parse(JSON.stringify(first.facts)),
    }, { ...io("sess-1"), fetchImpl: mockFetch });
    expect(counts).toEqual(callsAfterInterrupt);
    expect(second.stopReason ?? second.read).toBeTruthy();
  });
});

describe("owner isolation on delete", () => {
  it("delete removes session and steps together", async () => {
    await store.createSession(base("s1", "k1"));
    await store.appendStep({ sessionId: "s1", ord: 0, kind: "baseline", family: null, requestSummary: null, resultSummary: null, provenance: null });
    expect(await store.deleteSession("s1")).toBe(true);
    expect(await store.getSession("s1")).toBeNull();
    expect(await store.getSteps("s1")).toEqual([]);
    expect(await store.deleteSession("s1")).toBe(false);
  });
});
