import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { openSQLite } from "../persistence/sqlite";
import type { SessionStore } from "../persistence/store";
import { LOGIC_VERSION } from "../config/thresholds";

let store: SessionStore;
beforeEach(() => { store = openSQLite(":memory:"); });
afterEach(async () => { await store.close(); });

const base = (id: string, key: string) => ({
  id, ownerVerifier: "verifier-hex", intent: null,
  state: { read: "undecided" }, status: "awaiting", read: "undecided",
  logicVersion: LOGIC_VERSION, idempotencyKey: key, stateVersion: 0, brief: null,
});

describe("session store contract (sqlite)", () => {
  it("creates, reads, and version-guards sessions", async () => {
    await store.createSession(base("s1", "k1"));
    const got = await store.getSession("s1");
    expect(got?.status).toBe("awaiting");
    const updated = await store.compareAndSet("s1", 0, { status: "researching", read: "wait" });
    expect(updated?.status).toBe("researching");
    expect(updated?.stateVersion).toBe(1);
    const conflict = await store.compareAndSet("s1", 0, { status: "stopped" });
    expect(conflict).toBeNull();
  });
  it("finds sessions by idempotency key for duplicate-submit safety", async () => {
    await store.createSession(base("s1", "dup-key"));
    expect((await store.findByIdempotencyKey("dup-key"))?.id).toBe("s1");
    expect(await store.findByIdempotencyKey("other")).toBeNull();
  });
  it("appends and orders steps, deletes with cascade", async () => {
    await store.createSession(base("s1", "k1"));
    await store.appendStep({ sessionId: "s1", ord: 1, kind: "hinge", family: null, requestSummary: "q1", resultSummary: null, provenance: null });
    await store.appendStep({ sessionId: "s1", ord: 0, kind: "baseline", family: null, requestSummary: null, resultSummary: null, provenance: null });
    const steps = await store.getSteps("s1");
    expect(steps.map((s) => s.ord)).toEqual([0, 1]);
    expect(await store.deleteSession("s1")).toBe(true);
    expect(await store.getSession("s1")).toBeNull();
    expect(await store.getSteps("s1")).toEqual([]);
  });
  it("claims a guest row once and lists only account-owned rows", async () => {
    await store.createSession(base("s1", "k1"));
    expect(await store.listByAccountUserId("account-a")).toEqual([]);
    expect((await store.setAccountUser("s1", "account-a"))?.accountUserId).toBe("account-a");
    expect((await store.listByAccountUserId("account-a")).map((row) => row.id)).toEqual(["s1"]);
    expect(await store.setAccountUser("s1", "account-b")).toBeNull();
    expect(await store.listByAccountUserId("account-b")).toEqual([]);
  });
  it("enforces rate buckets with windows", async () => {
    const r1 = await store.rateHit("owner:x", 3_600_000, 10);
    expect(r1).toEqual({ allowed: true, count: 1 });
    for (let i = 0; i < 9; i++) await store.rateHit("owner:x", 3_600_000, 10);
    const over = await store.rateHit("owner:x", 3_600_000, 10);
    expect(over.allowed).toBe(false);
  });
});
