import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const ICONS = {
  quotes: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  review: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 13a7.97 7.97 0 000-2l2.1-1.6-2-3.5-2.5 1a8 8 0 00-1.7-1L14.9 3h-3.8l-.4 2.9a8 8 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.97 7.97 0 000 2l-2.1 1.6 2 3.5 2.5-1a8 8 0 001.7 1l.4 2.9h3.8l.4-2.9a8 8 0 001.7-1l2.5 1 2-3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default async function AdminMorePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/more");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();
  const [{ count: openFlags }, { count: openQuotesClients }] = await Promise.all([
    supabase
      .from("meter_readings")
      .select("id", { count: "exact", head: true })
      .neq("flag_status", "ok")
      .is("reviewed_at", null),
    supabase.from("clients").select("id", { count: "exact", head: true }).not("rebill_client_id", "is", null),
  ]);

  const items = [
    {
      href: "/admin/review",
      icon: ICONS.review,
      label: "Review queue",
      sub: "Flagged readings waiting on a decision",
      badge: openFlags && openFlags > 0 ? openFlags : null,
    },
    {
      href: "/admin/quotes",
      icon: ICONS.quotes,
      label: "Quotes",
      sub: `Build and send quotes via Rebill${openQuotesClients ? ` · ${openQuotesClients} client${openQuotesClients === 1 ? "" : "s"} linked` : ""}`,
      badge: null,
    },
    {
      href: "/admin/settings",
      icon: ICONS.settings,
      label: "Settings",
      sub: "Profile, password, business info",
      badge: null,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-28">
      <div className="flex items-center bg-navy-900 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <h1 className="text-lg font-bold">More</h1>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-bg text-navy-700">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-navy-900">{item.label}</p>
              <p className="truncate text-[11.5px] text-text-muted">{item.sub}</p>
            </div>
            {item.badge !== null && (
              <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-800">
                {item.badge}
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-text-faint" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}

        <LogoutButton className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-border-strong text-sm font-semibold text-navy-700" />
      </div>

      <BottomNav />
    </main>
  );
}
