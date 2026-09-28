import type { CleanedStatus } from "@/db/schema";

type Checks = { cleaned: CleanedStatus | null; cleanedAfter: CleanedStatus | null };

/** Each recorded cleaning time (before / after) counts once. */
export function cleaningTally(rows: Checks[]) {
  const marks = rows.flatMap((r) => [r.cleaned, r.cleanedAfter]).filter((m) => m !== null);
  const done = marks.filter((m) => m === "cleaned").length;
  return { done, missed: marks.length - done, recorded: marks.length };
}

/** "Cleaned", "Missed after", "Did not clean" or "—" for one person's slot. */
export function cleaningOutcome(r: Checks) {
  const missed = [r.cleaned === "not_cleaned" && "before", r.cleanedAfter === "not_cleaned" && "after"].filter(Boolean);
  if (missed.length === 2) return { text: "Did not clean", tone: "bad" as const };
  if (missed.length === 1) return { text: `Missed ${missed[0]}`, tone: "bad" as const };
  if (r.cleaned === "cleaned" || r.cleanedAfter === "cleaned") return { text: "Cleaned", tone: "good" as const };
  return { text: "—", tone: "muted" as const };
}
