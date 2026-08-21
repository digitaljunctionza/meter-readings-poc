"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/date";
import type { FlagStatus } from "@/lib/types";
import { SearchIcon } from "@/components/icons";

export interface ReadingRow {
  id: string;
  kind?: "reading" | "replacement";
  captured_at: string;
  meter_id: string;
  meter_label: string;
  /** Unit number for per-unit meters; the meter label for communal ones. */
  unit_number: string;
  service: string;
  reading_value: number;
  previous_value: number | null;
  usage: number | null;
  flag_status: FlagStatus;
  photo_url: string | null;
  notes: string | null;
  /** kind: "replacement" only — old/new meter identifiers for the marker copy. */
  replacementDetail?: {
    oldSerial: string | null;
    newSerial: string | null;
    closingValue: number;
    openingValue: number;
  };
}

const FLAG_LABEL: Record<FlagStatus, string> = {
  ok: "OK",
  below_prev: "Below previous",
  above_2x_avg: "Above 2x average",
  possible_partial: "Possible partial entry",
};

const FLAG_CLASS: Record<FlagStatus, string> = {
  ok: "border-green-200 text-green-700",
  below_prev: "border-red-200 text-red-700",
  above_2x_avg: "border-orange-200 text-orange-700",
  possible_partial: "border-accent-light text-accent",
};

const FLAG_DOT_CLASS: Record<FlagStatus, string> = {
  ok: "bg-green-500",
  below_prev: "bg-red-500",
  above_2x_avg: "bg-orange-500",
  possible_partial: "bg-accent",
};

type SortKey = "date" | "unit";
type SortDir = "asc" | "desc";

function compareUnitNumbers(a: string, b: string): number {
  const numA = Number.parseFloat(a);
  const numB = Number.parseFloat(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

function SortIcon({ direction }: { direction: SortDir | null }) {
  if (!direction) return null;
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block transition-transform ${direction === "asc" ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchIcon className="h-5 w-5" />
      </div>
      <p className="max-w-sm text-sm text-slate-500">{children}</p>
    </div>
  );
}

export function ReadingsTable({ rows }: { rows: ReadingRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp =
        sortKey === "date"
          ? a.captured_at.localeCompare(b.captured_at)
          : compareUnitNumbers(a.unit_number, b.unit_number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelected(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  if (rows.length === 0) {
    return <EmptyState>Use the filters above to find specific readings.</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-1 rounded transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Date
                  <SortIcon direction={sortKey === "date" ? sortDir : null} />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("unit")}
                  className="flex items-center gap-1 rounded transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Unit
                  <SortIcon direction={sortKey === "unit" ? sortDir : null} />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Service
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Reading
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Previous
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Usage
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Photo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((r) =>
              r.kind === "replacement" ? (
                <tr key={r.id} className="bg-amber-50">
                  <td colSpan={8} className="px-3 py-2.5 text-xs text-amber-800">
                    <span className="font-semibold text-amber-900">Unit {r.unit_number} · {r.service}</span> —
                    meter replaced {formatDateTime(r.captured_at)}.{" "}
                    {r.replacementDetail && (
                      <>
                        {r.replacementDetail.oldSerial ? `${r.replacementDetail.oldSerial} ` : "Old meter "}
                        closed {r.replacementDetail.closingValue.toLocaleString()} →{" "}
                        {r.replacementDetail.newSerial ? `${r.replacementDetail.newSerial} ` : "new meter "}
                        opened {r.replacementDetail.openingValue.toLocaleString()}.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
              <tr
                key={r.id}
                tabIndex={0}
                onClick={() => toggleSelected(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSelected(r.id);
                  }
                }}
                className={`cursor-pointer outline-none transition-colors focus-visible:bg-accent-light/60 ${
                  selectedId === r.id ? "bg-accent-light/60" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-slate-700">
                  {formatDateTime(r.captured_at)}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-900">{r.unit_number}</td>
                <td className="px-3 py-2.5 text-slate-600 capitalize">{r.service}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                  {r.reading_value.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {r.previous_value !== null ? r.previous_value.toLocaleString("en-US") : "-"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">
                  {r.usage !== null ? r.usage.toLocaleString("en-US") : "-"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs font-medium whitespace-nowrap ${FLAG_CLASS[r.flag_status]}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${FLAG_DOT_CLASS[r.flag_status]}`}
                      aria-hidden="true"
                    />
                    {FLAG_LABEL[r.flag_status]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {r.photo_url ? (
                    <a
                      href={r.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded font-medium text-accent underline decoration-accent-light underline-offset-2 hover:decoration-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
