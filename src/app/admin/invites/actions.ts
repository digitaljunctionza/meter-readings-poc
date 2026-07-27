"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createInvite(propertyId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_invites")
    .insert({ property_id: propertyId, created_by: admin.id })
    .select("token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return data.token as string;
}

export async function revokeInvite(inviteId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("property_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function listInvitesForProperty(propertyId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_invites")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
