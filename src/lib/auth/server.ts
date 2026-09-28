import { createNeonAuth } from "@neondatabase/auth/next/server";
import { lazy } from "@/lib/lazy";

// Created on first use so `next build` works without the auth env variables.
export const auth = lazy(() => {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set (in .env.local or the Vercel project).");
  }
  return createNeonAuth({ baseUrl, cookies: { secret } });
});
