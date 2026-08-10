"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redirectByRole() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "client";
    const isAllowedNext =
      !!next && (role === "admin" ? next.startsWith("/admin") || next.startsWith("/capture") : next.startsWith("/client"));
    const destination = isAllowedNext ? next! : role === "admin" ? "/admin" : "/client";
    router.push(destination);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || null } },
        });
        if (signUpError) throw signUpError;
      }
      await redirectByRole();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-white px-5 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-accent">Meter Readings</h1>
        <p className="text-sm text-gray-500">Wayne&apos;s Fix &amp; Finish</p>
      </div>

      <div className="mb-4 flex rounded-lg border-2 border-accent-light p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "signin" ? "bg-accent text-white" : "text-gray-600"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "signup" ? "bg-accent text-white" : "text-gray-600"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-accent">Full name</span>
            <input
              type="text"
              className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Email</span>
          <input
            type="email"
            required
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Password</span>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-accent py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Please wait..." : mode === "signin" ? "Log in" : "Sign up"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Link href="/" className="mt-6 text-center text-sm text-gray-500 underline">
        Back to home
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
