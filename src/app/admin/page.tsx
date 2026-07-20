import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { buildReportRows } from "@/lib/report";
import { ReadingsTable } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import type { Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; from?: string; to?: string }>;
}) {
  const { property: selectedPropertyId, from, to } = await searchParams;

  const { data: propertyRows } = await supabase.from("properties").select("*").order("name");
  const properties = (propertyRows ?? []) as Property[];

  const activePropertyId = selectedPropertyId || properties[0]?.id;
  const rows = activePropertyId ? await buildReportRows(activePropertyId, { from, to }) : [];
  const activeProperty = properties.find((p) => p.id === activePropertyId);

  const dateSuffix = from || to ? `&from=${from ?? ""}&to=${to ?? ""}` : "";

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 overflow-x-hidden bg-white px-4 py-6">
      <div className="no-print flex min-w-0 items-center gap-3 rounded-2xl bg-accent px-3 py-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white"
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
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          Admin: meter readings
        </h1>
        <Link
          href="/capture"
          className="flex h-8 shrink-0 items-center justify-center rounded-full border-2 border-white px-4 text-sm font-medium text-white"
        >
          Capture
        </Link>
      </div>

      <h1 className="hidden text-lg font-bold text-accent print:block">
        {activeProperty?.name} — meter readings
      </h1>

      <div className="no-print flex flex-wrap gap-2">
        {properties.map((p) => (
          <Link
            key={p.id}
            href={`/admin?property=${p.id}${dateSuffix}`}
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

      {activeProperty && (
        <a
          href={`https://wa.me/27725541634?text=${encodeURIComponent(
            `Hi Wayne, I have a query about the meter readings for ${activeProperty.name}.`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="no-print flex w-fit items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.5 1.34 5.02L2 22l5.13-1.35a9.96 9.96 0 0 0 4.91 1.29h.01c5.52 0 10-4.48 10-10s-4.48-10-10.01-10zm0 18.15a8.1 8.1 0 0 1-4.14-1.13l-.3-.18-3.05.8.81-2.97-.19-.3a8.13 8.13 0 0 1-1.25-4.37c0-4.5 3.66-8.15 8.15-8.15 4.5 0 8.15 3.66 8.15 8.15 0 4.5-3.66 8.15-8.15 8.15h-.03zm4.47-6.11c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14 0-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.36.99 2.52c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z" />
          </svg>
          Message Wayne
        </a>
      )}

      <ReportControls />

      <ReadingsTable rows={rows} />
    </main>
  );
}
