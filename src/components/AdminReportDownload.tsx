"use client";

import { useState } from "react";
import { loadReportSections } from "@/app/admin/reports/actions";
import { downloadReadingsPdf } from "@/lib/readingsPdf";
import { haptic } from "@/lib/haptics";

/**
 * Admin "Download report": the selected property, or every property in one
 * PDF (one section per property). Filters set on the page narrow the table
 * the same way they narrow the on-screen readings.
 */
export function AdminReportDownload({
  propertyId,
  propertyName,
  clientName,
  filters,
}: {
  propertyId: string;
  propertyName: string;
  clientName: string | null;
  filters: { from?: string; to?: string; unit?: string; service?: string };
}) {
  const [scope, setScope] = useState<"one" | "all">("one");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = !!(filters.from || filters.to || filters.unit || filters.service);
  const periodText =
    filters.from && filters.to
      ? `${filters.from} to ${filters.to}`
      : filters.from
        ? `Since ${filters.from}`
        : filters.to
          ? `Up to ${filters.to}`
          : "All readings";
  const filterText = [filters.unit ? `Unit "${filters.unit}"` : null, filters.service ? filters.service : null]
    .filter(Boolean)
    .join(" · ");

  async function handleDownload() {
    haptic("tap");
    setError(null);
    setBusy(true);
    try {
      const sections = await loadReportSections(scope === "all" ? "all" : propertyId, {
        from: filters.from,
        to: filters.to,
        unitNumber: filters.unit,
        service: filters.service === "electricity" || filters.service === "water" ? filters.service : undefined,
      });
      await downloadReadingsPdf({
        preparedFor: scope === "all" ? "All clients" : (clientName ?? propertyName),
        scopeLabel: scope === "all" ? "All properties" : propertyName,
        periodText,
        filterText: filterText || null,
        sections,
      });
    } catch {
      setError("We couldn't create the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label="What to include" className="grid grid-cols-2 gap-1 rounded-xl bg-divider p-1">
        {(
          [
            ["one", propertyName],
            ["all", "All properties"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            aria-pressed={scope === key}
            className={`min-h-11 truncate rounded-[9px] px-2 text-sm ${
              scope === key ? "bg-surface font-bold text-navy-900 shadow-[0_1px_3px_rgba(12,31,61,0.12)]" : "font-semibold text-[#5d6c80]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-border-strong bg-surface text-[15px] font-bold text-navy-700 hover:bg-app-bg disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? "Preparing report…" : "Download report"}
      </button>
      <p className="text-[13px] text-[#5d6c80]">
        {hasFilters ? "Uses the filters below for the readings table." : "Includes every reading on record."}
      </p>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
