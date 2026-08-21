"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  {
    key: "dashboard",
    href: "/admin",
    label: "Dashboard",
    match: (p: string) => p === "/admin",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" stroke={active ? "var(--navy-700)" : "var(--text-faint)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "capture",
    href: "/capture",
    label: "Capture",
    match: (p: string) => p.startsWith("/capture"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16M7 12h10M10 17h4" stroke={active ? "var(--navy-700)" : "var(--text-faint)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "reports",
    href: "/admin/reports",
    label: "Reports",
    match: (p: string) => p.startsWith("/admin/reports"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 20V9M12 20V4M19 20v-7" stroke={active ? "var(--navy-700)" : "var(--text-faint)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "clients",
    href: "/admin/clients",
    label: "Clients",
    match: (p: string) => p.startsWith("/admin/clients"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" stroke={active ? "var(--navy-700)" : "var(--text-faint)"} strokeWidth="2" />
        <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11h4M19 9v4" stroke={active ? "var(--navy-700)" : "var(--text-faint)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "more",
    href: "/admin/more",
    label: "More",
    match: (p: string) =>
      !p.startsWith("/capture") &&
      p !== "/admin" &&
      !p.startsWith("/admin/reports") &&
      !p.startsWith("/admin/clients"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="12" r="1.6" fill={active ? "var(--navy-700)" : "var(--text-faint)"} />
        <circle cx="12" cy="12" r="1.6" fill={active ? "var(--navy-700)" : "var(--text-faint)"} />
        <circle cx="19" cy="12" r="1.6" fill={active ? "var(--navy-700)" : "var(--text-faint)"} />
      </svg>
    ),
  },
];

/** Total fixed-bottom height (nav row only, no cta) other pages can reserve
 * space for via `pb-[var(--bottomnav-h)]` on their scroll container. */
export const BOTTOMNAV_H = "68px";

export function BottomNav({ cta }: { cta?: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md flex-col bg-surface">
      {cta && (
        <div className="border-t border-border px-4 pb-2 pt-3">{cta}</div>
      )}
      <div
        className="flex px-2 pt-1"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
          boxShadow: cta ? undefined : "0 -1px 0 var(--border)",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link key={tab.key} href={tab.href} className="flex flex-1 flex-col items-center gap-1 py-1.5">
              {tab.icon(active)}
              <span className={`text-[10px] ${active ? "font-semibold text-navy-700" : "font-medium text-text-faint"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
