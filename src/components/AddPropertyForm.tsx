"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "@/app/admin/properties/actions";

export function AddPropertyForm() {
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
        const id = await createProperty(name, address || null);
        setName("");
        setAddress("");
        setOpen(false);
        router.push(`/admin?property=${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add property");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print flex w-fit items-center gap-1 rounded-full border-2 border-accent-light px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-accent"
      >
        + Add property
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="no-print flex flex-col gap-3 rounded-lg border-2 border-accent-light p-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-accent">Property name</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tarragon Two"
          className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-accent">Address (optional)</span>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-accent"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add property"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border-2 border-accent-light px-4 py-2 text-sm font-medium text-gray-600"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
