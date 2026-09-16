import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { decisionWatches, notificationConnections, notificationConnectionTokens, watchNotifications } from "@/drizzle/schema";
import type { WatchChannel, WatchEvidenceSnapshot, WatchPlan, WatchStatus } from "@/domain/watch";

export interface WatchRow {
  id: string; accountUserId: string; sourceSessionId: string; assetLabel: string; realityTicker: string; perpTicker: string | null;
  originalQuestion: string; hinge: string | null; humanKeyQuestion: string; researchFamily: string; startingRead: string;
  currentRead: string; targetRead: string; status: WatchStatus; notificationChannel: WatchChannel; plan: WatchPlan;
  snapshot: WatchEvidenceSnapshot; workflowRunId: string | null; stateVersion: number; nextCheckAt: string | null;
  lastCheckedAt: string | null; triggeredAt: string | null; createdAt: string; updatedAt: string;
}
export interface ConnectionRow {
  id: string; accountUserId: string; channel: WatchChannel; address: string; status: string; createdAt: string; updatedAt: string;
}
export interface ConnectionTokenRow {
  tokenHash: string; accountUserId: string; channel: WatchChannel; expiresAt: string; usedAt: string | null; createdAt: string;
}
export interface WatchNotificationRow {
  id: string; watchId: string; transitionKey: string; channel: WatchChannel; status: string; attempts: number;
  providerMessageId: string | null; lastError: string | null; claimedAt: string; sentAt: string | null;
}
export interface WatchStore {
  kind: "sqlite" | "postgres";
  createWatch(row: Omit<WatchRow, "createdAt" | "updatedAt">): Promise<WatchRow>;
  getWatch(id: string): Promise<WatchRow | null>;
  listWatches(accountUserId: string): Promise<WatchRow[]>;
  updateWatch(id: string, expectedVersion: number, patch: Partial<Pick<WatchRow, "status" | "currentRead" | "snapshot" | "workflowRunId" | "nextCheckAt" | "lastCheckedAt" | "triggeredAt">>): Promise<WatchRow | null>;
  getConnection(accountUserId: string, channel: WatchChannel): Promise<ConnectionRow | null>;
  upsertConnection(row: Omit<ConnectionRow, "id" | "createdAt" | "updatedAt">): Promise<ConnectionRow>;
  createConnectionToken(row: Omit<ConnectionTokenRow, "createdAt" | "usedAt">): Promise<ConnectionTokenRow>;
  consumeConnectionToken(tokenHash: string, now: Date): Promise<ConnectionTokenRow | null>;
  claimNotification(watchId: string, transitionKey: string, channel: WatchChannel): Promise<WatchNotificationRow | null>;
  markNotificationSent(id: string, providerMessageId: string | null): Promise<void>;
  markNotificationFailed(id: string, errorCode: string): Promise<void>;
  close(): Promise<void>;
}

