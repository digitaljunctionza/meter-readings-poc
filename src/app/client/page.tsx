import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildReportRows } from "@/lib/report";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { GaugeIcon } from "@/components/icons";
import type { Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/client");
  if (profile.role === "admin") redirect("/admin");

  const { property: selectedPropertyId } = await searchParams;

  // RLS scopes this to the properties of the client(s) this user was granted.
  const supabase = await createClient();
  const { data: propertyRows } = await supabase.from("properties").select("*").order("name");
  const properties = (propertyRows ?? []) as Property[];

  if (properties.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-50 px-5 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light text-accent">
          <GaugeIcon className="h-7 w-7" />
        </div>
        <p className="text-sm text-slate-600">
          You don&apos;t have access to any properties yet. Ask Wayne to send you an invite link.
        </p>
        <LogoutButton className="rounded-full border border-accent-light px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
      </main>
    );
  }

  const active = properties.find((p) => p.id === selectedPropertyId) ?? properties[0];
  const rows = await buildReportRows(active.id);

  return (
    <ClientDashboard
      key={active.id}
      propertyName={active.name}
      properties={properties.map((p) => ({ id: p.id, name: p.name }))}
      activePropertyId={active.id}
      basePath="/client"
      settingsHref="/client/settings"
      greetingName={profile.full_name}
      rows={rows}
    />
  );
}
