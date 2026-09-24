import { createClient } from "@/lib/supabase/server";
import { computeFlagStatus, trailingAverageUsage } from "@/lib/flagging";
import type { FlagStatus, Meter, MeterReading } from "@/lib/types";

/** How many of a meter's prior readings feed the trailing average. */
const HISTORY_DEPTH = 7;

/**
 * Loads the history computeFlagStatus needs — this meter's own recent
 * readings — and flags a value against it. Shared by new-reading capture
 * (/api/readings) and correcting an already-captured one from the review
 * queue, so both judge a reading the same way.
 */
export async function computeFlagStatusForReading(params: {
  meter: Meter;
  rawValue: string;
  value: number;
  cutoff: string;
  /** Exclude this reading's own row from the lookup — needed when editing a
   * reading already in the table, so it doesn't count as its own history. */
  excludeReadingId?: string;
}): Promise<FlagStatus> {
  const { meter, rawValue, value, cutoff, excludeReadingId } = params;
  const supabase = await createClient();

  const { data: historyRows, error } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("meter_id", meter.id)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(HISTORY_DEPTH + 1);
  if (error) throw new Error(error.message);

  const history = ((historyRows ?? []) as MeterReading[]).filter((r) => r.id !== excludeReadingId);
  const previousValueForMeter = history.length > 0 ? history[0].reading_value : null;

  return computeFlagStatus({
    rawValue,
    value,
    previousValueForMeter,
    trailingAverageForMeter: trailingAverageUsage(history.map((r) => r.reading_value)),
  });
}
