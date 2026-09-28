import type { Member } from "@/db/schema";
import { MONTHS } from "@/lib/dates";
import { SubmitButton } from "./submit-button";

export function MemberForm({
  action,
  member,
}: {
  action: (fd: FormData) => Promise<void>;
  member?: Member;
}) {
  return (
    <form action={action} className="card space-y-4">
      {member && <input type="hidden" name="id" value={member.id} />}
      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" required defaultValue={member?.fullName} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Phone (WhatsApp)</label>
          <input id="phone" name="phone" type="tel" defaultValue={member?.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="gender">Gender</label>
          <select id="gender" name="gender" defaultValue={member?.gender ?? ""} className="input">
            <option value="">Not recorded</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Birthday</legend>
        <div className="grid grid-cols-3 gap-2">
          <input
            name="birthDay"
            type="number"
            min={1}
            max={31}
            placeholder="Day"
            aria-label="Birth day"
            defaultValue={member?.birthDay ?? ""}
            className="input"
          />
          <select name="birthMonth" aria-label="Birth month" defaultValue={member?.birthMonth ?? ""} className="input">
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            name="birthYear"
            type="number"
            min={1900}
            max={2100}
            placeholder="Year (optional)"
            aria-label="Birth year"
            defaultValue={member?.birthYear ?? ""}
            className="input"
          />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canClean" defaultChecked={member?.canClean ?? true} />
          Include in cleaning rotation
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canCoordinate" defaultChecked={member?.canCoordinate ?? false} />
          Can coordinate services
        </label>
        {member && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={member.active} />
            Active member
          </label>
        )}
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={member?.notes ?? ""} className="input" />
      </div>
      <SubmitButton>{member ? "Save changes" : "Add member"}</SubmitButton>
    </form>
  );
}
