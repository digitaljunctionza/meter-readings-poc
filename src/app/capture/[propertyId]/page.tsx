import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { AdminPage } from "@/components/AdminPage";
import type { FlagStatus, Meter, MeterReading, Property, Service, Unit } from "@/lib/types";

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
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/capture");
  if (profile.role !== "admin") redirect("/client");

  const { propertyId } = await params;
  const { service: serviceParam } = await searchParams;
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

  const isRead = (r: MeterListRow) => !!(r.latest && r.latest.captured_at >= monthStart);
  const readCount = rows.filter(isRead).length;
  const total = rows.length;
  const left = total - readCount;
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;

  const services = (["electricity", "water"] as const).filter((s) => rows.some((r) => r.service === s));
  // Default to the first service that still has meters to read, so the
  // list opens where the work is.
  const requested = services.find((s) => s === serviceParam);
  const firstWithWork = services.find((s) => rows.some((r) => r.service === s && !isRead(r)));
  const activeService: Service = requested ?? firstWithWork ?? services[0] ?? "electricity";
  const visible = rows.filter((r) => r.service === activeService);
  const leftIn = (s: Service) => rows.filter((r) => r.service === s && !isRead(r)).length;

  const nextPending = visible.find((r) => !isRead(r)) ?? rows.find((r) => !isRead(r));

  const FLAG_LABEL: Partial<Record<FlagStatus, string>> = {
    below_prev: "Lower than last month",
    above_2x_avg: "Much higher than usual",
    possible_partial: "Looks incomplete",
  };

  const nameFor = (r: MeterListRow) =>
    r.unit_number ? `unit ${r.unit_number} ${r.service === "water" ? "water" : "electricity"}` : r.label;

  return (
    <AdminPage>
      <header className="flex flex-col gap-3.5 border-b border-border bg-surface px-4 pb-3.5 pt-[calc(env(safe-area-inset-top)+16px)] lg:mx-4 lg:rounded-2xl lg:border lg:pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/capture"
            aria-label="Back to properties"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-app-bg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="var(--navy-900)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-navy-900">{property.name}</h1>
            <p className="truncate text-[13px] text-[#5d6c80]">
              {readCount} of {total} read{left > 0 ? ` · ${left} left` : " · all done"}
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-divider">
          <div className="h-full rounded-full bg-green-700" style={{ width: `${pct}%` }} />
        </div>
        {services.length > 1 && (
          <nav aria-label="Service" className="grid grid-cols-2 gap-1 rounded-xl bg-divider p-1">
            {services.map((s) => {
              const active = s === activeService;
              return (
                <Link
                  key={s}
                  href={`/capture/${propertyId}?service=${s}`}
                  replace
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-[9px] text-sm ${
                    active ? "bg-surface font-bold text-navy-900 shadow-[0_1px_3px_rgba(12,31,61,0.12)]" : "font-semibold text-[#5d6c80]"
                  }`}
                >
                  {s === "water" ? "Water" : "Electricity"} · {leftIn(s) === 0 ? "done" : `${leftIn(s)} left`}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] text-text-body">
            This property has no meters yet.{" "}
            <Link href="/admin/clients" className="font-semibold text-navy-700 underline">
              Add one
            </Link>
            .
          </p>
        )}
        {visible.map((r) => renderMeterRow(r))}
      </div>

      <BottomNav
        cta={
          nextPending && (
            <Link
              href={`/capture/${propertyId}/${nextPending.id}`}
              className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-navy-700 px-4 text-base font-bold text-white hover:bg-navy-900"
            >
              <span className="truncate">Read next: {nameFor(nextPending)}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )
        }
      />
    </AdminPage>
  );

  function renderMeterRow(r: MeterListRow) {
    const read = isRead(r);
    const flagged = read && r.latest!.flag_status !== "ok" && !r.latest!.reviewed_at;
    const isNext = !read && r.id === nextPending?.id;
    const usage = r.latest && r.previous ? r.latest.reading_value - r.previous.reading_value : null;
    const unitWord = r.service === "water" ? "kL" : "kWh";

    const box = flagged
      ? "border-amber-200 bg-amber-50"
      : read
        ? "border-green-200 bg-surface"
        : isNext
          ? "border-2 border-navy-700 bg-surface"
          : "border-border bg-surface";

    let sub: { text: string; cls: string };
    if (flagged) {
      sub = { text: FLAG_LABEL[r.latest!.flag_status] ?? "Needs a second look", cls: "text-[#7a5410]" };
    } else if (read) {
      const value = r.latest!.reading_value.toLocaleString("en-US");
      const used = usage !== null ? ` · ${usage >= 0 ? "+" : ""}${usage.toLocaleString("en-US")} ${unitWord}` : "";
      sub = { text: `${value}${used}`, cls: "font-mono text-[#2e6b1d]" };
    } else if (isNext) {
      sub = { text: r.location_note ?? "Next on your route", cls: "font-semibold text-navy-700" };
    } else {
      sub = { text: r.location_note ?? "Not read yet", cls: "text-[#5d6c80]" };
    }

    const badge = flagged
      ? { text: "Recheck", cls: "bg-[#fbe8c6] text-[#7a5410]" }
      : read
        ? { text: "Done", cls: "bg-[#e6f2df] text-[#2e6b1d]" }
        : isNext
          ? { text: "Next", cls: "bg-navy-700 text-white" }
          : null;

    return (
      <div key={r.id} className={`flex items-center rounded-2xl border ${box}`}>
        <Link href={`/capture/${propertyId}/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 py-3 pl-3.5 pr-1.5">
          <span className="w-12 shrink-0 truncate font-mono text-lg font-bold text-navy-900 tabular-nums">
            {r.is_communal ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="Communal meter">
                <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              (r.unit_number ?? "—")
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-navy-900">
              {r.is_communal ? r.label : r.service === "water" ? "Water" : "Electricity"}
            </span>
            <span className={`mt-0.5 block truncate text-[13px] tabular-nums ${sub.cls}`}>{sub.text}</span>
          </span>
          {badge && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
          )}
        </Link>
        <Link
          href={`/capture/${propertyId}/${r.id}/replace`}
          aria-label={`Replace the meter for ${nameFor(r)}`}
          title="Replace this meter"
          className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#5d6c80] hover:bg-divider hover:text-navy-900"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="5.5" r="1.7" fill="currentColor" />
            <circle cx="12" cy="12" r="1.7" fill="currentColor" />
            <circle cx="12" cy="18.5" r="1.7" fill="currentColor" />
          </svg>
        </Link>
      </div>
    );
  }
}
