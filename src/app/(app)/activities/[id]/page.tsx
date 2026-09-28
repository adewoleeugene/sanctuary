import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityTypes,
  attendance,
  cleaningChoiceOf,
  cleaningTimesLabel,
  roleAssignments,
  roles,
} from "@/db/schema";
import {
  deleteActivity,
  regenerateCleaning,
  setCleaner,
  setRolePerson,
  suggestRoles,
  toggleActivityRole,
  updateActivity,
} from "@/app/actions/activities";
import { CleaningChoice } from "@/components/cleaning-choice";
import { CoordinatorPills } from "@/components/coordinator-pills";
import { PickSelect } from "@/components/pick-select";
import { ShareButtons } from "@/components/share-buttons";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { formatLong, formatShort, todayISO } from "@/lib/dates";
import { getActiveMembers, getActivitySheet } from "@/lib/queries";
import { canManageActivity, requireUser } from "@/lib/session";
import { activityWhatsAppText, dutiesByMember, reminderText } from "@/lib/share-text";
import { whatsAppLink } from "@/lib/whatsapp";

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="step">{n}</span>
        <div className="flex-1">
          <h2 className="h2 leading-7">{title}</h2>
          {hint && <p className="muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Slot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <div className="text-sm font-medium text-muted sm:w-44 sm:shrink-0">{label}</div>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}

export default async function ActivityPage({ params, searchParams }: PageProps<"/activities/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const openReminders = (await searchParams).remind === "1";
  const sheet = await getActivitySheet(id);
  if (!sheet) notFound();

  const { activity } = sheet;
  const isAdmin = user.role === "admin";
  const canEdit = await canManageActivity(user, id);

  const [activeMembers, allRoles, types, roleHistory, marks] = await Promise.all([
    getActiveMembers(),
    db.select().from(roles).where(eq(roles.archived, false)).orderBy(asc(roles.sortOrder), asc(roles.name)),
    db.select().from(activityTypes).orderBy(asc(activityTypes.name)),
    // When each member last did each role, shown in the picker to keep turns fair.
    db
      .select({ roleId: roleAssignments.roleId, memberId: roleAssignments.memberId, date: activities.date })
      .from(roleAssignments)
      .innerJoin(activities, eq(roleAssignments.activityId, activities.id))
      .where(lt(activities.date, activity.date))
      .orderBy(asc(activities.date)),
    db.select({ status: attendance.status }).from(attendance).where(eq(attendance.activityId, id)),
  ]);

  const lastDid = new Map<string, string>();
  for (const h of roleHistory) lastDid.set(`${h.roleId}:${h.memberId}`, h.date);
  const enabledRoleIds = new Set(sheet.roles.map((r) => r.role.id));
  const emptyRoleSlots = sheet.roles.reduce((n, r) => n + Math.max(0, r.role.peopleNeeded - r.slots.length), 0);
  const duties = dutiesByMember(sheet);
  const isPast = activity.date <= todayISO();
  const shareText = activityWhatsAppText(sheet);

  // Members allowed to coordinate, plus anyone already coordinating this day.
  const coordinatorIds = sheet.coordinators.map((c) => c.id);
  const coordinatorCandidates = activeMembers.filter((m) => m.canCoordinate || coordinatorIds.includes(m.id));
  const roleOptions = (roleId: number) =>
    activeMembers.map((m) => {
      const last = lastDid.get(`${roleId}:${m.id}`);
      return { value: m.id, label: `${m.fullName} · ${last ? `last ${formatShort(last)}` : "not yet"}` };
    });
  const cleanerOptions = activeMembers.filter((m) => m.canClean).map((m) => ({ value: m.id, label: m.fullName }));

  const title = sheet.programmeName
    ? `${sheet.programmeName}${activity.dayNumber ? ` · Day ${activity.dayNumber}` : ""}`
    : sheet.typeName;

  return (
    <div className="space-y-4">
      <Link href="/activities" className="muted">‹ Services</Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="h1">{title}</h1>
          <StatusPill status={activity.status} />
        </div>
        <p className="text-base">
          {formatLong(activity.date)}
          {activity.time && ` · ${activity.time}`}
        </p>
        {sheet.programmeName && <p className="muted">{sheet.typeName}</p>}
        {activity.theme && <p className="mt-1">📖 {activity.theme}</p>}
      </div>

      {!canEdit && (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">
          Only {sheet.coordinators.map((c) => c.fullName).join(" or ") || "the coordinator"} or an admin can change
          this day.
        </p>
      )}

      <Step n={1} title="Who's serving">
        {canEdit && (
          <div>
            <p className="label">Roles needed today (tap to turn on or off)</p>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((r) => {
                const on = enabledRoleIds.has(r.id);
                return (
                  <form key={r.id} action={toggleActivityRole}>
                    <input type="hidden" name="activityId" value={id} />
                    <input type="hidden" name="roleId" value={r.id} />
                    {!on && <input type="hidden" name="enable" value="1" />}
                    <SubmitButton
                      className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                        on ? "border-brand bg-brand text-white" : "border-line bg-card text-muted"
                      }`}
                    >
                      {on ? `✓ ${r.name}` : `+ ${r.name}`}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Slot label={sheet.coordinators.length > 1 ? "Coordinators" : "Coordinator"}>
            <CoordinatorPills
              activityId={id}
              candidates={coordinatorCandidates}
              selectedIds={coordinatorIds}
              canEdit={isAdmin}
            />
          </Slot>

          {sheet.roles.map(({ role, slots }) => {
            const count = Math.max(role.peopleNeeded, slots.length);
            return Array.from({ length: count }, (_, i) => {
              const slot = slots.at(i);
              const label = count > 1 ? `${role.name} ${i + 1}` : role.name;
              return (
                <Slot key={`${role.id}-${i}-${slot?.assignmentId ?? "empty"}`} label={label}>
                  {canEdit ? (
                    <PickSelect
                      action={setRolePerson}
                      hidden={{ activityId: id, roleId: role.id, assignmentId: slot?.assignmentId }}
                      options={roleOptions(role.id)}
                      value={slot?.member.id ?? null}
                      placeholder="Choose someone"
                      clearLabel="— Nobody —"
                      label={label}
                    />
                  ) : (
                    <span className="font-medium">{slot?.member.fullName ?? "Not chosen yet"}</span>
                  )}
                </Slot>
              );
            });
          })}
        </div>

        {canEdit && emptyRoleSlots > 0 && (
          <form action={suggestRoles}>
            <input type="hidden" name="activityId" value={id} />
            <SubmitButton className="btn-primary w-full">
              ✨ Suggest people for {emptyRoleSlots === 1 ? "the empty role" : `the ${emptyRoleSlots} empty roles`}
            </SubmitButton>
          </form>
        )}


      </Step>

      <Step
        n={2}
        title="Cleaning"
        hint={
          activity.hasCleaning
            ? `The same people clean ${cleaningTimesLabel(activity.cleaningShifts)}. Filled in fairly for you; pick a different name to change anyone.`
            : undefined
        }
      >
        {!activity.hasCleaning ? (
          <p className="muted">No cleaning on this day. Change it under &quot;Edit&quot; at the bottom.</p>
        ) : (
          <>
            <div className="space-y-3">
              {sheet.zones.map(({ zone, assignments }) => {
                const count = Math.max(zone.peopleNeeded, assignments.length);
                return Array.from({ length: count }, (_, i) => {
                  const a = assignments.at(i);
                  return (
                    <Slot key={`${zone.id}-${i}-${a?.id ?? "empty"}`} label={zone.name}>
                      {canEdit ? (
                        <PickSelect
                          action={setCleaner}
                          hidden={{ activityId: id, zoneId: zone.id, assignmentId: a?.id }}
                          options={cleanerOptions}
                          value={a?.memberId ?? null}
                          placeholder="Choose someone"
                          clearLabel="— Nobody —"
                          label={zone.name}
                        />
                      ) : (
                        <span className="font-medium">{a?.member.fullName ?? "—"}</span>
                      )}
                    </Slot>
                  );
                });
              })}
            </div>
            {canEdit && (
              <form action={regenerateCleaning}>
                <input type="hidden" name="activityId" value={id} />
                <SubmitButton className="btn w-full">↻ Shuffle (keeps anyone you picked by hand)</SubmitButton>
              </form>
            )}
          </>
        )}
      </Step>

      <Step n={3} title="Share" hint="Send the plan to the group, then remind each person.">
        <ShareButtons
          activityId={id}
          whatsAppHref={whatsAppLink(shareText)}
          text={shareText}
          pdfHref={`/api/pdf?ids=${id}`}
          canEdit={canEdit}
        />
        {duties.length > 0 && (
          <details id="remind" open={openReminders} className="scroll-mt-20 rounded-xl border border-line">
            <summary className="cursor-pointer px-4 py-3 font-medium">
              Remind each person on WhatsApp ({duties.length})
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {duties.map(({ member, duties: list }) => (
                <li key={member.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{member.fullName}</div>
                    <div className="truncate text-sm text-muted">{list.join(", ")}</div>
                  </div>
                  {member.phone ? (
                    <a
                      href={whatsAppLink(reminderText(sheet, member, list), member.phone)}
                      target="_blank"
                      rel="noopener"
                      className="btn btn-sm"
                    >
                      Send
                    </a>
                  ) : (
                    <Link href={`/members/${member.id}`} className="text-sm text-muted underline">
                      No number
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Step>

      <Step n={4} title="After the service">
        {marks.length > 0 && (
          <p className="text-base">
            {marks.filter((m) => m.status === "present").length} present ·{" "}
            {marks.filter((m) => m.status !== "present").length} absent
            {activity.status === "completed" && " · report done ✓"}
          </p>
        )}
        <Link
          href={`/activities/${id}/attendance`}
          className={isPast || marks.length > 0 ? "btn-primary w-full" : "btn w-full"}
        >
          {marks.length > 0 ? "Open attendance & report" : "Take attendance"}
        </Link>
      </Step>

      {canEdit && (
        <details className="card">
          <summary className="cursor-pointer text-muted">Edit date, time, type, cleaning or theme</summary>
          <form action={updateActivity} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            {isAdmin && (
              <>
                <div>
                  <label className="label" htmlFor="date">Date</label>
                  <input id="date" name="date" type="date" required defaultValue={activity.date} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="activityTypeId">Type</label>
                  <select id="activityTypeId" name="activityTypeId" defaultValue={activity.activityTypeId} className="input">
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="time">Time</label>
              <input id="time" name="time" type="time" defaultValue={activity.time ?? ""} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="theme">Theme or scripture</label>
              <input id="theme" name="theme" defaultValue={activity.theme ?? ""} className="input" />
            </div>
            <div className="sm:col-span-2">
              <CleaningChoice defaultValue={cleaningChoiceOf(activity)} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Save</SubmitButton>
            </div>
          </form>
          {isAdmin && (
            <form action={deleteActivity} className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="id" value={id} />
              <SubmitButton className="btn-danger" confirm="Delete this day? Its roles, cleaning, attendance and report will be removed too."
                confirmLabel="Yes, delete it">
                Delete this day
              </SubmitButton>
            </form>
          )}
        </details>
      )}
    </div>
  );
}
