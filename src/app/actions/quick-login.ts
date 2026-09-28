"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, members } from "@/db/schema";
import { auth } from "@/lib/auth/server";

/**
 * Username-only sign-in for Francess (QUICK_LOGIN_USERNAME). Behind the scenes
 * it signs in to a normal Neon Auth account whose password only the server
 * knows. Anyone who knows the username gets admin access.
 */
export async function quickSignIn(username: string): Promise<{ error: string } | { ok: true }> {
  const expected = process.env.QUICK_LOGIN_USERNAME;
  const email = process.env.QUICK_LOGIN_EMAIL?.toLowerCase();
  const password = process.env.QUICK_LOGIN_PASSWORD;
  if (!expected || !email || !password) return { error: "Username sign-in isn't set up." };
  if (username.trim().toLowerCase() !== expected.toLowerCase()) {
    return { error: "That username isn't recognised. Use your email and password instead." };
  }

  let { error } = await auth.signIn.email({ email, password });
  if (error) {
    // First use: create the account, which also signs it in.
    ({ error } = await auth.signUp.email({ email, password, name: "Francess Thompson" }));
    if (error) return { error: error.message ?? "Couldn't sign in. Please try again." };
  }

  const [member] = await db.select().from(members).where(eq(members.fullName, "Francess Thompson"));
  await db
    .insert(appUsers)
    .values({ email, role: "admin", memberId: member?.id ?? null })
    .onConflictDoUpdate({ target: appUsers.email, set: { role: "admin" } });

  return { ok: true };
}
