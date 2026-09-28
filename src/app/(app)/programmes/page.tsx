import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, programmes } from "@/db/schema";
import { createProgramme } from "@/app/actions/programmes";
import { SubmitButton } from "@/components/submit-button";
import { addDays, formatLong, todayISO, WEEKDAYS } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export default async function ProgrammesPage() {
  await requireAdmin();
  const [list, types] = await Promise.all([
    db
      .select({ programme: programmes, typeName: activityTypes.name })
      .from(programmes)
      .innerJoin(activityTypes, eq(programmes.activityTypeId, activityTypes.id))
      .orderBy(desc(programmes.startDate)),
    db.select().from(activityTypes).where(eq(activityTypes.archived, false)).orderBy(asc(activityTypes.name)),
  ]);

  const defaultType = types.find((t) => /prayer/i.test(t.name)) ?? types[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Programmes</h1>
        <p className="muted">
          A run of days, like &quot;92 Days of Prayer&quot;. Each day gets its own page for roles, cleaning and attendance.
        </p>
      </div>

      <section className="card">
        <h2 className="h2 mb-3">New programme</h2>
        <form action={createProgramme} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required placeholder="e.g. 92 Days of Prayer" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="startDate">Starts on</label>
              <input id="startDate" name="startDate" type="date" required defaultValue={addDays(todayISO(), 1)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="days">How many days</label>
              <input id="days" name="days" type="number" inputMode="numeric" min={1} max={400} required defaultValue={92} className="input" />
            </div>
          </div>
          <details className="rounded-xl border border-line px-4 py-3">
            <summary className="cursor-pointer text-muted">More options (meets every day as a {defaultType?.name ?? "meeting"})</summary>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="activityTypeId">Each day is a</label>
                  <select id="activityTypeId" name="activityTypeId" required defaultValue={defaultType?.id} className="input">
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.hasCleaning ? " (with cleaning)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="time">Time</label>
                  <input id="time" name="time" type="time" className="input" />
                </div>
              </div>
              <fieldset>
                <legend className="label">Days it meets</legend>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d, i) => (
                    <label key={d} className="cursor-pointer">
                      <input type="checkbox" name="weekdays" value={i} defaultChecked className="peer sr-only" />
                      <span className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">
                        {d.slice(0, 3)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>
          <SubmitButton className="btn-primary w-full sm:w-auto">Create programme</SubmitButton>
        </form>
      </section>

      <section className="card p-0 sm:p-0">
        <ul className="divide-y divide-line">
          {list.map(({ programme: p, typeName }) => (
            <li key={p.id}>
              <Link href={`/programmes/${p.id}`} className="block px-4 py-3 hover:bg-paper">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted">
                  {formatLong(p.startDate)} → {formatLong(addDays(p.startDate, p.days - 1))} · {p.days} days · {typeName}
                </div>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-muted">No programmes yet.</li>}
        </ul>
      </section>
    </div>
  );
}
