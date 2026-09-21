"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ArcGauge } from "@/components/charts/ArcGauge";
import { BarGradient, ChartTooltip, compactNumber } from "@/components/charts/chartBits";
import { RegisterDigits } from "@/components/client/RegisterDigits";
import { BoltIcon, DropletIcon } from "@/components/icons";
import {
  formatNumber,
  monthLabel,
  monthName,
  monthShort,
  SERVICE_COLOR,
  SERVICE_LABEL,
  SERVICE_UNIT,
  type ServiceSummary,
} from "@/lib/clientReport";

/** Bar labels stay exact where they fit — "1,441" beats "1.4k" when there's room. */
function barLabel(n: number): string {
  return n >= 100_000 ? compactNumber(n) : formatNumber(n);
}

function changeLine(s: ServiceSummary): { text: string; className: string } | null {
  if (!s.latest) return null;
  if (s.inProgress && s.previous) {
    return {
      text: `Month still in progress: ${s.latest.readings} of ${s.previous.readings} readings so far`,
      className: "text-slate-500",
    };
  }
  if (!s.previous) {
    return s.months.length === 1 ? { text: "This is the first month of readings", className: "text-slate-500" } : null;
  }
  const prev = monthName(s.previous.key);
  if (s.changePct === null) return null;
  if (s.changePct === 0) return { text: `Same as ${prev}`, className: "text-slate-600" };
  if (s.changePct > 0) return { text: `▲ ${s.changePct}% more than ${prev}`, className: "text-amber-700" };
  return { text: `▼ ${Math.abs(s.changePct)}% less than ${prev}`, className: "text-green-700" };
}

function gaugeCopy(ratio: number): string {
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
}

export function UsageCard({ summary }: { summary: ServiceSummary }) {
  const { service, latest, ratio, typical } = summary;
  if (!latest) return null;

  const color = SERVICE_COLOR[service];
  const unit = SERVICE_UNIT[service];
  const Icon = service === "electricity" ? BoltIcon : DropletIcon;
  const line = changeLine(summary);
  const gradientId = `bar-${service}`;

  const chartData = summary.months.slice(-6).map((m) => ({
    key: m.key,
    label: monthShort(m.key),
    usage: Math.round(m.usage),
  }));

  return (
    <section
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-label={`${SERVICE_LABEL[service]} usage`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color }}>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-4 w-4" />
          </span>
          {SERVICE_LABEL[service]} used
        </span>
        <span className="text-xs font-semibold text-slate-500">{monthLabel(latest.key)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-end gap-1.5 sm:gap-3">
          <RegisterDigits value={latest.usage} unit={unit} />
          <span className="pb-1 text-sm font-semibold text-slate-500">{unit}</span>
        </div>

        {ratio !== null && typical !== null && (
          <ArcGauge
            ratio={ratio}
            centerLabel={gaugeCopy(ratio)}
            caption="vs usual month"
            ariaLabel={`This month is ${gaugeCopy(ratio)} compared with a usual month of about ${formatNumber(Math.round(typical))} ${unit}.`}
          />
        )}
      </div>

      {line && <p className={`mt-3 text-sm font-medium ${line.className}`}>{line.text}</p>}

      {chartData.length > 1 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Last {chartData.length} months
            </p>
            {typical !== null && (
              <p className="text-[11px] font-medium text-slate-400">
                Usual {formatNumber(Math.round(typical))} {unit}
              </p>
            )}
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <BarGradient id={gradientId} color={color} />
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={2}
                />
                {typical !== null && (
                  <ReferenceLine
                    y={Math.round(typical)}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                  />
                )}
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)", radius: 6 }}
                  content={<ChartTooltip suffix={unit} />}
                />
                <Bar dataKey="usage" radius={[7, 7, 3, 3]} maxBarSize={56}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={d.key}
                      fill={i === chartData.length - 1 ? color : `url(#${gradientId})`}
                      fillOpacity={i === chartData.length - 1 ? 1 : 0.55}
                    />
                  ))}
                  <LabelList
                    dataKey="usage"
                    position="top"
                    formatter={(v: unknown) => barLabel(Number(v))}
                    style={{ fontSize: 10, fontWeight: 600, fill: "#475569" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
