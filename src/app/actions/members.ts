"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { members } from "@/db/schema";
import { bool, optNum, optStr, str } from "@/lib/form";
import { requireAdmin } from "@/lib/session";

function memberValues(fd: FormData) {
  const fullName = str(fd, "fullName");
  if (!fullName) throw new Error("Name is required.");
  const birthDay = optNum(fd, "birthDay");
  const birthMonth = optNum(fd, "birthMonth");
  const gender = str(fd, "gender");
  return {
    fullName,
    phone: optStr(fd, "phone"),
    birthDay: birthDay && birthMonth ? birthDay : null,
    birthMonth: birthDay && birthMonth ? birthMonth : null,
    birthYear: optNum(fd, "birthYear"),
    gender: gender === "female" || gender === "male" ? gender : null,
    canClean: bool(fd, "canClean"),
    canCoordinate: bool(fd, "canCoordinate"),
    notes: optStr(fd, "notes"),
  } as const;
}

export async function createMember(fd: FormData) {
  await requireAdmin();
  await db.insert(members).values(memberValues(fd));
  revalidatePath("/members");
  redirect("/members");
}

export async function updateMember(fd: FormData) {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  await db
    .update(members)
    .set({ ...memberValues(fd), active: bool(fd, "active") })
    .where(eq(members.id, id));
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}
