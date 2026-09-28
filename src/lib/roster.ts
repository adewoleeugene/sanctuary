import "server-only";

import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { activities, cleaningAssignments, cleaningZones, members } from "@/db/schema";

/**
 * Fill every cleaning zone for one activity, keeping locked slots. The same
 * team cleans before and/or after the service.
 *
 * Fairness: members who cleaned least recently (before this date) go first,
 * then those who have cleaned fewest times. Nobody gets two zones on the same
 * day, and people are steered away from repeating their previous zone.
 */
export async function generateCleaningRoster(activityId: number) {
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));
  if (!activity || !activity.hasCleaning) return;

  const [zones, pool, existing, history] = await Promise.all([
    db
      .select()
      .from(cleaningZones)
      .where(eq(cleaningZones.archived, false))
      .orderBy(asc(cleaningZones.sortOrder), asc(cleaningZones.name)),
    db
      .select()
      .from(members)
      .where(and(eq(members.active, true), eq(members.canClean, true))),
    db.select().from(cleaningAssignments).where(eq(cleaningAssignments.activityId, activityId)),
    db
      .select({
        memberId: cleaningAssignments.memberId,
        zoneId: cleaningAssignments.zoneId,
        date: activities.date,
      })
      .from(cleaningAssignments)
      .innerJoin(activities, eq(cleaningAssignments.activityId, activities.id))
      .where(lt(activities.date, activity.date))
      .orderBy(asc(activities.date)),
  ]);

  const locked = existing.filter((c) => c.locked);
  await db
    .delete(cleaningAssignments)
    .where(and(eq(cleaningAssignments.activityId, activityId), eq(cleaningAssignments.locked, false)));

  const stats = new Map<number, { last: string; count: number; lastZone: number }>();
  for (const h of history) {
    const s = stats.get(h.memberId);
    stats.set(h.memberId, { last: h.date, count: (s?.count ?? 0) + 1, lastZone: h.zoneId });
  }

  const queue = [...pool].sort((a, b) => {
    const sa = stats.get(a.id);
    const sb = stats.get(b.id);
    const la = sa?.last ?? "";
    const lb = sb?.last ?? "";
    if (la !== lb) return la < lb ? -1 : 1;
    const ca = sa?.count ?? 0;
    const cb = sb?.count ?? 0;
    if (ca !== cb) return ca - cb;
    return a.id - b.id;
  });

  const used = new Set(locked.map((c) => c.memberId));
  const inserts: (typeof cleaningAssignments.$inferInsert)[] = [];

  // Every zone to fill today. Gendered zones (the toilets) go first so members
  // of the matching gender aren't used up elsewhere.
  const work = zones
    .map((zone) => ({ zone, open: Math.max(0, zone.peopleNeeded - locked.filter((c) => c.zoneId === zone.id).length) }))
    .filter((w) => w.open > 0);
  work.sort((a, b) => Number(!!b.zone.genderRule) - Number(!!a.zone.genderRule));

  // A matching gender is preferred only among the people due to clean today,
  // so a small group never ends up cleaning every time.
  const slotsToday = work.reduce((n, w) => n + w.open, 0);
  const due = new Set(queue.filter((m) => !used.has(m.id)).slice(0, slotsToday).map((m) => m.id));

  for (const { zone, open } of work) {
    for (let slot = 0; slot < open; slot++) {
      const available = queue.filter((m) => !used.has(m.id));
      const eligible = zone.genderRule
        ? [
            ...available.filter((m) => due.has(m.id) && m.gender === zone.genderRule),
            ...available.filter((m) => due.has(m.id) && !m.gender),
            ...available.filter((m) => !due.has(m.id) && m.gender === zone.genderRule),
            ...available.filter((m) => !due.has(m.id) && !m.gender),
          ]
        : available;
      const pick = eligible.find((m) => stats.get(m.id)?.lastZone !== zone.id) ?? eligible[0];
      if (!pick) break;
      used.add(pick.id);
      inserts.push({ activityId, zoneId: zone.id, memberId: pick.id });
    }
  }

  if (inserts.length) await db.insert(cleaningAssignments).values(inserts);
}
