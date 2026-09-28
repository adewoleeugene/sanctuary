import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { formatBirthday } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const user = await requireUser();
  const { q, show } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const showInactive = show === "all";

  const all = await db.select().from(members).orderBy(asc(members.fullName));
  const list = all.filter(
    (m) => (showInactive || m.active) && (!query || m.fullName.toLowerCase().includes(query)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="h1">Members</h1>
          <p className="muted">{all.filter((m) => m.active).length} active members</p>
        </div>
        {user.role === "admin" && (
          <Link href="/members/new" className="btn-primary">
            + Add member
          </Link>
        )}
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Search by name" className="input" />
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="show" value="all" defaultChecked={showInactive} /> Inactive too
        </label>
        <button className="btn">Search</button>
      </form>

      <div className="card overflow-x-auto p-0 sm:p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="pl-4">Name</th>
              <th>Birthday</th>
              <th className="hidden sm:table-cell">Phone</th>
              <th>Cleaning</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className={m.active ? "" : "opacity-50"}>
                <td className="pl-4">
                  <Link href={`/members/${m.id}`} className="font-medium text-brand">
                    {m.fullName}
                  </Link>
                  {!m.active && <span className="muted"> (inactive)</span>}
                </td>
                <td>{m.birthDay && m.birthMonth ? formatBirthday(m.birthDay, m.birthMonth) : "—"}</td>
                <td className="hidden sm:table-cell">{m.phone ?? "—"}</td>
                <td>{m.canClean ? "Yes" : "No"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
