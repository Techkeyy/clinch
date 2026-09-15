import { z } from "zod";
import { getStore } from "@/server/db";
import { currentAccountUserId, ownsSession, readOwner } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ClaimBody = z.object({ sessionIds: z.array(z.string().uuid()).max(10) });

/** Claim is intentionally explicit and requires the current guest owner cookie for every ID. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = ClaimBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const owner = await readOwner();
  const store = await getStore();
  let claimed = 0;
  for (const id of parsed.data.sessionIds) {
    const row = await store.getSession(id);
    if (!row || row.accountUserId || !ownsSession(row.ownerVerifier, row.id, owner.secret)) continue;
    if (await store.setAccountUser(id, accountUserId)) claimed += 1;
  }
  return Response.json({ claimed });
}
