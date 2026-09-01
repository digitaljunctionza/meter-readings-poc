"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/** Invites now grant access to a whole client (all its properties), not one property. */
export async function createInvite(clientId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_invites")
    .insert({ client_id: clientId, created_by: admin.id })
    .select("token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
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

  revalidatePath("/admin/clients");
}

export async function createAdminInvite() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_invites")
    .insert({ created_by: admin.id })
    .select("token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  return data.token as string;
}

export async function revokeAdminInvite(inviteId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
}
