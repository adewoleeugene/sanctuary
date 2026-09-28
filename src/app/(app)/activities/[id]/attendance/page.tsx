import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attendance, cleaningAssignments, members, reports } from "@/db/schema";
import { saveReport } from "@/app/actions/activities";
import { AttendanceBoard, CleaningBoard } from "@/components/attendance-board";
import { SubmitButton } from "@/components/submit-button";
import { formatLong, formatShort, todayISO } from "@/lib/dates";
import { getActiveMembers, getActivitySheet } from "@/lib/queries";
import { canManageActivity, requireUser } from "@/lib/session";

export default async function AttendancePage({ params }: PageProps<"/activities/[id]/attendance">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const sheet = await getActivitySheet(id);
  if (!sheet) notFound();
  const { activity } = sheet;

  const canEdit =
    (await canManageActivity(user, id)) && (user.role === "admin" || activity.status !== "completed");
  const tooEarly = activity.date > todayISO();

  const activeMembers = await getActiveMembers();
  let marks = await db.select().from(attendance).where(eq(attendance.activityId, id));

  // First time attendance is opened on (or after) the day: everyone starts as
  // present and every cleaner as "cleaned", so only the exceptions need a tap.
  if (canEdit && !tooEarly && marks.length === 0 && activeMembers.length > 0) {
    await db
      .insert(attendance)
      .values(activeMembers.map((m) => ({ activityId: id, memberId: m.id, status: "present" as const })))
      .onConflictDoNothing();
    if (activity.cleaningShifts.includes("before")) {
      await db
        .update(cleaningAssignments)
        .set({ cleaned: "cleaned" })
        .where(and(eq(cleaningAssignments.activityId, id), isNull(cleaningAssignments.cleaned)));
    }
    if (activity.cleaningShifts.includes("after")) {
      await db
        .update(cleaningAssignments)
        .set({ cleanedAfter: "cleaned" })
        .where(and(eq(cleaningAssignments.activityId, id), isNull(cleaningAssignments.cleanedAfter)));
    }
    marks = await db.select().from(attendance).where(eq(attendance.activityId, id));
  }

  const [report] = await db.select().from(reports).where(eq(reports.activityId, id));
  const markBy = new Map(marks.map((m) => [m.memberId, m]));
  const formerNames = new Map(
    (await db.select({ id: members.id, name: members.fullName }).from(members)).map((m) => [m.id, m.name]),
  );
  // Active members first, then anyone marked who has since become inactive.
  const people = [
    ...activeMembers.map((m) => ({ id: m.id, name: m.fullName })),
    ...marks
      .filter((m) => !activeMembers.some((a) => a.id === m.memberId))
      .map((m) => ({ id: m.memberId, name: formerNames.get(m.memberId) ?? "Former member" })),
  ]
    .filter((p) => markBy.has(p.id))
    .map((p) => ({ memberId: p.id, name: p.name, status: markBy.get(p.id)!.status, note: markBy.get(p.id)!.note }));

  const slots = sheet.zones.flatMap((z) =>
    z.assignments.map((a) => ({
      id: a.id,
      name: a.member.fullName,
      zone: z.zone.name,
      before: a.cleaned !== "not_cleaned",
      after: a.cleanedAfter !== "not_cleaned",
    })),
  );

  return (
    <div className="space-y-4">
      <Link href={`/activities/${id}`} className="muted">‹ Back to the day</Link>
      <div>
        <h1 className="h1">Attendance</h1>
        <p className="text-base">
          {sheet.programmeName ? `${sheet.programmeName}${activity.dayNumber ? ` · Day ${activity.dayNumber}` : ""}` : sheet.typeName}
          {" · "}
          {formatShort(activity.date)}
        </p>
      </div>

      {!canEdit && (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">
          {activity.status === "completed"
            ? "This day is finished. Only an admin can change it."
            : "Only this day's coordinator or an admin can take attendance."}
        </p>
      )}

      {tooEarly && marks.length === 0 ? (
        <div className="card text-center">
          <p className="text-base">Attendance opens on the day.</p>
          <p className="muted">{formatLong(activity.date)}</p>
        </div>
      ) : (
        <>
          <section className="card">
            <AttendanceBoard activityId={id} people={people} canEdit={canEdit} />
          </section>

          {activity.hasCleaning && slots.length > 0 && (
            <section className="card space-y-3">
              <h2 className="h2">🧹 Did they clean?</h2>
              <CleaningBoard activityId={id} slots={slots} shifts={activity.cleaningShifts} canEdit={canEdit} />
            </section>
          )}

          <form action={saveReport} className="card space-y-4">
            <input type="hidden" name="activityId" value={id} />
            <h2 className="h2">Anything to report?</h2>
            <fieldset disabled={!canEdit} className="space-y-4">
              <div>
                <label className="label" htmlFor="comments">Comments for the leaders and pastor</label>
                <textarea
                  id="comments"
                  name="comments"
                  rows={3}
                  defaultValue={report?.comments ?? ""}
                  placeholder="Optional"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="visitors">Visitors</label>
                  <input
                    id="visitors"
                    name="visitors"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={report?.visitors ?? 0}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="scripture">Scripture</label>
                  <input
                    id="scripture"
                    name="scripture"
                    defaultValue={report?.scripture ?? activity.theme ?? ""}
                    placeholder="Optional"
                    className="input"
                  />
                </div>
              </div>
            </fieldset>
            {canEdit &&
              (activity.status === "completed" ? (
                <SubmitButton className="btn w-full">Save changes</SubmitButton>
              ) : (
                <SubmitButton name="intent" value="complete" className="btn-primary w-full">
                  ✓ Done, finish this day
                </SubmitButton>
              ))}
            {report?.completedAt && (
              <p className="muted text-center text-sm">
                Finished by {report.completedBy} on {report.completedAt.toISOString().slice(0, 10)}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
