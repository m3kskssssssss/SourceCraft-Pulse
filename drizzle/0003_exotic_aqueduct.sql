CREATE INDEX "analyses_public_score_idx" ON "analyses" USING btree ("is_public","status","score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analyses_repo_finished_idx" ON "analyses" USING btree ("repository_id","finished_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "repositories_language_idx" ON "repositories" USING btree ("language");--> statement-breakpoint
CREATE INDEX "repositories_forks_count_idx" ON "repositories" USING btree ("forks_count" DESC NULLS LAST);