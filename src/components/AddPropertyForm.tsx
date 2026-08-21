"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "@/app/admin/clients/actions";
import { Modal } from "@/components/Modal";

export function AddPropertyForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const id = await createProperty(clientId, name, address || null);
        setName("");
        setAddress("");
        setOpen(false);
        router.push(`/admin/clients?client=${clientId}&property=${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add property");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-fit items-center gap-1.5 rounded-full border-2 border-accent-light px-4 text-sm font-medium text-gray-700 hover:border-accent"
      >
        + Add property
      </button>

      {open && (
        <Modal title="Add a property" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Property name</span>
              <input
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tarragon Two"
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Address (optional)</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
                {isPending ? "Adding…" : "Add property"}
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
