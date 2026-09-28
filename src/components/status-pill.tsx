import type { ActivityStatus } from "@/db/schema";

const STYLES: Record<ActivityStatus, string> = {
  draft: "bg-warn-soft text-warn",
  published: "bg-brand-soft text-brand",
  completed: "bg-good-soft text-good",
};

const LABELS: Record<ActivityStatus, string> = {
  draft: "Draft",
  published: "Shared",
  completed: "Completed",
};

export function StatusPill({ status }: { status: ActivityStatus }) {
  return <span className={`pill ${STYLES[status]}`}>{LABELS[status]}</span>;
}
