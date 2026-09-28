import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Created on the first request so `next build` doesn't need the auth env variables.
let middleware: ((request: NextRequest) => ReturnType<ReturnType<typeof auth.middleware>>) | undefined;

export default function proxy(request: NextRequest) {
  middleware ??= auth.middleware({ loginUrl: "/auth/sign-in" });
  return middleware(request);
}

// Everything except the auth pages, the auth API proxy and static assets.
export const config = {
  matcher: ["/((?!auth|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
