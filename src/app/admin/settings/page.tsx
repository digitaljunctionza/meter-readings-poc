import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getSessionUser } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";
import { LogoutButton } from "@/components/LogoutButton";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/settings");
  if (profile.role !== "admin") redirect("/client");
  const user = await getSessionUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-28">
      <div className="flex items-center gap-3 bg-navy-900 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <Link href="/admin/more" aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold">Settings</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        {user && <SettingsForm userId={user.id} email={user.email ?? ""} fullName={profile.full_name} />}

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold text-navy-900">Business</h2>
          <p className="mt-1 text-sm text-text-muted">Wayne&rsquo;s Fix &amp; Finish</p>
          <p className="text-xs text-text-faint">Meter Readings app</p>
        </div>

        <LogoutButton className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-border-strong text-sm font-semibold text-navy-700" />
      </div>

      <BottomNav />
    </main>
  );
}
