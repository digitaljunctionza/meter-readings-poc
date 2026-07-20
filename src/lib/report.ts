import { supabase } from "@/lib/supabase";
import type { MeterReading, Unit } from "@/lib/types";
import type { ReadingRow } from "@/components/ReadingsTable";

export interface DateRange {
  from?: string; // yyyy-mm-dd, inclusive
  to?: string; // yyyy-mm-dd, inclusive
}

export async function buildReportRows(
  propertyId: string,
  dateRange?: DateRange
): Promise<ReadingRow[]> {
  const { data: unitRows } = await supabase
    .from("units")
    .select("*")
    .eq("property_id", propertyId);

  const units = (unitRows ?? []) as Unit[];
  const unitById = new Map(units.map((u) => [u.id, u]));
  const unitIds = units.map((u) => u.id);

  if (unitIds.length === 0) return [];

  const { data: readingRows } = await supabase
    .from("meter_readings")
    .select("*")
    .in("unit_id", unitIds)
    .order("captured_at", { ascending: true });

  const readings = (readingRows ?? []) as MeterReading[];

  // Track the most recent reading seen per unit+service to compute usage deltas.
  const lastSeen = new Map<string, number>();
  const rows: ReadingRow[] = readings.map((r) => {
    const key = `${r.unit_id}:${r.service}`;
    const previous = lastSeen.get(key) ?? null;
    lastSeen.set(key, r.reading_value);
    return {
      id: r.id,
      captured_at: r.captured_at,
      unit_number: unitById.get(r.unit_id)?.unit_number ?? "?",
      service: r.service,
      reading_value: r.reading_value,
      previous_value: previous,
      usage: previous !== null ? r.reading_value - previous : null,
      flag_status: r.flag_status,
      photo_url: r.photo_url,
      notes: r.notes,
    };
  });

  const filtered = dateRange
    ? rows.filter((r) => {
        const capturedDate = r.captured_at.slice(0, 10);
        if (dateRange.from && capturedDate < dateRange.from) return false;
        if (dateRange.to && capturedDate > dateRange.to) return false;
        return true;
      })
    : rows;

  return filtered.reverse();
}
