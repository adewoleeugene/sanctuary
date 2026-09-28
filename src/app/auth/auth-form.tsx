"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { quickSignIn } from "@/app/actions/quick-login";
import { authClient } from "@/lib/auth/client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [login, setLogin] = useState("");
  // On sign-in, a username (no "@") logs in without a password; the password
  // box only appears once an email address is typed.
  const usernameOnly = mode === "sign-in" && !login.includes("@");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    try {
      if (usernameOnly) {
        const result = await quickSignIn(email);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.push("/");
        router.refresh();
        return;
      }
      const { error } =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: String(fd.get("name")).trim() });
      if (error) {
        setError(error.message ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl">⛪</p>
          <h1 className="h1 mt-2">Sanctuary</h1>
          <p className="muted mt-1">
            {mode === "sign-in" ? "Sign in to manage services and rosters" : "Create your account"}
          </p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          {mode === "sign-up" && (
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" required className="input" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">{mode === "sign-in" ? "Username or email" : "Email"}</label>
            <input
              id="email"
              name="email"
              type={mode === "sign-in" ? "text" : "email"}
              required
              className="input"
              autoComplete={mode === "sign-in" ? "username" : "email"}
              autoCapitalize="none"
              placeholder={mode === "sign-in" ? "e.g. Francess2026" : undefined}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          {!usernameOnly && (
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="input"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />
            </div>
          )}
          {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="muted mt-4 text-center">
          {mode === "sign-in" ? (
            <>
              First time here? <Link href="/auth/sign-up" className="font-medium text-brand">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/auth/sign-in" className="font-medium text-brand">Sign in</Link>
            </>
          )}
        </p>
        {mode === "sign-up" && (
          <p className="muted mt-2 text-center text-xs">
            Use the email address the leader added for you, or you won&apos;t have access yet.
          </p>
        )}
      </div>
    </main>
  );
}
