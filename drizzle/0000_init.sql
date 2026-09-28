CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"activity_type_id" integer NOT NULL,
	"programme_id" integer,
	"day_number" integer,
	"coordinator_member_id" integer,
	"theme" text,
	"has_cleaning" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_roles" (
	"activity_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "activity_roles_activity_id_role_id_pk" PRIMARY KEY("activity_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"has_cleaning" boolean DEFAULT false NOT NULL,
	"default_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"auth_user_id" text,
	"role" text NOT NULL,
	"member_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email"),
	CONSTRAINT "app_users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"activity_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"status" text NOT NULL,
	"note" text,
	CONSTRAINT "attendance_activity_id_member_id_pk" PRIMARY KEY("activity_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "cleaning_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer NOT NULL,
	"zone_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"cleaned" text,
	"note" text,
	CONSTRAINT "cleaning_assignments_activity_id_member_id_unique" UNIQUE("activity_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "cleaning_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"people_needed" integer DEFAULT 1 NOT NULL,
	"gender_rule" text,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"birth_day" integer,
	"birth_month" integer,
	"birth_year" integer,
	"gender" text,
	"active" boolean DEFAULT true NOT NULL,
	"can_clean" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"days" integer NOT NULL,
	"weekdays" jsonb NOT NULL,
	"activity_type_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"activity_id" integer PRIMARY KEY NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"comments" text,
	"scripture" text,
	"completed_by" text,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	CONSTRAINT "role_assignments_activity_id_role_id_member_id_unique" UNIQUE("activity_id","role_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"people_needed" integer DEFAULT 1 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_coordinator_member_id_members_id_fk" FOREIGN KEY ("coordinator_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_roles" ADD CONSTRAINT "activity_roles_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_roles" ADD CONSTRAINT "activity_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_assignments" ADD CONSTRAINT "cleaning_assignments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_assignments" ADD CONSTRAINT "cleaning_assignments_zone_id_cleaning_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."cleaning_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_assignments" ADD CONSTRAINT "cleaning_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;