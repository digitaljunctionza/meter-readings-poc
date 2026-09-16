"use client";

import { createClient } from "@/lib/supabase/browser";
import { listQueuedReadings, removeQueuedReading, type QueuedReading } from "@/lib/offlineQueue";

let flushing = false;

/**
 * Uploads every queued reading in capture order. Stops at the first failure
 * that looks like "still offline" so the rest stay queued for the next
 * attempt rather than being marked failed while there's no connection to
 * fail properly over. A real (non-network) failure — a 500, a rejected
 * payload — is left in place too (it needs a person to look at it, not a
 * silent retry loop) but doesn't block the items after it.
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    const queue = await listQueuedReadings();
    for (const item of queue) {
      if (!navigator.onLine) break;
      try {
        await uploadQueuedReading(item);
        await removeQueuedReading(item.id);
        synced++;
      } catch (err) {
        if (!navigator.onLine || isNetworkError(err)) break;
        failed++;
      }
    }
  } finally {
    flushing = false;
  }
  return { synced, failed };
}

function isNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /network|fetch|offline/i.test(message);
}

async function uploadQueuedReading(item: QueuedReading): Promise<void> {
  const supabase = createClient();
  const ext = item.photoName.split(".").pop() || "jpg";
  const path = `${item.propertyId}/${item.meterId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("meter-photos").upload(path, item.photo);
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage.from("meter-photos").getPublicUrl(path);

  const res = await fetch("/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meter_id: item.meterId,
      raw_value: item.rawValue,
      photo_url: publicUrlData.publicUrl,
      notes: item.notes,
      captured_at: item.capturedAt,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
}
