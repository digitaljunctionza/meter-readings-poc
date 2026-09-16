import { createClient } from "@/lib/supabase/server";
import { computeFlagStatus } from "@/lib/flagging";
import type { FlagStatus, Meter, MeterReading } from "@/lib/types";

/**
 * The DB lookups computeFlagStatus needs — the previous reading for this
 * meter, and recent readings across sibling meters of the same service —
 * shared by new-reading capture (/api/readings) and correcting an
 * already-captured one from the review queue, so both flag consistently.
 */
export async function computeFlagStatusForReading(params: {
  meter: Meter;
  rawValue: string;
  value: number;
  cutoff: string;
  /** Exclude this reading's own row from the lookups — needed when editing a
   * reading already in the table, so it doesn't count as its own "previous". */
  excludeReadingId?: string;
}): Promise<FlagStatus> {
  const { meter, rawValue, value, cutoff, excludeReadingId } = params;
  const supabase = await createClient();

  const { data: prevRows, error: prevError } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("meter_id", meter.id)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(excludeReadingId ? 2 : 1);
  if (prevError) throw new Error(prevError.message);
  const previousReadingForMeter =
    ((prevRows ?? []) as MeterReading[]).find((r) => r.id !== excludeReadingId) ?? null;

  const { data: siblingMeterRows, error: siblingError } = await supabase
    .from("meters")
    .select("id")
    .eq("property_id", meter.property_id)
    .eq("service", meter.service);
  if (siblingError) throw new Error(siblingError.message);
  const siblingMeterIds = (siblingMeterRows ?? []).map((m) => m.id as string);

  const { data: recentRows, error: recentError } = await supabase
    .from("meter_readings")
    .select("*")
    .in("meter_id", siblingMeterIds.length > 0 ? siblingMeterIds : [meter.id])
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(51);
  if (recentError) throw new Error(recentError.message);
  const recentReadingsForServiceAcrossProperty = ((recentRows ?? []) as MeterReading[]).filter(
    (r) => r.id !== excludeReadingId
  );

  return computeFlagStatus({
    rawValue,
    value,
    service: meter.service,
    previousReadingForMeter,
    recentReadingsForServiceAcrossProperty,
  });
}
