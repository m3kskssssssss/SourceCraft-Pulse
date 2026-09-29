CREATE TABLE "commit_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"head_sha" text,
	"reanalysis_id" uuid,
	"trigger" text DEFAULT 'schedule' NOT NULL,
	"error" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commit_checks" ADD CONSTRAINT "commit_checks_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_checks" ADD CONSTRAINT "commit_checks_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_checks" ADD CONSTRAINT "commit_checks_reanalysis_id_analyses_id_fk" FOREIGN KEY ("reanalysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commit_checks_repo_checked_idx" ON "commit_checks" USING btree ("repository_id","checked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "commit_checks_analysis_idx" ON "commit_checks" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "commit_checks_checked_idx" ON "commit_checks" USING btree ("checked_at" DESC NULLS LAST);