CREATE TABLE "analysis_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nickname" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contacts" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_data" "bytea";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_mime" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "analysis_comments" ADD CONSTRAINT "analysis_comments_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_comments" ADD CONSTRAINT "analysis_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_ratings" ADD CONSTRAINT "analysis_ratings_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_ratings" ADD CONSTRAINT "analysis_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_comments_analysis_id_idx" ON "analysis_comments" USING btree ("analysis_id","created_at");--> statement-breakpoint
CREATE INDEX "analysis_comments_user_id_idx" ON "analysis_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analysis_comments_parent_id_idx" ON "analysis_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_ratings_analysis_user_unique" ON "analysis_ratings" USING btree ("analysis_id","user_id");--> statement-breakpoint
CREATE INDEX "analysis_ratings_analysis_id_idx" ON "analysis_ratings" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "analysis_ratings_user_id_idx" ON "analysis_ratings" USING btree ("user_id");