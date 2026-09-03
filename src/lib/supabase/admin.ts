import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES ALL ROW LEVEL SECURITY.
 *
 * Rules for using this:
 *   1. Server-side only. This module must never be imported into a Client
 *      Component or anything that ends up in the browser bundle — the key
 *      would be handed to every visitor. It has no NEXT_PUBLIC_ prefix, so
 *      Next.js will throw at build time if that is attempted, but do not
 *      rely on that alone.
 *   2. Every caller must gate on requireAdmin() FIRST. RLS is what normally
 *      stops a logged-in client from reading another client's data; with
 *      this key that protection is gone, so the check in the action is the
 *      only thing left.
 *   3. Use it only for what the anon client genuinely cannot do — the
 *      auth.admin user APIs. Everything else should keep going through
 *      lib/supabase/server.ts so RLS stays in force.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "User management needs SUPABASE_SERVICE_ROLE_KEY. Add it in Supabase " +
        "(Settings -> API -> service_role) and set it as an environment variable " +
        "in Vercel and .env.local."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Lets the UI show a clear setup message instead of failing on first use. */
export function adminApiConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
