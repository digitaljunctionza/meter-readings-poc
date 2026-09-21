import { formatDay, isService, SERVICE_LABEL, SERVICE_UNIT, formatNumber, unitTitle } from "@/lib/clientReport";
import type { ReadingRow } from "@/components/ReadingsTable";
import type { FlagStatus } from "@/lib/types";

const FLAG_COPY: Partial<Record<FlagStatus, string>> = {
  below_prev: "is lower than the previous reading. We're checking it against the meter photo.",
  above_2x_avg: "is higher than usual for this meter. We're checking it against the meter photo.",
  possible_partial: "may not have been captured in full. We're confirming it.",
};

const BORDER_CLASS: Record<"flag" | "replacement", string> = {
  flag: "border-l-amber-500",
  replacement: "border-l-blue-500",
};

/**
 * Notices for a client: readings we're still checking, and meter swaps that
 * explain a jump in the numbers. The caller passes only rows worth showing.
 */
export function AlertsFeed({ rows }: { rows: ReadingRow[] }) {
  const items = rows
    .filter((r) => r.kind === "replacement" || r.flag_status !== "ok")
    .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
    .slice(0, 30);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">Nothing to check</p>
        <p className="max-w-sm text-sm text-slate-500">All of your latest readings look normal.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => {
        const isReplacement = r.kind === "replacement";
        const known = isService(r.service);
        const unit = known ? SERVICE_UNIT[r.service as "electricity" | "water"] : "";
        const service = known ? SERVICE_LABEL[r.service as "electricity" | "water"].toLowerCase() : r.service;
        return (
          <li
            key={r.id}
            className={`rounded-xl border border-slate-200 border-l-[3px] bg-white p-4 shadow-sm ${BORDER_CLASS[isReplacement ? "replacement" : "flag"]}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold text-navy-900">
                {isReplacement
                  ? `${unitTitle(r.unit_number)}: ${service} meter replaced`
                  : `${unitTitle(r.unit_number)}: ${service} reading being checked`}
              </p>
              <span className="shrink-0 text-xs text-slate-500">{formatDay(r.captured_at)}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {isReplacement && r.replacementDetail
                ? `The old meter closed at ${formatNumber(r.replacementDetail.closingValue)} ${unit} and the new one started at ${formatNumber(r.replacementDetail.openingValue)} ${unit}. Your usage totals account for both.`
                : `This reading (${formatNumber(r.reading_value)} ${unit}) ${FLAG_COPY[r.flag_status] ?? "is being checked."}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
