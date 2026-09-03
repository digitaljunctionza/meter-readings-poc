"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  deleteUser,
  sendPasswordReset,
  setUserPassword,
  setUserRole,
  type AppUser,
} from "@/app/admin/users/actions";
import { Modal } from "@/components/Modal";
import { formatDateTime } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import type { Role } from "@/lib/types";

type Dialog =
  | { kind: "create" }
  | { kind: "password"; user: AppUser }
  | { kind: "delete"; user: AppUser }
  | null;

export function UserManager({ users, currentUserId }: { users: AppUser[]; currentUserId: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "client" as Role });
  const [newPassword, setNewPassword] = useState("");

  function run(fn: () => Promise<void>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
        router.refresh();
      } catch (err) {
        haptic("error");
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function close() {
    setDialog(null);
    setError(null);
    setForm({ email: "", password: "", fullName: "", role: "client" });
    setNewPassword("");
  }

  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          {users.length} {users.length === 1 ? "user" : "users"} · {admins} admin{admins === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            setDialog({ kind: "create" });
          }}
          className="rounded-full bg-green-500 px-4 py-2 text-xs font-bold text-white"
        >
          + Add user
        </button>
      </div>

      {notice && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {notice}
        </p>
      )}
      {error && !dialog && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-navy-900">
                  {u.fullName || u.email}
                  {u.id === currentUserId && <span className="ml-1.5 text-[10px] text-text-faint">(you)</span>}
                </p>
                <p className="truncate text-[11px] text-text-muted">{u.email}</p>
                <p className="text-[10.5px] text-text-faint">
                  {u.lastSignInAt ? `Last in ${formatDateTime(u.lastSignInAt)}` : "Never signed in"}
                  {!u.confirmed && " · unconfirmed"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  u.role === "admin" ? "bg-navy-900 text-white" : "bg-app-bg text-text-muted"
                }`}
              >
                {u.role}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={isPending || u.id === currentUserId}
                onClick={() => run(() => setUserRole(u.id, u.role === "admin" ? "client" : "admin"))}
                className="rounded-lg border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 disabled:opacity-40"
              >
                {u.role === "admin" ? "Make client" : "Make admin"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDialog({ kind: "password", user: u })}
                className="rounded-lg border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 disabled:opacity-40"
              >
                Password
              </button>
              <button
                type="button"
                disabled={isPending || u.id === currentUserId}
                onClick={() => setDialog({ kind: "delete", user: u })}
                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {dialog?.kind === "create" && (
        <Modal title="Add a user" onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                async () => {
                  await createUser(form);
                },
                () => {
                  setNotice(`${form.email} can sign in now.`);
                  close();
                }
              );
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Full name</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Email</span>
              <input
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Temporary password</span>
              <input
                type="text"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              />
              <span className="text-[11px] text-gray-500">
                Shown in plain text so you can read it out. Tell them to change it after their first sign-in.
              </span>
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-bold text-accent">Access level</legend>
              <div className="flex gap-2">
                {(["client", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, role: r }))}
                    className={`flex-1 rounded-lg border-2 py-2 text-xs font-semibold capitalize ${
                      form.role === r
                        ? "border-accent bg-accent text-white"
                        : "border-accent-light text-gray-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-gray-500">
                {form.role === "admin"
                  ? "Full access: capture, review, clients, quotes and users."
                  : "Sees only the reports for the clients they're given access to."}
              </span>
            </fieldset>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create user"}
            </button>
          </form>
        </Modal>
      )}

      {dialog?.kind === "password" && (
        <Modal title={`Password · ${dialog.user.email}`} onClose={close}>
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = dialog.user.email;
                run(
                  async () => {
                    await setUserPassword(dialog.user.id, newPassword);
                  },
                  () => {
                    setNotice(`Password changed for ${email}.`);
                    close();
                  }
                );
              }}
              className="flex flex-col gap-2"
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-accent">Set a new password</span>
                <input
                  type="text"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Set password"}
              </button>
            </form>

            <div className="border-t border-accent-light pt-3">
              <p className="mb-2 text-[11px] text-gray-500">
                Better when they aren&rsquo;t with you — they pick their own password and you never handle it.
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const email = dialog.user.email;
                  run(
                    async () => {
                      await sendPasswordReset(email);
                    },
                    () => {
                      setNotice(`Reset link sent to ${email}.`);
                      close();
                    }
                  );
                }}
                className="w-full rounded-full border-2 border-accent-light px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50"
              >
                Email a reset link instead
              </button>
            </div>

            {error && <p className="text-xs text-red-700">{error}</p>}
          </div>
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <Modal title="Delete user" onClose={close}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-body">
              Permanently delete <strong>{dialog.user.email}</strong>? They lose access immediately. Readings
              they captured stay in the system.
            </p>
            <p className="text-xs text-text-muted">This can&rsquo;t be undone.</p>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-full border-2 border-accent-light px-4 py-2 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const email = dialog.user.email;
                  run(
                    async () => {
                      await deleteUser(dialog.user.id);
                    },
                    () => {
                      setNotice(`${email} deleted.`);
                      close();
                    }
                  );
                }}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
