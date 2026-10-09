import Link from "next/link";
import type { ReactNode } from "react";

/** Page frame for admin screens: phone-width column on mobile, and on
 * desktop the space to the right of BottomNav's sidebar (w-64), either a
 * reading column or the full working width. Pages still render BottomNav
 * themselves so each can pass its own call to action. */
export function AdminPage({
  children,
  width = "narrow",
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="min-h-screen bg-app-bg lg:pl-64">
      <main
        className={`mx-auto flex min-h-screen w-full max-w-md flex-col pb-32 lg:pb-12 lg:pt-8 ${
          width === "wide" ? "lg:max-w-6xl lg:px-8" : "lg:max-w-2xl"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

/** Header for admin screens reached from the Menu: back button, title and a
 * one-line description of what the screen is for. */
export function AdminSubHeader({
  title,
  description,
  backHref = "/admin/more",
  backLabel = "Back to menu",
}: {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] lg:mx-4 lg:rounded-2xl lg:border lg:pt-4">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-app-bg lg:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="var(--navy-900)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold text-navy-900 lg:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-[#5d6c80] lg:text-sm">{description}</p>}
      </div>
    </header>
  );
}
