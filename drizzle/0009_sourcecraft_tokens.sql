CREATE TABLE "sourcecraft_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"token_encrypted" text NOT NULL,
	"sc_user_id" text NOT NULL,
	"sc_username" text,
	"sc_display_name" text,
	"extra_orgs" text,
	"last_sync_at" timestamp with time zone,
	"last_sync_error" text,
	"invalid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owned_repositories" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sourcecraft_tokens" ADD CONSTRAINT "sourcecraft_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
