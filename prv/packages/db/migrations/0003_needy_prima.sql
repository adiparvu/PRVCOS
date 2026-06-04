CREATE TYPE "public"."erasure_status" AS ENUM('pending', 'approved', 'executing', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."jit_status" AS ENUM('pending', 'approved', 'active', 'expired', 'revoked', 'break_glass');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "data_erasure_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"status" "erasure_status" DEFAULT 'pending' NOT NULL,
	"request_reason" text NOT NULL,
	"gdpr_basis" varchar(100) DEFAULT 'right_to_erasure' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"executed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"verification_hash" varchar(64),
	"erasure_log" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sysadmin_access_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid NOT NULL,
	"company_id" uuid,
	"status" "jit_status" DEFAULT 'pending' NOT NULL,
	"justification" text NOT NULL,
	"is_break_glass" boolean DEFAULT false NOT NULL,
	"break_glass_justification" text,
	"approver_id_1" uuid,
	"approved_at_1" timestamp with time zone,
	"approver_id_2" uuid,
	"approved_at_2" timestamp with time zone,
	"session_token_hash" varchar(64),
	"started_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "impersonated_by" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "jit_session_id" uuid;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_erasure_requests" ADD CONSTRAINT "data_erasure_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_erasure_requests" ADD CONSTRAINT "data_erasure_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_erasure_requests" ADD CONSTRAINT "data_erasure_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_erasure_requests" ADD CONSTRAINT "data_erasure_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_erasure_requests" ADD CONSTRAINT "data_erasure_requests_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sysadmin_access_sessions" ADD CONSTRAINT "sysadmin_access_sessions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sysadmin_access_sessions" ADD CONSTRAINT "sysadmin_access_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sysadmin_access_sessions" ADD CONSTRAINT "sysadmin_access_sessions_approver_id_1_users_id_fk" FOREIGN KEY ("approver_id_1") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sysadmin_access_sessions" ADD CONSTRAINT "sysadmin_access_sessions_approver_id_2_users_id_fk" FOREIGN KEY ("approver_id_2") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sysadmin_access_sessions" ADD CONSTRAINT "sysadmin_access_sessions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_company_id_idx" ON "api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "erasure_requests_company_id_idx" ON "data_erasure_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "erasure_requests_target_user_id_idx" ON "data_erasure_requests" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "erasure_requests_status_idx" ON "data_erasure_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jit_sessions_requested_by_idx" ON "sysadmin_access_sessions" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "jit_sessions_status_idx" ON "sysadmin_access_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jit_sessions_expires_at_idx" ON "sysadmin_access_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonated_by_users_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;