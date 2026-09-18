import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { decisionWatches, notificationConnections, notificationConnectionTokens, watchNotifications, watchWorkerHeartbeats } from "@/drizzle/schema";
import type { WatchChannel, WatchEvidenceSnapshot, WatchPlan, WatchStatus } from "@/domain/watch";

export interface WatchRow {
  id: string; accountUserId: string; sourceSessionId: string; assetLabel: string; realityTicker: string; perpTicker: string | null;
  originalQuestion: string; hinge: string | null; humanKeyQuestion: string; researchFamily: string; startingRead: string;
  currentRead: string; targetRead: string; status: WatchStatus; notificationChannel: WatchChannel; plan: WatchPlan;
  snapshot: WatchEvidenceSnapshot; stateVersion: number; nextCheckAt: string | null;
  lastCheckedAt: string | null; triggeredAt: string | null; leaseOwner: string | null; leaseExpiresAt: string | null;
  lastAttemptAt: string | null; createdAt: string; updatedAt: string;
}
export interface WorkerHeartbeat { workerId: string; startedAt: string; lastCycleStartedAt: string | null; lastCycleFinishedAt: string | null; lastCycleClaimed: number; lastCycleProcessed: number; lastError: string | null; updatedAt: string; }
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
  updateWatch(id: string, expectedVersion: number, patch: Partial<Pick<WatchRow, "status" | "currentRead" | "snapshot" | "nextCheckAt" | "lastCheckedAt" | "triggeredAt" | "leaseOwner" | "leaseExpiresAt" | "lastAttemptAt">>, leaseOwner?: string): Promise<WatchRow | null>;
  claimDueWatches(workerId: string, now: Date, leaseMs: number, limit: number): Promise<WatchRow[]>;
  releaseLease(id: string, workerId: string, expectedVersion: number): Promise<WatchRow | null>;
  recordWorkerHeartbeat(row: Omit<WorkerHeartbeat, "updatedAt">): Promise<WorkerHeartbeat>;
  getConnection(accountUserId: string, channel: WatchChannel): Promise<ConnectionRow | null>;
  /** Reverse lookup for inbound channel traffic: chat address -> linked account. */
  findConnectionByAddress(channel: WatchChannel, address: string): Promise<ConnectionRow | null>;
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
    plan: row.plan as WatchPlan, snapshot: row.snapshot as WatchEvidenceSnapshot,
    stateVersion: row.stateVersion, nextCheckAt: dateOrNull(row.nextCheckAt), lastCheckedAt: dateOrNull(row.lastCheckedAt),
    triggeredAt: dateOrNull(row.triggeredAt), leaseOwner: row.leaseOwner ?? null, leaseExpiresAt: dateOrNull(row.leaseExpiresAt),
    lastAttemptAt: dateOrNull(row.lastAttemptAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}
