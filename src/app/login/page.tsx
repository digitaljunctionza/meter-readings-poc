"use client";

import Image from "next/image";
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
    <main className="flex min-h-screen w-full flex-col justify-between bg-navy-900 px-6 py-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col gap-3">
          <Image src="/icons/source-icon.png" alt="" width={64} height={64} className="rounded-2xl" priority />
          <div className="flex gap-1.5 font-sans text-xs font-semibold tracking-[0.14em]">
            <span className="text-white">WAYNE&apos;S</span>
            <span className="text-green-500">FIX AND FINISH</span>
          </div>
          <p className="-mt-1.5 text-sm text-white/50">Meter readings</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 rounded-xl border border-white/[0.16] bg-white/[0.07] px-4 py-3 focus-within:border-blue-500">
            <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-white/45">
              EMAIL
            </span>
            <input
              type="email"
              required
              className="w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          {mode === "signup" && (
            <label className="flex flex-col gap-1 rounded-xl border border-white/[0.16] bg-white/[0.07] px-4 py-3 focus-within:border-blue-500">
              <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-white/45">
                FULL NAME
              </span>
              <input
                type="text"
                className="w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/30"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 rounded-xl border border-white/[0.16] bg-white/[0.07] px-4 py-3 focus-within:border-blue-500">
            <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-white/45">
              PASSWORD
            </span>
            <input
              type="password"
              required
              minLength={6}
              className="w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-[52px] w-full rounded-xl bg-green-500 py-4 text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
          >
            {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>

          {error && (
            <p className="rounded-lg border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-[#F0A6A0]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="mt-1 min-h-[44px] text-center text-xs font-medium text-white/45 underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Need an admin account? Sign up" : "Already have an account? Log in"}
          </button>
        </form>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 pt-6">
        <p className="text-center text-[11px] leading-relaxed text-white/35">
          Clients: use the link in your invite email to set a password the first time.
        </p>
        <Link href="/" className="text-center text-xs text-white/45 underline-offset-2 hover:underline">
          Back to home
        </Link>
      </div>
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
