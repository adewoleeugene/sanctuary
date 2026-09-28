"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({ className = "btn btn-sm" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await authClient.signOut();
        router.push("/auth/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
