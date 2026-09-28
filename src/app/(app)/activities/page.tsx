import Link from "next/link";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes, programmes } from "@/db/schema";
import { StatusPill } from "@/components/status-pill";
import { NewEventForm } from "@/components/new-event-form";
import { formatLong, todayISO } from "@/lib/dates";
import { coordinatedBy, coordinatorNamesSql, getActiveMembers } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export default async function ActivitiesPage({ searchParams }: PageProps<"/activities">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const { view } = await searchParams;
  const past = view === "past";
  const today = todayISO();

  const rows = await db
    .select({
      id: activities.id,
      date: activities.date,
      time: activities.time,
      status: activities.status,
      theme: activities.theme,
      dayNumber: activities.dayNumber,
      hasCleaning: activities.hasCleaning,
      mine: user.memberId ? coordinatedBy(user.memberId).mapWith(Boolean) : sql<boolean>`false`,
      typeName: activityTypes.name,
      programmeName: programmes.name,
      coordinator: coordinatorNamesSql,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .leftJoin(programmes, eq(activities.programmeId, programmes.id))
    .where(past ? lt(activities.date, today) : and(gte(activities.date, today)))
    .orderBy(past ? desc(activities.date) : asc(activities.date), asc(activities.time))
    .limit(past ? 100 : 60);

  const [types, activeMembers] = isAdmin
    ? await Promise.all([
        db.select().from(activityTypes).where(eq(activityTypes.archived, false)).orderBy(asc(activityTypes.name)),
        getActiveMembers(),
      ])
    : [[], []];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="h1">Services</h1>
          <p className="muted">Services, evangelism, prayer meetings and programme days.</p>
        </div>
        <div className="flex rounded-lg border border-line bg-card p-0.5 text-sm">
          <Link href="/activities" className={`rounded-md px-3 py-1 ${!past ? "bg-brand-soft font-medium text-brand" : "text-muted"}`}>
            Upcoming
          </Link>
          <Link href="/activities?view=past" className={`rounded-md px-3 py-1 ${past ? "bg-brand-soft font-medium text-brand" : "text-muted"}`}>
            Past
          </Link>
        </div>
      </div>

      {isAdmin && <NewEventForm types={types} members={activeMembers} />}

      <div className="card p-0 sm:p-0">
        <ul className="divide-y divide-line">
          {rows.map((a) => {
            const mine = a.mine;
            return (
              <li key={a.id}>
                <Link href={`/activities/${a.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {formatLong(a.date)}
                      {a.time && <span className="text-muted"> · {a.time}</span>}
                    </div>
                    <div className="text-sm">
                      {a.typeName}
                      {a.programmeName && (
                        <span className="text-muted">
                          {" "}
                          · {a.programmeName}
                          {a.dayNumber ? ` Day ${a.dayNumber}` : ""}
                        </span>
                      )}
                      {a.hasCleaning && <span className="text-muted"> · 🧹</span>}
                    </div>
                    <div className="text-xs text-muted">
                      Coordinator: {a.coordinator ?? "not assigned"}
                      {mine && <span className="ml-1 font-medium text-brand">(you)</span>}
                    </div>
                  </div>
                  <StatusPill status={a.status} />
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-muted">
              {past ? "No past activities yet." : "Nothing scheduled. Create a programme or a one-off activity."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
