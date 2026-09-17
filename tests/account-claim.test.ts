// Guest -> account claim contract: authenticated-start ownership, atomic claim
// with stable per-id codes, idempotency, cross-account rejection, and
// post-claim accessibility. Fully offline: Clerk is mocked at the server-auth
// boundary; persistence is a temp SQLite file; Bitget is never touched.
import { describe, expect, it, vi, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

process.env.SESSION_PEPPER = "account-claim-test-pepper";
const DB = join(tmpdir(), `clinch-account-claim-${process.pid}.db`);
process.env.SQLITE_PATH = DB;
try { unlinkSync(DB); } catch { /* fresh */ }

const testState = { ownerSecret: null as string | null, accountUserId: null as string | null };

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    readOwner: async () => ({ secret: testState.ownerSecret, setCookie: null }),
    currentAccountUserId: async () => testState.accountUserId,
    readAccountContext: async () => ({
      userId: testState.accountUserId,
      clerkError: testState.accountUserId ? null : "signed-out",
      clerkAuthStatus: null,
    }),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any;
let ClaimPOST: (req: Request) => Promise<Response>;
let StartPOST: (req: Request) => Promise<Response>;
let SessionGET: (req: Request) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any;

function jsonReq(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GUEST_SECRET = "guest-secret-for-claim-tests-00000000001";

async function createGuestRow(id = randomUUID()): Promise<string> {
  const { verifierFor } = await import("@/server/auth");
  await store.createSession({
    id, ownerVerifier: verifierFor(id, GUEST_SECRET), accountUserId: null,
    intent: null, state: { dilemma: "claim test" }, status: "stopped",
    read: "holding-off", logicVersion: "test", idempotencyKey: `claim-${id}`,
    stateVersion: 0, brief: null,
  });
  return id;
}

beforeAll(async () => {
  const claimMod: AnyMod = await import("@/app/api/account/claim/route");
  const startMod: AnyMod = await import("@/app/api/research/start/route");
  const sessMod: AnyMod = await import("@/app/api/session/route");
  ClaimPOST = claimMod.POST; StartPOST = startMod.POST; SessionGET = sessMod.GET;
  const dbMod: AnyMod = await import("@/server/db");
  store = await dbMod.getStore();
});

describe("guest research claim flow", () => {
  it("A: guest row plus valid owner cookie plus sign-in claims to the account", async () => {
    testState.ownerSecret = GUEST_SECRET;
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    const res = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(res.status).toBe(200);
    const body = await res.json() as { claimed?: number; alreadyOwned?: number; results?: { id: string; ok: boolean; code: string }[] };
    expect(body.claimed).toBe(1);
    expect(body.results?.[0]).toMatchObject({ id, ok: true, code: "CLAIMED" });
    expect((await store.getSession(id))?.accountUserId).toBe("user-A");
  });

  it("B: a signed-in start is account-owned immediately, never guest", async () => {
    testState.ownerSecret = null;
    testState.accountUserId = "user-A";
    const key = `claim-start-${Date.now()}`;
    const started = await StartPOST(jsonReq("/api/research/start", { dilemma: "Should I buy or wait?", idempotencyKey: key }));
    expect(started.status).toBe(200);
    await started.text();
    const row = await store.findByIdempotencyKey(key);
    expect(row?.accountUserId).toBe("user-A");
  });

  it("C: the same user re-claiming an owned session gets idempotent success", async () => {
    testState.ownerSecret = GUEST_SECRET;
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    const again = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(again.status).toBe(200);
    const body = await again.json() as { claimed?: number; alreadyOwned?: number };
    expect(body.claimed).toBe(0);
    expect(body.alreadyOwned).toBe(1);
  });

  it("D: a different authenticated user cannot claim another account row", async () => {
    testState.ownerSecret = GUEST_SECRET;
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    testState.accountUserId = "user-B";
    const res = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(res.status).toBe(422);
    const body = await res.json() as { error?: string };
    expect(body.error).toBe("CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT");
    expect((await store.getSession(id))?.accountUserId).toBe("user-A");
  });

  it("E: a missing guest owner cookie is rejected with a stable code", async () => {
    testState.ownerSecret = null;
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    const res = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(res.status).toBe(422);
    expect((await res.json() as { error?: string }).error).toBe("CLAIM_OWNER_COOKIE_MISSING");
    expect((await store.getSession(id))?.accountUserId).toBeNull();
  });

  it("F: an invalid owner verifier is rejected without claiming", async () => {
    testState.ownerSecret = "wrong-secret-not-the-guest-owner-00000002";
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    const res = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(res.status).toBe(422);
    expect((await res.json() as { error?: string }).error).toBe("CLAIM_OWNER_VERIFICATION_FAILED");
    expect((await store.getSession(id))?.accountUserId).toBeNull();
  });

  it("G: a signed-out claim is rejected as authentication required", async () => {
    testState.ownerSecret = GUEST_SECRET;
    testState.accountUserId = null;
    const id = await createGuestRow();
    const res = await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    expect(res.status).toBe(401);
    expect((await res.json() as { error?: string }).error).toBe("CLAIM_AUTH_REQUIRED");
  });

  it("H: claimed research stays accessible to the account without the guest cookie", async () => {
    testState.ownerSecret = GUEST_SECRET;
    testState.accountUserId = "user-A";
    const id = await createGuestRow();
    await ClaimPOST(jsonReq("/api/account/claim", { sessionIds: [id] }));
    // Refresh / sign-out / sign-in: no guest cookie, same account.
    testState.ownerSecret = null;
    const again = await SessionGET(new Request(`http://localhost/api/session?id=${id}`));
    expect(again.status).toBe(200);
    expect(((await again.json()) as { session?: { ownership?: string } }).session?.ownership).toBe("account");
    // Signed out entirely: inaccessible.
    testState.accountUserId = null;
    expect((await SessionGET(new Request(`http://localhost/api/session?id=${id}`))).status).toBe(401);
    // History is server-derived per account: visible again after sign-in.
    testState.accountUserId = "user-A";
    const listed = await store.listByAccountUserId("user-A");
    expect(listed.map((r: { id: string }) => r.id)).toContain(id);
  });

  it("I: account ownership gates account surfaces, not the read label alone", async () => {
    const { decisionWatchEligibility } = await import("@/lib/watch-ui");
    expect(decisionWatchEligibility("Better to wait")).toBe("eligible");
    testState.ownerSecret = null;
    testState.accountUserId = null;
    const recentMod: AnyMod = await import("@/app/api/recent/route");
    const anon = await recentMod.GET(new Request("http://localhost/api/recent"));
    expect(((await anon.json()) as { authenticated?: boolean; items?: unknown[] }).authenticated).toBe(false);
  });
});
