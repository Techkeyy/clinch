// Route-level recovery contract: stale resume accepted + no rerun, fresh refused,
// version-conflict race, idempotency trio, create race, delete A/B. Fully offline:
// global fetch is stubbed with canned Bitget fixtures; owner auth is injected.
import { describe, expect, it, vi, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, unlinkSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

process.env.SESSION_PEPPER = "recovery-api-test-pepper";
const DB = join(tmpdir(), `clinch-recovery-api-${process.pid}.db`);
process.env.SQLITE_PATH = DB;
try { unlinkSync(DB); } catch { /* fresh */ }

(globalThis as Record<string, unknown>).__clinchTestOwner = "owner-A-secret";

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    readOwner: async () => ({ secret: (globalThis as Record<string, unknown>).__clinchTestOwner ?? null, setCookie: null }),
  };
});
vi.mock("@/server/rate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/rate")>();
  return {
    ...actual,
    checkStartLimits: async () => ({ ok: true }),
    trustedNetworkSource: async () => "127.0.0.1",
  };
});

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));
const WIDE_TICKER = {
  code: "00000", msg: "ok",
  data: [{ category: "SPOT", symbol: "RNVDAUSDT", ts: "1789167781492", lastPrice: "218.24", openPrice24h: "218.44", highPrice24h: "220.01", lowPrice24h: "218.05", ask1Price: "218.60", bid1Price: "218.00", bid1Size: "0.5", ask1Size: "0.4", price24hPcnt: "-0.00091", volume24h: "100.0", turnover24h: "21824.0" }],
};
const CANDLES = { code: "00000", msg: "ok", data: [
  ["1789135200000", "221.62", "222.00", "219.30", "219.47", "17293322.0", "3819018733.0"],
  ["1789138800000", "219.43", "220.57", "219.36", "219.68", "9599350.0", "2111323326.0"],
  ["1789142400000", "219.68", "219.97", "218.65", "219.10", "7384733.0", "1619322972.0"],
  ["1789146000000", "219.11", "219.43", "218.40", "218.60", "5887266.0", "1290531655.0"],
  ["1789149600000", "218.60", "218.70", "218.10", "218.20", "6610618.0", "1451144945.0"],
] };
const DEPTH = { code: "00000", msg: "ok", data: { a: [["218.60", 0.4]], b: [["218.00", 0.5]], ts: "1789167781492" } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any;
let StartPOST: (req: Request) => Promise<Response>;
let RetryPOST: (req: Request) => Promise<Response>;
let ContinuePOST: (req: Request) => Promise<Response>;
let SessionGET: (req: Request) => Promise<Response>;
let DeletePOST: (req: Request) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any;
let STALE_RUN_MS: number;
let SESSION_TTL_MS: number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let buildResumeInput: (st: any) => any;
const fetchCalls: string[] = [];

function stubFetch(routes: Record<string, unknown>) {
  fetchCalls.length = 0;
  vi.stubGlobal("fetch", (async (url: string) => {
    fetchCalls.push(url);
    for (const [key, body] of Object.entries(routes)) {
      if (url.includes(key)) return { status: 200, json: async () => body };
    }
    return { status: 200, json: async () => ({ code: "40404", msg: "Request URL NOT FOUND" }) };
  }) as unknown as typeof fetch);
}

function jsonReq(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function backdateSession(id: string, ageMs: number) {
  const db = new DatabaseSync(DB);
  try {
    db.prepare("UPDATE research_sessions SET updated_at = ? WHERE id = ?")
      .run(new Date(Date.now() - ageMs).toISOString(), id);
  } finally {
    db.close();
  }
}

function rowCountForKey(key: string): number {
  const db = new DatabaseSync(DB);
  try {
    const r = db.prepare("SELECT COUNT(*) AS n FROM research_sessions WHERE idempotency_key = ?").get(key) as { n: number };
    return r.n;
  } finally {
    db.close();
  }
}

beforeAll(async () => {
  const perp = { code: "00000", msg: "ok", data: [fx("perp-nvda.json")] };
  stubFetch({
    "/tickers?category=SPOT": WIDE_TICKER,
    "/tickers?category=USDT-FUTURES": perp,
    "/candles?": CANDLES,
    "/orderbook?": DEPTH,
  });
  const startMod: AnyMod = await import("@/app/api/research/start/route");
  const retryMod: AnyMod = await import("@/app/api/research/retry/route");
  const contMod: AnyMod = await import("@/app/api/research/continue/route");
  const sessMod: AnyMod = await import("@/app/api/session/route");
  const delMod: AnyMod = await import("@/app/api/session/delete/route");
  StartPOST = startMod.POST; RetryPOST = retryMod.POST; ContinuePOST = contMod.POST;
  SessionGET = sessMod.GET; DeletePOST = delMod.POST;
  const dbMod: AnyMod = await import("@/server/db");
  store = await dbMod.getStore();
  const th: AnyMod = await import("@/config/thresholds");
  STALE_RUN_MS = th.STALE_RUN_MS;
  SESSION_TTL_MS = th.SESSION_TTL_MS;
  const resumeMod: AnyMod = await import("@/server/resume");
  buildResumeInput = resumeMod.buildResumeInput;
}, 120000);

const AMBIGUOUS = "Should I buy or wait?";
const RNVDA_ENTER = "rNVDA is flat but stock-perp positioning looks crowded. Is entering now worth it or should I wait?";

describe("idempotency contract through the real start route", () => {
  it("replays same owner + same key + same dilemma; rejects payload mismatch and foreign owner", async () => {
    const key = `idem-trio-${Date.now()}`;
    const first = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    expect(first.status).toBe(200);
    await first.text();
    const s1 = await store.findByIdempotencyKey(key);
    expect(s1).toBeTruthy();

    const replay = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    expect(replay.status).toBe(200);
    expect((await replay.json() as { replayed?: boolean }).replayed).toBe(true);

    const mismatch = await StartPOST(jsonReq("/api/research/start", { dilemma: "Should I sell everything now?", idempotencyKey: key }));
    expect(mismatch.status).toBe(409);
    expect((await mismatch.json() as { error?: string }).error).toBe("KEY_CONFLICT");

    (globalThis as Record<string, unknown>).__clinchTestOwner = "owner-B-secret";
    const foreign = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    expect(foreign.status).toBe(409);
    (globalThis as Record<string, unknown>).__clinchTestOwner = "owner-A-secret";
    expect(rowCountForKey(key)).toBe(1);
  }, 30000);

  it("concurrent duplicate creation leaves exactly one session", async () => {
    const key = `idem-race-${Date.now()}`;
    const [a, b] = await Promise.all([
      StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key })),
      StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key })),
    ]);
    expect([a.status, b.status].every((s) => s === 200)).toBe(true);
    await a.text();
    await b.text();
    expect(rowCountForKey(key)).toBe(1);
  }, 30000);
});

