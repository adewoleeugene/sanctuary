"use client";

import { useFormStatus } from "react-dom";

type Option = { value: number | string; label: string };

function Select({
  options,
  value,
  placeholder,
  clearLabel,
  label,
  className,
}: {
  options: Option[];
  value: number | string | null;
  placeholder: string;
  clearLabel?: string;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      name="memberId"
      aria-label={label}
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`input ${pending ? "opacity-50" : ""} ${className ?? ""}`}
    >
      <option value="" disabled={!clearLabel}>
        {value ? clearLabel : placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A dropdown that saves as soon as a new person is picked. */
export function PickSelect({
  action,
  hidden,
  ...props
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string | number | null | undefined>;
  options: Option[];
  value: number | string | null;
  placeholder: string;
  clearLabel?: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={action} className="min-w-0 flex-1">
      {Object.entries(hidden).map(([k, v]) =>
        v === null || v === undefined ? null : <input key={k} type="hidden" name={k} value={v} />,
      )}
      <Select {...props} />
    </form>
  );
}
