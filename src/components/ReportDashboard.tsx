"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarGradient, ChartTooltip, compactNumber } from "@/components/charts/chartBits";
import { StatusArc } from "@/components/charts/StatusArc";
import { BoltIcon, DropletIcon } from "@/components/icons";
import { ADMIN_FLAG_LABEL as FLAG_LABEL } from "@/lib/flagDisplay";
import { monthLabel, monthKey, monthShort } from "@/lib/clientReport";
import type { ReadingRow } from "@/components/ReadingsTable";
import type { FlagStatus, Service } from "@/lib/types";

const FLAG_COLOR: Record<FlagStatus, string> = {
  ok: "#22c55e",
  below_prev: "#ef4444",
  above_2x_avg: "#f97316",
  possible_partial: "#2fb6de",
};

const SERVICE_META: Record<
  Service,
  { label: string; color: string; softBg: string; unit: string; Icon: typeof BoltIcon }
> = {
  electricity: { label: "Electricity", color: "#d97706", softBg: "bg-amber-50", unit: "kWh", Icon: BoltIcon },
  water: { label: "Water", color: "#2563eb", softBg: "bg-blue-50", unit: "kl", Icon: DropletIcon },
};

/**
 * Readings whose usage is wildly out of line with the median for this
 * service — the signature of a reading typed with an extra digit, which
 * inflates a whole month's total on its own. Compared against the median
 * rather than the mean so the outliers don't drag the yardstick up with them.
 */
function implausibleReadings(rows: ReadingRow[]): ReadingRow[] {
  const usages = rows
    .map((r) => r.usage)
    .filter((u): u is number => u !== null && u > 0)
    .sort((a, b) => a - b);
  if (usages.length < 6) return [];
  const median = usages[Math.floor(usages.length / 2)];
  if (median <= 0) return [];
  return rows
    .filter((r) => r.usage !== null && r.usage > median * 50)
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0));
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      {/* Grid rows stretch to the tallest panel, so centre the contents rather
          than leaving the shorter one top-heavy with dead space beneath. */}
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

function UtilityDashboard({ service, rows }: { service: Service; rows: ReadingRow[] }) {
  const meta = SERVICE_META[service];
  const Icon = meta.Icon;

  const flagCounts: Record<FlagStatus, number> = { ok: 0, below_prev: 0, above_2x_avg: 0, possible_partial: 0 };
  for (const r of rows) flagCounts[r.flag_status]++;

  const pieData = (Object.keys(flagCounts) as FlagStatus[])
    .filter((status) => flagCounts[status] > 0)
    .map((status) => ({ name: FLAG_LABEL[status], value: flagCounts[status], status }));

  const monthlyUsage = new Map<string, { month: string; label: string; usage: number }>();
  for (const r of rows) {
    if (r.usage === null || r.usage < 0) continue;
    const month = monthKey(r.captured_at);
    const entry = monthlyUsage.get(month) ?? { month, label: monthShort(month), usage: 0 };
    entry.usage += r.usage;
    monthlyUsage.set(month, entry);
  }
  const trendData = [...monthlyUsage.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((d) => ({ ...d, usage: Math.round(d.usage) }));

  if (rows.length === 0) return null;

  const flagged = rows.length - flagCounts.ok;
  const okPct = rows.length > 0 ? Math.round((flagCounts.ok / rows.length) * 100) : 0;
  const average =
    trendData.length > 1 ? trendData.reduce((sum, d) => sum + d.usage, 0) / trendData.length : null;
  const suspect = implausibleReadings(rows);
  const gradientId = `admin-bar-${service}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.softBg}`}
          style={{ color: meta.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold" style={{ color: meta.color }}>
          {meta.label}
        </p>
        <span className="text-xs text-slate-500">
          {rows.length} reading{rows.length === 1 ? "" : "s"}
          {flagged > 0 && ` · ${flagged} flagged`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel title="Reading status breakdown">
          <div className="flex items-center gap-3">
            <StatusArc
              segments={pieData.map((entry) => ({
                key: entry.status,
                label: entry.name,
                value: entry.value,
                color: FLAG_COLOR[entry.status],
              }))}
              centerValue={`${okPct}%`}
              centerLabel="OK"
              ariaLabel={`${okPct}% of ${meta.label.toLowerCase()} readings are OK. ${pieData
                .map((e) => `${e.name}: ${e.value}`)
                .join(". ")}.`}
            />

            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {pieData.map((entry) => (
                <li key={entry.status} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: FLAG_COLOR[entry.status] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-600">{entry.name}</span>
                  <span className="font-mono font-bold tabular-nums text-navy-900">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Monthly usage">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <BarGradient id={gradientId} color={meta.color} />
                </defs>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={2}
                />
                {/* An explicit axis, so a month inflated by a mistyped reading is
                    visible as an outlier instead of silently rescaling the rest. */}
                <YAxis
                  width={46}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={compactNumber}
                />
                {average !== null && (
                  <ReferenceLine y={Math.round(average)} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.2} />
                )}
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)", radius: 6 }}
                  content={
                    <ChartTooltip
                      suffix={meta.unit}
                      labelFormatter={(label) => {
                        const match = trendData.find((d) => d.label === label);
                        return match ? monthLabel(match.month) : label;
                      }}
                    />
                  }
                />
                <Bar dataKey="usage" radius={[7, 7, 3, 3]} maxBarSize={56} fill={`url(#${gradientId})`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {suspect.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
              <p>
                <b className="font-bold">
                  {suspect.length} reading{suspect.length === 1 ? "" : "s"} look
                  {suspect.length === 1 ? "s" : ""} mistyped
                </b>{" "}
                — far larger than this property&apos;s usual usage, which is what inflates the months above.
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {suspect.slice(0, 3).map((r) => (
                  <li key={r.id} className="font-mono tabular-nums">
                    Unit {r.unit_number} · {monthLabel(monthKey(r.captured_at))} ·{" "}
                    {Number(r.usage).toLocaleString("en-US")} {meta.unit}
                  </li>
                ))}
                {suspect.length > 3 && <li>+{suspect.length - 3} more</li>}
              </ul>
              <Link href="/admin/review" className="mt-1 inline-block font-semibold underline">
                Correct them in the review queue
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function ReportDashboard({ rows }: { rows: ReadingRow[] }) {
  // Replacement marker rows aren't real readings — exclude them from every
  // summary/aggregate here (see report.ts's ReadingRow.kind).
  const readingRows = rows.filter((r) => r.kind !== "replacement");
  if (readingRows.length === 0) return null;

  return (
    <div className="no-print flex flex-col gap-6">
      <UtilityDashboard service="electricity" rows={readingRows.filter((r) => r.service === "electricity")} />
      <UtilityDashboard service="water" rows={readingRows.filter((r) => r.service === "water")} />
    </div>
  );
}
