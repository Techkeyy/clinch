import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getStore } from "@/server/db";
import { getWatchStore } from "@/server/watch-db";
import { planFromSession } from "@/server/watch-plan";
import { currentAccountUserId, canAccessSession, ownsSession, readOwner } from "@/server/auth";
import { sameOrigin } from "@/server/stream";
import { isFavorableRead } from "@/domain/watch";
import type { WatchRow } from "@/persistence/watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({ sessionId: z.string().uuid(), channel: z.literal("TELEGRAM") });

function publicWatch(row: WatchRow) {
  return {
    id: row.id, sourceSessionId: row.sourceSessionId, assetLabel: row.assetLabel, realityTicker: row.realityTicker, currentRead: row.currentRead,
    targetRead: row.targetRead, status: row.status, notificationChannel: row.notificationChannel,
    humanKeyQuestion: row.humanKeyQuestion, lastCheckedAt: row.lastCheckedAt, nextCheckAt: row.nextCheckAt,
    stateVersion: row.stateVersion, updatedAt: row.updatedAt,
  };
}

export async function GET(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ authenticated: false, items: [] });
  const store = await getWatchStore();
  const items = await store.listWatches(accountUserId);
  return Response.json({ authenticated: true, items: items.map((item) => ({
    id: item.id, sourceSessionId: item.sourceSessionId, assetLabel: item.assetLabel, realityTicker: item.realityTicker, currentRead: item.currentRead,
    targetRead: item.targetRead, status: item.status, notificationChannel: item.notificationChannel,
    humanKeyQuestion: item.humanKeyQuestion, lastCheckedAt: item.lastCheckedAt, nextCheckAt: item.nextCheckAt,
    stateVersion: item.stateVersion, updatedAt: item.updatedAt,
  })) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const accountUserId = await currentAccountUserId();
  if (!accountUserId) return Response.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  const sessionStore = await getStore();
  const owner = await readOwner();
  let session = await sessionStore.getSession(parsed.data.sessionId);
  if (!session || !canAccessSession(session, owner.secret, accountUserId)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!session.accountUserId && ownsSession(session.ownerVerifier, session.id, owner.secret)) {
    await sessionStore.setAccountUser(session.id, accountUserId);
    session = await sessionStore.getSession(session.id);
  }
  if (!session || session.accountUserId !== accountUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.status !== "stopped" && session.status !== "unresolved") return Response.json({ error: "WATCH_REQUIRES_COMPLETED_RESEARCH" }, { status: 409 });

  const plan = planFromSession(session);
  if (!plan) return Response.json({ error: "WATCH_PLAN_UNAVAILABLE" }, { status: 409 });
  if (isFavorableRead(plan.baseline.read)) return Response.json({ error: "WATCH_TARGET_ALREADY_REACHED" }, { status: 409 });

  const watchStore = await getWatchStore();
  const connection = await watchStore.getConnection(accountUserId, parsed.data.channel);
  if (!connection || connection.status !== "CONNECTED") {
    return Response.json({ error: "NOTIFICATION_CHANNEL_NOT_CONNECTED", channel: parsed.data.channel }, { status: 412 });
  }
  const state = session.state as { intent?: { asset?: string; decisionQuestion?: string } | null; assetIdentity?: { normalTicker?: string | null; realityTicker?: string | null; perpSymbol?: string | null } | null };
  const initialCheckAt = new Date(Date.now() + plan.cadenceSeconds * 1000).toISOString();
  const created = await watchStore.createWatch({
    id: randomUUID(),
    accountUserId,
    sourceSessionId: session.id,
    assetLabel: state.assetIdentity?.normalTicker || state.intent?.asset || plan.humanKeyQuestion,
    realityTicker: state.assetIdentity?.realityTicker ?? "",
    perpTicker: state.assetIdentity?.perpSymbol ?? null,
    originalQuestion: state.intent?.decisionQuestion ?? session.id,
    hinge: plan.hingeTopic,
    humanKeyQuestion: plan.humanKeyQuestion,
    researchFamily: plan.family,
    startingRead: plan.baseline.read,
    currentRead: plan.baseline.read,
    targetRead: plan.targetRead,
    status: "ACTIVE",
    notificationChannel: parsed.data.channel,
    plan,
    snapshot: plan.baseline,
    stateVersion: 0,
    nextCheckAt: initialCheckAt,
    lastCheckedAt: null,
    triggeredAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastAttemptAt: null,
  });
  return Response.json({ watch: publicWatch(created) }, { status: 201 });
}
