import { toggleCoordinator } from "@/app/actions/activities";
import type { Member } from "@/db/schema";
import { SubmitButton } from "./submit-button";

/**
 * One pill per person who can coordinate. Admins tap to add or remove; one,
 * both or nobody can be selected. Everyone else just sees the names.
 */
export function CoordinatorPills({
  activityId,
  candidates,
  selectedIds,
  canEdit,
  size = "md",
}: {
  activityId: number;
  candidates: Member[];
  selectedIds: number[];
  canEdit: boolean;
  size?: "sm" | "md";
}) {
  const selected = new Set(selectedIds);
  if (!canEdit) {
    const names = candidates.filter((m) => selected.has(m.id)).map((m) => m.fullName);
    return <span className="font-medium">{names.join(" & ") || "Not chosen yet"}</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {candidates.map((m) => {
        const on = selected.has(m.id);
        return (
          <form key={m.id} action={toggleCoordinator}>
            <input type="hidden" name="activityId" value={activityId} />
            <input type="hidden" name="memberId" value={m.id} />
            {!on && <input type="hidden" name="on" value="1" />}
            <SubmitButton
              className={`rounded-full border font-medium ${size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-sm"} ${
                on ? "border-brand bg-brand text-white" : "border-line bg-card text-muted"
              }`}
            >
              {on ? `✓ ${m.fullName}` : m.fullName}
            </SubmitButton>
          </form>
        );
      })}
    </div>
  );
}
