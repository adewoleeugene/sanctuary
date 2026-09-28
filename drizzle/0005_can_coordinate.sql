ALTER TABLE "members" ADD COLUMN "can_coordinate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "members" SET "can_coordinate" = true WHERE "full_name" IN ('Francess Thompson', 'Emily Fanday');
