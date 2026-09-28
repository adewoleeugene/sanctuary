"use client";

import { useState } from "react";

export type QuickPick = { label: string; date: string };

/**
 * Date field with one-tap buttons for the usual service days. Picking one
 * also switches the "What is it?" select to Service, if there is one.
 */
export function EventDatePicker({
  picks,
  defaultDate,
  serviceTypeId,
  typeSelectId,
}: {
  picks: QuickPick[];
  defaultDate: string;
  serviceTypeId: number | null;
  typeSelectId: string;
}) {
  const [date, setDate] = useState(defaultDate);

  function pick(p: QuickPick) {
    setDate(p.date);
    if (serviceTypeId) {
      const select = document.getElementById(typeSelectId) as HTMLSelectElement | null;
      if (select && select.value !== String(serviceTypeId)) {
        select.value = String(serviceTypeId);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  return (
    <div className="space-y-2">
      <span className="label">When?</span>
      <div className="grid grid-cols-3 gap-2">
        {picks.map((p) => (
          <button
            key={p.date}
            type="button"
            onClick={() => pick(p)}
            aria-pressed={date === p.date}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 text-center ${
              date === p.date ? "border-brand bg-brand-soft text-brand" : "border-line bg-card"
            }`}
          >
            <span className="text-base font-semibold">{p.label}</span>
            <span className="text-xs">{formatPick(p.date)}</span>
          </button>
        ))}
      </div>
      <input
        name="date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Or choose another date"
        className="input"
      />
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPick(iso: string) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}
