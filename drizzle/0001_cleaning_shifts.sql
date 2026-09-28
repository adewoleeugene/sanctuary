ALTER TABLE "cleaning_assignments" ADD COLUMN "shift" text DEFAULT 'before' NOT NULL;--> statement-breakpoint
ALTER TABLE "cleaning_zones" ADD COLUMN "people_after" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "cleaning_zones" SET "people_after" = "people_needed";
