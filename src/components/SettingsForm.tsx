"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SettingsForm({
  userId,
  email,
  fullName,
}: {
  userId: string;
  email: string;
  fullName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setNameSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() || null })
        .eq("id", userId);
      if (error) throw new Error(error.message);
      setNameMsg("Saved.");
      router.refresh();
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (password.length < 6) {
      setPasswordMsg({ ok: false, text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Passwords don't match." });
      return;
    }
    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPasswordMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update password" });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold text-navy-900">Profile</h2>
        <form onSubmit={handleSaveName} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-muted">Display name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border-2 border-border bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-green-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-muted">Email</span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border-2 border-border bg-app-bg px-3 py-2.5 text-sm text-text-muted outline-none"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={nameSaving}
              className="w-fit rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {nameSaving ? "Saving…" : "Save"}
            </button>
            {nameMsg && <p className="text-xs text-text-muted">{nameMsg}</p>}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold text-navy-900">Change password</h2>
        <form onSubmit={handleChangePassword} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-muted">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-lg border-2 border-border bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-green-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-muted">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-lg border-2 border-border bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-green-500"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordSaving}
              className="w-fit rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {passwordSaving ? "Updating…" : "Update password"}
            </button>
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.ok ? "text-green-700" : "text-red-600"}`}>{passwordMsg.text}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
