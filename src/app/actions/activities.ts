"use server";

import { and, asc, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  activities,
  activityCoordinators,
  activityRoles,
  activityTypes,
  attendance,
  cleaningAssignments,
  members,
  reports,
  roleAssignments,
  roles,
  type AttendanceStatus,
  parseCleaningChoice,
  type CleaningShift,
} from "@/db/schema";
import { bool, num, optNum, optStr, str } from "@/lib/form";
import { createActivities } from "@/lib/queries";
import { generateCleaningRoster } from "@/lib/roster";
import { requireActivityAccess, requireAdmin } from "@/lib/session";

function refresh(activityId: number) {
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/activities");
  revalidatePath("/");
}

export async function createActivity(fd: FormData) {
  await requireAdmin();
  const typeId = num(fd, "activityTypeId");
  const [type] = await db.select().from(activityTypes).where(eq(activityTypes.id, typeId));
  if (!type) throw new Error("Choose what kind of event this is.");
  // The form's cleaning choice wins; without one, follow the event type.
  const cleaning = fd.has("cleaning")
    ? parseCleaningChoice(str(fd, "cleaning"))
    : parseCleaningChoice(type.hasCleaning ? "both" : "none");
  const [id] = await createActivities([
    {
      date: str(fd, "date"),
      time: optStr(fd, "time"),
      activityTypeId: typeId,
      theme: optStr(fd, "theme"),
      ...cleaning,
    },
  ], fd.getAll("coordinatorIds").map(Number).filter(Boolean));
  if (cleaning.hasCleaning) await generateCleaningRoster(id);
  revalidatePath("/activities");
  revalidatePath("/");
  redirect(`/activities/${id}`);
}

export async function updateActivity(fd: FormData) {
  const id = num(fd, "id");
  const user = await requireActivityAccess(id);
  const cleaning = parseCleaningChoice(str(fd, "cleaning"));
  const [before] = await db.select().from(activities).where(eq(activities.id, id));

  const values: Partial<typeof activities.$inferInsert> = {
    theme: optStr(fd, "theme"),
    time: optStr(fd, "time"),
    ...cleaning,
  };
  // Only admins move the date or change the type.
  if (user.role === "admin") {
    values.date = str(fd, "date");
    values.activityTypeId = num(fd, "activityTypeId");
  }
  await db.update(activities).set(values).where(eq(activities.id, id));

  // Cleaning just switched on: fill the roster if it's empty.
  if (cleaning.hasCleaning && !before?.hasCleaning) {
    const existing = await db
      .select({ id: cleaningAssignments.id })
      .from(cleaningAssignments)
      .where(eq(cleaningAssignments.activityId, id))
      .limit(1);
    if (existing.length === 0) await generateCleaningRoster(id);
  }
  refresh(id);
}

export async function deleteActivity(fd: FormData) {
  await requireAdmin();
  const id = num(fd, "id");
  await db.delete(activities).where(eq(activities.id, id));
  revalidatePath("/activities");
  revalidatePath("/");
  // Stay on the home page when deleting from there.
  redirect(str(fd, "returnTo") === "/" ? "/" : "/activities");
}

// ── Roles ────────────────────────────────────────────────────────────────

export async function toggleActivityRole(fd: FormData) {
  const activityId = num(fd, "activityId");
  await requireActivityAccess(activityId);
  const roleId = num(fd, "roleId");
  if (bool(fd, "enable")) {
    await db.insert(activityRoles).values({ activityId, roleId }).onConflictDoNothing();
  } else {
    await db
      .delete(activityRoles)
      .where(and(eq(activityRoles.activityId, activityId), eq(activityRoles.roleId, roleId)));
    await db
      .delete(roleAssignments)
      .where(and(eq(roleAssignments.activityId, activityId), eq(roleAssignments.roleId, roleId)));
  }
  refresh(activityId);
}

// ── Cleaning ─────────────────────────────────────────────────────────────