export function hashConnectionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
function dateOrNull(value: Date | null | undefined): string | null { return value ? value.toISOString() : null; }
function parseDate(value: string | null | undefined): Date | null { return value ? new Date(value) : null; }
function toWatch(row: typeof decisionWatches.$inferSelect): WatchRow {
  return {
    id: row.id, accountUserId: row.accountUserId, sourceSessionId: row.sourceSessionId, assetLabel: row.assetLabel,
    realityTicker: row.realityTicker, perpTicker: row.perpTicker ?? null, originalQuestion: row.originalQuestion,
    hinge: row.hinge ?? null, humanKeyQuestion: row.humanKeyQuestion, researchFamily: row.researchFamily,
    startingRead: row.startingRead, currentRead: row.currentRead, targetRead: row.targetRead,
    status: row.status as WatchStatus, notificationChannel: row.notificationChannel as WatchChannel,
    plan: row.plan as WatchPlan, snapshot: row.snapshot as WatchEvidenceSnapshot, workflowRunId: row.workflowRunId ?? null,
    stateVersion: row.stateVersion, nextCheckAt: dateOrNull(row.nextCheckAt), lastCheckedAt: dateOrNull(row.lastCheckedAt),
    triggeredAt: dateOrNull(row.triggeredAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}
function toConnection(row: typeof notificationConnections.$inferSelect): ConnectionRow {
  return { id: row.id, accountUserId: row.accountUserId, channel: row.channel as WatchChannel, address: row.address, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function toToken(row: typeof notificationConnectionTokens.$inferSelect): ConnectionTokenRow {
  return { tokenHash: row.tokenHash, accountUserId: row.accountUserId, channel: row.channel as WatchChannel, expiresAt: row.expiresAt.toISOString(), usedAt: dateOrNull(row.usedAt), createdAt: row.createdAt.toISOString() };
}
function toNotification(row: typeof watchNotifications.$inferSelect): WatchNotificationRow {
  return { id: row.id, watchId: row.watchId, transitionKey: row.transitionKey, channel: row.channel as WatchChannel, status: row.status, attempts: row.attempts, providerMessageId: row.providerMessageId ?? null, lastError: row.lastError ?? null, claimedAt: row.claimedAt.toISOString(), sentAt: dateOrNull(row.sentAt) };
}

export function openPostgresWatchStore(url: string): WatchStore {
  const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
  const db: PostgresJsDatabase = drizzle(client);
  return {
    kind: "postgres",
    async createWatch(row) {
      const [created] = await db.insert(decisionWatches).values({
        id: row.id, accountUserId: row.accountUserId, sourceSessionId: row.sourceSessionId, assetLabel: row.assetLabel,
        realityTicker: row.realityTicker, perpTicker: row.perpTicker, originalQuestion: row.originalQuestion, hinge: row.hinge,
        humanKeyQuestion: row.humanKeyQuestion, researchFamily: row.researchFamily, startingRead: row.startingRead,
        currentRead: row.currentRead, targetRead: row.targetRead, status: row.status, notificationChannel: row.notificationChannel,
        plan: row.plan, snapshot: row.snapshot, workflowRunId: row.workflowRunId, stateVersion: row.stateVersion,
        nextCheckAt: parseDate(row.nextCheckAt), lastCheckedAt: parseDate(row.lastCheckedAt), triggeredAt: parseDate(row.triggeredAt),
      }).returning();
      return toWatch(created);
    },
    async getWatch(id) {
      const rows = await db.select().from(decisionWatches).where(eq(decisionWatches.id, id)).limit(1);
      return rows.length ? toWatch(rows[0]) : null;
    },
    async listWatches(accountUserId) {
      const rows = await db.select().from(decisionWatches).where(eq(decisionWatches.accountUserId, accountUserId)).orderBy(sql.raw("updated_at DESC")).limit(50);
      return rows.map(toWatch);
    },
    async updateWatch(id, expectedVersion, patch) {
      const values: Record<string, unknown> = { updatedAt: new Date(), stateVersion: sql.raw("state_version + 1") };
      if (patch.status !== undefined) values.status = patch.status;
      if (patch.currentRead !== undefined) values.currentRead = patch.currentRead;
      if (patch.snapshot !== undefined) values.snapshot = patch.snapshot;
      if (patch.workflowRunId !== undefined) values.workflowRunId = patch.workflowRunId;
      if (patch.nextCheckAt !== undefined) values.nextCheckAt = parseDate(patch.nextCheckAt);
      if (patch.lastCheckedAt !== undefined) values.lastCheckedAt = parseDate(patch.lastCheckedAt);
      if (patch.triggeredAt !== undefined) values.triggeredAt = parseDate(patch.triggeredAt);
      const rows = await db.update(decisionWatches).set(values).where(and(eq(decisionWatches.id, id), eq(decisionWatches.stateVersion, expectedVersion))).returning();
      return rows.length ? toWatch(rows[0]) : null;
    },
    async getConnection(accountUserId, channel) {
      const rows = await db.select().from(notificationConnections).where(and(eq(notificationConnections.accountUserId, accountUserId), eq(notificationConnections.channel, channel))).limit(1);
      return rows.length ? toConnection(rows[0]) : null;
    },
    async upsertConnection(row) {
      const [saved] = await db.insert(notificationConnections).values({ accountUserId: row.accountUserId, channel: row.channel, address: row.address, status: row.status })
        .onConflictDoUpdate({ target: [notificationConnections.accountUserId, notificationConnections.channel], set: { address: row.address, status: row.status, updatedAt: new Date() } }).returning();
      return toConnection(saved);
    },
    async createConnectionToken(row) {
      const [created] = await db.insert(notificationConnectionTokens).values({ tokenHash: row.tokenHash, accountUserId: row.accountUserId, channel: row.channel, expiresAt: new Date(row.expiresAt) }).returning();
      return toToken(created);
    },
    async consumeConnectionToken(tokenHash, now) {
      const [used] = await db.update(notificationConnectionTokens).set({ usedAt: now })
        .where(and(eq(notificationConnectionTokens.tokenHash, tokenHash), isNull(notificationConnectionTokens.usedAt), gt(notificationConnectionTokens.expiresAt, now))).returning();
      return used ? toToken(used) : null;
    },
    async claimNotification(watchId, transitionKey, channel) {
      const [claimed] = await db.insert(watchNotifications).values({ id: randomUUID(), watchId, transitionKey, channel, status: "CLAIMED", attempts: 1 })
        .onConflictDoUpdate({
          target: watchNotifications.transitionKey,
          set: { status: "CLAIMED", attempts: sql`${watchNotifications.attempts} + 1`, claimedAt: new Date(), lastError: null },
          setWhere: eq(watchNotifications.status, "FAILED"),
        }).returning();
      return claimed ? toNotification(claimed) : null;
    },
    async markNotificationSent(id, providerMessageId) { await db.update(watchNotifications).set({ status: "SENT", providerMessageId, sentAt: new Date() }).where(eq(watchNotifications.id, id)); },
    async markNotificationFailed(id, errorCode) { await db.update(watchNotifications).set({ status: "FAILED", lastError: errorCode }).where(eq(watchNotifications.id, id)); },
    async close() { await client.end({ timeout: 5 }); },
  };
}

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS notification_connections (
  id TEXT PRIMARY KEY, account_user_id TEXT NOT NULL, channel TEXT NOT NULL,
  address TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CONNECTED',
  UNIQUE(account_user_id, channel),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS notification_connection_tokens (
  token_hash TEXT PRIMARY KEY, account_user_id TEXT NOT NULL, channel TEXT NOT NULL,
  expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS decision_watches (
  id TEXT PRIMARY KEY, account_user_id TEXT NOT NULL, source_session_id TEXT NOT NULL,
  asset_label TEXT NOT NULL, reality_ticker TEXT NOT NULL, perp_ticker TEXT,
  original_question TEXT NOT NULL, hinge TEXT, human_key_question TEXT NOT NULL,
  research_family TEXT NOT NULL, starting_read TEXT NOT NULL, current_read TEXT NOT NULL,
  target_read TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', notification_channel TEXT NOT NULL,
  plan TEXT NOT NULL, snapshot TEXT NOT NULL, workflow_run_id TEXT,
  state_version INTEGER NOT NULL DEFAULT 0, next_check_at TEXT, last_checked_at TEXT, triggered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS watch_notifications (
  id TEXT PRIMARY KEY, watch_id TEXT NOT NULL, transition_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CLAIMED', attempts INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT, last_error TEXT,
  claimed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), sent_at TEXT
);`;

function sqliteWatchRow(row: Record<string, unknown>): WatchRow {
  return {
    id: String(row.id), accountUserId: String(row.account_user_id), sourceSessionId: String(row.source_session_id), assetLabel: String(row.asset_label),
    realityTicker: String(row.reality_ticker), perpTicker: row.perp_ticker ? String(row.perp_ticker) : null, originalQuestion: String(row.original_question),
    hinge: row.hinge ? String(row.hinge) : null, humanKeyQuestion: String(row.human_key_question), researchFamily: String(row.research_family),
    startingRead: String(row.starting_read), currentRead: String(row.current_read), targetRead: String(row.target_read),
    status: String(row.status) as WatchStatus, notificationChannel: String(row.notification_channel) as WatchChannel,
    plan: JSON.parse(String(row.plan)) as WatchPlan, snapshot: JSON.parse(String(row.snapshot)) as WatchEvidenceSnapshot,
    workflowRunId: row.workflow_run_id ? String(row.workflow_run_id) : null, stateVersion: Number(row.state_version),
    nextCheckAt: row.next_check_at ? String(row.next_check_at) : null, lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    triggeredAt: row.triggered_at ? String(row.triggered_at) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
function sqliteConnectionRow(row: Record<string, unknown>): ConnectionRow {
  return { id: String(row.id), accountUserId: String(row.account_user_id), channel: String(row.channel) as WatchChannel, address: String(row.address), status: String(row.status), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function sqliteTokenRow(row: Record<string, unknown>): ConnectionTokenRow {
  return { tokenHash: String(row.token_hash), accountUserId: String(row.account_user_id), channel: String(row.channel) as WatchChannel, expiresAt: String(row.expires_at), usedAt: row.used_at ? String(row.used_at) : null, createdAt: String(row.created_at) };
}
function sqliteNotificationRow(row: Record<string, unknown>): WatchNotificationRow {
  return { id: String(row.id), watchId: String(row.watch_id), transitionKey: String(row.transition_key), channel: String(row.channel) as WatchChannel, status: String(row.status), attempts: Number(row.attempts), providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null, lastError: row.last_error ? String(row.last_error) : null, claimedAt: String(row.claimed_at), sentAt: row.sent_at ? String(row.sent_at) : null };
}

export function openWatchStore(url?: string): WatchStore {
  if (url) return openPostgresWatchStore(url);
  const localProdE2E = process.env.CLINCH_DEV_SQLITE === "1" && !process.env.VERCEL;
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && !localProdE2E) throw new Error("DATABASE_URL is not configured: refusing SQLite watch fallback in production.");
  const file = process.env.SQLITE_PATH || "data/clinch-dev.db";
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;"); db.exec("PRAGMA foreign_keys = ON;"); db.exec("PRAGMA busy_timeout = 10000;"); db.exec(SQLITE_SCHEMA);
  const now = () => new Date().toISOString();
  const get = (id: string) => db.prepare("SELECT * FROM decision_watches WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return {
    kind: "sqlite",
    async createWatch(row) {
      const ts = now();
      db.prepare(`INSERT INTO decision_watches
        (id, account_user_id, source_session_id, asset_label, reality_ticker, perp_ticker, original_question, hinge, human_key_question,
         research_family, starting_read, current_read, target_read, status, notification_channel, plan, snapshot, workflow_run_id,
         state_version, next_check_at, last_checked_at, triggered_at, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        row.id, row.accountUserId, row.sourceSessionId, row.assetLabel, row.realityTicker, row.perpTicker, row.originalQuestion, row.hinge, row.humanKeyQuestion,
        row.researchFamily, row.startingRead, row.currentRead, row.targetRead, row.status, row.notificationChannel, JSON.stringify(row.plan), JSON.stringify(row.snapshot),
        row.workflowRunId, row.stateVersion, row.nextCheckAt, row.lastCheckedAt, row.triggeredAt, ts, ts);
      return sqliteWatchRow(get(row.id)!);
    },
    async getWatch(id) { const row = get(id); return row ? sqliteWatchRow(row) : null; },
    async listWatches(accountUserId) { return (db.prepare("SELECT * FROM decision_watches WHERE account_user_id = ? ORDER BY updated_at DESC LIMIT 50").all(accountUserId) as Record<string, unknown>[]).map(sqliteWatchRow); },
    async updateWatch(id, expectedVersion, patch) {
      const sets: string[] = []; const values: (string | number | null)[] = [];
      const map: Record<string, string> = { status: "status", currentRead: "current_read", snapshot: "snapshot", workflowRunId: "workflow_run_id", nextCheckAt: "next_check_at", lastCheckedAt: "last_checked_at", triggeredAt: "triggered_at" };
      for (const [key, column] of Object.entries(map)) {
        const value = (patch as Record<string, unknown>)[key];
        if (value !== undefined) { sets.push(column + " = ?"); values.push(key === "snapshot" ? JSON.stringify(value) ?? null : value as string | number | null); }
      }
      sets.push("state_version = state_version + 1", "updated_at = ?"); values.push(now(), id, expectedVersion);
      const result = db.prepare("UPDATE decision_watches SET " + sets.join(", ") + " WHERE id = ? AND state_version = ?").run(...values);
      return result.changes ? sqliteWatchRow(get(id)!) : null;
    },
    async getConnection(accountUserId, channel) {
      const row = db.prepare("SELECT * FROM notification_connections WHERE account_user_id = ? AND channel = ?").get(accountUserId, channel) as Record<string, unknown> | undefined;
      return row ? sqliteConnectionRow(row) : null;
    },
    async upsertConnection(row) {
      const ts = now(); const existing = db.prepare("SELECT id, created_at FROM notification_connections WHERE account_user_id = ? AND channel = ?").get(row.accountUserId, row.channel) as { id: string; created_at: string } | undefined;
      const id = existing?.id ?? randomUUID();
      db.prepare(`INSERT INTO notification_connections (id, account_user_id, channel, address, status, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?) ON CONFLICT(account_user_id, channel) DO UPDATE SET address=excluded.address, status=excluded.status, updated_at=excluded.updated_at`)
        .run(id, row.accountUserId, row.channel, row.address, row.status, existing?.created_at ?? ts, ts);
      return sqliteConnectionRow(db.prepare("SELECT * FROM notification_connections WHERE account_user_id = ? AND channel = ?").get(row.accountUserId, row.channel) as Record<string, unknown>);
    },
    async createConnectionToken(row) {
      const ts = now(); db.prepare("INSERT INTO notification_connection_tokens (token_hash, account_user_id, channel, expires_at, created_at) VALUES (?,?,?,?,?)").run(row.tokenHash, row.accountUserId, row.channel, row.expiresAt, ts);
      return sqliteTokenRow(db.prepare("SELECT * FROM notification_connection_tokens WHERE token_hash = ?").get(row.tokenHash) as Record<string, unknown>);
    },
    async consumeConnectionToken(tokenHash, at) {
      const result = db.prepare("UPDATE notification_connection_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").run(at.toISOString(), tokenHash, at.toISOString());
      if (!result.changes) return null;
      return sqliteTokenRow(db.prepare("SELECT * FROM notification_connection_tokens WHERE token_hash = ?").get(tokenHash) as Record<string, unknown>);
    },
    async claimNotification(watchId, transitionKey, channel) {
      const id = randomUUID(); const result = db.prepare("INSERT OR IGNORE INTO watch_notifications (id, watch_id, transition_key, channel, status, attempts, claimed_at) VALUES (?,?,?,?,?,?,?)").run(id, watchId, transitionKey, channel, "CLAIMED", 1, now());
      if (result.changes) return sqliteNotificationRow(db.prepare("SELECT * FROM watch_notifications WHERE id = ?").get(id) as Record<string, unknown>);
      const retry = db.prepare("UPDATE watch_notifications SET status = 'CLAIMED', attempts = attempts + 1, claimed_at = ?, last_error = NULL WHERE transition_key = ? AND status = 'FAILED'").run(now(), transitionKey);
      if (!retry.changes) return null;
      return sqliteNotificationRow(db.prepare("SELECT * FROM watch_notifications WHERE transition_key = ?").get(transitionKey) as Record<string, unknown>);
    },
    async markNotificationSent(id, providerMessageId) { db.prepare("UPDATE watch_notifications SET status = 'SENT', provider_message_id = ?, sent_at = ? WHERE id = ?").run(providerMessageId, now(), id); },
    async markNotificationFailed(id, errorCode) { db.prepare("UPDATE watch_notifications SET status = 'FAILED', last_error = ? WHERE id = ?").run(errorCode, id); },
    async close() { db.close(); },
  };
}