describe("stale resume through the real retry route", () => {
  it("fresh researching refuses resume; stale researching resumes without rerunning completed spot work", async () => {
    // Persisted interrupted run: spot-structure already completed (move-reality
    // resolved, hinge recorded), perp-positioning still open.
    const persistedState = {
      dilemma: RNVDA_ENTER,
      intent: { asset: "RNVDA", action: "enter-now", horizon: "swing", clarificationNeeded: false },
      read: "undecided", resolvedTopics: ["move-reality"],
      facts: { spot: { last: 218.24, spreadWide: true, topBidSize: 0.5, topAskSize: 0.4 } },
      skips: [], uncertainty: [], retries: 0,
      hingeHistory: [{ hinge: "h1", topic: "move-reality", verdict: "thin-artifact :: read now stand-aside" }],
      stopReason: null, briefStatus: "researching",
      spotSymbol: "RNVDAUSDT", perpSymbol: "NVDAUSDT", context: "", known: [],
      clarificationRound: 0, data: { "spot-structure": "fresh", "perp-positioning": "fresh" },
    };
    // The route reconstructs resume input through this same helper: completed
    // Hinge topics must re-enter resolvedTopics so the family is never rerun.
    const helperInput = buildResumeInput({
      intent: persistedState.intent, spotSymbol: "RNVDAUSDT", perpSymbol: "NVDAUSDT",
      read: "undecided", resolvedTopics: ["move-reality"], facts: persistedState.facts,
      context: "", known: [], skips: [{ check: "perp-positioning", reason: "saved counterfactual", kind: "cannot-matter" }],
      uncertainty: ["saved uncertainty"], stopReason: null, hingeHistory: persistedState.hingeHistory,
    });
    expect(helperInput.resolvedTopics).toContain("move-reality");
    expect(helperInput.spotSymbol).toBe("RNVDAUSDT");
    expect(helperInput.skips?.[0].reason).toBe("saved counterfactual");
    expect(helperInput.uncertainty).toEqual(["saved uncertainty"]);
    expect(helperInput.hingeHistory?.[0].topic).toBe("move-reality");

    const { verifierFor } = await import("@/server/auth");
    const freshId = `11111111-1111-4111-8111-${Date.now().toString().padStart(12, "0").slice(-12)}`;
    await store.createSession({
      id: freshId, ownerVerifier: verifierFor(freshId, "owner-A-secret"),
      intent: persistedState.intent, state: persistedState, status: "researching",
      read: "undecided", logicVersion: "test", idempotencyKey: `stale-fresh-${Date.now()}`, stateVersion: 0, brief: null,
    });
    const freshRow = await store.getSession(freshId);
    const refused = await RetryPOST(jsonReq("/api/research/retry", { sessionId: freshId, expectedVersion: freshRow.stateVersion }));
    expect(refused.status).toBe(409);
    expect((await refused.json() as { error?: string }).error).toBe("NOT_RETRYABLE");

    const staleId = `22222222-2222-4222-8222-${Date.now().toString().padStart(12, "0").slice(-12)}`;
    await store.createSession({
      id: staleId, ownerVerifier: verifierFor(staleId, "owner-A-secret"),
      intent: persistedState.intent, state: persistedState, status: "researching",
      read: "undecided", logicVersion: "test", idempotencyKey: `stale-old-${Date.now()}`, stateVersion: 0, brief: null,
    });
    backdateSession(staleId, STALE_RUN_MS + 60_000);
    const staleRow = await store.getSession(staleId);

    fetchCalls.length = 0;
    const resumed = await RetryPOST(jsonReq("/api/research/retry", { sessionId: staleId, expectedVersion: staleRow.stateVersion }));
    expect(resumed.status).toBe(200);
    const body = await resumed.text();
    expect(body).toContain("brief");

    // Completed spot family was never re-fetched: no spot-symbol calls at all.
    expect(fetchCalls.some((u) => u.includes("RNVDAUSDT"))).toBe(false);

    const after = await store.getSession(staleId);
    expect(["stopped", "unresolved"]).toContain(after.status);
    expect(after.brief).toBeTruthy();
    const steps = await store.getSteps(staleId);
    const spotResearch = steps.filter((s: { kind: string; family: string | null }) => s.kind === "research" && s.family === "spot-structure");
    expect(spotResearch.length).toBe(0);
  }, 60000);
});

