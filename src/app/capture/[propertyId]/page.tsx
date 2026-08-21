import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import type { FlagStatus, Meter, MeterReading, Property, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

interface MeterListRow extends Meter {
  unit_number: string | null;
  latest: MeterReading | null;
  previous: MeterReading | null;
}

export default async function CaptureRouteListPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/capture");
  if (profile.role !== "admin") redirect("/client");

  const { propertyId } = await params;
  const supabase = await createClient();

  const { data: propertyRow } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();
  if (!propertyRow) notFound();
  const property = propertyRow as Property;

  const [{ data: meterRows }, { data: unitRows }] = await Promise.all([
    supabase.from("meters").select("*").eq("property_id", propertyId).is("retired_at", null),
    supabase.from("units").select("*").eq("property_id", propertyId),
  ]);
  const meters = (meterRows ?? []) as Meter[];
  const unitById = new Map(((unitRows ?? []) as Unit[]).map((u) => [u.id, u]));

  const meterIds = meters.map((m) => m.id);
  const { data: readingRows } = meterIds.length
    ? await supabase
        .from("meter_readings")
        .select("*")
        .in("meter_id", meterIds)
        .order("captured_at", { ascending: false })
    : { data: [] };

  const readingsByMeter = new Map<string, MeterReading[]>();
  for (const r of (readingRows ?? []) as MeterReading[]) {
    const list = readingsByMeter.get(r.meter_id) ?? [];
    if (list.length < 2) list.push(r);
    readingsByMeter.set(r.meter_id, list);
  }

  const monthStart = monthStartIso();
  const rows: MeterListRow[] = meters
    .map((m) => {
      const [latest, previous] = readingsByMeter.get(m.id) ?? [];
      return {
        ...m,
        unit_number: m.unit_id ? (unitById.get(m.unit_id)?.unit_number ?? null) : null,
        latest: latest ?? null,
        previous: previous ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const readThisRound = rows.filter((r) => r.latest && r.latest.captured_at >= monthStart);
  const readCount = readThisRound.length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;

  const nextPending = rows.find((r) => !(r.latest && r.latest.captured_at >= monthStart));

  const FLAG_LABEL: Partial<Record<FlagStatus, string>> = {
    below_prev: "Reading came in below last month",
    above_2x_avg: "Well above the property average",
    possible_partial: "Reading looks incomplete",
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-32">
      <div className="flex flex-col gap-4 bg-navy-700 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/capture" aria-label="Choose a different property" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-green-500">
                {new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" }).toUpperCase()}
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight">{property.name}</h1>
              <p className="text-xs text-white/55">
                {property.address ? `${property.address} · ` : ""}
                {total} meter{total === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.16]">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-xs font-bold tabular-nums">
            {readCount}/{total}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {rows.length === 0 && (
          <p className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
            This property has no meters yet.{" "}
            <Link href="/admin/clients" className="text-green-700 underline">
              Add one
            </Link>
            .
          </p>
        )}

        {(["electricity", "water"] as const).map((service) => {
          const group = rows.filter((r) => r.service === service);
          if (group.length === 0) return null;
          const groupRead = group.filter((r) => r.latest && r.latest.captured_at >= monthStart).length;

          const groupPct = group.length > 0 ? Math.round((groupRead / group.length) * 100) : 0;

          return (
            <details key={service} className="group overflow-hidden rounded-xl border border-border bg-surface" open>
              <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0 text-text-faint transition-transform group-open:rotate-90"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                  className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full ${service === "water" ? "bg-blue-50 text-blue-500" : "bg-amber-50 text-amber-600"}`}
                >
                  {service === "water" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold capitalize ${service === "water" ? "text-blue-600" : "text-amber-700"}`}>
                    {service}
                  </span>
                  <span className="block font-mono text-[10.5px] text-text-muted tabular-nums">
                    {groupRead}/{group.length} read this round
                  </span>
                </span>
                <span className="h-[5px] w-16 shrink-0 overflow-hidden rounded-full bg-divider">
                  <span
                    className={`block h-full rounded-full ${service === "water" ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${groupPct}%` }}
                  />
                </span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-border px-3 py-3">{group.map((r) => renderMeterRow(r))}</div>
            </details>
          );
        })}
      </div>

      <BottomNav
        cta={
          nextPending && (
            <Link
              href={`/capture/${propertyId}/${nextPending.id}`}
              className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-navy-700 text-[15px] font-semibold text-white"
            >
              Next meter · {nextPending.unit_number ?? nextPending.label}
              {nextPending.unit_number ? ` ${nextPending.service === "water" ? "Water" : "Electricity"}` : ""}
            </Link>
          )
        }
      />
    </main>
  );

  function renderMeterRow(r: MeterListRow) {
          const isReadThisRound = !!(r.latest && r.latest.captured_at >= monthStart);
          const flagged = isReadThisRound && r.latest!.flag_status !== "ok" && !r.latest!.reviewed_at;
          const isNext = !isReadThisRound && r.id === nextPending?.id;
          const usage =
            r.latest && r.previous ? r.latest.reading_value - r.previous.reading_value : null;

          const wrapClass = flagged
            ? "bg-amber-50 border border-amber-200"
            : isReadThisRound
              ? "bg-green-50 border border-green-200"
              : isNext
                ? "bg-surface border border-border border-l-[3px] border-l-green-500"
                : "bg-surface border border-border";

          return (
            <div key={r.id} className={`flex items-center gap-1 rounded-xl px-1.5 py-1 ${wrapClass}`}>
              <Link href={`/capture/${propertyId}/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
                {r.is_communal ? (
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-divider ${r.service === "water" ? "text-blue-500" : "text-navy-900"}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="w-11 shrink-0 font-mono text-[17px] font-bold tabular-nums text-navy-900">
                    {r.unit_number ?? "—"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-semibold ${r.is_communal ? "" : "capitalize"} ${r.service === "water" ? "text-blue-500" : "text-navy-900"}`}>
                    {r.is_communal ? r.label : r.service}
                  </p>
                  {flagged ? (
                    <p className="truncate text-[11px] text-amber-800">
                      {r.is_communal ? `${r.service} · ` : ""}
                      {FLAG_LABEL[r.latest!.flag_status] ?? "Needs a second look"}
                    </p>
                  ) : isReadThisRound ? (
                    <p className="truncate font-mono text-[11px] font-medium text-green-700 tabular-nums">
                      {r.latest!.reading_value.toLocaleString()}
                      {usage !== null ? ` · ${usage >= 0 ? "+" : ""}${usage.toLocaleString()}` : ""}
                    </p>
                  ) : (
                    <p className="truncate text-[11px] text-text-muted">
                      {r.is_communal ? `${r.service} · ` : ""}
                      {r.location_note ?? "Not read yet this round"}
                    </p>
                  )}
                </div>
                {flagged ? (
                  <span className="shrink-0 rounded-full border border-amber-200 px-2.5 py-1.5 font-sans text-[10px] font-semibold text-amber-800">
                    Recheck
                  </span>
                ) : isReadThisRound ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-green-700" aria-hidden="true">
                    <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isNext ? "bg-green-500" : "border border-border"
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke={isNext ? "#fff" : "var(--text-faint)"}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </Link>
              <Link
                href={`/capture/${propertyId}/${r.id}/replace`}
                aria-label={`Replace ${r.service} meter for unit ${r.unit_number ?? r.label}`}
                title="Record a meter replacement"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-faint hover:bg-divider hover:text-navy-900"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M17 2l4 4-4 4M21 6H8a5 5 0 0 0-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 22l-4-4 4-4M3 18h13a5 5 0 0 0 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          );
  }
}
