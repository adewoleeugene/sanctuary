import Link from "next/link";
import { createMember } from "@/app/actions/members";
import { MemberForm } from "@/components/member-form";
import { requireAdmin } from "@/lib/session";

export default async function NewMemberPage() {
  await requireAdmin();
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/members" className="muted">← Members</Link>
      <h1 className="h1">Add member</h1>
      <MemberForm action={createMember} />
    </div>
  );
}
