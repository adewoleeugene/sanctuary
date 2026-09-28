CREATE TABLE "activity_coordinators" (
	"activity_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	CONSTRAINT "activity_coordinators_activity_id_member_id_pk" PRIMARY KEY("activity_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "activities_coordinator_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_coordinators" ADD CONSTRAINT "activity_coordinators_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_coordinators" ADD CONSTRAINT "activity_coordinators_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "activity_coordinators" ("activity_id", "member_id") SELECT "id", "coordinator_member_id" FROM "activities" WHERE "coordinator_member_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN "coordinator_member_id";