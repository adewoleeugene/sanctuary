"use client";

import { useState, useTransition } from "react";
import { setAttendanceMark, setCleaned } from "@/app/actions/activities";
import type { AttendanceStatus, CleaningShift } from "@/db/schema";

const NEXT: Record<AttendanceStatus, AttendanceStatus> = {
  present: "absent",
  absent: "excused",
  excused: "present",
};

const LOOK: Record<AttendanceStatus, { label: string; cls: string; dot: string }> = {
  present: { label: "Present", cls: "border-good/30 bg-good-soft", dot: "bg-good" },
  absent: { label: "Absent", cls: "border-bad/30 bg-bad-soft", dot: "bg-bad" },
  excused: { label: "Excused", cls: "border-warn/30 bg-warn-soft", dot: "bg-warn" },
};

type Person = { memberId: number; name: string; status: AttendanceStatus; note: string | null };

export function AttendanceBoard({
  activityId,
  people,
  canEdit,
}: {
  activityId: number;
  people: Person[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(people);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(memberId: number, status: AttendanceStatus, note: string | null) {
    setRows((r) => r.map((p) => (p.memberId === memberId ? { ...p, status, note } : p)));
    startTransition(async () => {
      try {
        await setAttendanceMark(activityId, memberId, status, note);
        setError(null);
      } catch {
        setError("Couldn't save. Check your connection and tap again.");
      }
    });
  }

  const counts = { present: 0, absent: 0, excused: 0 };
  for (const r of rows) counts[r.status]++;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {(["present", "absent", "excused"] as const).map((s) => (
          <div key={s} className={`rounded-xl border px-2 py-2 ${LOOK[s].cls}`}>
            <div className="text-2xl font-semibold">{counts[s]}</div>
            <div className="text-sm">{LOOK[s].label}</div>
          </div>
        ))}
      </div>
      {canEdit && <p className="muted">Tap a name to change it: Present → Absent → Excused. It saves by itself.</p>}
      {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.memberId} className={`rounded-xl border ${LOOK[p.status].cls}`}>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => save(p.memberId, NEXT[p.status], p.note)}
              className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${LOOK[p.status].dot}`} />
              <span className="flex-1 text-base font-medium">{p.name}</span>
              <span className="text-sm">{LOOK[p.status].label}</span>
            </button>
            {p.status === "excused" && (
              <input
                defaultValue={p.note ?? ""}
                disabled={!canEdit}
                placeholder="Reason (optional)"
                aria-label={`Reason for ${p.name}`}
                onBlur={(e) => {
                  if (e.target.value !== (p.note ?? "")) save(p.memberId, "excused", e.target.value);
                }}
                className="input mx-auto mb-3 block w-[calc(100%-2rem)] bg-white/70"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Slot = { id: number; name: string; zone: string; before: boolean; after: boolean };

export function CleaningBoard({
  activityId,
  slots,
  shifts,
  canEdit,
}: {
  activityId: number;
  slots: Slot[];
  shifts: CleaningShift[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(slots);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: number, shift: CleaningShift) {
    const next = !rows.find((r) => r.id === id)![shift];
    setRows((r) => r.map((s) => (s.id === id ? { ...s, [shift]: next } : s)));
    startTransition(async () => {
      try {
        await setCleaned(activityId, id, shift, next);
        setError(null);
      } catch {
        setError("Couldn't save. Check your connection and tap again.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {canEdit && (
        <p className="muted">
          Everyone is marked as cleaned. Tap {shifts.length > 1 ? "Before or After" : "anyone"} for anyone who didn&apos;t.
        </p>
      )}
      {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-4 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">{s.name}</span>
              <span className="block text-sm text-muted">{s.zone}</span>
            </span>
            <span className="flex gap-2">
              {shifts.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(s.id, shift)}
                  aria-pressed={s[shift]}
                  aria-label={`${s.name} ${shift === "before" ? "before" : "after"} service: ${s[shift] ? "cleaned" : "didn't clean"}`}
                  className={`min-h-11 min-w-24 rounded-xl border px-3 text-sm font-medium ${
                    s[shift] ? "border-good/30 bg-good-soft text-good" : "border-bad/30 bg-bad-soft text-bad"
                  }`}
                >
                  {shifts.length > 1 ? (shift === "before" ? "Before " : "After ") : ""}
                  {s[shift] ? "✓" : "✕ missed"}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
