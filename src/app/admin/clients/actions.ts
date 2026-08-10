"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Service } from "@/lib/types";

export async function createClientRecord(name: string, contactEmail: string | null) {
  await requireAdmin();
  const supabase = await createClient();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Client name is required");

  const { data, error } = await supabase
    .from("clients")
    .insert({ name: trimmed, contact_email: contactEmail?.trim() || null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
  return data.id as string;
}

export async function createProperty(
  clientId: string,
  name: string,
  address: string | null
) {
  await requireAdmin();
  const supabase = await createClient();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Property name is required");

  const { data, error } = await supabase
    .from("properties")
    .insert({ client_id: clientId, name: trimmed, address: address?.trim() || null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return data.id as string;
}

export async function createMeter(params: {
  propertyId: string;
  service: Service;
  label: string;
  unitNumber: string | null;
  locationNote: string | null;
  isCommunal: boolean;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const label = params.label.trim();
  if (!label) throw new Error("Meter label is required");

  // A per-unit meter needs a unit row to hang off. Units are shared across a
  // property's meters (unit 101 has both an electricity and a water meter),
  // so find-or-create rather than always inserting.
  let unitId: string | null = null;
  if (!params.isCommunal && params.unitNumber?.trim()) {
    const unitNumber = params.unitNumber.trim();

    const { data: existingUnit, error: lookupError } = await supabase
      .from("units")
      .select("id")
      .eq("property_id", params.propertyId)
      .eq("unit_number", unitNumber)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);

    if (existingUnit) {
      unitId = existingUnit.id as string;
    } else {
      const { data: newUnit, error: unitError } = await supabase
        .from("units")
        .insert({ property_id: params.propertyId, unit_number: unitNumber })
        .select("id")
        .single();
      if (unitError) throw new Error(unitError.message);
      unitId = newUnit.id as string;
    }
  }

  const { data, error } = await supabase
    .from("meters")
    .insert({
      property_id: params.propertyId,
      unit_id: unitId,
      service: params.service,
      label,
      location_note: params.locationNote?.trim() || null,
      is_communal: params.isCommunal,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
  revalidatePath("/capture");
  return data.id as string;
}

export async function deleteMeter(meterId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Readings cascade with the meter, so refuse if any exist rather than
  // silently destroying history.
  const { count, error: countError } = await supabase
    .from("meter_readings")
    .select("id", { count: "exact", head: true })
    .eq("meter_id", meterId);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      `This meter has ${count} reading${count === 1 ? "" : "s"} against it and cannot be deleted.`
    );
  }

  const { error } = await supabase.from("meters").delete().eq("id", meterId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
}
