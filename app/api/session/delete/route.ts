import { z } from "zod";
import { getStore } from "@/server/db";
import { readOwner, currentAccountUserId, canAccessSession } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DeleteBody = z.object({ sessionId: z.string().uuid() });

// Owner-verified deletion of one research session and its steps.
// No delete-by-ID: ownership is either the guest verifier or Clerk account.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = DeleteBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const store = await getStore();
  const owner = await readOwner();
  const accountUserId = await currentAccountUserId();
  const row = await store.getSession(parsed.data.sessionId);
  if (!row || !canAccessSession(row, owner.secret, accountUserId)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  await store.deleteSession(row.id);
  return Response.json({ deleted: true });
}
