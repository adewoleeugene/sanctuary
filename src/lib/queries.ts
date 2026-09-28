import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityCoordinators,
  activityRoles,
  activityTypes,
  cleaningAssignments,
  cleaningZones,
  members,
  programmes,
  roleAssignments,
  roles,
  settings,
  type Member,
} from "@/db/schema";
import { addDays, daysUntilBirthday } from "@/lib/dates";

export const DEFAULT_BIRTHDAY_TEMPLATE =
  "🎉 Happy birthday, {name}! 🎂\n\nThe sanctuary family celebrates you today. May the Lord bless you and keep you, and make His face shine upon you (Numbers 6:24–25). Have a wonderful year ahead! 🙏";

export async function getSetting(key: string, fallback: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? fallback;
}

export async function getActiveMembers() {
  return db.select().from(members).where(eq(members.active, true)).orderBy(asc(members.fullName));
}

/** Members with a birthday within `days` days of `fromISO` (inclusive), soonest first. */
export function upcomingBirthdays(all: Member[], fromISO: string, days: number) {
  return all
    .filter((m) => m.active && m.birthDay && m.birthMonth)
    .map((m) => ({ member: m, inDays: daysUntilBirthday(m.birthDay!, m.birthMonth!, fromISO) }))
    .filter((b) => b.inDays < days)
    .sort((a, b) => a.inDays - b.inDays)
    .map((b) => ({ ...b, date: addDays(fromISO, b.inDays) }));
}

export type ActivitySheet = Awaited<ReturnType<typeof getActivitySheets>>[number];

/** Everything needed to show, print or share one or more activities. */
export async function getActivitySheets(ids: number[]) {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      activity: activities,
      typeName: activityTypes.name,
      programmeName: programmes.name,
      programmeDays: programmes.days,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .leftJoin(programmes, eq(activities.programmeId, programmes.id))
    .where(inArray(activities.id, ids))
    .orderBy(asc(activities.date), asc(activities.time));

  const [allMembers, coordinatorRows, enabledRoles, assigned, cleaning, zones] = await Promise.all([
    db.select().from(members),
    db.select().from(activityCoordinators).where(inArray(activityCoordinators.activityId, ids)),
    db
      .select({ activityId: activityRoles.activityId, role: roles })
      .from(activityRoles)
      .innerJoin(roles, eq(activityRoles.roleId, roles.id))
      .where(inArray(activityRoles.activityId, ids))
      .orderBy(asc(roles.sortOrder), asc(roles.name)),
    db.select().from(roleAssignments).where(inArray(roleAssignments.activityId, ids)),
    db.select().from(cleaningAssignments).where(inArray(cleaningAssignments.activityId, ids)),
    db
      .select()
      .from(cleaningZones)
      .where(eq(cleaningZones.archived, false))
      .orderBy(asc(cleaningZones.sortOrder), asc(cleaningZones.name)),
  ]);

  const memberById = new Map(allMembers.map((m) => [m.id, m]));

  return rows.map(({ activity, typeName, programmeName, programmeDays }) => {
    const roleList = enabledRoles
      .filter((r) => r.activityId === activity.id)
      .map(({ role }) => {
        const slots = assigned
          .filter((a) => a.activityId === activity.id && a.roleId === role.id)
          .map((a) => ({ assignmentId: a.id, member: memberById.get(a.memberId)! }))
          .filter((a) => !!a.member);
        return { role, slots, members: slots.map((a) => a.member) };
      });

    const zoneList = activity.hasCleaning
      ? zones.map((zone) => ({
          zone,
          assignments: cleaning
            .filter((c) => c.activityId === activity.id && c.zoneId === zone.id)
            .map((c) => ({ ...c, member: memberById.get(c.memberId)! }))
            .filter((c) => !!c.member),
        }))
      : [];

    return {
      activity,
      typeName,
      programmeName,
      programmeDays,
      coordinators: coordinatorRows
        .filter((c) => c.activityId === activity.id)
        .map((c) => memberById.get(c.memberId))
        .filter((m): m is Member => !!m)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
      roles: roleList,
      zones: zoneList,
      birthdays: upcomingBirthdays(allMembers, activity.date, 7),
    };
  });
}

export async function getActivitySheet(id: number) {
  const [sheet] = await getActivitySheets([id]);
  return sheet ?? null;
}

/** Create activities with the type's default roles switched on and any coordinators set. */
export async function createActivities(
  values: (typeof activities.$inferInsert)[],
  coordinatorIds: number[] = [],
): Promise<number[]> {
  if (values.length === 0) return [];
  const created = await db.insert(activities).values(values).returning();
  if (coordinatorIds.length) {
    await db
      .insert(activityCoordinators)
      .values(created.flatMap((a) => coordinatorIds.map((memberId) => ({ activityId: a.id, memberId }))))
      .onConflictDoNothing();
  }
  const typeIds = [...new Set(created.map((a) => a.activityTypeId))];
  const types = await db.select().from(activityTypes).where(inArray(activityTypes.id, typeIds));
  const defaults = new Map(types.map((t) => [t.id, t.defaultRoleIds]));
  const links = created.flatMap((a) =>
    (defaults.get(a.activityTypeId) ?? []).map((roleId) => ({ activityId: a.id, roleId })),
  );
  if (links.length) await db.insert(activityRoles).values(links).onConflictDoNothing();
  return created.map((a) => a.id);
}

export async function activityIdsForProgramme(programmeId: number) {
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.programmeId, programmeId))
    .orderBy(asc(activities.date));
  return rows.map((r) => r.id);
}

export async function activityIdsBetween(from: string, to: string) {
  const rows = await db.query.activities.findMany({
    columns: { id: true },
    where: (a, { and, gte, lte }) => and(gte(a.date, from), lte(a.date, to)),
    orderBy: (a, { asc }) => [asc(a.date)],
  });
  return rows.map((r) => r.id);
}

export async function roleIdsForActivity(activityId: number) {
  const rows = await db
    .select({ roleId: activityRoles.roleId })
    .from(activityRoles)
    .where(eq(activityRoles.activityId, activityId));
  return rows.map((r) => r.roleId);
}



/** "Francess Thompson & Emily Fanday", or null when nobody is set. */
export function coordinatorNames(people: { fullName: string }[]) {
  return people.length ? people.map((p) => p.fullName).join(" & ") : null;
}

// ── Coordinators in list queries ─────────────────────────────────────────

/** Coordinator names for an activity row, e.g. "Emily Fanday & Francess Thompson". */
export const coordinatorNamesSql = sql<string | null>`(
  select string_agg(m.full_name, ' & ' order by m.full_name)
  from activity_coordinators ac join members m on m.id = ac.member_id
  where ac.activity_id = ${activities.id}
)`;

/** Activities this member coordinates. */
export function coordinatedBy(memberId: number) {
  return sql`exists (
    select 1 from activity_coordinators ac
    where ac.activity_id = ${activities.id} and ac.member_id = ${memberId}
  )`;
}

/** Activities with no coordinator yet. */
export const withoutCoordinator = sql`not exists (
  select 1 from activity_coordinators ac where ac.activity_id = ${activities.id}
)`;
