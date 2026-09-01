"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use as usePromise } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function AdminInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("get_admin_invite_preview", { p_token: token })
      .then(({ data, error: rpcError }) => {
        setValid(!rpcError && !!data && data.length > 0 && data[0].valid);
        setLoading(false);
      });
  }, [token]);

  async function redeemAndRedirect() {
    const supabase = createClient();
    const { error: redeemError } = await supabase.rpc("redeem_admin_invite", { p_token: token });
    if (redeemError) {
      throw new Error("This invite link is no longer valid. Please ask for a new one.");
    }
    router.push("/admin");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || null } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      await redeemAndRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 bg-white px-5 py-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-light border-t-accent" />
      </main>
    );
  }

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 bg-white px-5 py-6 text-center">
        <p className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This invite link is no longer valid. Please ask for a new one.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-white px-5 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-navy-700">You&apos;ve been invited as an admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create an account to get full admin access — readings, clients, reports, everything.
        </p>
      </div>

      <div className="mb-4 flex rounded-lg border-2 border-accent-light p-1">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "signup" ? "bg-navy-700 text-white" : "text-gray-600"
          }`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "signin" ? "bg-navy-700 text-white" : "text-gray-600"
          }`}
        >
          Log in instead
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-navy-700">Full name</span>
            <input
              type="text"
              className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-navy-700"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-navy-700">Email</span>
          <input
            type="email"
            required
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-navy-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-navy-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-navy-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-navy-700 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Please wait..." : mode === "signup" ? "Sign up" : "Log in"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
