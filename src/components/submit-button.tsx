"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button. With `confirm`, the first tap shows the warning with
 * "Yes, delete" / "Cancel" on the page (browser pop-ups are blocked in some
 * phone and in-app browsers), and only the second tap submits.
 */
export function SubmitButton({
  children,
  className = "btn-primary",
  name,
  value,
  confirm,
  confirmLabel = "Yes, delete",
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
  confirmLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [asking, setAsking] = useState(false);

  if (confirm && asking) {
    return (
      <div role="alertdialog" aria-label={confirm} className="w-full rounded-xl border border-bad/40 bg-bad-soft p-3 text-left">
        <p className="text-sm font-medium text-bad">{confirm}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" name={name} value={value} disabled={pending} className="btn-danger bg-bad text-white hover:bg-bad hover:opacity-90">
            {pending ? "Deleting…" : confirmLabel}
          </button>
          <button type="button" disabled={pending} onClick={() => setAsking(false)} className="btn">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type={confirm ? "button" : "submit"}
      name={confirm ? undefined : name}
      value={confirm ? undefined : value}
      disabled={pending}
      className={className}
      onClick={confirm ? () => setAsking(true) : undefined}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
