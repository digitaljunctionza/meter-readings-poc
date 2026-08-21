"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function recordReplacement(params: {
  oldMeterId: string;
  closingValue: number;
  closingPhotoUrl: string;
  newSerial: string | null;
  openingValue: number;
  openingPhotoUrl: string;
  note: string | null;
  propertyId: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("record_meter_replacement", {
    p_old_meter_id: params.oldMeterId,
    p_closing_value: params.closingValue,
    p_closing_photo_url: params.closingPhotoUrl,
    p_new_serial: params.newSerial,
    p_opening_value: params.openingValue,
    p_opening_photo_url: params.openingPhotoUrl,
    p_note: params.note,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/capture/${params.propertyId}`);
  revalidatePath("/admin");
  return data as { new_meter_id: string; replacement_id: string };
}
