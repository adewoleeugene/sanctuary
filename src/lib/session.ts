import "server-only";

import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { activityCoordinators, appUsers, members } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type CurrentUser = {
  authUserId: string;
  email: string;
  name: string;
  role: "admin" | "coordinator";
  memberId: number | null;
};

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The signed-in user plus their app role, or null when signed out.
 * `role` is null when the person has an account but no admin has given them access.
 */
export const getSessionUser = cache(async () => {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const email = user.email.toLowerCase();
  let [row] = await db
    .select()
    .from(appUsers)
    .where(or(eq(appUsers.authUserId, user.id), eq(appUsers.email, email)));

  // Bootstrap: emails in ADMIN_EMAILS become admins on first sign-in.
  if (!row && adminEmails().includes(email)) {
    [row] = await db
      .insert(appUsers)
      .values({ email, authUserId: user.id, role: "admin" })
      .returning();
  }

  // Link an invited email to its auth account the first time it signs in.
  if (row && row.authUserId !== user.id) {
    [row] = await db
      .update(appUsers)
      .set({ authUserId: user.id })
      .where(eq(appUsers.id, row.id))
      .returning();
  }

  let name = user.name || email;
  if (row?.memberId) {
    const [member] = await db.select().from(members).where(eq(members.id, row.memberId));
    if (member) name = member.fullName;
  }

  return {
    authUserId: user.id,
    email,
    name,
    role: row?.role ?? null,
    memberId: row?.memberId ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");
  if (!user.role) redirect("/no-access");
  return user as CurrentUser;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Only admins can do this.");
  return user;
}

export function isAdmin(user: CurrentUser) {
  return user.role === "admin";
}

export async function canManageActivity(user: CurrentUser, activityId: number) {
  if (user.role === "admin") return true;
  if (!user.memberId) return false;
  const [row] = await db
    .select({ activityId: activityCoordinators.activityId })
    .from(activityCoordinators)
    .where(and(eq(activityCoordinators.activityId, activityId), eq(activityCoordinators.memberId, user.memberId)));
  return !!row;
}

export async function requireActivityAccess(activityId: number) {
  const user = await requireUser();
  if (!(await canManageActivity(user, activityId))) {
    throw new Error("You can only change services you coordinate.");
  }
  return user;
}
