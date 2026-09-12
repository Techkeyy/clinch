// Postgres adapter (Neon production path) via Drizzle. Same SessionStore
// contract as the SQLite dev adapter; covered by the same contract tests
// wherever DATABASE_URL is available.
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { researchSessions, researchSteps } from "../drizzle/schema";
import type { SessionRow, SessionStore, StepRow } from "./store";

export function openPostgres(url: string): SessionStore {
  const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
  const db: PostgresJsDatabase = drizzle(client);
  const toRow = (r: typeof researchSessions.$inferSelect): SessionRow => ({
    id: r.id, ownerVerifier: r.ownerVerifier, intent: r.intent, state: (r.state ?? {}) as Record<string, unknown>,
    status: r.status, read: r.read, logicVersion: r.logicVersion, idempotencyKey: r.idempotencyKey,
    stateVersion: r.stateVersion, brief: r.brief, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  });
  return {
    kind: "postgres",
    async createSession(r) {
      const [ins] = await db.insert(researchSessions).values({
        id: r.id, ownerVerifier: r.ownerVerifier, intent: r.intent, state: r.state as Record<string, unknown>,
        status: r.status, read: r.read, logicVersion: r.logicVersion, idempotencyKey: r.idempotencyKey,
        stateVersion: r.stateVersion, brief: r.brief,
      }).returning();
      return toRow(ins);
    },
    async getSession(id) {
      const rows = await db.select().from(researchSessions).where(eq(researchSessions.id, id)).limit(1);
      return rows.length ? toRow(rows[0]) : null;
    },
    async findByIdempotencyKey(key) {
      const rows = await db.select().from(researchSessions).where(eq(researchSessions.idempotencyKey, key)).limit(1);
      return rows.length ? toRow(rows[0]) : null;
    },
    async compareAndSet(id, expectedVersion, patch) {
      const sets: Record<string, unknown> = { updatedAt: new Date(), stateVersion: sql`${researchSessions.stateVersion} + 1` };
      if (patch.intent !== undefined) sets.intent = patch.intent;
      if (patch.state !== undefined) sets.state = patch.state;
      if (patch.status !== undefined) sets.status = patch.status;
      if (patch.read !== undefined) sets.read = patch.read;
      if (patch.logicVersion !== undefined) sets.logicVersion = patch.logicVersion;
      if (patch.brief !== undefined) sets.brief = patch.brief;
      const rows = await db.update(researchSessions).set(sets)
        .where(sql`${researchSessions.id} = ${id} AND ${researchSessions.stateVersion} = ${expectedVersion}`)
        .returning();
      return rows.length ? toRow(rows[0]) : null;
    },
    async appendStep(s) {
      const [ins] = await db.insert(researchSteps).values({
        id: s.id ?? randomUUID(), sessionId: s.sessionId, ord: s.ord, kind: s.kind,
        family: s.family ?? null, requestSummary: s.requestSummary ?? null,
        resultSummary: s.resultSummary ?? null, provenance: s.provenance ?? null,
        finishedAt: new Date(),
      }).returning();
      return { id: ins.id, sessionId: ins.sessionId, ord: ins.ord, kind: ins.kind,
        family: ins.family ?? null, requestSummary: ins.requestSummary ?? null,
        resultSummary: ins.resultSummary, provenance: ins.provenance,
        startedAt: ins.startedAt.toISOString(), finishedAt: ins.finishedAt ? ins.finishedAt.toISOString() : null };
    },
    async getSteps(sessionId) {
      const rows = await db.select().from(researchSteps).where(eq(researchSteps.sessionId, sessionId)).orderBy(researchSteps.ord);
      return rows.map((r) => ({ id: r.id, sessionId: r.sessionId, ord: r.ord, kind: r.kind,
        family: r.family ?? null, requestSummary: r.requestSummary ?? null,
        resultSummary: r.resultSummary, provenance: r.provenance,
        startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null }));
    },
    async deleteSession(id) {
      await db.delete(researchSteps).where(eq(researchSteps.sessionId, id));
      const rows = await db.delete(researchSessions).where(eq(researchSessions.id, id)).returning({ id: researchSessions.id });
      return rows.length > 0;
    },
    async rateHit(key, windowMs, limit) {
      const windowStart = Date.now() - (Date.now() % windowMs);
      const existing = await client.unsafe(
        `INSERT INTO rate_counters (bucket_key, window_start_ms, count) VALUES ($1, $2, 1)
         ON CONFLICT (bucket_key) DO UPDATE SET
           window_start_ms = CASE WHEN rate_counters.window_start_ms <> $2 THEN $2 ELSE rate_counters.window_start_ms END,
           count = CASE WHEN rate_counters.window_start_ms <> $2 THEN 1 ELSE rate_counters.count + 1 END
         RETURNING count`,
        [key, windowStart],
      ) as { count: number }[];
      const count = existing[0]?.count ?? limit + 1;
      return { allowed: count <= limit, count };
    },
    async close() { await client.end(); },
  };
}
