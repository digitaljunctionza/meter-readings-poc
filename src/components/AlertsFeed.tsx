import { formatDay, isService, SERVICE_LABEL, SERVICE_UNIT, formatNumber, unitTitle } from "@/lib/clientReport";
import type { ReadingRow } from "@/components/ReadingsTable";
import type { FlagStatus } from "@/lib/types";

const FLAG_COPY: Partial<Record<FlagStatus, string>> = {
  below_prev: "is lower than the previous reading. We're checking it against the meter photo.",
  above_2x_avg: "is higher than usual for this meter. We're checking it against the meter photo.",
  possible_partial: "may not have been captured in full. We're confirming it.",
};

const FLAG_TITLE: Partial<Record<FlagStatus, string>> = {
  below_prev: "lower than last time",
  above_2x_avg: "higher than usual",
  possible_partial: "being confirmed",
};

function Notice({ row }: { row: ReadingRow }) {
  const isReplacement = row.kind === "replacement";
  const known = isService(row.service);
  const unit = known ? SERVICE_UNIT[row.service as "electricity" | "water"] : "";
  const service = known ? SERVICE_LABEL[row.service as "electricity" | "water"].toLowerCase() : row.service;

  return (
    <li
      className={`flex gap-3 rounded-2xl border bg-surface p-4 ${isReplacement ? "border-border" : "border-amber-200"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isReplacement ? "bg-[#e8eef7] text-navy-700" : "bg-amber-50 text-amber-800"
        }`}
        aria-hidden="true"
      >
        {isReplacement ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 2l4 4-4 4M21 6H8a5 5 0 0 0-5 5M7 22l-4-4 4-4M3 18h13a5 5 0 0 0 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7.5v5.5M12 16.5v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-navy-900">
          {isReplacement
            ? `${unitTitle(row.unit_number)} ${service} meter replaced`
            : `${unitTitle(row.unit_number)} ${service} ${FLAG_TITLE[row.flag_status] ?? "being checked"}`}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text-body">
          {isReplacement && row.replacementDetail
            ? `The old meter closed at ${formatNumber(row.replacementDetail.closingValue)} ${unit} and the new one started at ${formatNumber(row.replacementDetail.openingValue)} ${unit}. Your usage totals count both meters.`
            : `This reading (${formatNumber(row.reading_value)} ${unit}) ${FLAG_COPY[row.flag_status] ?? "is being checked."}`}
        </p>
        <p className="mt-1.5 text-[13px] text-[#5d6c80]">{formatDay(row.captured_at)}</p>
      </div>
    </li>
  );
}

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
      <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f2df] text-[#2e6b1d]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-base font-bold text-navy-900">Nothing to check</p>
        <p className="max-w-sm text-sm text-[#5d6c80]">All of your latest readings look normal.</p>
      </div>
    );
  }

  const attention = items.filter((r) => r.kind !== "replacement");
  const info = items.filter((r) => r.kind === "replacement");

  return (
    <div className="flex flex-col gap-5">
      {attention.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-text-body">Needs attention</h3>
          <ul className="flex flex-col gap-2.5">
            {attention.map((r) => (
              <Notice key={r.id} row={r} />
            ))}
          </ul>
        </section>
      )}
      {info.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-text-body">For your information</h3>
          <ul className="flex flex-col gap-2.5">
            {info.map((r) => (
              <Notice key={r.id} row={r} />
            ))}
          </ul>
        </section>
      )}
      {attention.length === 0 && (
        <p className="text-center text-sm text-[#5d6c80]">All other readings look normal.</p>
      )}
    </div>
  );
}
