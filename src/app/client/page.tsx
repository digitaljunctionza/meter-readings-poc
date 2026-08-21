import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildReportRows } from "@/lib/report";
import { formatDate } from "@/lib/date";
import { ReadingsTable } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import { ReportDashboard } from "@/components/ReportDashboard";
import { AlertsFeed } from "@/components/AlertsFeed";
import { LogoutButton } from "@/components/LogoutButton";
import { ComingSoon } from "@/components/ComingSoon";
import { StatTile } from "@/components/StatTile";
import { AlertTriangleIcon, ClockIcon, GaugeIcon } from "@/components/icons";
import type { Property, Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    from?: string;
    to?: string;
    unit?: string;
    service?: string;
    tab?: string;
  }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/client");
  if (profile.role === "admin") redirect("/admin");

  const { property: selectedPropertyId, from, to, unit, service, tab } = await searchParams;
  const hasFilters = !!(from || to || unit || service);
  const activeTab = tab === "alerts" ? "alerts" : "readings";

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

  const activePropertyId = selectedPropertyId || properties[0].id;
  const activeProperty = properties.find((p) => p.id === activePropertyId);

  const dashboardRows = await buildReportRows(activePropertyId);
  const rows = hasFilters
    ? await buildReportRows(activePropertyId, {
        from,
        to,
        unitNumber: unit,
        service: service as Service | undefined,
      })
    : [];

  const readingRowsOnly = dashboardRows.filter((r) => r.kind !== "replacement");
  const meterCount = new Set(readingRowsOnly.map((r) => r.meter_id)).size;
  const latestReadingLabel = dashboardRows.length > 0 ? formatDate(dashboardRows[0].captured_at) : "—";
  const alertCount = dashboardRows.filter((r) => r.kind === "replacement" || r.flag_status !== "ok").length;
  const propertyInitial = (activeProperty?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  const tabHref = (t: "readings" | "alerts") => {
    const qs = new URLSearchParams();
    qs.set("property", activePropertyId);
    if (t === "alerts") qs.set("tab", "alerts");
    return `/client?${qs.toString()}`;
  };

  return (
    <main className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
        <div className="no-print sticky top-0 z-20 -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-navy-900 px-3 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
              {propertyInitial}
            </div>
            <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {activeProperty?.name ?? "My properties"}
            </h1>
            <Link
              href="/client/settings"
              aria-label="Settings"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M19.4 13a7.97 7.97 0 000-2l2.1-1.6-2-3.5-2.5 1a8 8 0 00-1.7-1L14.9 3h-3.8l-.4 2.9a8 8 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.97 7.97 0 000 2l-2.1 1.6 2 3.5 2.5-1a8 8 0 001.7 1l.4 2.9h3.8l.4-2.9a8 8 0 001.7-1l2.5 1 2-3.5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

        <h1 className="hidden text-lg font-bold text-navy-900 print:block">
          {activeProperty?.name} — meter readings
        </h1>

        {properties.length > 1 && (
          <div className="no-print flex flex-wrap gap-2">
            {properties.map((p) => (
              <Link
                key={p.id}
                href={`/client?property=${p.id}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  p.id === activePropertyId
                    ? "border-green-500 bg-green-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-green-500 hover:text-green-700"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}

        <div className="no-print flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600">Meter reading history and consumption report.</p>
          <ComingSoon label="Cost & tariffs" />
        </div>

        {dashboardRows.length > 0 && (
          <div className="no-print grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              icon={<GaugeIcon className="h-4 w-4" />}
              label="Meters tracked"
              value={String(meterCount)}
            />
            <StatTile
              icon={<ClockIcon className="h-4 w-4" />}
              label="Latest reading"
              value={latestReadingLabel}
            />
            <StatTile
              icon={<AlertTriangleIcon className="h-4 w-4" />}
              label="Alerts"
              value={String(alertCount)}
              tone={alertCount > 0 ? "warning" : "default"}
            />
          </div>
        )}

        <div className="no-print flex gap-1 border-b border-slate-200">
          <Link
            href={tabHref("readings")}
            className={`px-1 pb-2.5 text-[13px] font-semibold ${
              activeTab === "readings" ? "border-b-2 border-green-500 text-navy-900" : "text-slate-500"
            }`}
          >
            Readings
          </Link>
          <Link
            href={tabHref("alerts")}
            className={`ml-5 px-1 pb-2.5 text-[13px] font-semibold ${
              activeTab === "alerts" ? "border-b-2 border-green-500 text-navy-900" : "text-slate-500"
            }`}
          >
            Alerts
            {alertCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                {alertCount}
              </span>
            )}
          </Link>
        </div>

        {activeTab === "alerts" ? (
          <AlertsFeed rows={dashboardRows} />
        ) : (
          <>
            <ReportControls hasResults={rows.length > 0} />
            <ReadingsTable rows={rows} />
            <ReportDashboard rows={dashboardRows} />
          </>
        )}
      </div>
    </main>
  );
}
