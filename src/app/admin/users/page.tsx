import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getSessionUser } from "@/lib/auth";
import { adminApiConfigured } from "@/lib/supabase/admin";
import { listUsers } from "@/app/admin/users/actions";
import { UserManager } from "@/components/UserManager";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/users");
  if (profile.role !== "admin") redirect("/client");
  const user = await getSessionUser();

  const configured = adminApiConfigured();
  const users = configured ? await listUsers() : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-28">
      <div className="flex items-center gap-3 bg-navy-900 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <Link
          href="/admin/more"
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold">Users</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {configured ? (
          <UserManager users={users} currentUserId={user?.id ?? ""} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-bold text-amber-900">One setup step left</h2>
            <p className="mt-1.5 text-xs text-amber-900/80">
              Managing users needs Supabase&rsquo;s admin API, which uses a separate key. In Supabase go to
              <strong> Settings → API</strong>, copy the <strong>service_role</strong> key, then add it in Vercel
              under <strong>Settings → Environment Variables</strong> as{" "}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> and redeploy.
            </p>
            <p className="mt-2 text-xs text-amber-900/80">
              Keep that key server-side only — it bypasses every access rule in the database. Never put it in a
              variable whose name starts with <code className="font-mono">NEXT_PUBLIC_</code>.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
