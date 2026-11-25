ALTER TABLE "one_time_tokens" DROP CONSTRAINT "one_time_tokens_purpose_check";--> statement-breakpoint
ALTER TABLE "one_time_tokens" ADD COLUMN "new_email" "citext";--> statement-breakpoint
ALTER TABLE "one_time_tokens" ADD CONSTRAINT "one_time_tokens_purpose_check" CHECK ("one_time_tokens"."purpose" in ('verify_email', 'reset_password', 'change_email'));