import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildReportRows } from "@/lib/report";
import { ReadingsTable } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import { ReportDashboard } from "@/components/ReportDashboard";
import { ComingSoon } from "@/components/ComingSoon";
import { BottomNav } from "@/components/BottomNav";
import type { Client, Property, Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    from?: string;
    to?: string;
    unit?: string;
    service?: string;
  }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/reports");
  if (profile.role !== "admin") redirect("/client");

  const { property: selectedPropertyId, from, to, unit, service } = await searchParams;
  const hasFilters = !!(from || to || unit || service);

  const supabase = await createClient();
  const { data: propertyRows } = await supabase.from("properties").select("*").order("name");
  const properties = (propertyRows ?? []) as Property[];

  const { data: clientRows } = await supabase.from("clients").select("*").order("name");
  const clients = (clientRows ?? []) as Client[];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const activePropertyId = selectedPropertyId || properties[0]?.id;
  const activeProperty = properties.find((p) => p.id === activePropertyId);
  const activeClient = activeProperty ? clientById.get(activeProperty.client_id) : undefined;

  // The table only shows something once at least one filter is set — the
  // KPI cards/charts below still use the full unfiltered history regardless.
  const dashboardRows = activePropertyId ? await buildReportRows(activePropertyId) : [];
  const rows =
    activePropertyId && hasFilters
      ? await buildReportRows(activePropertyId, {
          from,
          to,
          unitNumber: unit,
          service: service as Service | undefined,
        })
      : [];

  const readingRows = dashboardRows.filter((r) => r.kind !== "replacement");
  const flaggedRows = readingRows.filter((r) => r.flag_status !== "ok");

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5 overflow-x-hidden bg-white px-4 py-6 pb-32">
      <div className="no-print flex min-w-0 items-center gap-3 rounded-2xl bg-navy-700 px-3 py-3">
        <Link
          href="/admin"
          aria-label="Back to dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">Reports</h1>
      </div>

      <h1 className="hidden text-lg font-bold text-navy-900 print:block">
        {activeProperty?.name} — meter readings
      </h1>

      {properties.length === 0 ? (
        <p className="text-sm text-gray-500">
          No properties yet.{" "}
          <Link href="/admin/clients" className="text-accent underline">
            Add a client and property
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="no-print flex flex-wrap gap-2">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/admin/reports?property=${p.id}`}
              className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                p.id === activePropertyId
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-border text-gray-700 hover:border-green-500"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {activeClient && (
        <p className="no-print text-sm text-gray-500">
          Client: <span className="font-medium text-gray-700">{activeClient.name}</span>
        </p>
      )}

      <ReportControls hasResults={rows.length > 0} />

      <ReadingsTable rows={rows} />

      {flaggedRows.length > 0 && (
        <div className="no-print flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-600" aria-hidden="true">
            <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </svg>
          <p className="min-w-0 flex-1 text-sm text-amber-800">
            <b className="text-amber-900">
              {flaggedRows.length} reading{flaggedRows.length === 1 ? "" : "s"} need
              {flaggedRows.length === 1 ? "s" : ""} a second look
            </b>{" "}
            — compared against each meter&apos;s own trailing average.
          </p>
          <Link
            href="/admin/review"
            className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800"
          >
            Review
          </Link>
        </div>
      )}

      <ReportDashboard rows={dashboardRows} />

      <div className="no-print"><ComingSoon label="Cost & tariffs" /></div>

      <BottomNav />
    </main>
  );
}
