"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/date";
import type { FlagStatus } from "@/lib/types";

export interface ReadingRow {
  id: string;
  captured_at: string;
  unit_number: string;
  service: string;
  reading_value: number;
  previous_value: number | null;
  usage: number | null;
  flag_status: FlagStatus;
  photo_url: string | null;
  notes: string | null;
}

const FLAG_LABEL: Record<FlagStatus, string> = {
  ok: "OK",
  below_prev: "Below previous",
  above_2x_avg: "Above 2x average",
  possible_partial: "Possible partial entry",
};

const FLAG_CLASS: Record<FlagStatus, string> = {
  ok: "border-green-300 text-green-700",
  below_prev: "border-red-300 text-red-700",
  above_2x_avg: "border-orange-300 text-orange-700",
  possible_partial: "border-accent text-accent",
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

export function ReadingsTable({
  rows,
  hasSearched,
}: {
  rows: ReadingRow[];
  hasSearched: boolean;
}) {
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

  if (!hasSearched) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-accent-light px-4 py-6 text-center text-sm text-gray-500">
        Enter a unit number, service, and/or date range above, then press Look up.
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="text-gray-500">No readings found for that search.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-accent-light">
      <table className="min-w-full divide-y divide-accent-light text-sm">
        <thead className="bg-accent-light">
          <tr>
            <th className="px-3 py-2 text-left font-bold text-accent">
              <button
                type="button"
                onClick={() => handleSort("date")}
                className="flex items-center gap-1"
              >
                Date
                <SortIcon direction={sortKey === "date" ? sortDir : null} />
              </button>
            </th>
            <th className="px-3 py-2 text-left font-bold text-accent">
              <button
                type="button"
                onClick={() => handleSort("unit")}
                className="flex items-center gap-1"
              >
                Unit
                <SortIcon direction={sortKey === "unit" ? sortDir : null} />
              </button>
            </th>
            <th className="px-3 py-2 text-left font-bold text-accent">Service</th>
            <th className="px-3 py-2 text-right font-bold text-accent">Reading</th>
            <th className="px-3 py-2 text-right font-bold text-accent">Previous</th>
            <th className="px-3 py-2 text-right font-bold text-accent">Usage</th>
            <th className="px-3 py-2 text-left font-bold text-accent">Status</th>
            <th className="px-3 py-2 text-left font-bold text-accent">Photo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-accent-light">
          {sortedRows.map((r) => (
            <tr
              key={r.id}
              onClick={() => setSelectedId((current) => (current === r.id ? null : r.id))}
              className={`cursor-pointer ${
                selectedId === r.id ? "bg-accent-light" : "hover:bg-accent-light/40"
              }`}
            >
              <td className="whitespace-nowrap px-3 py-2">
                {formatDateTime(r.captured_at)}
              </td>
              <td className="px-3 py-2">{r.unit_number}</td>
              <td className="px-3 py-2 capitalize">{r.service}</td>
              <td className="px-3 py-2 text-right">{r.reading_value.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">
                {r.previous_value !== null ? r.previous_value.toLocaleString() : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {r.usage !== null ? r.usage.toLocaleString() : "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={`whitespace-nowrap rounded-full border-2 bg-white px-2 py-1 text-xs font-medium ${FLAG_CLASS[r.flag_status]}`}
                >
                  {FLAG_LABEL[r.flag_status]}
                </span>
              </td>
              <td className="px-3 py-2">
                {r.photo_url ? (
                  <a
                    href={r.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    View
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
