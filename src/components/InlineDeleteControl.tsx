"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient, deleteProperty } from "@/app/admin/clients/actions";

/**
 * A tap-to-arm delete link shared by the client and property detail panels.
 * When `blockedReason` is set (children still exist — properties, meters)
 * it renders as explanatory text instead of a control, so the admin sees why
 * deletion isn't available rather than hitting a plain server error.
 */
export function InlineDeleteControl({
  kind,
  id,
  label,
  blockedReason,
}: {
  kind: "client" | "property";
  id: string;
  label: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (blockedReason) {
    return <span className="text-xs text-gray-400">{blockedReason}</span>;
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === "client") await deleteClient(id);
        else await deleteProperty(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-red-700">Delete permanently?</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="text-xs text-gray-500 underline disabled:opacity-50"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-red-600 underline"
        >
          {label}
        </button>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
