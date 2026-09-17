import { z } from "zod";
import { cookies } from "next/headers";
import { getStore } from "@/server/db";
import { readAccountContext, ownsSession, readOwner } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ClaimBody = z.object({ sessionIds: z.array(z.string().uuid()).max(10) });

export type ClaimResultCode =
  | "CLAIMED"
  | "ALREADY_OWNED"
  | "CLAIM_SESSION_NOT_FOUND"
  | "CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT"
  | "CLAIM_OWNER_COOKIE_MISSING"
  | "CLAIM_OWNER_VERIFICATION_FAILED"
  | "CLAIM_PROVIDER_FAILURE";

/** Claim is intentionally explicit and requires the current guest owner cookie for every ID. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const account = await readAccountContext();
  const proxyAuthStatus = req.headers.get("x-clerk-auth-status");
  if (!account.userId) {
    // Presence-only cookie diagnostics: names/prefixes, never values.
    let hasClerkSessionCookie = false;
    let hasClerkUatCookie = false;
    try {
      const jar = await cookies();
      for (const c of jar.getAll()) {
        if (c.name === "__session" || c.name.startsWith("__session_")) hasClerkSessionCookie = true;
        if (c.name === "__client_uat" || c.name.startsWith("__client_uat")) hasClerkUatCookie = true;
      }
    } catch { /* diagnostics only; the rejection stands */ }
    console.log(JSON.stringify({
      tag: "clinch-claim", outcome: "rejected",
      error: "CLAIM_AUTH_REQUIRED", authPresent: false,
      cookiePresent: false, proxyAuthStatus,
      hasClerkSessionCookie, hasClerkUatCookie,
      clerkError: account.clerkError,
    }));
    return Response.json({ error: "CLAIM_AUTH_REQUIRED", message: "Sign in to save research to your account." }, { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = ClaimBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const owner = await readOwner();
  let store;
  try {
    store = await getStore();
  } catch {
    return Response.json({ error: "CLAIM_PROVIDER_FAILURE", message: "Save is temporarily unavailable. Your research is preserved; please retry." }, { status: 503 });
  }
  const results: { id: string; ok: boolean; code: ClaimResultCode }[] = [];
  for (const id of parsed.data.sessionIds) {
    try {
      const row = await store.getSession(id);
      if (!row) {
        results.push({ id, ok: false, code: "CLAIM_SESSION_NOT_FOUND" });
        continue;
      }
      if (row.accountUserId) {
        // Idempotent: claiming what this account already owns is success.
        results.push(row.accountUserId === account.userId
          ? { id, ok: true, code: "ALREADY_OWNED" }
          : { id, ok: false, code: "CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT" });
        continue;
      }
      if (!owner.secret) {
        results.push({ id, ok: false, code: "CLAIM_OWNER_COOKIE_MISSING" });
        continue;
      }
      if (!ownsSession(row.ownerVerifier, row.id, owner.secret)) {
        results.push({ id, ok: false, code: "CLAIM_OWNER_VERIFICATION_FAILED" });
        continue;
      }
      const updated = await store.setAccountUser(id, account.userId);
      if (updated) {
        results.push({ id, ok: true, code: "CLAIMED" });
        continue;
      }
      // Lost a race: re-read once to classify precisely instead of guessing.
      const raced = await store.getSession(id);
      results.push(raced?.accountUserId === account.userId
        ? { id, ok: true, code: "ALREADY_OWNED" }
        : { id, ok: false, code: "CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT" });
    } catch {
      results.push({ id, ok: false, code: "CLAIM_PROVIDER_FAILURE" });
    }
  }
  const claimed = results.filter((r) => r.code === "CLAIMED").length;
  const alreadyOwned = results.filter((r) => r.code === "ALREADY_OWNED").length;
  const failures: Record<string, number> = {};
  for (const r of results) {
    if (!r.ok) failures[r.code] = (failures[r.code] ?? 0) + 1;
  }
  console.log(JSON.stringify({
    tag: "clinch-claim", outcome: claimed + alreadyOwned > 0 ? "success" : "no-claim",
    authPresent: true, cookiePresent: owner.secret !== null, proxyAuthStatus,
    total: results.length, claimed, alreadyOwned, failures,
  }));
  if (claimed + alreadyOwned === 0) {
    const first = results[0]?.code ?? "CLAIM_SESSION_NOT_FOUND";
    const status = first === "CLAIM_PROVIDER_FAILURE" ? 503 : 422;
    return Response.json({ error: first, message: claimFailureMessage(first), claimed, alreadyOwned, total: results.length, results }, { status });
  }
  return Response.json({ claimed, alreadyOwned, total: results.length, results });
}

function claimFailureMessage(code: ClaimResultCode): string {
  switch (code) {
    case "CLAIM_SESSION_NOT_FOUND":
      return "That research could not be found. It may have expired; your current work is preserved.";
    case "CLAIM_ALREADY_OWNED_BY_OTHER_ACCOUNT":
      return "That research belongs to a different account and cannot be claimed.";
    case "CLAIM_OWNER_COOKIE_MISSING":
      return "The browser proof for that guest research is missing. Open the research in the browser where it was created, then save again.";
    case "CLAIM_OWNER_VERIFICATION_FAILED":
      return "That research could not be matched to this browser. Open it where it was created, then save again.";
    case "CLAIM_PROVIDER_FAILURE":
      return "Save is temporarily unavailable. Your research is preserved; please retry.";
    default:
      return "We could not save this research yet.";
  }
}
