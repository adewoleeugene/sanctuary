import "server-only";

import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityTypes,
  attendance,
  cleaningAssignments,
  members,
  programmes,
  reports,
  roleAssignments,
  roles,
} from "@/db/schema";
import { cleaningTally } from "@/lib/cleaning";
import { addDays, todayISO } from "@/lib/dates";

export type ReportFilters = {
  from: string;
  to: string;
  programmeId: number | null;
  typeId: number | null;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): ReportFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const today = todayISO();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return {
    from: iso.test(s("from")) ? s("from") : addDays(today, -30),
    to: iso.test(s("to")) ? s("to") : today,
    programmeId: Number(s("programme")) || null,
    typeId: Number(s("type")) || null,
  };
}

export function filtersToQuery(f: ReportFilters) {
  const p = new URLSearchParams({ from: f.from, to: f.to });
  if (f.programmeId) p.set("programme", String(f.programmeId));
  if (f.typeId) p.set("type", String(f.typeId));
  return p.toString();
}

export async function buildSummary(f: ReportFilters) {
  const where: SQL[] = [];
  // A programme filter shows the whole programme regardless of dates.
  if (f.programmeId) where.push(eq(activities.programmeId, f.programmeId));
  else where.push(gte(activities.date, f.from), lte(activities.date, f.to));
  if (f.typeId) where.push(eq(activities.activityTypeId, f.typeId));

  const acts = await db
    .select({
      id: activities.id,
      date: activities.date,
      status: activities.status,
      typeId: activities.activityTypeId,
      typeName: activityTypes.name,
      programmeName: programmes.name,
      dayNumber: activities.dayNumber,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .leftJoin(programmes, eq(activities.programmeId, programmes.id))
    .where(and(...where))
    .orderBy(asc(activities.date));

  const ids = acts.map((a) => a.id);
  const [allMembers, att, clean, roleRows, reportRows] = ids.length
    ? await Promise.all([
        db.select().from(members).orderBy(asc(members.fullName)),
        db.select().from(attendance).where(inArray(attendance.activityId, ids)),
        db.select().from(cleaningAssignments).where(inArray(cleaningAssignments.activityId, ids)),
        db
          .select({ memberId: roleAssignments.memberId, roleName: roles.name })
          .from(roleAssignments)
          .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
          .where(inArray(roleAssignments.activityId, ids)),
        db.select().from(reports).where(inArray(reports.activityId, ids)),
      ])
    : [await db.select().from(members).orderBy(asc(members.fullName)), [], [], [], []];

  const roleNames = [...new Set(roleRows.map((r) => r.roleName))].sort();

  const memberRows = allMembers
    .map((m) => {
      const a = att.filter((x) => x.memberId === m.id);
      const c = clean.filter((x) => x.memberId === m.id);
      const present = a.filter((x) => x.status === "present").length;
      const { done: cleaned, missed: notCleaned } = cleaningTally(c);
      return {
        member: m,
        marked: a.length,
        present,
        excused: a.filter((x) => x.status === "excused").length,
        absent: a.filter((x) => x.status === "absent").length,
        rate: a.length ? present / a.length : null,
        cleaningAssigned: c.length,
        cleaned,
        notCleaned,
        cleaningRate: cleaned + notCleaned ? cleaned / (cleaned + notCleaned) : null,
        roles: Object.fromEntries(
          roleNames.map((r) => [r, roleRows.filter((x) => x.memberId === m.id && x.roleName === r).length]),
        ) as Record<string, number>,
      };
    })
    .filter((r) => r.member.active || r.marked > 0 || r.cleaningAssigned > 0);

  const typeRows = [...new Map(acts.map((a) => [a.typeId, a.typeName])).entries()].map(([typeId, typeName]) => {
    const tIds = new Set(acts.filter((a) => a.typeId === typeId).map((a) => a.id));
    const marks = att.filter((x) => tIds.has(x.activityId));
    const withMarks = new Set(marks.map((x) => x.activityId)).size;
    const present = marks.filter((x) => x.status === "present").length;
    return {
      typeName,
      count: tIds.size,
      withMarks,
      avgPresent: withMarks ? present / withMarks : null,
      rate: marks.length ? present / marks.length : null,
    };
  });

  const reportByActivity = new Map(reportRows.map((r) => [r.activityId, r]));
  const dayRows = acts.map((a) => {
    const marks = att.filter((x) => x.activityId === a.id);
    const c = clean.filter((x) => x.activityId === a.id);
    return {
      ...a,
      present: marks.filter((x) => x.status === "present").length,
      excused: marks.filter((x) => x.status === "excused").length,
      absent: marks.filter((x) => x.status === "absent").length,
      cleaned: cleaningTally(c).done,
      cleaningChecks: cleaningTally(c).recorded,
      cleaningSlots: c.length,
      report: reportByActivity.get(a.id) ?? null,
    };
  });

  const totalMarks = att.length;
  const totals = {
    activities: acts.length,
    completed: acts.filter((a) => a.status === "completed").length,
    attendanceRate: totalMarks ? att.filter((x) => x.status === "present").length / totalMarks : null,
    cleaningRate: (() => {
      const { done, recorded } = cleaningTally(clean);
      return recorded ? done / recorded : null;
    })(),
    visitors: reportRows.reduce((s, r) => s + r.visitors, 0),
  };

  return { acts, memberRows, typeRows, dayRows, roleNames, totals };
}

export function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}
