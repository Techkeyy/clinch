import { pgTable, text, integer, timestamp, jsonb, uuid, bigint, index } from "drizzle-orm/pg-core";

// Minimal two-table model (P6 sec 23). Guest ownership remains verifier-based;
// account ownership is nullable so existing anonymous sessions are preserved.
export const researchSessions = pgTable("research_sessions", {
  id: uuid("id").primaryKey(),
  ownerVerifier: text("owner_verifier").notNull(),
  accountUserId: text("account_user_id"),
  intent: jsonb("intent"),
  state: jsonb("state").notNull(),
  status: text("status").notNull(),
  read: text("read").notNull().default("undecided"),
  logicVersion: text("logic_version").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  stateVersion: integer("state_version").notNull().default(0),
  brief: jsonb("brief"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("research_sessions_account_user_idx").on(table.accountUserId)]);

export const researchSteps = pgTable("research_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => researchSessions.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull(),
  kind: text("kind").notNull(),
  family: text("family"),
  requestSummary: text("request_summary"),
  resultSummary: jsonb("result_summary"),
  provenance: jsonb("provenance"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// Short-lived abuse-control buckets (P7: pseudonymous HMAC keys, 24h max).
export const rateCounters = pgTable("rate_counters", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStartMs: bigint("window_start_ms", { mode: "number" }).notNull(),
  count: integer("count").notNull(),
});
