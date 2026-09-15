ALTER TABLE "research_sessions" ADD COLUMN IF NOT EXISTS "account_user_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_sessions_account_user_idx" ON "research_sessions" USING btree ("account_user_id");
