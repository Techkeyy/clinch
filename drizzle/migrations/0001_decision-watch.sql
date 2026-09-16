CREATE TABLE "decision_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_user_id" text NOT NULL,
	"source_session_id" uuid NOT NULL,
	"asset_label" text NOT NULL,
	"reality_ticker" text NOT NULL,
	"perp_ticker" text,
	"original_question" text NOT NULL,
	"hinge" text,
	"human_key_question" text NOT NULL,
	"research_family" text NOT NULL,
	"starting_read" text NOT NULL,
	"current_read" text NOT NULL,
	"target_read" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notification_channel" text NOT NULL,
	"plan" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"workflow_run_id" text,
	"state_version" integer DEFAULT 0 NOT NULL,
	"next_check_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_connection_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"account_user_id" text NOT NULL,
	"channel" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_user_id" text NOT NULL,
	"channel" text NOT NULL,
	"address" text NOT NULL,
	"status" text DEFAULT 'CONNECTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_connections_account_user_id_unique" UNIQUE("account_user_id")
);
--> statement-breakpoint
CREATE TABLE "watch_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watch_id" uuid NOT NULL,
	"transition_key" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'CLAIMED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "watch_notifications_transition_key_unique" UNIQUE("transition_key")
);
--> statement-breakpoint
ALTER TABLE "decision_watches" ADD CONSTRAINT "decision_watches_source_session_id_research_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."research_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_notifications" ADD CONSTRAINT "watch_notifications_watch_id_decision_watches_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."decision_watches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decision_watches_account_idx" ON "decision_watches" USING btree ("account_user_id");--> statement-breakpoint
CREATE INDEX "decision_watches_status_idx" ON "decision_watches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_tokens_account_idx" ON "notification_connection_tokens" USING btree ("account_user_id");--> statement-breakpoint
CREATE INDEX "notification_connections_account_idx" ON "notification_connections" USING btree ("account_user_id");--> statement-breakpoint
CREATE INDEX "watch_notifications_watch_idx" ON "watch_notifications" USING btree ("watch_id");