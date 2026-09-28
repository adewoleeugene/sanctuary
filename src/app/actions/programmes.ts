"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { activityTypes, programmes } from "@/db/schema";
import { addDays, weekdayOf } from "@/lib/dates";
import { num, str } from "@/lib/form";
import { activityIdsForProgramme, createActivities } from "@/lib/queries";
import { generateCleaningRoster } from "@/lib/roster";
import { requireAdmin } from "@/lib/session";

export async function createProgramme(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  const startDate = str(fd, "startDate");
  const days = num(fd, "days");
  const activityTypeId = num(fd, "activityTypeId");
  const weekdays = fd.getAll("weekdays").map(Number);
  if (!name || !startDate) throw new Error("Name and start date are required.");
  if (days < 1 || days > 400) throw new Error("A programme can run for 1 to 400 days.");
  if (weekdays.length === 0) throw new Error("Pick at least one weekday.");

  const [type] = await db.select().from(activityTypes).where(eq(activityTypes.id, activityTypeId));
  if (!type) throw new Error("Choose an activity type.");

  const [programme] = await db
    .insert(programmes)
    .values({ name, startDate, days, weekdays, activityTypeId })
    .returning();

  // Day numbers count calendar days from the start, so "Day 14 of 92" is
  // the 14th day of the programme even when only some weekdays meet.
  const values = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    if (!weekdays.includes(weekdayOf(date))) continue;
    values.push({
      date,
      time: str(fd, "time") || null,
      activityTypeId,
      programmeId: programme.id,
      dayNumber: i + 1,
      hasCleaning: type.hasCleaning,
    });
  }
  const ids = await createActivities(values);

  // Generate in date order so each day's rotation sees the days before it.
  if (type.hasCleaning) {
    for (const id of ids) await generateCleaningRoster(id);
  }

  revalidatePath("/programmes");
  redirect(`/programmes/${programme.id}`);
}

export async function regenerateProgrammeCleaning(fd: FormData) {
  await requireAdmin();
  const programmeId = num(fd, "programmeId");
  for (const id of await activityIdsForProgramme(programmeId)) {
    await generateCleaningRoster(id);
  }
  revalidatePath(`/programmes/${programmeId}`);
}

export async function deleteProgramme(fd: FormData) {
  await requireAdmin();
  await db.delete(programmes).where(eq(programmes.id, num(fd, "programmeId")));
  revalidatePath("/programmes");
  revalidatePath("/activities");
  redirect("/programmes");
}
