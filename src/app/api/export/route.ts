import { buildSummary, parseFilters } from "@/lib/reports";
import { getSessionUser } from "@/lib/session";

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.role) return new Response("Unauthorized", { status: 401 });

  const filters = parseFilters(Object.fromEntries(new URL(request.url).searchParams));
  const { memberRows, roleNames } = await buildSummary(filters);

  const header = [
    "Member",
    "Present",
    "Absent (excused)",
    "Absent (no excuse)",
    "Attendance rate %",
    "Cleaning assigned",
    "Cleaned",
    "Did not clean",
    ...roleNames,
  ];
  const lines = [header, ...memberRows.map((r) => [
    r.member.fullName,
    r.present,
    r.excused,
    r.absent,
    r.rate === null ? "" : Math.round(r.rate * 100),
    r.cleaningAssigned,
    r.cleaned,
    r.notCleaned,
    ...roleNames.map((role) => r.roles[role] ?? 0),
  ])];

  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sanctuary-report-${filters.from}-to-${filters.to}.csv"`,
    },
  });
}
