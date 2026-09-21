"use client";

import { useMemo, useState } from "react";
import type { ReadingRow } from "@/components/ReadingsTable";
import { ReadingDetailModal } from "@/components/ReadingDetailModal";
import { BoltIcon, DownloadIcon, DropletIcon, SearchIcon, XIcon } from "@/components/icons";
import { TONE_CLASS } from "@/lib/flagDisplay";
import { downloadReadingsPdf } from "@/lib/readingsPdf";
import {
  clientStatus,
  filterReadings,
  formatDay,
  formatNumber,
  isService,
  latestMonthKey,
  PERIOD_OPTIONS,
  periodLabel,
  SERVICE_COLOR,
  SERVICE_LABEL,
  SERVICE_UNIT,
  unitTitle,
  type PeriodKey,
  type SortKey,
} from "@/lib/clientReport";
import type { Service } from "@/lib/types";

const PAGE_SIZE = 25;

const controlClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export function ReadingsExplorer({
  propertyName,
  rows,
  openIds,
}: {
  propertyName: string;
  rows: ReadingRow[];
  openIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState<Service | "all">("all");
  const [period, setPeriod] = useState<PeriodKey>("latest");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const latestKey = useMemo(() => latestMonthKey(rows), [rows]);
  const results = useMemo(
    () => filterReadings(rows, { query, service, period, sort, latestKey }),
    [rows, query, service, period, sort, latestKey]
  );

  const openRow = openId ? (results.find((r) => r.id === openId) ?? rows.find((r) => r.id === openId) ?? null) : null;
  const period_ = periodLabel(period, latestKey);
  const hasFilters = query.trim() !== "" || service !== "all";

  function change(update: () => void) {
    update();
    setVisible(PAGE_SIZE);
  }

  async function handleDownload() {
    setPdfError(null);
    setPreparing(true);
    try {
      const filterParts: string[] = [];
      if (query.trim()) filterParts.push(`Unit "${query.trim()}"`);
      if (service !== "all") filterParts.push(SERVICE_LABEL[service]);
      await downloadReadingsPdf({
        propertyName,
        periodText: period_,
        filterText: filterParts.length > 0 ? filterParts.join(" · ") : null,
        rows: results,
        openIssueIds: openIds,
      });
    } catch {
      setPdfError("We couldn't create the PDF. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  if (!latestKey) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <SearchIcon className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No readings yet</p>
        <p className="max-w-sm text-sm text-slate-500">
          Your readings will appear here after the next meter round.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Meter readings">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">Meter readings</h2>
          <p className="text-sm text-slate-500" aria-live="polite">
            {formatNumber(results.length)} reading{results.length === 1 ? "" : "s"} · {period_}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={preparing || results.length === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
          {preparing ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {pdfError && <p className="text-sm text-red-700">{pdfError}</p>}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Find a unit</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => change(() => setQuery(e.target.value))}
            placeholder="Find a unit, e.g. 101"
            className={`${controlClass} w-full pl-9`}
          />
        </label>

        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Service">
          {(["all", "electricity", "water"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={service === s}
              onClick={() => change(() => setService(s))}
              className={`min-h-10 flex-1 rounded-[10px] px-3 text-sm font-semibold transition-colors sm:flex-none ${
                service === s ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s === "all" ? "All" : SERVICE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Period</span>
            <select
              value={period}
              onChange={(e) => change(() => setPeriod(e.target.value as PeriodKey))}
              className={`${controlClass} w-full`}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => change(() => setSort(e.target.value as SortKey))}
              className={`${controlClass} w-full`}
            >
              <option value="newest">Newest first</option>
              <option value="unit">Unit number</option>
            </select>
          </label>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-10 text-center">
          <p className="max-w-sm text-sm text-slate-500">
            No readings match{hasFilters ? " those filters" : " this period"}. Try a different unit, service or period.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() =>
                change(() => {
                  setQuery("");
                  setService("all");
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              <XIcon className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.slice(0, visible).map((r) => {
            const known = isService(r.service);
            const svc = known ? (r.service as Service) : "electricity";
            const unit = SERVICE_UNIT[svc];
            const status = clientStatus(r, openIds.has(r.id));
            const Icon = svc === "electricity" ? BoltIcon : DropletIcon;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4 sm:px-4"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${SERVICE_COLOR[svc]}1a`, color: SERVICE_COLOR[svc] }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-navy-900">
                      {unitTitle(r.unit_number)}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {SERVICE_LABEL[svc]} · {formatDay(r.captured_at)}
                    </span>
                    {r.flag_status !== "ok" && (
                      <span
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[status.tone].pill}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${TONE_CLASS[status.tone].dot}`} aria-hidden="true" />
                        {status.label}
                      </span>
                    )}
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[15px] font-bold tabular-nums text-navy-900">
                      {formatNumber(r.reading_value)}
                      <span className="ml-1 font-sans text-xs font-semibold text-slate-400">{unit}</span>
                    </span>
                    <span className="block text-xs text-slate-500">
                      {r.usage !== null && r.usage >= 0 ? `Used ${formatNumber(r.usage)} ${unit}` : "First reading"}
                    </span>
                  </span>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="hidden shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 sm:block"
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {results.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mx-auto min-h-11 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
        >
          Show {Math.min(PAGE_SIZE, results.length - visible)} more ({formatNumber(results.length - visible)} remaining)
        </button>
      )}

      {openRow && (
        <ReadingDetailModal
          row={openRow}
          onClose={() => setOpenId(null)}
          audience="client"
          openIssue={openIds.has(openRow.id)}
        />
      )}
    </section>
  );
}
