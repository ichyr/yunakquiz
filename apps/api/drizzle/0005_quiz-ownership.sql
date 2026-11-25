ALTER TABLE "quizzes" ADD COLUMN "author_id" integer;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Every Quiz that exists now is published and ownerless (author_id stays null). ADR 0009.
UPDATE "quizzes" SET "published_at" = now();--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quizzes_author_idx" ON "quizzes" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_status_check" CHECK ("quizzes"."status" in ('draft', 'published'));--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_published_has_date_check" CHECK ("quizzes"."status" = 'draft' or "quizzes"."published_at" is not null);