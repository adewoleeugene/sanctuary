import type { ActivityType, Member } from "@/db/schema";
import { createActivity } from "@/app/actions/activities";
import { addDays, todayISO, weekdayOf } from "@/lib/dates";
import { CleaningChoice } from "./cleaning-choice";
import { EventDatePicker } from "./event-date-picker";
import { SubmitButton } from "./submit-button";

// Our regular service days: Wednesday, Friday and Sunday.
const SERVICE_DAYS = [
  { weekday: 3, label: "Wed" },
  { weekday: 5, label: "Fri" },
  { weekday: 0, label: "Sun" },
];

// Services end at 1:30 pm. Sierra Leone is on GMT all year, so UTC works.
const SERVICE_END_MINUTES = 13 * 60 + 30;

/**
 * The next date for each regular service day. Today counts until the
 * service has ended; after 1:30 pm it moves to the same day next week.
 */
function nextServiceDays() {
  const now = new Date();
  const today = todayISO();
  const over = now.getUTCHours() * 60 + now.getUTCMinutes() >= SERVICE_END_MINUTES;
  return SERVICE_DAYS.map(({ weekday, label }) => {
    let offset = (weekday - weekdayOf(today) + 7) % 7;
    if (offset === 0 && over) offset = 7;
    return { label, date: addDays(today, offset) };
  });
}

/** Short "new event" form: what, when, and optionally who coordinates. */
export function NewEventForm({
  types,
  members,
  label = "+ New event",
}: {
  types: ActivityType[];
  members: Member[];
  label?: string;
}) {
  const picks = nextServiceDays().sort((a, b) => a.date.localeCompare(b.date));
  const service = types.find((t) => t.name.toLowerCase() === "service");
  return (
    <details className="card group">
      <summary className="cursor-pointer list-none font-semibold text-brand">
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">New event</span>
      </summary>
      <form action={createActivity} className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="new-type">What is it?</label>
          <select id="new-type" name="activityTypeId" required defaultValue={service?.id} className="input">
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <EventDatePicker
          picks={picks}
          defaultDate={picks[0].date}
          serviceTypeId={service?.id ?? null}
          typeSelectId="new-type"
        />
        <CleaningChoice
          defaultValue={(service ?? types[0])?.hasCleaning ? "both" : "none"}
          typeSelectId="new-type"
          typesWithCleaning={types.filter((t) => t.hasCleaning).map((t) => t.id)}
        />
        <div>
          <label className="label" htmlFor="new-time">Time (optional)</label>
          <input id="new-time" name="time" type="time" className="input" />
        </div>
        <fieldset>
          <legend className="label">Coordinator (optional, pick one or both)</legend>
          <div className="flex flex-wrap gap-2">
            {members
              .filter((m) => m.canCoordinate)
              .map((m) => (
                <label key={m.id} className="cursor-pointer">
                  <input type="checkbox" name="coordinatorIds" value={m.id} className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-muted peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
                    {m.fullName}
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="new-theme">Theme or scripture (optional)</label>
          <input id="new-theme" name="theme" className="input" />
        </div>
        <SubmitButton className="btn-primary w-full">Create event</SubmitButton>
      </form>
    </details>
  );
}
