"use client";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ReadingRow } from "@/components/ReadingsTable";
import type { FlagStatus } from "@/lib/types";

const FLAG_LABEL: Record<FlagStatus, string> = {
  ok: "OK",
  below_prev: "Below previous",
  above_2x_avg: "Above 2x average",
  possible_partial: "Possible partial entry",
};

const FLAG_COLOR: Record<FlagStatus, string> = {
  ok: "#22c55e",
  below_prev: "#ef4444",
  above_2x_avg: "#f97316",
  possible_partial: "#2fb6de",
};

const SERVICE_COLOR = {
  electricity: "#d97706",
  water: "#2563eb",
};

export function ReportDashboard({ rows }: { rows: ReadingRow[] }) {
  if (rows.length === 0) return null;

  const flagCounts: Record<FlagStatus, number> = {
    ok: 0,
    below_prev: 0,
    above_2x_avg: 0,
    possible_partial: 0,
  };
  for (const r of rows) flagCounts[r.flag_status]++;

  const pieData = (Object.keys(flagCounts) as FlagStatus[])
    .filter((status) => flagCounts[status] > 0)
    .map((status) => ({ name: FLAG_LABEL[status], value: flagCounts[status], status }));

  const monthlyUsage = new Map<string, { month: string; electricity: number; water: number }>();
  for (const r of rows) {
    if (r.usage === null || r.usage < 0) continue;
    const month = r.captured_at.slice(0, 7); // YYYY-MM
    const entry = monthlyUsage.get(month) ?? { month, electricity: 0, water: 0 };
    if (r.service === "electricity") entry.electricity += r.usage;
    else entry.water += r.usage;
    monthlyUsage.set(month, entry);
  }
  const trendData = [...monthlyUsage.values()].sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border-2 border-accent-light p-3">
        <p className="mb-2 text-sm font-bold text-accent">Reading status breakdown</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={FLAG_COLOR[entry.status]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={48} iconSize={10} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-accent-light p-3">
        <p className="mb-2 text-sm font-bold text-accent">Monthly usage by service</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eaf8fc" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="electricity" fill={SERVICE_COLOR.electricity} name="Electricity" />
              <Bar dataKey="water" fill={SERVICE_COLOR.water} name="Water" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
