"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { computeFlagStatusForReading } from "@/lib/computeReadingFlag";
import type { Meter, MeterReading } from "@/lib/types";

/**
 * Corrects a flagged reading in place — the reading value, notes, and
 * optionally the photo — instead of deleting it and waiting on a return
 * site visit. Most flags turn out to be a misread or a typo the photo
 * already proves; this lets the admin fix it from the photo directly.
 * Always marks the reading reviewed, same as Accept, since fixing it IS
 * the review.
 */
export async function editReading(params: {
  readingId: string;
  rawValue: string;
  notes: string | null;
  /** Only present when the photo was retaken; omitted keeps the original. */
  photoUrl?: string;
}) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: readingRow, error: readingError } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("id", params.readingId)
    .single();
  if (readingError || !readingRow) throw new Error("Reading not found");
  const reading = readingRow as MeterReading;

  const { data: meterRow, error: meterError } = await supabase
    .from("meters")
    .select("*")
    .eq("id", reading.meter_id)
    .single();
  if (meterError || !meterRow) throw new Error("Meter not found");
  const meter = meterRow as Meter;

  const value = Number.parseFloat(params.rawValue);
  if (Number.isNaN(value)) throw new Error("Reading value is not numeric");

  const flag_status = await computeFlagStatusForReading({
    meter,
    rawValue: params.rawValue,
    value,
    cutoff: reading.captured_at,
    excludeReadingId: reading.id,
  });

  const { error } = await supabase
    .from("meter_readings")
    .update({
      reading_value: value,
      notes: params.notes,
      ...(params.photoUrl ? { photo_url: params.photoUrl } : {}),
      flag_status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", params.readingId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export async function acceptReading(readingId: string) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("meter_readings")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: profile.id })
    .eq("id", readingId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}
