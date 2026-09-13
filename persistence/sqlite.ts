// SQLite adapter for local development and tests (node:sqlite, stdlib).
// Production uses the Drizzle/Postgres adapter; behavior contract is shared
// (see store.ts) and both are covered by the same contract tests.
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { SessionRow, SessionStore, StepRow } from "./store";
import { SESSION_TTL_MS, RATE_BUCKET_TTL_MS } from "../config/thresholds";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS research_sessions (
  id TEXT PRIMARY KEY, owner_verifier TEXT NOT NULL, intent TEXT,
  state TEXT NOT NULL, status TEXT NOT NULL, read TEXT NOT NULL DEFAULT 'undecided',
  logic_version TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
  state_version INTEGER NOT NULL DEFAULT 0, brief TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS research_steps (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL, kind TEXT NOT NULL, family TEXT,
  request_summary TEXT, result_summary TEXT, provenance TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), finished_at TEXT
);
CREATE TABLE IF NOT EXISTS rate_counters (
  bucket_key TEXT PRIMARY KEY, window_start_ms INTEGER NOT NULL, count INTEGER NOT NULL
);`;

function row(r: Record<string, unknown>): SessionRow {
  return {
    id: r.id as string, ownerVerifier: r.owner_verifier as string,
    intent: r.intent ? JSON.parse(r.intent as string) : null,
    state: JSON.parse(r.state as string), status: r.status as string, read: r.read as string,
    logicVersion: r.logic_version as string, idempotencyKey: r.idempotency_key as string,
    stateVersion: r.state_version as number, brief: r.brief ? JSON.parse(r.brief as string) : null,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export function openSQLite(path: string): SessionStore {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 10000;");
  db.exec(SCHEMA);
  const now = () => new Date().toISOString();
  return {
    kind: "sqlite",
    async createSession(r) {
      const ts = now();
      db.prepare(`INSERT INTO research_sessions
        (id, owner_verifier, intent, state, status, read, logic_version, idempotency_key, state_version, brief, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        r.id, r.ownerVerifier, JSON.stringify(r.intent ?? null), JSON.stringify(r.state),
        r.status, r.read, r.logicVersion, r.idempotencyKey, r.stateVersion,
        JSON.stringify(r.brief ?? null), ts, ts);
      const got = await this.getSession(r.id);
      if (!got) throw new Error("session insert failed");
      return got;
    },
    async getSession(id) {
      const r = db.prepare("SELECT * FROM research_sessions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!r) return null;
      // Lazy expiry: expired sessions are never accessible (P15 retention).
      if (Date.now() - Date.parse(r.updated_at as string) > SESSION_TTL_MS) {
        db.prepare("DELETE FROM research_steps WHERE session_id = ?").run(id);
        db.prepare("DELETE FROM research_sessions WHERE id = ?").run(id);
        return null;
      }
      return row(r);
    },
    async findByIdempotencyKey(key) {
      const r = db.prepare("SELECT * FROM research_sessions WHERE idempotency_key = ?").get(key) as Record<string, unknown> | undefined;
      if (!r) return null;
      if (Date.now() - Date.parse(r.updated_at as string) > SESSION_TTL_MS) {
        db.prepare("DELETE FROM research_steps WHERE session_id = ?").run(r.id as string);
        db.prepare("DELETE FROM research_sessions WHERE id = ?").run(r.id as string);
        return null;
      }
      return row(r);
    },
    async compareAndSet(id, expectedVersion, patch) {
      const sets: string[] = [];
      const vals: (string | number | null)[] = [];
      const map: Record<string, string> = { intent: "intent", state: "state", status: "status", read: "read", logicVersion: "logic_version", brief: "brief" };
      for (const [k, col] of Object.entries(map)) {
        const v = (patch as Record<string, unknown>)[k];
        if (v !== undefined) { sets.push(`${col} = ?`); vals.push(typeof v === "string" ? v : JSON.stringify(v)); }
      }
      sets.push("state_version = state_version + 1", "updated_at = ?");
      vals.push(now());
      const info = db.prepare(`UPDATE research_sessions SET ${sets.join(", ")} WHERE id = ? AND state_version = ?`).run(...vals, id, expectedVersion);
      if (info.changes === 0) return null;
      return this.getSession(id);
    },
    async appendStep(s) {
      const id = s.id ?? randomUUID();
      db.prepare(`INSERT INTO research_steps (id, session_id, ord, kind, family, request_summary, result_summary, provenance, finished_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(id, s.sessionId, s.ord, s.kind, s.family ?? null, s.requestSummary ?? null,
        JSON.stringify(s.resultSummary ?? null), JSON.stringify(s.provenance ?? null), null);
      db.prepare("UPDATE research_steps SET finished_at = ? WHERE id = ?").run(now(), id);
      const r = db.prepare("SELECT * FROM research_steps WHERE id = ?").get(id) as Record<string, unknown>;
      return { id, sessionId: s.sessionId, ord: s.ord, kind: s.kind, family: (r.family as string) ?? null,
        requestSummary: (r.request_summary as string) ?? null,
        resultSummary: r.result_summary ? JSON.parse(r.result_summary as string) : null,
        provenance: r.provenance ? JSON.parse(r.provenance as string) : null,
        startedAt: r.started_at as string, finishedAt: r.finished_at as string };
    },
    async getSteps(sessionId) {
      const rows = db.prepare("SELECT * FROM research_steps WHERE session_id = ? ORDER BY ord ASC").all(sessionId) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, sessionId: sessionId, ord: r.ord as number, kind: r.kind as string,
        family: (r.family as string) ?? null, requestSummary: (r.request_summary as string) ?? null,
        resultSummary: r.result_summary ? JSON.parse(r.result_summary as string) : null,
        provenance: r.provenance ? JSON.parse(r.provenance as string) : null,
        startedAt: r.started_at as string, finishedAt: (r.finished_at as string) ?? null }));
    },
    async deleteSession(id) {
      const info = db.prepare("DELETE FROM research_sessions WHERE id = ?").run(id);
      return info.changes > 0;
    },
    async rateHit(key, windowMs, limit) {
      const nowMs = Date.now();
      const windowStart = nowMs - (nowMs % windowMs);
      const existing = db.prepare("SELECT window_start_ms AS w, count AS c FROM rate_counters WHERE bucket_key = ?").get(key) as { w: number; c: number } | undefined;
      if (!existing || existing.w !== windowStart) {
        db.prepare("INSERT INTO rate_counters (bucket_key, window_start_ms, count) VALUES (?,?,1) ON CONFLICT(bucket_key) DO UPDATE SET window_start_ms=excluded.window_start_ms, count=1").run(key, windowStart);
        return { allowed: 1 <= limit, count: 1 };
      }
      if (existing.c >= limit) return { allowed: false, count: existing.c };
      db.prepare("UPDATE rate_counters SET count = count + 1 WHERE bucket_key = ?").run(key);
      return { allowed: true, count: existing.c + 1 };
    },
    async pruneExpired(nowMs) {
      const cutoff = new Date(nowMs - SESSION_TTL_MS).toISOString();
      const dying = db.prepare("SELECT id FROM research_sessions WHERE updated_at < ? LIMIT 100").all(cutoff) as { id: string }[];
      for (const d of dying) {
        db.prepare("DELETE FROM research_steps WHERE session_id = ?").run(d.id);
        db.prepare("DELETE FROM research_sessions WHERE id = ?").run(d.id);
      }
      const bcut = nowMs - RATE_BUCKET_TTL_MS;
      const old = db.prepare("SELECT bucket_key FROM rate_counters WHERE window_start_ms < ? LIMIT 500").all(bcut) as { bucket_key: string }[];
      for (const o of old) db.prepare("DELETE FROM rate_counters WHERE bucket_key = ?").run(o.bucket_key);
      return { sessions: dying.length, buckets: old.length };
    },
    async close() { db.close(); },
  };
}
