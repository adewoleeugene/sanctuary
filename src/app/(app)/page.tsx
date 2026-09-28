import Link from "next/link";
import { and, asc, desc, eq, gte, lt, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes, members, programmes, type ActivityType } from "@/db/schema";
import { CopyButton } from "@/components/copy-button";
import { DeleteEventButton } from "@/components/delete-event-button";
import { NewEventForm } from "@/components/new-event-form";
import { ShareButtons } from "@/components/share-buttons";
import { StatusPill } from "@/components/status-pill";
import { addDays, formatBirthday, formatLong, formatShort, todayISO } from "@/lib/dates";
import {
  coordinatedBy,
  coordinatorNamesSql,
  DEFAULT_BIRTHDAY_TEMPLATE,
  getActivitySheets,
  getSetting,
  upcomingBirthdays,
  withoutCoordinator,
} from "@/lib/queries";
import { birthdayMessage, activityWhatsAppText } from "@/lib/share-text";
import { requireUser } from "@/lib/session";
import { whatsAppLink } from "@/lib/whatsapp";

function activityQuery() {
  return db
    .select({
      id: activities.id,
      date: activities.date,
      status: activities.status,
      dayNumber: activities.dayNumber,
      typeName: activityTypes.name,
      programmeName: programmes.name,
      coordinator: coordinatorNamesSql,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .leftJoin(programmes, eq(activities.programmeId, programmes.id));
}

type Row = Awaited<ReturnType<typeof activityQuery>>[number];

function name(a: { typeName: string; programmeName: string | null; dayNumber: number | null }) {
  return a.programmeName ? `${a.programmeName}${a.dayNumber ? ` · Day ${a.dayNumber}` : ""}` : a.typeName;
}

function TodoCard({ tone, title, rows, action }: { tone: "warn" | "brand"; title: string; rows: Row[]; action: string }) {
  if (rows.length === 0) return null;
  return (
    <section className={`card ${tone === "warn" ? "border-warn/40 bg-warn-soft/40" : ""}`}>
      <h2 className="h2 mb-2">{title}</h2>
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id}>
            <Link
              href={action === "attendance" ? `/activities/${a.id}/attendance` : `/activities/${a.id}`}
              className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-3 py-2 hover:bg-paper"
            >
              <span className="w-20 shrink-0 font-medium">{formatShort(a.date)}</span>
              <span className="flex-1 truncate">{name(a)}</span>
              <span aria-hidden className="text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const today = todayISO();
  const mine = user.memberId ? coordinatedBy(user.memberId) : undefined;
  // Admins see everything; coordinators see the days they coordinate.
  const scope = isAdmin ? undefined : (mine ?? eq(activities.id, -1));

  const [[next], unassigned, toFinish, comingUp, allMembers, template] = await Promise.all([
    activityQuery()
      .where(and(gte(activities.date, today), scope))
      .orderBy(asc(activities.date), asc(activities.time))
      .limit(1),
    isAdmin
      ? activityQuery()
          .where(and(gte(activities.date, today), lte(activities.date, addDays(today, 13)), withoutCoordinator))
          .orderBy(asc(activities.date))
          .limit(5)
      : Promise.resolve([] as Row[]),
    activityQuery()
      .where(and(lt(activities.date, today), ne(activities.status, "completed"), scope))
      .orderBy(desc(activities.date))
      .limit(5),
    activityQuery()
      .where(and(gte(activities.date, today), lte(activities.date, addDays(today, 13)), scope))
      .orderBy(asc(activities.date), asc(activities.time))
      .limit(6),
    db.select().from(members),
    getSetting("birthday_template", DEFAULT_BIRTHDAY_TEMPLATE),
  ]);
  const types: ActivityType[] = isAdmin
    ? await db.select().from(activityTypes).where(eq(activityTypes.archived, false)).orderBy(asc(activityTypes.name))
    : [];
  const activeMembers = allMembers
    .filter((m) => m.active)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const [sheet] = next ? await getActivitySheets([next.id]) : [];
  const emptyRoles = sheet ? sheet.roles.reduce((n, r) => n + Math.max(0, r.role.peopleNeeded - r.slots.length), 0) : 0;
  const isToday = next?.date === today;
  const birthdays = upcomingBirthdays(allMembers, today, 7);
  const firstName = user.name.replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, "").split(" ")[0];

  return (
    <div className="space-y-4">
      <h1 className="h1">Hello, {firstName} 👋</h1>

      {isAdmin && <NewEventForm types={types} members={activeMembers} />}

      {next && sheet ? (
        <section className="card space-y-4 border-brand/30">
          <div>
            <div className="text-sm font-medium text-brand">{isToday ? "TODAY" : "NEXT UP"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{name(next)}</h2>
              <StatusPill status={next.status} />
            </div>
            <p className="text-base">{formatLong(next.date)}</p>
            <p className="muted">
              {sheet.coordinators.length > 1 ? "Coordinators" : "Coordinator"}: {next.coordinator ?? "not chosen yet"}
              {emptyRoles > 0 && ` · ${emptyRoles} role${emptyRoles > 1 ? "s" : ""} still empty`}
            </p>
          </div>

          <div className="grid gap-2">
            <Link href={`/activities/${next.id}`} className={emptyRoles > 0 ? "btn-primary" : "btn"}>
              {emptyRoles > 0 ? "Fill in who's serving" : "See who's serving"}
            </Link>
            <ShareButtons
              activityId={next.id}
              whatsAppHref={whatsAppLink(activityWhatsAppText(sheet))}
              text={activityWhatsAppText(sheet)}
              pdfHref={`/api/pdf?ids=${next.id}`}
              canEdit={isAdmin || !!mine}
            />
            {sheet.coordinators.length || sheet.roles.some((r) => r.slots.length) || sheet.zones.length ? (
              <Link href={`/activities/${next.id}?remind=1#remind`} className="btn">
                Send reminders
              </Link>
            ) : null}
            <Link
              href={`/activities/${next.id}/attendance`}
              className={isToday ? "btn-primary" : "btn"}
            >
              Take attendance
            </Link>
          </div>
          {isAdmin && (
            <div className="flex justify-end border-t border-line pt-3">
              <DeleteEventButton id={next.id} name={`${name(next)} on ${formatShort(next.date)}`} returnTo="/" />
            </div>
          )}
        </section>
      ) : (
        <section className="card text-center">
          <p className="text-base">Nothing coming up.</p>
          {isAdmin ? (
            <p className="muted">Create an event above, or <Link href="/programmes" className="font-medium text-brand">set up a programme</Link>.</p>
          ) : (
            <p className="muted">Francess will let you know when you&apos;re coordinating.</p>
          )}
        </section>
      )}

      <TodoCard tone="warn" title="Attendance not finished" rows={toFinish} action="attendance" />
      <TodoCard tone="warn" title="Needs a coordinator" rows={unassigned} action="open" />

      {birthdays.length > 0 && (
        <section className="card space-y-3">
          <h2 className="h2">🎂 Birthdays this week</h2>
          <ul className="space-y-3">
            {birthdays.map((b) => {
              const message = birthdayMessage(template, b.member.fullName);
              return (
                <li key={b.member.id} className="space-y-2">
                  <div>
                    <span className="font-medium">{b.member.fullName}</span>
                    <span className="muted">
                      {" · "}
                      {b.inDays === 0 ? "today 🎉" : b.inDays === 1 ? "tomorrow" : formatBirthday(b.member.birthDay!, b.member.birthMonth!)}
                    </span>
                  </div>
                  {b.member.phone ? (
                    <a href={whatsAppLink(message, b.member.phone)} target="_blank" rel="noopener" className="btn w-full">
                      Send birthday wishes on WhatsApp
                    </a>
                  ) : (
                    <CopyButton text={message} label="Copy birthday message" className="btn w-full" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {comingUp.length > 1 && (
        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h2">Coming up</h2>
            <Link href="/activities" className="text-sm font-medium text-brand">See all ›</Link>
          </div>
          <ul className="divide-y divide-line">
            {comingUp.slice(1).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 pb-2">
                <Link href={`/activities/${a.id}`} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2">
                  <span className="w-20 shrink-0 font-medium">{formatShort(a.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{name(a)}</span>
                    <span className="block truncate text-sm text-muted">{a.coordinator ?? "No coordinator yet"}</span>
                  </span>
                  {!isAdmin && <span aria-hidden className="text-muted">›</span>}
                </Link>
                {isAdmin && (
                  <DeleteEventButton
                    id={a.id}
                    name={`${name(a)} on ${formatShort(a.date)}`}
                    returnTo="/"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted hover:bg-bad-soft hover:text-bad"
                  >
                    <span aria-label={`Delete ${name(a)}`}>🗑</span>
                  </DeleteEventButton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
