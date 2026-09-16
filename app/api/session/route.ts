import { getStore } from "@/server/db";
import { readOwner, currentAccountUserId, canAccessSession } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authoritative refresh/resume path. Ownership enforced; never streams progress.
export async function GET(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const store = await getStore();
  const owner = await readOwner();
  const accountUserId = await currentAccountUserId();
  const row = await store.getSession(id);
  if (!row || !canAccessSession(row, owner.secret, accountUserId)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const steps = await store.getSteps(id);
  return Response.json({
    session: { id: row.id, status: row.status, read: row.read, stateVersion: row.stateVersion, state: row.state, brief: row.brief, updatedAt: row.updatedAt, createdAt: row.createdAt, ownership: row.accountUserId ? "account" : "guest" },
    steps: steps.map((s) => ({ ord: s.ord, kind: s.kind, family: s.family, requestSummary: s.requestSummary, resultSummary: s.resultSummary, provenance: s.provenance, finishedAt: s.finishedAt })),
  });
}