describe("version conflict through the real continue route", () => {
  it("exactly one contender advances; loser gets 409; final state is single and coherent", async () => {
    const key = `ver-race-${Date.now()}`;
    const started = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    await started.text();
    const s = await store.findByIdempotencyKey(key);
    expect(s.status).toBe("clarifying");
    const v = s.stateVersion;
    const payload = { sessionId: s.id, expectedVersion: v, text: "I want to enter RNVDA for a swing" };
    const [a, b] = await Promise.all([
      ContinuePOST(jsonReq("/api/research/continue", payload)),
      ContinuePOST(jsonReq("/api/research/continue", payload)),
    ]);
    const codes = [a.status, b.status].sort();
    expect(codes).toEqual([200, 409]);
    const winnerBody = await (a.status === 200 ? a : b).text();
    expect(winnerBody).toContain("brief");
    const loserJson = (await (a.status === 409 ? a : b).json()) as { error?: string };
    expect(loserJson.error).toBe("VERSION_CONFLICT");

    const after = await store.getSession(s.id);
    expect(["stopped", "unresolved", "failed", "clarifying"]).toContain(after.status);
    const steps = await store.getSteps(s.id);
    const hinges = steps.filter((x: { kind: string }) => x.kind === "hinge").map((x: { requestSummary: string | null }) => x.requestSummary);
    expect(new Set(hinges).size).toBe(hinges.length);
  }, 60000);
});

describe("owner delete through the real delete route", () => {  it("stranger cannot delete; owner delete removes the session", async () => {
    const key = `del-ab-${Date.now()}`;
    const started = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    await started.text();
    const s = await store.findByIdempotencyKey(key);

    (globalThis as Record<string, unknown>).__clinchTestOwner = "owner-B-secret";
    const strangerDel = await DeletePOST(jsonReq("/api/session/delete", { sessionId: s.id }));
    expect(strangerDel.status).toBe(401);
    const strangerGet = await SessionGET(new Request(`http://localhost/api/session?id=${s.id}`));
    expect(strangerGet.status).toBe(401);

    (globalThis as Record<string, unknown>).__clinchTestOwner = "owner-A-secret";
    const ownerDel = await DeletePOST(jsonReq("/api/session/delete", { sessionId: s.id }));
    expect(ownerDel.status).toBe(200);
    expect((await ownerDel.json() as { deleted?: boolean }).deleted).toBe(true);
    expect(await store.getSession(s.id)).toBeNull();
  }, 30000);
});

describe("expiry through the real session route", () => {
  it("expired sessions prune away and read as unauthorized", async () => {
    const key = `expired-${Date.now()}`;
    const started = await StartPOST(jsonReq("/api/research/start", { dilemma: AMBIGUOUS, idempotencyKey: key }));
    await started.text();
    const s = await store.findByIdempotencyKey(key);
    const db = new DatabaseSync(DB);
    try {
      const ancient = new Date(Date.now() - SESSION_TTL_MS - 60_000).toISOString();
      db.prepare("UPDATE research_sessions SET created_at = ?, updated_at = ? WHERE id = ?").run(ancient, ancient, s.id);
    } finally {
      db.close();
    }
    const pruned = await store.pruneExpired(Date.now());
    expect(pruned.sessions).toBeGreaterThanOrEqual(1);
    const gone = await SessionGET(new Request(`http://localhost/api/session?id=${s.id}`));
    expect(gone.status).toBe(401);
  }, 30000);
});
