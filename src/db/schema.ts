import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  birthDay: integer("birth_day"),
  birthMonth: integer("birth_month"),
  birthYear: integer("birth_year"),
  gender: text("gender").$type<"female" | "male">(),
  active: boolean("active").notNull().default(true),
  canClean: boolean("can_clean").notNull().default(true),
  // Only these members appear in the Coordinator pickers.
  canCoordinate: boolean("can_coordinate").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Who may log in. Rows are created by an admin by email; the Neon Auth user id
// is linked the first time that email signs in.
export const appUsers = pgTable("app_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  authUserId: text("auth_user_id").unique(),
  role: text("role").$type<"admin" | "coordinator">().notNull(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  peopleNeeded: integer("people_needed").notNull().default(1),
  archived: boolean("archived").notNull().default(false),
});

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hasCleaning: boolean("has_cleaning").notNull().default(false),
  defaultRoleIds: jsonb("default_role_ids").$type<number[]>().notNull().default([]),
  archived: boolean("archived").notNull().default(false),
});

export const cleaningZones = pgTable("cleaning_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  peopleNeeded: integer("people_needed").notNull().default(1),
  genderRule: text("gender_rule").$type<"female" | "male">(),
  archived: boolean("archived").notNull().default(false),
});

export const programmes = pgTable("programmes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  days: integer("days").notNull(),
  // 0 = Sunday … 6 = Saturday
  weekdays: jsonb("weekdays").$type<number[]>().notNull(),
  activityTypeId: integer("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityStatus = "draft" | "published" | "completed";
export type CleaningShift = "before" | "after";

export const SHIFTS: { key: CleaningShift; label: string }[] = [
  { key: "before", label: "Before service" },
  { key: "after", label: "After service" },
];

/** "before & after service", "before service" or "after service". */
export function cleaningTimesLabel(shifts: CleaningShift[]) {
  if (shifts.includes("before") && shifts.includes("after")) return "before & after service";
  return shifts.includes("after") ? "after service" : "before service";
}

/** The form value for a day's cleaning: "both", "before", "after" or "none". */
export type CleaningChoice = "both" | CleaningShift | "none";

export function parseCleaningChoice(value: string): { hasCleaning: boolean; cleaningShifts: CleaningShift[] } {
  if (value === "before" || value === "after") return { hasCleaning: true, cleaningShifts: [value] };
  if (value === "none") return { hasCleaning: false, cleaningShifts: ["before", "after"] };
  return { hasCleaning: true, cleaningShifts: ["before", "after"] };
}

export function cleaningChoiceOf(a: { hasCleaning: boolean; cleaningShifts: CleaningShift[] }): CleaningChoice {
  if (!a.hasCleaning) return "none";
  return a.cleaningShifts.length === 1 ? a.cleaningShifts[0] : "both";
}

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  time: text("time"),
  activityTypeId: integer("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
  programmeId: integer("programme_id").references(() => programmes.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number"),
  theme: text("theme"),
  hasCleaning: boolean("has_cleaning").notNull().default(false),
  // When the day's cleaning team cleans (before and/or after the service).
  cleaningShifts: jsonb("cleaning_shifts").$type<CleaningShift[]>().notNull().default(["before", "after"]),
  status: text("status").$type<ActivityStatus>().notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Who coordinates a day. Usually one person, sometimes both coordinators.
export const activityCoordinators = pgTable(
  "activity_coordinators",
  {
    activityId: integer("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.memberId] })],
);

// Roles switched on for a given day.
export const activityRoles = pgTable(
  "activity_roles",
  {
    activityId: integer("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.roleId] })],
);

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: serial("id").primaryKey(),
    activityId: integer("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.activityId, t.roleId, t.memberId)],
);

export type CleanedStatus = "cleaned" | "not_cleaned";

export const cleaningAssignments = pgTable(
  "cleaning_assignments",
  {
    id: serial("id").primaryKey(),
    activityId: integer("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => cleaningZones.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    locked: boolean("locked").notNull().default(false),
    // The same person cleans before and after the service; each is recorded.
    cleaned: text("cleaned").$type<CleanedStatus>(),
    cleanedAfter: text("cleaned_after").$type<CleanedStatus>(),
    note: text("note"),
  },
  (t) => [unique().on(t.activityId, t.memberId)],
);

export type AttendanceStatus = "present" | "excused" | "absent";

export const attendance = pgTable(
  "attendance",
  {
    activityId: integer("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: text("status").$type<AttendanceStatus>().notNull(),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.memberId] })],
);

export const reports = pgTable("reports", {
  activityId: integer("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  visitors: integer("visitors").notNull().default(0),
  comments: text("comments"),
  scripture: text("scripture"),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at"),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Member = typeof members.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type CleaningZone = typeof cleaningZones.$inferSelect;
export type ActivityType = typeof activityTypes.$inferSelect;
export type Programme = typeof programmes.$inferSelect;
