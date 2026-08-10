import { createClient } from "@/lib/supabase/server";
import type { Meter, MeterReading, Service, Unit } from "@/lib/types";
import type { ReadingRow } from "@/components/ReadingsTable";

export interface ReportFilters {
  from?: string; // yyyy-mm-dd, inclusive
  to?: string; // yyyy-mm-dd, inclusive
  unitNumber?: string; // partial, case-insensitive; matches unit number or meter label
  service?: Service;
}

export async function buildReportRows(
  propertyId: string,
  filters?: ReportFilters
): Promise<ReadingRow[]> {
  const supabase = await createClient();

  const { data: meterRows } = await supabase
    .from("meters")
    .select("*")
    .eq("property_id", propertyId);

  const meters = (meterRows ?? []) as Meter[];
  if (meters.length === 0) return [];

  const meterById = new Map(meters.map((m) => [m.id, m]));
  const meterIds = meters.map((m) => m.id);

  // Reports still show unit numbers, so resolve them for per-unit meters.
  const { data: unitRows } = await supabase
    .from("units")
    .select("*")
    .eq("property_id", propertyId);
  const unitById = new Map(((unitRows ?? []) as Unit[]).map((u) => [u.id, u]));

  const { data: readingRows } = await supabase
    .from("meter_readings")
    .select("*")
    .in("meter_id", meterIds)
    .order("captured_at", { ascending: true });

  const readings = (readingRows ?? []) as MeterReading[];

  // Deltas are computed over the FULL unfiltered history, keyed by meter, so
  // "previous" and "usage" stay accurate even when only a slice is displayed.
  const lastSeen = new Map<string, number>();
  const rows: ReadingRow[] = readings.map((r) => {
    const meter = meterById.get(r.meter_id);
    const previous = lastSeen.get(r.meter_id) ?? null;
    lastSeen.set(r.meter_id, r.reading_value);

    // Per-unit meters display their unit number; communal meters display
    // their label ("Main Water Meter", "Public 1", ...).
    const displayUnit = meter?.unit_id
      ? unitById.get(meter.unit_id)?.unit_number ?? meter.label
      : meter?.label ?? "?";

    return {
      id: r.id,
      captured_at: r.captured_at,
      meter_id: r.meter_id,
      meter_label: meter?.label ?? "Unknown meter",
      unit_number: displayUnit,
      service: meter?.service ?? "electricity",
      reading_value: r.reading_value,
      previous_value: previous,
      usage: previous !== null ? r.reading_value - previous : null,
      flag_status: r.flag_status,
      photo_url: r.photo_url,
      notes: r.notes,
    };
  });

  const query = filters?.unitNumber?.trim().toLowerCase();

  const filtered = rows.filter((r) => {
    const capturedDate = r.captured_at.slice(0, 10);
    if (filters?.from && capturedDate < filters.from) return false;
    if (filters?.to && capturedDate > filters.to) return false;
    if (filters?.service && r.service !== filters.service) return false;
    if (
      query &&
      !r.unit_number.toLowerCase().includes(query) &&
      !r.meter_label.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });

  return filtered.reverse();
}