function toHeartbeat(row: typeof watchWorkerHeartbeats.$inferSelect): WorkerHeartbeat {
  return { workerId: row.workerId, startedAt: row.startedAt.toISOString(), lastCycleStartedAt: dateOrNull(row.lastCycleStartedAt), lastCycleFinishedAt: dateOrNull(row.lastCycleFinishedAt), lastCycleClaimed: row.lastCycleClaimed, lastCycleProcessed: row.lastCycleProcessed, lastError: row.lastError ?? null, updatedAt: row.updatedAt.toISOString() };
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
        plan: row.plan, snapshot: row.snapshot, stateVersion: row.stateVersion,
        nextCheckAt: parseDate(row.nextCheckAt), lastCheckedAt: parseDate(row.lastCheckedAt), triggeredAt: parseDate(row.triggeredAt),
        leaseOwner: row.leaseOwner, leaseExpiresAt: parseDate(row.leaseExpiresAt), lastAttemptAt: parseDate(row.lastAttemptAt),
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
    async updateWatch(id, expectedVersion, patch, leaseOwner) {
      const values: Record<string, unknown> = { updatedAt: new Date(), stateVersion: sql.raw("state_version + 1") };
      if (patch.status !== undefined) values.status = patch.status;
      if (patch.currentRead !== undefined) values.currentRead = patch.currentRead;
      if (patch.snapshot !== undefined) values.snapshot = patch.snapshot;
      if (patch.nextCheckAt !== undefined) values.nextCheckAt = parseDate(patch.nextCheckAt);
      if (patch.lastCheckedAt !== undefined) values.lastCheckedAt = parseDate(patch.lastCheckedAt);
      if (patch.triggeredAt !== undefined) values.triggeredAt = parseDate(patch.triggeredAt);
      if (patch.leaseOwner !== undefined) values.leaseOwner = patch.leaseOwner;
      if (patch.leaseExpiresAt !== undefined) values.leaseExpiresAt = parseDate(patch.leaseExpiresAt);
      if (patch.lastAttemptAt !== undefined) values.lastAttemptAt = parseDate(patch.lastAttemptAt);
      const conditions = [eq(decisionWatches.id, id), eq(decisionWatches.stateVersion, expectedVersion)];
      if (leaseOwner) conditions.push(eq(decisionWatches.leaseOwner, leaseOwner));
      const rows = await db.update(decisionWatches).set(values).where(and(...conditions)).returning();
      return rows.length ? toWatch(rows[0]) : null;
    },
    async claimDueWatches(workerId, now, leaseMs, limit) {
      const expires = new Date(now.getTime() + leaseMs);
      const claimed = await client.unsafe<{ id: string }[]>(`WITH due AS (
        SELECT id FROM decision_watches
        WHERE status = 'ACTIVE' AND next_check_at <= $1
          AND (lease_expires_at IS NULL OR lease_expires_at < $1)
        ORDER BY next_check_at ASC, id ASC
        LIMIT $2 FOR UPDATE SKIP LOCKED
      )
      UPDATE decision_watches AS w
      SET lease_owner = $3, lease_expires_at = $4, last_attempt_at = $1,
          state_version = w.state_version + 1, updated_at = $1
      FROM due WHERE w.id = due.id RETURNING w.id`, [now.toISOString(), limit, workerId, expires.toISOString()]);
      if (!claimed.length) return [];
      const rows = await db.select().from(decisionWatches).where(inArray(decisionWatches.id, claimed.map((row) => row.id)));
      return rows.map(toWatch);
    },
    async releaseLease(id, workerId, expectedVersion) {
      const rows = await db.update(decisionWatches).set({ leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date(), stateVersion: sql.raw("state_version + 1") })
        .where(and(eq(decisionWatches.id, id), eq(decisionWatches.leaseOwner, workerId), eq(decisionWatches.stateVersion, expectedVersion))).returning();
      return rows.length ? toWatch(rows[0]) : null;
    },
    async recordWorkerHeartbeat(row) {
      const [saved] = await db.insert(watchWorkerHeartbeats).values({ workerId: row.workerId, startedAt: new Date(row.startedAt), lastCycleStartedAt: parseDate(row.lastCycleStartedAt), lastCycleFinishedAt: parseDate(row.lastCycleFinishedAt), lastCycleClaimed: row.lastCycleClaimed, lastCycleProcessed: row.lastCycleProcessed, lastError: row.lastError, updatedAt: new Date() })
        .onConflictDoUpdate({ target: watchWorkerHeartbeats.workerId, set: { startedAt: new Date(row.startedAt), lastCycleStartedAt: parseDate(row.lastCycleStartedAt), lastCycleFinishedAt: parseDate(row.lastCycleFinishedAt), lastCycleClaimed: row.lastCycleClaimed, lastCycleProcessed: row.lastCycleProcessed, lastError: row.lastError, updatedAt: new Date() } }).returning();
      return toHeartbeat(saved);
    },
    async getConnection(accountUserId, channel) {
      const rows = await db.select().from(notificationConnections).where(and(eq(notificationConnections.accountUserId, accountUserId), eq(notificationConnections.channel, channel))).limit(1);
      return rows.length ? toConnection(rows[0]) : null;
    },
    async findConnectionByAddress(channel, address) {
      const rows = await db.select().from(notificationConnections)
        .where(and(eq(notificationConnections.channel, channel), eq(notificationConnections.address, address)))
        .orderBy(sql`updated_at DESC`).limit(1);
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
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(account_user_id, channel)
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
  plan TEXT NOT NULL, snapshot TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 0, next_check_at TEXT, last_checked_at TEXT, triggered_at TEXT,
  lease_owner TEXT, lease_expires_at TEXT, last_attempt_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS watch_notifications (
  id TEXT PRIMARY KEY, watch_id TEXT NOT NULL, transition_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CLAIMED', attempts INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT, last_error TEXT,
  claimed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), sent_at TEXT
);
CREATE TABLE IF NOT EXISTS watch_worker_heartbeats (
  worker_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, last_cycle_started_at TEXT,
  last_cycle_finished_at TEXT, last_cycle_claimed INTEGER NOT NULL DEFAULT 0,
  last_cycle_processed INTEGER NOT NULL DEFAULT 0, last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);`;

function ensureSqliteWatchColumns(db: DatabaseSync): void {
  for (const statement of [
    "ALTER TABLE decision_watches ADD COLUMN lease_owner TEXT",
    "ALTER TABLE decision_watches ADD COLUMN lease_expires_at TEXT",
    "ALTER TABLE decision_watches ADD COLUMN last_attempt_at TEXT",
  ]) {
    try {
      db.exec(statement);
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column name")) throw error;
    }
  }
}

function sqliteWatchRow(row: Record<string, unknown>): WatchRow {
  return {
    id: String(row.id), accountUserId: String(row.account_user_id), sourceSessionId: String(row.source_session_id), assetLabel: String(row.asset_label),
    realityTicker: String(row.reality_ticker), perpTicker: row.perp_ticker ? String(row.perp_ticker) : null, originalQuestion: String(row.original_question),
    hinge: row.hinge ? String(row.hinge) : null, humanKeyQuestion: String(row.human_key_question), researchFamily: String(row.research_family),
    startingRead: String(row.starting_read), currentRead: String(row.current_read), targetRead: String(row.target_read),
    status: String(row.status) as WatchStatus, notificationChannel: String(row.notification_channel) as WatchChannel,
    plan: JSON.parse(String(row.plan)) as WatchPlan, snapshot: JSON.parse(String(row.snapshot)) as WatchEvidenceSnapshot,
    stateVersion: Number(row.state_version),
    nextCheckAt: row.next_check_at ? String(row.next_check_at) : null, lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    triggeredAt: row.triggered_at ? String(row.triggered_at) : null, leaseOwner: row.lease_owner ? String(row.lease_owner) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null, lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
function sqliteHeartbeatRow(row: Record<string, unknown>): WorkerHeartbeat {
  return { workerId: String(row.worker_id), startedAt: String(row.started_at), lastCycleStartedAt: row.last_cycle_started_at ? String(row.last_cycle_started_at) : null, lastCycleFinishedAt: row.last_cycle_finished_at ? String(row.last_cycle_finished_at) : null, lastCycleClaimed: Number(row.last_cycle_claimed), lastCycleProcessed: Number(row.last_cycle_processed), lastError: row.last_error ? String(row.last_error) : null, updatedAt: String(row.updated_at) };
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
  db.exec("PRAGMA journal_mode = WAL;"); db.exec("PRAGMA foreign_keys = ON;"); db.exec("PRAGMA busy_timeout = 10000;"); db.exec(SQLITE_SCHEMA); ensureSqliteWatchColumns(db);
  const now = () => new Date().toISOString();
  const get = (id: string) => db.prepare("SELECT * FROM decision_watches WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return {
    kind: "sqlite",
    async createWatch(row) {
      const ts = now();
      db.prepare(`INSERT INTO decision_watches
        (id, account_user_id, source_session_id, asset_label, reality_ticker, perp_ticker, original_question, hinge, human_key_question,
         research_family, starting_read, current_read, target_read, status, notification_channel, plan, snapshot,
         state_version, next_check_at, last_checked_at, triggered_at, lease_owner, lease_expires_at, last_attempt_at, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        row.id, row.accountUserId, row.sourceSessionId, row.assetLabel, row.realityTicker, row.perpTicker, row.originalQuestion, row.hinge, row.humanKeyQuestion,
        row.researchFamily, row.startingRead, row.currentRead, row.targetRead, row.status, row.notificationChannel, JSON.stringify(row.plan), JSON.stringify(row.snapshot),
        row.stateVersion, row.nextCheckAt, row.lastCheckedAt, row.triggeredAt, row.leaseOwner, row.leaseExpiresAt, row.lastAttemptAt, ts, ts);
      return sqliteWatchRow(get(row.id)!);
    },
    async getWatch(id) { const row = get(id); return row ? sqliteWatchRow(row) : null; },
    async listWatches(accountUserId) { return (db.prepare("SELECT * FROM decision_watches WHERE account_user_id = ? ORDER BY updated_at DESC LIMIT 50").all(accountUserId) as Record<string, unknown>[]).map(sqliteWatchRow); },
    async updateWatch(id, expectedVersion, patch, leaseOwner) {
      const sets: string[] = []; const values: (string | number | null)[] = [];
      const map: Record<string, string> = { status: "status", currentRead: "current_read", snapshot: "snapshot", nextCheckAt: "next_check_at", lastCheckedAt: "last_checked_at", triggeredAt: "triggered_at", leaseOwner: "lease_owner", leaseExpiresAt: "lease_expires_at", lastAttemptAt: "last_attempt_at" };
      for (const [key, column] of Object.entries(map)) {
        const value = (patch as Record<string, unknown>)[key];
        if (value !== undefined) { sets.push(column + " = ?"); values.push(key === "snapshot" ? JSON.stringify(value) ?? null : value as string | number | null); }
      }
      sets.push("state_version = state_version + 1", "updated_at = ?"); values.push(now(), id, expectedVersion);
      let where = " WHERE id = ? AND state_version = ?";
      if (leaseOwner) { where += " AND lease_owner = ?"; values.push(leaseOwner); }
      const result = db.prepare("UPDATE decision_watches SET " + sets.join(", ") + where).run(...values);
      return result.changes ? sqliteWatchRow(get(id)!) : null;
    },
    async claimDueWatches(workerId, at, leaseMs, limit) {
      const expires = new Date(at.getTime() + leaseMs).toISOString();
      const rows = db.prepare("SELECT * FROM decision_watches WHERE status = 'ACTIVE' AND next_check_at <= ? AND (lease_expires_at IS NULL OR lease_expires_at < ?) ORDER BY next_check_at ASC, id ASC LIMIT ?").all(at.toISOString(), at.toISOString(), limit) as Record<string, unknown>[];
      const out: WatchRow[] = [];
      for (const row of rows) {
        const result = db.prepare("UPDATE decision_watches SET lease_owner = ?, lease_expires_at = ?, last_attempt_at = ?, state_version = state_version + 1, updated_at = ? WHERE id = ? AND status = 'ACTIVE' AND (lease_expires_at IS NULL OR lease_expires_at < ?)").run(workerId, expires, at.toISOString(), now(), String(row.id), at.toISOString());
        if (result.changes) out.push(sqliteWatchRow(get(String(row.id))!));
      }
      return out;
    },
    async releaseLease(id, workerId, expectedVersion) {
      const result = db.prepare("UPDATE decision_watches SET lease_owner = NULL, lease_expires_at = NULL, state_version = state_version + 1, updated_at = ? WHERE id = ? AND lease_owner = ? AND state_version = ?").run(now(), id, workerId, expectedVersion);
      return result.changes ? sqliteWatchRow(get(id)!) : null;
    },
    async recordWorkerHeartbeat(row) {
      const ts = now();
      db.prepare(`INSERT INTO watch_worker_heartbeats (worker_id, started_at, last_cycle_started_at, last_cycle_finished_at, last_cycle_claimed, last_cycle_processed, last_error, updated_at)
        VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(worker_id) DO UPDATE SET started_at=excluded.started_at, last_cycle_started_at=excluded.last_cycle_started_at, last_cycle_finished_at=excluded.last_cycle_finished_at, last_cycle_claimed=excluded.last_cycle_claimed, last_cycle_processed=excluded.last_cycle_processed, last_error=excluded.last_error, updated_at=excluded.updated_at`)
        .run(row.workerId, row.startedAt, row.lastCycleStartedAt, row.lastCycleFinishedAt, row.lastCycleClaimed, row.lastCycleProcessed, row.lastError, ts);
      return sqliteHeartbeatRow(db.prepare("SELECT * FROM watch_worker_heartbeats WHERE worker_id = ?").get(row.workerId) as Record<string, unknown>);
    },
    async getConnection(accountUserId, channel) {
      const row = db.prepare("SELECT * FROM notification_connections WHERE account_user_id = ? AND channel = ?").get(accountUserId, channel) as Record<string, unknown> | undefined;
      return row ? sqliteConnectionRow(row) : null;
    },
    async findConnectionByAddress(channel, address) {
      const row = db.prepare("SELECT * FROM notification_connections WHERE channel = ? AND address = ? ORDER BY updated_at DESC LIMIT 1").get(channel, address) as Record<string, unknown> | undefined;
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
