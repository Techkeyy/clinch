import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { openPostgres } from "../persistence/postgres";
import { openPostgresWatchStore, hashConnectionToken } from "../persistence/watch";
import { compileWatchPlan } from "../domain/watch";
import { LOGIC_VERSION, SESSION_TTL_MS } from "../config/thresholds";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("NEON_WATCH_PROOF: DATABASE_URL is not configured");
  process.exit(2);
}

const sessionId = randomUUID();
const expiringSessionId = randomUUID();
const accountA = "neon-proof-account-a";
const accountB = "neon-proof-account-b";
const now = new Date();
const sessionRow = {
  id: sessionId,
  ownerVerifier: "neon-proof-owner",
  accountUserId: accountA,
  intent: { asset: "NVDA", action: "wait", decisionQuestion: "Should I wait for a better entry?" },
  state: {
    assetIdentity: { normalTicker: "NVDA", realityTicker: "NVDAUSDT", perpSymbol: "NVDAUSDT" },
    read: "undecided",
  },
  status: "stopped",
  read: "undecided",
  logicVersion: LOGIC_VERSION,
  idempotencyKey: "neon-proof-" + sessionId.replaceAll("-", "").slice(0, 24),
  stateVersion: 0,
  brief: { changeTriggers: ["spot structure changes materially"] },
};

let sessions = openPostgres(databaseUrl);
const watches = openPostgresWatchStore(databaseUrl);
const raw = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
let checkpoint = "opened";
const cleanupProofRows = async () => {
  await raw`DELETE FROM notification_connection_tokens WHERE account_user_id IN (${accountA}, ${accountB})`;
  await raw`DELETE FROM notification_connections WHERE account_user_id IN (${accountA}, ${accountB})`;
  await raw`DELETE FROM research_steps WHERE session_id IN (SELECT id FROM research_sessions WHERE owner_verifier = 'neon-proof-owner')`;
  await raw`DELETE FROM research_sessions WHERE owner_verifier = 'neon-proof-owner'`;
};

