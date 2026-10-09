"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClient } from "@/app/admin/clients/actions";
import { Modal } from "@/components/Modal";

export function EditClientButton({
  clientId,
  currentName,
  currentEmail,
}: {
  clientId: string;
  currentName: string;
  currentEmail: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditor() {
    setName(currentName);
    setEmail(currentEmail ?? "");
    setError(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateClient(clientId, name, email || null);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        aria-label="Edit client name and contact email"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#5d6c80] hover:bg-divider hover:text-navy-900"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <Modal title="Edit client" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy-900">Client name</span>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy-900">Contact email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trustee@example.co.za"
                className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
              />
              <span className="text-[13px] text-[#5d6c80]">
                Where their reports get emailed. Without it, the Email report button on Reports stays hidden.
              </span>
            </label>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="min-h-12 rounded-xl bg-navy-700 px-5 text-[15px] font-bold text-white hover:bg-navy-900 disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-12 rounded-xl border-[1.5px] border-border-strong px-5 text-[15px] font-bold text-navy-700 hover:bg-app-bg"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