export async function regenerateCleaning(fd: FormData) {
  const activityId = num(fd, "activityId");
  await requireActivityAccess(activityId);
  await generateCleaningRoster(activityId);
  refresh(activityId);
}

// ── Attendance, cleaning compliance and the report ─────────────────────

async function assertEditable(activityId: number) {
  const user = await requireActivityAccess(activityId);
  const [a] = await db.select().from(activities).where(eq(activities.id, activityId));
  if (a?.status === "completed" && user.role !== "admin") {
    throw new Error("This day is completed. Ask an admin to make changes.");
  }
  return user;
}

export async function saveReport(fd: FormData) {
  const activityId = num(fd, "activityId");
  const user = await assertEditable(activityId);
  const complete = str(fd, "intent") === "complete";
  const values = {
    visitors: optNum(fd, "visitors") ?? 0,
    comments: optStr(fd, "comments"),
    scripture: optStr(fd, "scripture"),
    ...(complete ? { completedBy: user.name, completedAt: new Date() } : {}),
  };
  await db
    .insert(reports)
    .values({ activityId, ...values })
    .onConflictDoUpdate({ target: reports.activityId, set: values });
  if (complete) {
    await db.update(activities).set({ status: "completed" }).where(eq(activities.id, activityId));
  }
  refresh(activityId);
  revalidatePath(`/activities/${activityId}/attendance`);
}


// ── One-tap actions used by the simplified screens ─────────────────────

/** Turn one person on or off as a coordinator for the day (admins only). */
export async function toggleCoordinator(fd: FormData) {
  await requireAdmin();
  const activityId = num(fd, "activityId");
  const memberId = num(fd, "memberId");
  if (bool(fd, "on")) {
    await db.insert(activityCoordinators).values({ activityId, memberId }).onConflictDoNothing();
  } else {
    await db
      .delete(activityCoordinators)
      .where(and(eq(activityCoordinators.activityId, activityId), eq(activityCoordinators.memberId, memberId)));
  }
  refresh(activityId);
  revalidatePath("/programmes", "layout");
}

/** Put a person in a role slot, swap them, or clear the slot (no memberId). */
export async function setRolePerson(fd: FormData) {
  const activityId = num(fd, "activityId");
  await requireActivityAccess(activityId);
  const roleId = num(fd, "roleId");
  const assignmentId = optNum(fd, "assignmentId");
  const memberId = optNum(fd, "memberId");
  if (assignmentId) {
    await db
      .delete(roleAssignments)
      .where(and(eq(roleAssignments.id, assignmentId), eq(roleAssignments.activityId, activityId)));
  }
  if (memberId) {
    await db.insert(roleAssignments).values({ activityId, roleId, memberId }).onConflictDoNothing();
  }
  refresh(activityId);
}

