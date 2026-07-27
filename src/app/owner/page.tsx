import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildReportRows } from "@/lib/report";
import { ReadingsTable } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import { ReportDashboard } from "@/components/ReportDashboard";
import { LogoutButton } from "@/components/LogoutButton";
import type { Property, Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    from?: string;
    to?: string;
    unit?: string;
    service?: string;
    searched?: string;
  }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/owner");
  if (profile.role === "admin") redirect("/admin");

  const { property: selectedPropertyId, from, to, unit, service, searched } = await searchParams;
  const hasSearched = searched === "1";

  const supabase = await createClient();
  const { data: propertyRows } = await supabase.from("properties").select("*").order("name");
  const properties = (propertyRows ?? []) as Property[];

  if (properties.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-white px-5 py-6 text-center">
        <p className="text-sm text-gray-600">
          You don&apos;t have access to any properties yet. Ask Wayne to send you an invite link.
        </p>
        <LogoutButton className="rounded-full border-2 border-accent-light px-4 py-2.5 text-sm font-medium text-accent" />
      </main>
    );
  }

  const activePropertyId = selectedPropertyId || properties[0].id;
  const activeProperty = properties.find((p) => p.id === activePropertyId);

  const dashboardRows = await buildReportRows(activePropertyId);
  const rows = hasSearched
    ? await buildReportRows(activePropertyId, {
        from,
        to,
        unitNumber: unit,
        service: service as Service | undefined,
      })
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 overflow-x-hidden bg-white px-4 py-6">
      <div className="no-print flex min-w-0 items-center gap-3 rounded-2xl bg-accent px-3 py-3">
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          {activeProperty?.name ?? "My properties"}
        </h1>
        <LogoutButton className="flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-white/80" />
      </div>

      {properties.length > 1 && (
        <div className="no-print flex flex-wrap gap-2">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/owner?property=${p.id}`}
              className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                p.id === activePropertyId
                  ? "border-accent bg-accent text-white"
                  : "border-accent-light text-gray-700 hover:border-accent"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-600">Meter reading history and consumption report.</p>

      <ReportDashboard rows={dashboardRows} />

      <ReportControls hasResults={hasSearched && rows.length > 0} />

      <ReadingsTable rows={rows} hasSearched={hasSearched} />
    </main>
  );
}
