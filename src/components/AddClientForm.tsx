"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientRecord } from "@/app/admin/clients/actions";
import { Modal } from "@/components/Modal";

export function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const id = await createClientRecord(name, email || null);
        setName("");
        setEmail("");
        setOpen(false);
        router.push(`/admin/clients?client=${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add client");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-fit items-center gap-1.5 rounded-xl bg-navy-700 px-4 text-sm font-bold text-white hover:bg-navy-900"
      >
        + New client
      </button>

      {open && (
        <Modal title="Add a client" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy-900">Client name</span>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tarragon Two Body Corporate"
                className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy-900">Contact email (optional)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
              />
            </label>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="min-h-12 rounded-xl bg-navy-700 px-5 text-[15px] font-bold text-white hover:bg-navy-900 disabled:opacity-50"
              >
                {isPending ? "Adding…" : "Add client"}
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
