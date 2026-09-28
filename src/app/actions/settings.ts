"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityTypes, appUsers, cleaningZones, roles, settings } from "@/db/schema";
import { bool, num, optNum, str } from "@/lib/form";
import { requireAdmin } from "@/lib/session";

function done() {
  revalidatePath("/settings");
}

// ── Roles ────────────────────────────────────────────────────────────────

export async function saveRole(fd: FormData) {
  await requireAdmin();
  const id = optNum(fd, "id");
  const values = {
    name: str(fd, "name"),
    sortOrder: optNum(fd, "sortOrder") ?? 0,
    peopleNeeded: Math.max(1, optNum(fd, "peopleNeeded") ?? 1),
    archived: bool(fd, "archived"),
  };
  if (!values.name) throw new Error("Role name is required.");
  if (id) await db.update(roles).set(values).where(eq(roles.id, id));
  else await db.insert(roles).values(values);
  done();
}

// ── Activity types ───────────────────────────────────────────────────────

export async function saveActivityType(fd: FormData) {
  await requireAdmin();
  const id = optNum(fd, "id");
  const values = {
    name: str(fd, "name"),
    hasCleaning: bool(fd, "hasCleaning"),
    defaultRoleIds: fd.getAll("defaultRoleIds").map(Number),
    archived: bool(fd, "archived"),
  };
  if (!values.name) throw new Error("Type name is required.");
  if (id) await db.update(activityTypes).set(values).where(eq(activityTypes.id, id));
  else await db.insert(activityTypes).values(values);
  done();
}

// ── Cleaning zones ───────────────────────────────────────────────────────

export async function saveZone(fd: FormData) {
  await requireAdmin();
  const id = optNum(fd, "id");
  const gender = str(fd, "genderRule");
  const values = {
    name: str(fd, "name"),
    sortOrder: optNum(fd, "sortOrder") ?? 0,
    peopleNeeded: Math.max(1, optNum(fd, "peopleNeeded") ?? 1),
    genderRule: gender === "female" || gender === "male" ? (gender as "female" | "male") : null,
    archived: bool(fd, "archived"),
  };
  if (!values.name) throw new Error("Zone name is required.");
  if (id) await db.update(cleaningZones).set(values).where(eq(cleaningZones.id, id));
  else await db.insert(cleaningZones).values(values);
  done();
}

// ── Users ────────────────────────────────────────────────────────────────

export async function inviteUser(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  if (!email.includes("@")) throw new Error("Enter a valid email.");
  const role = str(fd, "role") === "admin" ? "admin" : "coordinator";
  await db
    .insert(appUsers)
    .values({ email, role, memberId: optNum(fd, "memberId") })
    .onConflictDoUpdate({ target: appUsers.email, set: { role, memberId: optNum(fd, "memberId") } });
  done();
}

export async function updateUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  const [row] = await db.select().from(appUsers).where(eq(appUsers.id, id));
  const role = str(fd, "role") === "admin" ? "admin" : "coordinator";
  if (row?.email === me.email && role !== "admin") throw new Error("You can't remove your own admin access.");
  await db.update(appUsers).set({ role, memberId: optNum(fd, "memberId") }).where(eq(appUsers.id, id));
  done();
}

export async function removeUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  const [row] = await db.select().from(appUsers).where(eq(appUsers.id, id));
  if (row?.email === me.email) throw new Error("You can't remove yourself.");
  await db.delete(appUsers).where(eq(appUsers.id, id));
  done();
}

// ── Birthday message ─────────────────────────────────────────────────────

export async function saveBirthdayTemplate(fd: FormData) {
  await requireAdmin();
  const value = str(fd, "template");
  await db
    .insert(settings)
    .values({ key: "birthday_template", value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  done();
  revalidatePath("/");
}
