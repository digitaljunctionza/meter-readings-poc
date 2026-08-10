import type { FlagStatus, MeterReading, Service } from "@/lib/types";

// A valid reading is just digits with an optional decimal point. Anything else
// (a trailing OCR letter like "124937.26e", a stray extra token like "280891 0",
// an embedded unit like "7192.133m3") parses as a number but silently drops or
// mangles part of the value — reject the whole shape, not just known typos.
const VALID_READING_PATTERN = /^\d+(\.\d+)?$/;

export function looksLikePartialEntry(raw: string): boolean {
  return !VALID_READING_PATTERN.test(raw.trim());
}

// KNOWN DEFECT — `above_2x_avg` compares this reading's ABSOLUTE cumulative
// meter value against the mean of other meters' absolute values, so a meter
// with a naturally bigger dial trips it every single month (units 111, 112,
// 115, 116, 120, 123, 138, 151 and 153 are flagged every month in the live
// data — pure alarm fatigue). The correct comparison is consumption DELTA
// against this meter's own trailing average, which is spec step 4 and is
// deliberately not part of this restructure. Left behaviourally unchanged
// here so the meter migration stays a pure refactor.
export function computeFlagStatus(params: {
  rawValue: string;
  value: number;
  service: Service;
  previousReadingForMeter: MeterReading | null;
  recentReadingsForServiceAcrossProperty: MeterReading[];
}): FlagStatus {
  const { rawValue, value, previousReadingForMeter, recentReadingsForServiceAcrossProperty } =
    params;

  if (looksLikePartialEntry(rawValue)) {
    return "possible_partial";
  }

  if (previousReadingForMeter && value < previousReadingForMeter.reading_value) {
    return "below_prev";
  }

  const others = recentReadingsForServiceAcrossProperty.filter(
    (r) => r.meter_id !== previousReadingForMeter?.meter_id
  );
  if (others.length > 0) {
    const avg = others.reduce((sum, r) => sum + r.reading_value, 0) / others.length;
    if (avg > 0 && value > avg * 2) {
      return "above_2x_avg";
    }
  }

  return "ok";
}
