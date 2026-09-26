CREATE TABLE "improvement_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"status" text DEFAULT 'preparing' NOT NULL,
	"stage" text,
	"base_oid" text,
	"items" jsonb,
	"notes" jsonb,
	"error" text,
	"pr_branch" text,
	"pr_slug" text,
	"pr_items" jsonb,
	"submitted_at" timestamp with time zone,
	"merged_answer" text,
	"reevaluation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "improvement_proposals" ADD CONSTRAINT "improvement_proposals_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposals" ADD CONSTRAINT "improvement_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposals" ADD CONSTRAINT "improvement_proposals_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_proposals" ADD CONSTRAINT "improvement_proposals_reevaluation_id_analyses_id_fk" FOREIGN KEY ("reevaluation_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "improvement_proposals_analysis_user_idx" ON "improvement_proposals" USING btree ("analysis_id","user_id");