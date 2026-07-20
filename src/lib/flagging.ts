import type { FlagStatus, MeterReading, Service } from "@/lib/types";

// A valid reading is just digits with an optional decimal point. Anything else
// (a trailing OCR letter like "124937.26e", a stray extra token like "280891 0",
// an embedded unit like "7192.133m3") parses as a number but silently drops or
// mangles part of the value — reject the whole shape, not just known typos.
const VALID_READING_PATTERN = /^\d+(\.\d+)?$/;

export function looksLikePartialEntry(raw: string): boolean {
  return !VALID_READING_PATTERN.test(raw.trim());
}

export function computeFlagStatus(params: {
  rawValue: string;
  value: number;
  service: Service;
  previousReadingForUnit: MeterReading | null;
  recentReadingsForServiceAcrossProperty: MeterReading[];
}): FlagStatus {
  const { rawValue, value, previousReadingForUnit, recentReadingsForServiceAcrossProperty } =
    params;

  if (looksLikePartialEntry(rawValue)) {
    return "possible_partial";
  }

  if (previousReadingForUnit && value < previousReadingForUnit.reading_value) {
    return "below_prev";
  }

  const others = recentReadingsForServiceAcrossProperty.filter(
    (r) => r.unit_id !== previousReadingForUnit?.unit_id
  );
  if (others.length > 0) {
    const avg = others.reduce((sum, r) => sum + r.reading_value, 0) / others.length;
    if (avg > 0 && value > avg * 2) {
      return "above_2x_avg";
    }
  }

  return "ok";
}
