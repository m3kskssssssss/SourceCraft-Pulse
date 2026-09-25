CREATE TABLE "owned_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"verify_key" text NOT NULL,
	"verified_at" timestamp with time zone,
	"last_check_at" timestamp with time zone,
	"last_check_error" text,
	"refreshed_on" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owned_repositories" ADD CONSTRAINT "owned_repositories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owned_repositories" ADD CONSTRAINT "owned_repositories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "owned_repositories_user_repo_unique" ON "owned_repositories" USING btree ("user_id","repository_id");--> statement-breakpoint
CREATE INDEX "owned_repositories_repository_id_idx" ON "owned_repositories" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "owned_repositories_verified_at_idx" ON "owned_repositories" USING btree ("verified_at");
