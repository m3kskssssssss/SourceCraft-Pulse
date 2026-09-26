CREATE TABLE "catalog_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourcecraft_id" text NOT NULL,
	"org_slug" varchar(128) NOT NULL,
	"repo_slug" varchar(128) NOT NULL,
	"description" text,
	"is_empty" boolean DEFAULT false NOT NULL,
	"is_fork" boolean DEFAULT false NOT NULL,
	"is_mirror" boolean DEFAULT false NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"likes" integer,
	"last_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_repositories_sourcecraft_id_unique" ON "catalog_repositories" USING btree ("sourcecraft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_repositories_org_repo_unique" ON "catalog_repositories" USING btree ("org_slug","repo_slug");--> statement-breakpoint
CREATE INDEX "catalog_repositories_synced_at_idx" ON "catalog_repositories" USING btree ("synced_at");
