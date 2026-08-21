import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { ReviewQueueList, type ReviewItem } from "@/components/ReviewQueueList";
import { BottomNav } from "@/components/BottomNav";
import type { Meter, MeterReading, Property, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/review");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();

  const [{ data: propertyRows }, { data: meterRows }, { data: unitRows }] = await Promise.all([
    supabase.from("properties").select("*"),
    supabase.from("meters").select("*").is("retired_at", null),
    supabase.from("units").select("*"),
  ]);

  const propertyById = new Map(((propertyRows ?? []) as Property[]).map((p) => [p.id, p]));
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

  const items: ReviewItem[] = [];
  for (const m of meters) {
    const [latest, previous] = readingsByMeter.get(m.id) ?? [];
    if (!latest || latest.flag_status === "ok" || latest.reviewed_at) continue;
    const property = propertyById.get(m.property_id);
    items.push({
      readingId: latest.id,
      propertyName: property?.name ?? "—",
      unitNumber: m.unit_id ? unitById.get(m.unit_id)?.unit_number ?? m.label : m.label,
      service: m.service,
      flagStatus: latest.flag_status,
      readingValue: latest.reading_value,
      previousValue: previous?.reading_value ?? null,
      capturedAt: latest.captured_at,
      photoUrl: latest.photo_url,
      notes: latest.notes,
    });
  }
  items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-24">
      <div className="flex-none border-b border-border bg-surface px-5 pb-3.5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex items-center gap-3">
          <Link href="/admin/more" aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="var(--navy-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-navy-900">Review queue</p>
            <p className="text-[11px] text-text-muted">{items.length} open</p>
          </div>
        </div>
      </div>

      <ReviewQueueList items={items} />
      <BottomNav />
    </main>
  );
}
