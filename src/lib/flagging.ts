import type { FlagStatus, MeterReading, Service } from "@/lib/types";

// A reading like "124937.26e" (OCR garble from a photo-read meter) parses as a
// number but silently drops the trailing letter — catch that pattern explicitly.
const PARTIAL_ENTRY_PATTERN = /[a-zA-Z]\s*$/;

export function looksLikePartialEntry(raw: string): boolean {
  return PARTIAL_ENTRY_PATTERN.test(raw.trim());
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