try {
  await cleanupProofRows();
  checkpoint = "session-create";
  await sessions.createSession(sessionRow);
  await sessions.appendStep({ sessionId, ord: 1, kind: "research", family: "spot-structure", requestSummary: "Neon persistence proof", resultSummary: { ok: true }, provenance: { source: "test" } });
  assert.equal((await sessions.findByIdempotencyKey(sessionRow.idempotencyKey))?.id, sessionId);

  checkpoint = "cross-request-session-read";
  await sessions.close();
  sessions = openPostgres(databaseUrl);
  assert.equal((await sessions.getSession(sessionId))?.id, sessionId);
  assert.equal((await sessions.getSteps(sessionId)).length, 1);
  assert.equal((await sessions.listByAccountUserId(accountA)).some((row) => row.id === sessionId), true);
  assert.equal((await sessions.listByAccountUserId(accountB)).some((row) => row.id === sessionId), false);

  checkpoint = "session-cas";
  const advanced = await sessions.compareAndSet(sessionId, 0, { status: "stopped", read: "wait" });
  assert.equal(advanced?.stateVersion, 1);
  assert.equal(await sessions.compareAndSet(sessionId, 0, { read: "enter-now" }), null);

  checkpoint = "watch-create";
  const facts = { spot: { last: 100, movePct24h: -2, spreadBps: 5, spreadWide: false } };
  const plan = compileWatchPlan({
    asset: "NVDA",
    action: "wait",
    currentRead: "wait",
    hinge: { topic: "structure-direction", question: "Has NVDA started stabilizing?" },
    completedFamily: "spot-structure",
    facts,
  });
  const watchId = randomUUID();
  const watch = await watches.createWatch({
    id: watchId,
    accountUserId: accountA,
    sourceSessionId: sessionId,
    assetLabel: "NVIDIA",
    realityTicker: "NVDAUSDT",
    perpTicker: "NVDAUSDT",
    originalQuestion: "Should I wait for a better entry?",
    hinge: plan.hingeTopic,
    humanKeyQuestion: plan.humanKeyQuestion,
    researchFamily: plan.family,
    startingRead: plan.baseline.read,
    currentRead: plan.baseline.read,
    targetRead: plan.targetRead,
    status: "ACTIVE",
    notificationChannel: "TELEGRAM",
    plan,
    snapshot: plan.baseline,
    workflowRunId: null,
    stateVersion: 0,
    nextCheckAt: now.toISOString(),
    lastCheckedAt: null,
    triggeredAt: null,
  });
  assert.equal((await watches.getWatch(watchId))?.id, watchId);
  assert.equal((await watches.listWatches(accountB)).length, 0);
  assert.equal((await watches.updateWatch(watchId, 0, { currentRead: "enter-now" }))?.stateVersion, 1);
  assert.equal(await watches.updateWatch(watchId, 0, { currentRead: "wait" }), null);

  checkpoint = "channel-connections";
  const telegram = await watches.upsertConnection({ accountUserId: accountA, channel: "TELEGRAM", address: "proof-telegram-chat", status: "CONNECTED" });
  const whatsapp = await watches.upsertConnection({ accountUserId: accountA, channel: "WHATSAPP", address: "proof-whatsapp-address", status: "CONNECTED" });
  assert.equal(telegram.channel, "TELEGRAM");
  assert.equal(whatsapp.channel, "WHATSAPP");
  assert.equal((await watches.getConnection(accountA, "TELEGRAM"))?.address, "proof-telegram-chat");
  assert.equal((await watches.getConnection(accountA, "WHATSAPP"))?.address, "proof-whatsapp-address");

  checkpoint = "connection-tokens";
  const tokenHash = hashConnectionToken("neon-proof-one-time-token-" + sessionId);
  await watches.createConnectionToken({ tokenHash, accountUserId: accountA, channel: "TELEGRAM", expiresAt: new Date(Date.now() + 60_000).toISOString() });
  assert.equal((await watches.consumeConnectionToken(tokenHash, new Date()))?.usedAt !== null, true);
  assert.equal(await watches.consumeConnectionToken(tokenHash, new Date()), null);
  const expiredHash = hashConnectionToken("neon-proof-expired-token-" + sessionId);
  await watches.createConnectionToken({ tokenHash: expiredHash, accountUserId: accountA, channel: "TELEGRAM", expiresAt: new Date(Date.now() - 1).toISOString() });
  assert.equal(await watches.consumeConnectionToken(expiredHash, new Date()), null);

  checkpoint = "notification-idempotency";
  const transitionKey = watchId + ":enter-now:1";
  const firstClaim = await watches.claimNotification(watchId, transitionKey, "TELEGRAM");
  assert.ok(firstClaim);
  assert.equal(await watches.claimNotification(watchId, transitionKey, "TELEGRAM"), null);
  await watches.markNotificationSent(firstClaim!.id, "proof-message");

  checkpoint = "retention";
  await sessions.createSession({ ...sessionRow, id: expiringSessionId, idempotencyKey: "neon-expiry-" + expiringSessionId.replaceAll("-", "").slice(0, 24) });
  await raw`UPDATE research_sessions SET updated_at = ${new Date(Date.now() - SESSION_TTL_MS - 1_000)} WHERE id = ${expiringSessionId}`;
  assert.equal(await sessions.getSession(expiringSessionId), null);

  checkpoint = "delete-cascade";
  assert.equal(await sessions.deleteSession(sessionId), true);
  assert.equal(await sessions.getSession(sessionId), null);
  assert.equal(await watches.getWatch(watchId), null);
  console.log("NEON_WATCH_PROOF: PASS");
} catch {
  console.error("NEON_WATCH_PROOF: FAIL", checkpoint);
  process.exitCode = 1;
} finally {
  await cleanupProofRows();
  await sessions.close();
  await watches.close();
  await raw.end({ timeout: 5 });
}