/** Fill every empty role slot with whoever has gone longest without that role. */
export async function suggestRoles(fd: FormData) {
  const activityId = num(fd, "activityId");
  await requireActivityAccess(activityId);
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));
  if (!activity) return;

  const [enabled, existing, pool, history, coordinators] = await Promise.all([
    db
      .select({ role: roles })
      .from(activityRoles)
      .innerJoin(roles, eq(activityRoles.roleId, roles.id))
      .where(eq(activityRoles.activityId, activityId))
      .orderBy(asc(roles.sortOrder)),
    db.select().from(roleAssignments).where(eq(roleAssignments.activityId, activityId)),
    db.select().from(members).where(eq(members.active, true)),
    db
      .select({ roleId: roleAssignments.roleId, memberId: roleAssignments.memberId, date: activities.date })
      .from(roleAssignments)
      .innerJoin(activities, eq(roleAssignments.activityId, activities.id))
      .where(lt(activities.date, activity.date)),
    db.select().from(activityCoordinators).where(eq(activityCoordinators.activityId, activityId)),
  ]);

  const last = new Map<string, string>();
  const anyRoleCount = new Map<number, number>();
  for (const h of history) {
    const key = `${h.roleId}:${h.memberId}`;
    if ((last.get(key) ?? "") < h.date) last.set(key, h.date);
    anyRoleCount.set(h.memberId, (anyRoleCount.get(h.memberId) ?? 0) + 1);
  }

  // One role per person per day; the coordinator already has a job.
  const busy = new Set(existing.map((e) => e.memberId));
  for (const c of coordinators) busy.add(c.memberId);

  const inserts: (typeof roleAssignments.$inferInsert)[] = [];
  for (const { role } of enabled) {
    const open = role.peopleNeeded - existing.filter((e) => e.roleId === role.id).length;
    for (let i = 0; i < open; i++) {
      const pick = pool
        .filter((m) => !busy.has(m.id))
        .sort((a, b) => {
          const la = last.get(`${role.id}:${a.id}`) ?? "";
          const lb = last.get(`${role.id}:${b.id}`) ?? "";
          if (la !== lb) return la < lb ? -1 : 1;
          return (anyRoleCount.get(a.id) ?? 0) - (anyRoleCount.get(b.id) ?? 0) || a.id - b.id;
        })[0];
      if (!pick) break;
      busy.add(pick.id);
      inserts.push({ activityId, roleId: role.id, memberId: pick.id });
    }
  }
  if (inserts.length) await db.insert(roleAssignments).values(inserts).onConflictDoNothing();
  refresh(activityId);
}

/** Put a person in a cleaning slot, swap them, or clear the slot (no memberId). */
export async function setCleaner(fd: FormData) {
  const activityId = num(fd, "activityId");
  await requireActivityAccess(activityId);
  const zoneId = num(fd, "zoneId");
  const assignmentId = optNum(fd, "assignmentId");
  const memberId = optNum(fd, "memberId");
  if (assignmentId) {
    await db
      .delete(cleaningAssignments)
      .where(and(eq(cleaningAssignments.id, assignmentId), eq(cleaningAssignments.activityId, activityId)));
  }
  if (memberId) {
    // One zone per person per day: moving someone frees their old zone.
    await db
      .delete(cleaningAssignments)
      .where(and(eq(cleaningAssignments.activityId, activityId), eq(cleaningAssignments.memberId, memberId)));
    // Hand-picked slots are kept when the roster is shuffled.
    await db.insert(cleaningAssignments).values({ activityId, zoneId, memberId, locked: true });
  }
  refresh(activityId);
}

/** Called when someone shares the day; moves a draft to "shared". */
export async function markShared(activityId: number) {
  await requireActivityAccess(activityId);
  await db
    .update(activities)
    .set({ status: "published" })
    .where(and(eq(activities.id, activityId), eq(activities.status, "draft")));
  refresh(activityId);
}

export async function setAttendanceMark(
  activityId: number,
  memberId: number,
  status: AttendanceStatus,
  note: string | null,
) {
  await assertEditable(activityId);
  if (!["present", "excused", "absent"].includes(status)) throw new Error("Bad status");
  const values = { status, note: status === "excused" ? note?.trim() || null : null };
  await db
    .insert(attendance)
    .values({ activityId, memberId, ...values })
    .onConflictDoUpdate({ target: [attendance.activityId, attendance.memberId], set: values });
  revalidatePath(`/activities/${activityId}/attendance`);
}

export async function setCleaned(
  activityId: number,
  assignmentId: number,
  shift: CleaningShift,
  cleaned: boolean,
) {
  await assertEditable(activityId);
  const value = cleaned ? "cleaned" : "not_cleaned";
  await db
    .update(cleaningAssignments)
    .set(shift === "after" ? { cleanedAfter: value } : { cleaned: value })
    .where(and(eq(cleaningAssignments.id, assignmentId), eq(cleaningAssignments.activityId, activityId)));
  revalidatePath(`/activities/${activityId}/attendance`);
}
