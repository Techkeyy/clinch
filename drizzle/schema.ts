import { pgTable, text, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

// Minimal two-table model (P6 sec 23). Anonymous sessions only.
export const researchSessions = pgTable("research_sessions", {
  id: uuid("id").primaryKey(),
  ownerVerifier: text("owner_verifier").notNull(),
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
});

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
