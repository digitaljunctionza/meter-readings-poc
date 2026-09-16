"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import {
  subscribe,
  getCountSnapshot,
  getCountServerSnapshot,
  listQueuedReadings,
  removeQueuedReading,
  type QueuedReading,
} from "@/lib/offlineQueue";
import { flushOfflineQueue } from "@/lib/offlineSync";
import { haptic } from "@/lib/haptics";

/** Full-width strip above the capture flow's own header — not fixed, so it
 * never overlaps a page's sticky header, it just pushes content down while
 * something is pending. Hidden entirely once the queue is empty. */
export function OfflineQueuePanel() {
  const count = useSyncExternalStore(subscribe, getCountSnapshot, getCountServerSnapshot);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QueuedReading[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) listQueuedReadings().then(setItems);
  }, [open, count]);

  useEffect(() => {
    // Covers connectivity returning while this particular page wasn't
    // mounted — OfflineSyncListener already tries on the `online` event, but
    // that only fires on the transition, not on "was already back online by
    // the time this screen opened".
    if (count > 0) handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSync() {
    setSyncing(true);
    flushOfflineQueue()
      .then(({ synced }) => {
        if (synced > 0) haptic("success");
      })
      .finally(() => setSyncing(false));
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeQueuedReading(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  if (count === 0) return null;

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 items-center gap-1.5 font-semibold text-amber-900"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {count}
            </span>
            <span className="truncate">
              {count} reading{count === 1 ? "" : "s"} saved offline
            </span>
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 rounded-full border border-amber-300 px-3 py-1 font-semibold text-amber-900 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>

        {open && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-amber-200 pt-2">
            {items.length === 0 ? (
              <p className="text-amber-800">Loading…</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-amber-900">
                    {item.meterLabel} · {item.rawValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={isPending}
                    className="shrink-0 text-red-600 underline disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
