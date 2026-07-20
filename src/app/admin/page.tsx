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
        <p className="no-print flex min-w-0 flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:gap-2">
          <span className="shrink-0">Owner report link:</span>
          <span className="min-w-0 break-all font-mono text-accent">
            /report/{activeProperty.owner_share_token}
          </span>
        </p>
      )}

      <ReportControls />

      <ReadingsTable rows={rows} />
    </main>
  );
}
