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
        className="flex h-10 w-fit items-center gap-1.5 rounded-full border-2 border-dashed border-accent-light px-4 text-sm font-semibold text-accent hover:border-accent"
      >
        + New client
      </button>

      {open && (
        <Modal title="Add a client" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Client name</span>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tarragon Two Body Corporate"
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Contact email (optional)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Adding…" : "Add client"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border-2 border-accent-light px-4 py-2 text-sm font-medium text-gray-600"
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
