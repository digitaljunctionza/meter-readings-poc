import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { InstallPrompt } from "@/components/InstallPrompt";
import { BottomNav } from "@/components/BottomNav";
import type { Client, FlagStatus, Meter, MeterReading, Property } from "@/lib/types";

export const dynamic = "force-dynamic";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

const FLAG_LABEL: Partial<Record<FlagStatus, string>> = {
  below_prev: "fell below its previous reading",
  above_2x_avg: "well above its own average",
  possible_partial: "looks like an incomplete entry",
};

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();

  const [{ data: propertyRows }, { data: clientRows }, { data: meterRows }] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("clients").select("*").order("name"),
    supabase.from("meters").select("*").is("retired_at", null),
  ]);

  const properties = (propertyRows ?? []) as Property[];
  const clients = (clientRows ?? []) as Client[];
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const meters = (meterRows ?? []) as Meter[];

  const metersByProperty = new Map<string, Meter[]>();
  for (const m of meters) {
    metersByProperty.set(m.property_id, [...(metersByProperty.get(m.property_id) ?? []), m]);
  }

  const meterIds = meters.map((m) => m.id);
  const { data: readingRows } = meterIds.length
    ? await supabase
        .from("meter_readings")
        .select("*")
        .in("meter_id", meterIds)
        .order("captured_at", { ascending: false })
    : { data: [] };

  // Latest reading per meter — the current state that drives both "read
  // this round" and "open flag" for every screen below.
  const latestByMeter = new Map<string, MeterReading>();
  for (const r of (readingRows ?? []) as MeterReading[]) {
    if (!latestByMeter.has(r.meter_id)) latestByMeter.set(r.meter_id, r);
  }

  const monthStart = monthStartIso();

  interface PropertySummary {
    property: Property;
    clientName: string;
    total: number;
    read: number;
    openFlags: { meter: Meter; reading: MeterReading }[];
  }

  const summaries: PropertySummary[] = properties.map((p) => {
    const propMeters = metersByProperty.get(p.id) ?? [];
    let read = 0;
    const openFlags: { meter: Meter; reading: MeterReading }[] = [];
    for (const m of propMeters) {
      const latest = latestByMeter.get(m.id);
      if (latest && latest.captured_at >= monthStart) read++;
      if (latest && latest.flag_status !== "ok" && !latest.reviewed_at) {
        openFlags.push({ meter: m, reading: latest });
      }
    }
    return {
      property: p,
      clientName: clientById.get(p.client_id)?.name ?? "—",
      total: propMeters.length,
      read,
      openFlags,
    };
  });

  const totalMeters = summaries.reduce((sum, s) => sum + s.total, 0);
  const totalRead = summaries.reduce((sum, s) => sum + s.read, 0);
  const allOpenFlags = summaries.flatMap((s) => s.openFlags.map((f) => ({ ...f, property: s.property })));
  const completeCount = summaries.filter((s) => s.total > 0 && s.read === s.total && s.openFlags.length === 0).length;
  const notStartedCount = summaries.filter((s) => s.total > 0 && s.read === 0).length;

  const inProgress = summaries
    .filter((s) => s.total > 0 && s.read < s.total)
    .sort((a, b) => b.read / (b.total || 1) - a.read / (a.total || 1));
  const continueTarget = inProgress[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-32">
      <div className="flex flex-col gap-4 bg-navy-900 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-green-500">
              {new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" }).toUpperCase()}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight">
              {new Date().toLocaleDateString("en-ZA", { month: "long" })} round
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InstallPrompt />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.16]">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${totalMeters > 0 ? Math.round((totalRead / totalMeters) * 100) : 0}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold tabular-nums">
            {totalRead}/{totalMeters}
          </span>
        </div>
        <p className="text-[11px] text-white/50">
          {Math.max(totalMeters - totalRead, 0)} meters left across {properties.length} propert
          {properties.length === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {allOpenFlags.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="flex items-center gap-2.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-600" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-[13px] font-semibold text-amber-900">
                {allOpenFlags.length} reading{allOpenFlags.length === 1 ? "" : "s"} need review
              </span>
              <Link
                href="/admin/review"
                className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800"
              >
                Open queue
              </Link>
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-amber-800">
              {allOpenFlags
                .slice(0, 3)
                .map((f) => `${f.meter.label} ${FLAG_LABEL[f.reading.flag_status] ?? "needs a second look"}`)
                .join(". ")}
              {allOpenFlags.length > 3 ? `, and ${allOpenFlags.length - 3} more.` : "."} Each is compared against
              its own meter, not against the block.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-surface p-3.5">
            <p className="font-mono text-[9.5px] font-medium tracking-[0.07em] text-text-muted">COMPLETE</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-navy-900">{completeCount}</p>
            <p className="mt-0.5 text-[10.5px] text-text-muted">fully read, no flags</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-surface p-3.5">
            <p className="font-mono text-[9.5px] font-medium tracking-[0.07em] text-text-muted">NOT STARTED</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-navy-900">{notStartedCount}</p>
            <p className="mt-0.5 text-[10.5px] text-text-muted">no meters read yet</p>
          </div>
        </div>

        <p className="mt-1 font-mono text-[10px] font-medium tracking-[0.08em] text-text-faint">
          PROPERTIES THIS ROUND
        </p>
        <div className="flex flex-col gap-2">
          {summaries.map((s) => {
            const pct = s.total > 0 ? Math.round((s.read / s.total) * 100) : 0;
            const complete = s.total > 0 && s.read === s.total && s.openFlags.length === 0;
            const blocked = s.openFlags.length > 0;
            return (
              <div
                key={s.property.id}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                  complete ? "border-green-200 bg-green-50" : "border-border bg-surface"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-navy-900">{s.property.name}</p>
                  {complete ? (
                    <p className="mt-0.5 truncate text-[11px] text-green-700">
                      {s.read}/{s.total} read · no open flags
                    </p>
                  ) : (
                    <>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-divider">
                          <div
                            className={`h-full rounded-full ${blocked ? "bg-amber-600" : "bg-green-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10.5px] font-semibold text-text-muted tabular-nums">
                          {s.read}/{s.total}
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-[11px] ${blocked ? "text-amber-800" : "text-text-muted"}`}>
                        {blocked
                          ? `${s.openFlags.length} flag${s.openFlags.length === 1 ? "" : "s"} to review`
                          : s.read === 0
                            ? `Not started · ${s.total} meters`
                            : `In progress · ${s.clientName}`}
                      </p>
                    </>
                  )}
                </div>
                {complete ? (
                  <Link
                    href={`/admin/reports?property=${s.property.id}`}
                    className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    View report
                  </Link>
                ) : blocked ? (
                  <Link
                    href="/admin/review"
                    className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-[11px] font-semibold text-amber-800"
                  >
                    Review
                  </Link>
                ) : s.read === 0 ? (
                  <Link
                    href={`/capture/${s.property.id}`}
                    className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    Start
                  </Link>
                ) : (
                  <Link
                    href={`/capture/${s.property.id}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </div>
            );
          })}
          {summaries.length === 0 && (
            <p className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
              No properties yet.{" "}
              <Link href="/admin/clients" className="text-green-700 underline">
                Add a client and property
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <BottomNav
        cta={
          continueTarget && (
            <Link
              href={`/capture/${continueTarget.property.id}`}
              className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-navy-700 text-[15px] font-semibold text-white"
            >
              Continue {continueTarget.property.name} · {continueTarget.total - continueTarget.read} left
            </Link>
          )
        }
      />
    </main>
  );
}
