import { redirect } from "next/navigation";
import { getProfile, getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminApiConfigured } from "@/lib/supabase/admin";
import { listUsers, listClientAccess } from "@/app/admin/users/actions";
import { UserManager } from "@/components/UserManager";
import { BottomNav } from "@/components/BottomNav";
import { AdminPage, AdminSubHeader } from "@/components/AdminPage";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/users");
  if (profile.role !== "admin") redirect("/client");
  const user = await getSessionUser();

  const configured = adminApiConfigured();
  const users = configured ? await listUsers() : [];
  const accessByUser = configured ? await listClientAccess() : {};

  const supabase = await createClient();
  const { data: clientRows } = await supabase.from("clients").select("id, name").order("name");
  const clients = (clientRows ?? []) as Pick<Client, "id" | "name">[];

  return (
    <AdminPage>
      <AdminSubHeader title="Users & access" description="Who can sign in, what they can see, and password resets." />

      <div className="flex flex-col gap-4 px-4 py-4">
        {configured ? (
          <UserManager users={users} currentUserId={user?.id ?? ""} clients={clients} accessByUser={accessByUser} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-bold text-amber-900">One setup step left</h2>
            <p className="mt-1.5 text-sm text-amber-900">
              Managing users needs Supabase&rsquo;s admin API, which uses a separate key. In Supabase go to
              <strong> Settings → API</strong>, copy the <strong>service_role</strong> key, then add it in Vercel
              under <strong>Settings → Environment Variables</strong> as{" "}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> and redeploy.
            </p>
            <p className="mt-2 text-sm text-amber-900">
              Keep that key server-side only — it bypasses every access rule in the database. Never put it in a
              variable whose name starts with <code className="font-mono">NEXT_PUBLIC_</code>.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </AdminPage>
  );
}
