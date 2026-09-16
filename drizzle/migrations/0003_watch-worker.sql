ALTER TABLE "decision_watches" DROP COLUMN IF EXISTS "workflow_run_id";--> statement-breakpoint
ALTER TABLE "decision_watches" ADD COLUMN IF NOT EXISTS "lease_owner" text;--> statement-breakpoint
ALTER TABLE "decision_watches" ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "decision_watches" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_watches_due_idx" ON "decision_watches" USING btree ("status","next_check_at","lease_expires_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watch_worker_heartbeats" (
  "worker_id" text PRIMARY KEY NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "last_cycle_started_at" timestamp with time zone,
  "last_cycle_finished_at" timestamp with time zone,
  "last_cycle_claimed" integer DEFAULT 0 NOT NULL,
  "last_cycle_processed" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
