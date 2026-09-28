import Link from "next/link";
import { BottomNav, TopNav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

// Every page here depends on who is signed in.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  return (
    <>
      <header className="print:hidden sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden>⛪</span> Sanctuary
          </Link>
          <TopNav />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-xs text-muted sm:block">
              {user.name}
              <br />
              {isAdmin ? "Admin" : "Coordinator"}
            </span>
            <span className="hidden md:block">
              <SignOutButton />
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 md:pb-10">{children}</main>
      <div className="print:hidden">
        <BottomNav />
      </div>
    </>
  );
}
