import { ReadingsTable, type ReadingRow } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import { ReportDashboard } from "@/components/ReportDashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { ComingSoon } from "@/components/ComingSoon";
import { StatTile } from "@/components/StatTile";
import { AlertTriangleIcon, ClockIcon, GaugeIcon } from "@/components/icons";
import { formatDate } from "@/lib/date";

/**
 * Fixture-data-only stand-in for /client — lets the redesign be viewed in a
 * browser without a real Supabase project or login. Not linked from any nav.
 * Safe to delete once the real page has been checked against real data.
 */

const MOCK_PROPERTIES = [
  { id: "p1", name: "Ocean View Apartments" },
  { id: "p2", name: "Harbor Heights" },
];

function buildMockRows(): ReadingRow[] {
  const entries: Omit<ReadingRow, "notes">[] = [
    // Unit 101 — electricity
    { id: "e1-1", captured_at: "2026-03-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1200, previous_value: null, usage: null, flag_status: "ok", photo_url: null },
    { id: "e1-2", captured_at: "2026-04-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1350, previous_value: 1200, usage: 150, flag_status: "ok", photo_url: "https://placehold.co/400x300" },
    { id: "e1-3", captured_at: "2026-05-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1500, previous_value: 1350, usage: 150, flag_status: "ok", photo_url: null },
    { id: "e1-4", captured_at: "2026-06-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1480, previous_value: 1500, usage: -20, flag_status: "below_prev", photo_url: null },
    { id: "e1-5", captured_at: "2026-07-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1700, previous_value: 1480, usage: 220, flag_status: "above_2x_avg", photo_url: "https://placehold.co/400x300" },
    { id: "e1-6", captured_at: "2026-08-01T08:00:00Z", meter_id: "e1", meter_label: "Unit 101 Electricity", unit_number: "101", service: "electricity", reading_value: 1750, previous_value: 1700, usage: 50, flag_status: "possible_partial", photo_url: null },

    // Unit 102 — electricity
    { id: "e2-1", captured_at: "2026-03-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 800, previous_value: null, usage: null, flag_status: "ok", photo_url: null },
    { id: "e2-2", captured_at: "2026-04-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 900, previous_value: 800, usage: 100, flag_status: "ok", photo_url: null },
    { id: "e2-3", captured_at: "2026-05-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 1000, previous_value: 900, usage: 100, flag_status: "ok", photo_url: null },
    { id: "e2-4", captured_at: "2026-06-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 1100, previous_value: 1000, usage: 100, flag_status: "ok", photo_url: null },
    { id: "e2-5", captured_at: "2026-07-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 1210, previous_value: 1100, usage: 110, flag_status: "ok", photo_url: null },
    { id: "e2-6", captured_at: "2026-08-05T08:00:00Z", meter_id: "e2", meter_label: "Unit 102 Electricity", unit_number: "102", service: "electricity", reading_value: 1300, previous_value: 1210, usage: 90, flag_status: "ok", photo_url: null },

    // Unit 101 — water
    { id: "w1-1", captured_at: "2026-03-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 45, previous_value: null, usage: null, flag_status: "ok", photo_url: null },
    { id: "w1-2", captured_at: "2026-04-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 52, previous_value: 45, usage: 7, flag_status: "ok", photo_url: null },
    { id: "w1-3", captured_at: "2026-05-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 58, previous_value: 52, usage: 6, flag_status: "ok", photo_url: null },
    { id: "w1-4", captured_at: "2026-06-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 50, previous_value: 58, usage: -8, flag_status: "below_prev", photo_url: null },
    { id: "w1-5", captured_at: "2026-07-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 70, previous_value: 50, usage: 20, flag_status: "above_2x_avg", photo_url: "https://placehold.co/400x300" },
    { id: "w1-6", captured_at: "2026-08-10T08:00:00Z", meter_id: "w1", meter_label: "Unit 101 Water", unit_number: "101", service: "water", reading_value: 74, previous_value: 70, usage: 4, flag_status: "ok", photo_url: null },

    // Communal — main water meter
    { id: "w2-1", captured_at: "2026-03-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 500, previous_value: null, usage: null, flag_status: "ok", photo_url: null },
    { id: "w2-2", captured_at: "2026-04-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 540, previous_value: 500, usage: 40, flag_status: "ok", photo_url: null },
    { id: "w2-3", captured_at: "2026-05-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 560, previous_value: 540, usage: 20, flag_status: "ok", photo_url: null },
    { id: "w2-4", captured_at: "2026-06-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 590, previous_value: 560, usage: 30, flag_status: "ok", photo_url: null },
    { id: "w2-5", captured_at: "2026-07-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 600, previous_value: 590, usage: 10, flag_status: "possible_partial", photo_url: null },
    { id: "w2-6", captured_at: "2026-08-12T08:00:00Z", meter_id: "w2", meter_label: "Main Water Meter", unit_number: "Main Water Meter", service: "water", reading_value: 650, previous_value: 600, usage: 50, flag_status: "ok", photo_url: null },
  ];

  return entries
    .map((e) => ({ ...e, notes: null }))
    .sort((a, b) => b.captured_at.localeCompare(a.captured_at));
}

export default async function ClientPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { property: selectedPropertyId } = await searchParams;
  const activePropertyId = selectedPropertyId || MOCK_PROPERTIES[0].id;
  const activeProperty = MOCK_PROPERTIES.find((p) => p.id === activePropertyId);

  const dashboardRows = buildMockRows();
  const rows = dashboardRows;

  const meterCount = new Set(dashboardRows.map((r) => r.meter_id)).size;
  const latestReadingLabel = dashboardRows.length > 0 ? formatDate(dashboardRows[0].captured_at) : "—";
  const flaggedCount = dashboardRows.filter((r) => r.flag_status !== "ok").length;
  const propertyInitial = (activeProperty?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
        <div className="no-print rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          Preview mode — fixture data, no login required. Not linked from the app; safe to remove
          later.
        </div>

        <div className="no-print sticky top-0 z-20 -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-accent px-3 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {propertyInitial}
            </div>
            <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {activeProperty?.name ?? "My properties"}
            </h1>
            <LogoutButton className="flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" />
          </div>
        </div>

        {MOCK_PROPERTIES.length > 1 && (
          <div className="no-print flex flex-wrap gap-2">
            {MOCK_PROPERTIES.map((p) => (
              <a
                key={p.id}
                href={`/preview/client?property=${p.id}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  p.id === activePropertyId
                    ? "border-accent bg-accent text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent"
                }`}
              >
                {p.name}
              </a>
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
              label="Flagged readings"
              value={String(flaggedCount)}
              tone={flaggedCount > 0 ? "warning" : "default"}
            />
          </div>
        )}

        <ReportDashboard rows={dashboardRows} />

        <ReportControls hasResults={rows.length > 0} />

        <ReadingsTable rows={rows} />
      </div>
    </main>
  );
}
