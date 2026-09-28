import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

export default async function MorePage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const links = [
    isAdmin && { href: "/programmes", title: "Programmes", text: "Set up a run of days, like 92 Days of Prayer" },
    { href: "/reports", title: "Reports", text: "Attendance, cleaning and roles, for leaders and the pastor" },
    isAdmin && { href: "/settings", title: "Settings", text: "Who can log in, roles, cleaning areas, birthday message" },
  ].filter((l) => !!l);

  return (
    <div className="space-y-4">
      <h1 className="h1">More</h1>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="card flex items-center gap-3 hover:bg-paper">
              <div className="flex-1">
                <div className="text-lg font-semibold">{l.title}</div>
                <div className="muted">{l.text}</div>
              </div>
              <span aria-hidden className="text-xl text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="card flex items-center justify-between">
        <div className="text-sm">
          Signed in as <strong>{user.name}</strong>
          <div className="text-muted">{isAdmin ? "Admin" : "Coordinator"}</div>
        </div>
        <SignOutButton className="btn" />
      </div>
    </div>
  );
}
