import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/session";

// Every page here depends on who is signed in.
export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");
  if (user.role) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <p className="text-3xl">🔒</p>
        <h1 className="h2 mt-2">You don&apos;t have access yet</h1>
        <p className="muted mt-2">
          You&apos;re signed in as <strong>{user.email}</strong>. Ask Francess to add this email in Settings → Users,
          then sign in again.
        </p>
        <div className="mt-4">
          <SignOutButton className="btn" />
        </div>
      </div>
    </main>
  );
}
