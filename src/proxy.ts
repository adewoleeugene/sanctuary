import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/auth/sign-in" });

// Everything except the auth pages, the auth API proxy and static assets.
export const config = {
  matcher: ["/((?!auth|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
