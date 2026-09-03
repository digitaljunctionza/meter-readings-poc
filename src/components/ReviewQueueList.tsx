"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptReading, sendBackReading } from "@/app/admin/review/actions";
import { formatDateTime } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import type { FlagStatus, Service } from "@/lib/types";

export interface ReviewItem {
  readingId: string;
  propertyName: string;
  unitNumber: string;
  service: Service;
  flagStatus: FlagStatus;
  readingValue: number;
  previousValue: number | null;
  capturedAt: string;
  photoUrl: string | null;
  notes: string | null;
}

const REASON_COPY: Partial<Record<FlagStatus, string>> = {
  below_prev: "Reading came in below last month",
  above_2x_avg: "Well above this meter's own average",
  possible_partial: "Reading looks like an incomplete entry",
};

export function ReviewQueueList({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The buzz fires on tap, not on completion: the action is a server round
  // trip, and by the time it resolves the gesture that authorised vibration
  // has expired on Android, so a success buzz would be silently dropped.
  function handle(action: (id: string) => Promise<void>, id: string, feedback: "success" | "warning") {
    haptic(feedback);
    setBusyId(id);
    startTransition(async () => {
      try {
        await action(id);
        router.refresh();
      } catch (err) {
        haptic("error");
        throw err; // still surfaces to the error boundary as before
      } finally {
        setBusyId(null);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-text-muted">Nothing waiting on you. All caught up.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-4">
      {items.map((item) => {
        const delta = item.previousValue !== null ? item.readingValue - item.previousValue : null;
        const busy = busyId === item.readingId;
        return (
          <div key={item.readingId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[12.5px] font-semibold text-amber-900">
                {REASON_COPY[item.flagStatus] ?? "Needs a second look"}
              </p>
            </div>

            <div className="flex gap-3">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white/40">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-navy-900">
                  {item.unitNumber} · <span className="capitalize">{item.service}</span>
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {item.propertyName} · {formatDateTime(item.capturedAt)}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold tabular-nums text-navy-900">
                    {item.readingValue.toLocaleString()}
                  </span>
                  {delta !== null && (
                    <span className={`font-mono text-xs font-semibold tabular-nums ${delta < 0 ? "text-red-600" : "text-amber-600"}`}>
                      {delta >= 0 ? "+" : ""}
                      {delta.toLocaleString()}
                    </span>
                  )}
                </div>
                {item.previousValue !== null && (
                  <p className="text-[10.5px] text-text-faint">was {item.previousValue.toLocaleString()}</p>
                )}
              </div>
            </div>

            {item.notes && <p className="rounded-lg bg-app-bg px-3 py-2 text-xs text-text-body">{item.notes}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handle(sendBackReading, item.readingId, "warning")}
                className="flex-1 rounded-xl border border-border-strong py-3 text-[13px] font-semibold text-navy-700 disabled:opacity-50"
              >
                {busy ? "…" : "Send back"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handle(acceptReading, item.readingId, "success")}
                className="flex-1 rounded-xl bg-green-500 py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {busy ? "…" : "Accept"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
