import { formatDate } from "@/lib/date";
import type { ReadingRow } from "@/components/ReadingsTable";
import type { FlagStatus } from "@/lib/types";

const FLAG_COPY: Partial<Record<FlagStatus, string>> = {
  below_prev: "came in below the previous reading",
  above_2x_avg: "was well above this meter's own average",
  possible_partial: "looks like an incomplete entry — Wayne will confirm",
};

const BORDER_CLASS: Record<"flag" | "replacement", string> = {
  flag: "border-l-amber-600",
  replacement: "border-l-blue-500",
};

export function AlertsFeed({ rows }: { rows: ReadingRow[] }) {
  const items = rows
    .filter((r) => r.kind === "replacement" || r.flag_status !== "ok")
    .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
    .slice(0, 30);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="max-w-sm text-sm text-slate-500">No alerts — everything reads normally.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((r) => {
        const isReplacement = r.kind === "replacement";
        return (
          <div
            key={r.id}
            className={`rounded-xl border border-slate-200 border-l-[3px] bg-white p-3.5 ${BORDER_CLASS[isReplacement ? "replacement" : "flag"]}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-semibold text-navy-900">
                {isReplacement ? `Meter replaced at ${r.unit_number}` : `${r.unit_number} · ${r.service} needs a second look`}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-text-faint tabular-nums">{formatDate(r.captured_at)}</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-text-body">
              {isReplacement && r.replacementDetail
                ? `Old meter closed at ${r.replacementDetail.closingValue.toLocaleString()}, new one started at ${r.replacementDetail.openingValue.toLocaleString()}. Your usage total accounts for both.`
                : `This reading (${r.reading_value.toLocaleString()}) ${FLAG_COPY[r.flag_status] ?? "needs a second look"}.`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
