"use client";

import { useEffect, useState } from "react";
import type { CleaningChoice as Choice } from "@/db/schema";

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "both", label: "Before & after" },
  { value: "before", label: "Before only" },
  { value: "after", label: "After only" },
  { value: "none", label: "No cleaning" },
];

/**
 * Picks which cleaning teams an event has. When `typeSelectId` is given, the
 * choice follows the event type (types with cleaning → before & after) until
 * the person picks something themselves.
 */
export function CleaningChoice({
  defaultValue,
  typeSelectId,
  typesWithCleaning = [],
}: {
  defaultValue: Choice;
  typeSelectId?: string;
  typesWithCleaning?: number[];
}) {
  const [value, setValue] = useState<Choice>(defaultValue);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!typeSelectId) return;
    const select = document.getElementById(typeSelectId) as HTMLSelectElement | null;
    if (!select) return;
    const follow = () => {
      if (!touched) setValue(typesWithCleaning.includes(Number(select.value)) ? "both" : "none");
    };
    select.addEventListener("change", follow);
    return () => select.removeEventListener("change", follow);
  }, [typeSelectId, typesWithCleaning, touched]);

  return (
    <fieldset>
      <legend className="label">Cleaning</legend>
      <input type="hidden" name="cleaning" value={value} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => {
              setValue(o.value);
              setTouched(true);
            }}
            className={`min-h-11 rounded-xl border px-2 text-sm font-medium ${
              value === o.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-card"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
