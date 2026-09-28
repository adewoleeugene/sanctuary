import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { lazy } from "@/lib/lazy";
import * as schema from "./schema";

// Connects on first use so `next build` works without DATABASE_URL.
export const db = lazy<NeonHttpDatabase<typeof schema>>(() => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (add it to .env.local or the Vercel project).");
  return drizzle(neon(url), { schema });
});
