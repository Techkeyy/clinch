import { pgTable, text, integer, timestamp, jsonb, uuid, bigint, index, unique } from "drizzle-orm/pg-core";

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

export const notificationConnections = pgTable("notification_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountUserId: text("account_user_id").notNull(),
  channel: text("channel").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("CONNECTED"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("notification_connections_account_channel_unique").on(table.accountUserId, table.channel),
  index("notification_connections_account_idx").on(table.accountUserId),
]);

export const notificationConnectionTokens = pgTable("notification_connection_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  accountUserId: text("account_user_id").notNull(),
  channel: text("channel").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notification_tokens_account_idx").on(table.accountUserId)]);

export const decisionWatches = pgTable("decision_watches", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountUserId: text("account_user_id").notNull(),
  sourceSessionId: uuid("source_session_id").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  assetLabel: text("asset_label").notNull(),
  realityTicker: text("reality_ticker").notNull(),
  perpTicker: text("perp_ticker"),
  originalQuestion: text("original_question").notNull(),
  hinge: text("hinge"),
  humanKeyQuestion: text("human_key_question").notNull(),
  researchFamily: text("research_family").notNull(),
  startingRead: text("starting_read").notNull(),
  currentRead: text("current_read").notNull(),
  targetRead: text("target_read").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  notificationChannel: text("notification_channel").notNull(),
  plan: jsonb("plan").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  stateVersion: integer("state_version").notNull().default(0),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("decision_watches_account_idx").on(table.accountUserId),
  index("decision_watches_status_idx").on(table.status),
  index("decision_watches_due_idx").on(table.status, table.nextCheckAt, table.leaseExpiresAt),
]);

export const watchNotifications = pgTable("watch_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  watchId: uuid("watch_id").notNull().references(() => decisionWatches.id, { onDelete: "cascade" }),
  transitionKey: text("transition_key").notNull().unique(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("CLAIMED"),
  attempts: integer("attempts").notNull().default(0),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (table) => [index("watch_notifications_watch_idx").on(table.watchId)]);

export const watchWorkerHeartbeats = pgTable("watch_worker_heartbeats", {
  workerId: text("worker_id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  lastCycleStartedAt: timestamp("last_cycle_started_at", { withTimezone: true }),
  lastCycleFinishedAt: timestamp("last_cycle_finished_at", { withTimezone: true }),
  lastCycleClaimed: integer("last_cycle_claimed").notNull().default(0),
  lastCycleProcessed: integer("last_cycle_processed").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
