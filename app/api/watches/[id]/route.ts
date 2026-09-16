import { z } from "zod";
import { getWatchStore } from "@/server/watch-db";
import { currentAccountUserId } from "@/server/auth";
import { sameOrigin } from "@/server/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionBody = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
  expectedVersion: z.number().int().nonnegative(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const store = await getWatchStore();
  const watch = await store.getWatch(id);
  if (!watch || watch.accountUserId !== accountUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return Response.json({ watch: {
    id: watch.id, sourceSessionId: watch.sourceSessionId, assetLabel: watch.assetLabel, realityTicker: watch.realityTicker, currentRead: watch.currentRead,
    targetRead: watch.targetRead, status: watch.status, notificationChannel: watch.notificationChannel,
    originalQuestion: watch.originalQuestion, humanKeyQuestion: watch.humanKeyQuestion, plan: watch.plan,
    snapshot: watch.snapshot, lastCheckedAt: watch.lastCheckedAt, nextCheckAt: watch.nextCheckAt,
    stateVersion: watch.stateVersion, updatedAt: watch.updatedAt,
  } });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = ActionBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const store = await getWatchStore();
  const watch = await store.getWatch(id);
  if (!watch || watch.accountUserId !== accountUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (parsed.data.action === "cancel" && watch.status === "TRIGGERED") return Response.json({ error: "WATCH_ALREADY_TRIGGERED" }, { status: 409 });
  const status = parsed.data.action === "pause" ? "PAUSED" : parsed.data.action === "resume" ? "ACTIVE" : "CANCELLED";
  const updated = await store.updateWatch(id, parsed.data.expectedVersion, {
    status,
    nextCheckAt: status === "ACTIVE" ? new Date().toISOString() : watch.nextCheckAt,
  });
  if (!updated) return Response.json({ error: "VERSION_CONFLICT" }, { status: 409 });
  return Response.json({ watch: { id: updated.id, status: updated.status, stateVersion: updated.stateVersion, currentRead: updated.currentRead, nextCheckAt: updated.nextCheckAt } });
}
