import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityTypes,
  attendance,
  cleaningAssignments,
  cleaningZones,
  members,
  roleAssignments,
  roles,
} from "@/db/schema";
import { updateMember } from "@/app/actions/members";
import { MemberForm } from "@/components/member-form";
import { cleaningOutcome, cleaningTally } from "@/lib/cleaning";
import { formatBirthday, formatShort } from "@/lib/dates";
import { requireUser } from "@/lib/session";

const ATTENDANCE_LABEL = { present: "Present", excused: "Absent (excused)", absent: "Absent" } as const;

export default async function MemberPage({ params }: PageProps<"/members/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) notFound();

  const [att, cleaning, roleRows] = await Promise.all([
    db
      .select({ status: attendance.status, note: attendance.note, date: activities.date, type: activityTypes.name, activityId: activities.id })
      .from(attendance)
      .innerJoin(activities, eq(attendance.activityId, activities.id))
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(eq(attendance.memberId, id))
      .orderBy(desc(activities.date)),
    db
      .select({ zone: cleaningZones.name, cleaned: cleaningAssignments.cleaned, cleanedAfter: cleaningAssignments.cleanedAfter, date: activities.date, activityId: activities.id })
      .from(cleaningAssignments)
      .innerJoin(activities, eq(cleaningAssignments.activityId, activities.id))
      .innerJoin(cleaningZones, eq(cleaningAssignments.zoneId, cleaningZones.id))
      .where(eq(cleaningAssignments.memberId, id))
      .orderBy(desc(activities.date)),
    db
      .select({ role: roles.name, date: activities.date, activityId: activities.id })
      .from(roleAssignments)
      .innerJoin(activities, eq(roleAssignments.activityId, activities.id))
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.memberId, id))
      .orderBy(desc(activities.date)),
  ]);

  const present = att.filter((a) => a.status === "present").length;
  const excused = att.filter((a) => a.status === "excused").length;
  const absent = att.filter((a) => a.status === "absent").length;
  const { done: cleanedDone, missed: cleanedMissed } = cleaningTally(cleaning);

  const stats = [
    { label: "Attendance rate", value: att.length ? `${Math.round((present / att.length) * 100)}%` : "—" },
    { label: "Present", value: present },
    { label: "Absent (excused)", value: excused },
    { label: "Absent (no excuse)", value: absent },
    { label: "Cleaning done", value: `${cleanedDone} of ${cleanedDone + cleanedMissed}` },
    { label: "Roles served", value: roleRows.length },
  ];

  return (
    <div className="space-y-5">
      <Link href="/members" className="muted">← Members</Link>
      <div>
        <h1 className="h1">{member.fullName}</h1>
        <p className="muted">
          {member.active ? "Active" : "Inactive"}
          {member.birthDay && member.birthMonth && ` · Birthday ${formatBirthday(member.birthDay, member.birthMonth)}`}
          {member.phone && ` · ${member.phone}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-3 sm:p-3">
            <div className="text-lg font-semibold">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card">
          <h2 className="h2 mb-2">Attendance</h2>
          <ul className="space-y-1 text-sm">
            {att.slice(0, 15).map((a) => (
              <li key={a.activityId} className="flex gap-2">
                <Link href={`/activities/${a.activityId}`} className="w-20 shrink-0 text-brand">{formatShort(a.date)}</Link>
                <span className="flex-1 truncate text-muted">{a.type}</span>
                <span className={a.status === "present" ? "text-good" : a.status === "excused" ? "text-warn" : "text-bad"}>
                  {ATTENDANCE_LABEL[a.status]}
                </span>
              </li>
            ))}
            {att.length === 0 && <li className="muted">No attendance recorded yet.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 mb-2">Cleaning</h2>
          <ul className="space-y-1 text-sm">
            {cleaning.slice(0, 15).map((c) => (
              <li key={c.activityId} className="flex gap-2">
                <Link href={`/activities/${c.activityId}`} className="w-20 shrink-0 text-brand">{formatShort(c.date)}</Link>
                <span className="flex-1 truncate text-muted">{c.zone}</span>
                <span className={`text-${cleaningOutcome(c).tone}`}>
                  {cleaningOutcome(c).text}
                </span>
              </li>
            ))}
            {cleaning.length === 0 && <li className="muted">No cleaning duties yet.</li>}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2 mb-2">Roles</h2>
          <ul className="space-y-1 text-sm">
            {roleRows.slice(0, 15).map((r, i) => (
              <li key={i} className="flex gap-2">
                <Link href={`/activities/${r.activityId}`} className="w-20 shrink-0 text-brand">{formatShort(r.date)}</Link>
                <span className="flex-1 truncate">{r.role}</span>
              </li>
            ))}
            {roleRows.length === 0 && <li className="muted">No roles yet.</li>}
          </ul>
        </section>
      </div>

      {user.role === "admin" && (
        <section className="max-w-xl space-y-2">
          <h2 className="h2">Edit details</h2>
          <MemberForm action={updateMember} member={member} />
        </section>
      )}
    </div>
  );
}
