"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

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

export async function sendBackReading(readingId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // No "resolved" state to clear — deleting the reading reopens the meter
  // for recapture, same as it never having been read this round.
  const { error } = await supabase.from("meter_readings").delete().eq("id", readingId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/capture");
}
