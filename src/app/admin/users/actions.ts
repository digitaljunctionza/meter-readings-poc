"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@/lib/types";

// Every action here runs with the service-role key, which bypasses RLS
// entirely. requireAdmin() is therefore not defence in depth — it is the
// ONLY thing standing between a logged-in client and everyone's account.
// Do not add an action to this file without it as the first statement.

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  /** False until they click the confirmation link or an admin creates them pre-confirmed. */
  confirmed: boolean;
}

export async function listUsers(): Promise<AppUser[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);

  // Roles live in profiles, not in auth.users, so they are fetched separately
  // and joined here. A user with no profile row is still listed — hiding them
  // would make a broken signup invisible, which is exactly when you need to
  // see it.
  const supabase = await createClient();
  const { data: profileRows } = await supabase.from("profiles").select("id, role, full_name");
  const profiles = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p as { role: Role; full_name: string | null }])
  );

  return data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(no email)",
      role: profiles.get(u.id)?.role ?? ("client" as Role),
      fullName: profiles.get(u.id)?.full_name ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createUser(params: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required");
  if (params.password.length < 8) throw new Error("Password must be at least 8 characters");

  // email_confirm: true skips the confirmation email — an admin creating the
  // account in person has already established who this is, and waiting on an
  // inbox is the main reason these flows stall on site.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName.trim() || null },
  });
  if (error) throw new Error(error.message);

  // The handle_new_user trigger has already inserted a profile with the
  // default role ('client'), so an admin account is a follow-up update
  // rather than an insert.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: params.role, full_name: params.fullName.trim() || null })
    .eq("id", data.user.id);

  if (profileError) {
    throw new Error(
      `User ${email} was created but their role could not be set: ${profileError.message}. ` +
        `Set it from the users list rather than creating them again.`
    );
  }

  revalidatePath("/admin/users");
  return data.user.id;
}

export async function setUserPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

/**
 * Emails a reset link instead of setting the password directly — the better
 * default when the person is not standing next to you, since the new password
 * never has to be spoken aloud or typed into a chat.
 */
export async function sendPasswordReset(email: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wmfixandfinish.co.za"}/login`,
  });
  if (error) throw new Error(error.message);
}

export async function setUserRole(userId: string, role: Role) {
  const currentAdmin = await requireAdmin();

  // Losing the last admin locks everyone out of the admin side with no way
  // back except the SQL editor, so demoting yourself is refused outright.
  if (userId === currentAdmin.id && role !== "admin") {
    throw new Error("You can't remove your own admin access. Ask another admin to do it.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const currentAdmin = await requireAdmin();
  if (userId === currentAdmin.id) {
    throw new Error("You can't delete your own account.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
