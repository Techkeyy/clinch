import { getStore } from "@/server/db";
import { currentAccountUserId } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Account history is server-derived; no session IDs are accepted from the client. */
export async function GET(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ authenticated: false, items: [] });
  const store = await getStore();
  const rows = await store.listByAccountUserId(accountUserId);
  return Response.json({
    authenticated: true,
    items: rows.slice(0, 10).map((row) => {
      const state = row.state as { intent?: { decisionQuestion?: string }; spotSymbol?: string };
      return {
        id: row.id,
        stockMention: state.spotSymbol ?? null,
        decision: String(state.intent?.decisionQuestion ?? "Research session").slice(0, 100),
        read: row.read,
        status: row.status,
        updatedAt: row.updatedAt,
      };
    }),
  });
}
