"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createProperty(name: string, address: string | null) {
  await requireAdmin();
  const supabase = await createClient();

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Property name is required");

  const { data, error } = await supabase
    .from("properties")
    .insert({ name: trimmedName, address: address?.trim() || null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return data.id as string;
}
