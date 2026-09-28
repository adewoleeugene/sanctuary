"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/activities", label: "Services", icon: "▦" },
  { href: "/members", label: "Members", icon: "☺" },
  { href: "/more", label: "More", icon: "☰", also: ["/programmes", "/reports", "/settings"] },
];

function useLinks() {
  const pathname = usePathname();
  return LINKS.map((l) => ({
    ...l,
    active:
      l.href === "/"
        ? pathname === "/"
        : [l.href, ...(l.also ?? [])].some((h) => pathname.startsWith(h)),
  }));
}

export function TopNav() {
  const links = useLinks();
  return (
    <nav className="hidden gap-1 md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            l.active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:text-ink"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const links = useLinks();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card/95 backdrop-blur md:hidden">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs ${
            l.active ? "font-medium text-brand" : "text-muted"
          }`}
        >
          <span aria-hidden className="text-xl leading-none">
            {l.icon}
          </span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
