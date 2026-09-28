import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, programmes } from "@/db/schema";
import { PrintButton } from "@/components/print-button";
import { formatLong, formatShort } from "@/lib/dates";
import { buildSummary, filtersToQuery, parseFilters, pct } from "@/lib/reports";
import { requireUser } from "@/lib/session";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireUser();
  const filters = parseFilters(await searchParams);
  const [summary, programmeList, typeList] = await Promise.all([
    buildSummary(filters),
    db.select().from(programmes).orderBy(desc(programmes.startDate)),
    db.select().from(activityTypes).orderBy(asc(activityTypes.name)),
  ]);
  const { totals, memberRows, typeRows, dayRows, roleNames } = summary;
  const programme = programmeList.find((p) => p.id === filters.programmeId);
  const withComments = dayRows.filter((d) => d.report?.comments || d.report?.scripture);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="h1">Reports</h1>
          <p className="muted">
            {programme ? programme.name : `${formatLong(filters.from)} → ${formatLong(filters.to)}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href={`/api/export?${filtersToQuery(filters)}`} className="btn">⬇ CSV</a>
          <PrintButton />
        </div>
      </div>

      <form className="card grid gap-3 sm:grid-cols-5 print:hidden">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="programme">Programme</label>
          <select id="programme" name="programme" defaultValue={filters.programmeId ?? ""} className="input">
            <option value="">Any (use dates)</option>
            {programmeList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={filters.typeId ?? ""} className="input">
            <option value="">All types</option>
            {typeList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Apply</button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Activities", value: totals.activities },
          { label: "Reports completed", value: `${totals.completed}/${totals.activities}` },
          { label: "Attendance rate", value: pct(totals.attendanceRate) },
          { label: "Cleaning done", value: pct(totals.cleaningRate) },
          { label: "Visitors", value: totals.visitors },
        ].map((s) => (
          <div key={s.label} className="card p-3 sm:p-3">
            <div className="text-xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {typeRows.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="h2 mb-2">By activity type</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Activities</th>
                <th>Avg. present</th>
                <th>Attendance rate</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map((t) => (
                <tr key={t.typeName}>
                  <td className="font-medium">{t.typeName}</td>
                  <td>{t.count}</td>
                  <td>{t.avgPresent === null ? "—" : t.avgPresent.toFixed(1)}</td>
                  <td>{pct(t.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="h2 mb-2">By member</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Present</th>
              <th>Excused</th>
              <th>Absent</th>
              <th>Rate</th>
              <th>Cleaned</th>
              {roleNames.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberRows.map((r) => (
              <tr key={r.member.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/members/${r.member.id}`} className="font-medium text-brand">{r.member.fullName}</Link>
                </td>
                <td className="text-good">{r.present}</td>
                <td className="text-warn">{r.excused}</td>
                <td className="text-bad">{r.absent}</td>
                <td>{pct(r.rate)}</td>
                <td>
                  {r.cleaned + r.notCleaned ? `${r.cleaned}/${r.cleaned + r.notCleaned}` : "—"}
                  {r.notCleaned > 0 && <span className="text-bad"> ({r.notCleaned} missed)</span>}
                </td>
                {roleNames.map((role) => (
                  <td key={role}>{r.roles[role] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h2 mb-2">By day</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity</th>
              <th>Present</th>
              <th>Excused</th>
              <th>Absent</th>
              <th>Cleaning</th>
              <th>Visitors</th>
            </tr>
          </thead>
          <tbody>
            {dayRows.map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/activities/${d.id}`} className="text-brand">{formatShort(d.date)}</Link>
                </td>
                <td>
                  {d.typeName}
                  {d.programmeName && <span className="text-muted"> · Day {d.dayNumber}</span>}
                </td>
                <td>{d.present}</td>
                <td>{d.excused}</td>
                <td>{d.absent}</td>
                <td>{d.cleaningChecks ? `${d.cleaned}/${d.cleaningChecks}` : "—"}</td>
                <td>{d.report?.visitors ?? "—"}</td>
              </tr>
            ))}
            {dayRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">No activities in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {withComments.length > 0 && (
        <section className="card space-y-3">
          <h2 className="h2">Comments from reports</h2>
          {withComments.map((d) => (
            <div key={d.id} className="border-l-2 border-brand/40 pl-3">
              <div className="text-sm font-medium">
                {formatLong(d.date)} · {d.typeName}
              </div>
              {d.report?.scripture && <div className="text-sm text-muted">📖 {d.report.scripture}</div>}
              {d.report?.comments && <p className="mt-1 whitespace-pre-line text-sm">{d.report.comments}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
