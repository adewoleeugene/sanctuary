import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityCoordinators, activityTypes, programmes } from "@/db/schema";
import { deleteProgramme, regenerateProgrammeCleaning } from "@/app/actions/programmes";
import { CoordinatorPills } from "@/components/coordinator-pills";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { addDays, formatLong, formatShort, WEEKDAYS } from "@/lib/dates";
import { getActiveMembers } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export default async function ProgrammePage({ params }: PageProps<"/programmes/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const [programme] = await db.select().from(programmes).where(eq(programmes.id, id));
  if (!programme) notFound();

  const [days, activeMembers, coordinatorRows] = await Promise.all([
    db
      .select({ activity: activities, typeName: activityTypes.name })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
      .where(eq(activities.programmeId, id))
      .orderBy(asc(activities.date)),
    getActiveMembers(),
    db
      .select({ activityId: activityCoordinators.activityId, memberId: activityCoordinators.memberId })
      .from(activityCoordinators)
      .innerJoin(activities, eq(activityCoordinators.activityId, activities.id))
      .where(eq(activities.programmeId, id)),
  ]);

  const coordinatorsByDay = new Map<number, number[]>();
  for (const c of coordinatorRows) {
    coordinatorsByDay.set(c.activityId, [...(coordinatorsByDay.get(c.activityId) ?? []), c.memberId]);
  }
  const end = addDays(programme.startDate, programme.days - 1);
  const unassigned = days.filter((d) => !coordinatorsByDay.has(d.activity.id)).length;

  return (
    <div className="space-y-5">
      <Link href="/programmes" className="muted">← Programmes</Link>
      <div>
        <h1 className="h1">{programme.name}</h1>
        <p className="muted">
          {formatLong(programme.startDate)} → {formatLong(end)} · {days.length} meeting days ·{" "}
          {programme.weekdays.length === 7 ? "every day" : programme.weekdays.map((w) => WEEKDAYS[w].slice(0, 3)).join(", ")}
        </p>
      </div>

      <section className="card flex flex-wrap gap-2">
        <a href={`/api/pdf?programme=${id}`} className="btn-primary" target="_blank" rel="noopener">
          ⬇ PDF of all days
        </a>
        <form action={regenerateProgrammeCleaning}>
          <input type="hidden" name="programmeId" value={id} />
          <SubmitButton className="btn">↻ Shuffle cleaning for all days</SubmitButton>
        </form>
        <a href={`/reports?programme=${id}`} className="btn">
          ▤ Programme report
        </a>
      </section>

      <section className="card space-y-3 p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          <h2 className="h2 flex-1">Coordinators</h2>
          {unassigned > 0 && <span className="pill bg-warn-soft text-warn">{unassigned} days need a coordinator</span>}
        </div>
        <p className="muted px-4">Tap a name to add or remove them. Both can be picked for the same day.</p>
        <ul className="divide-y divide-line border-t border-line">
          {days.map(({ activity: a, typeName }) => {
            const selectedIds = coordinatorsByDay.get(a.id) ?? [];
            return (
              <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <Link href={`/activities/${a.id}`} className="flex min-w-0 items-center gap-3 sm:w-64 sm:shrink-0">
                  <span className="w-14 shrink-0 font-semibold text-brand">Day {a.dayNumber ?? "—"}</span>
                  <span className="min-w-0">
                    <span className="block">{formatShort(a.date)}</span>
                    <span className="block text-xs text-muted">{typeName}</span>
                  </span>
                  <span className="ml-auto sm:hidden">
                    <StatusPill status={a.status} />
                  </span>
                </Link>
                <div className="flex-1">
                  <CoordinatorPills
                    activityId={a.id}
                    candidates={activeMembers.filter((m) => m.canCoordinate || selectedIds.includes(m.id))}
                    selectedIds={selectedIds}
                    canEdit
                    size="sm"
                  />
                </div>
                <span className="hidden sm:block">
                  <StatusPill status={a.status} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <form action={deleteProgramme}>
        <input type="hidden" name="programmeId" value={id} />
        <SubmitButton className="btn-danger" confirm={`Delete "${programme.name}" and all ${days.length} of its days, including attendance and reports?`} confirmLabel="Yes, delete programme">
          Delete programme
        </SubmitButton>
      </form>
    </div>
  );
}
