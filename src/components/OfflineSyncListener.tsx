"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/offlineSync";

/**
 * Headless — mounted once in the root layout (same idiom as
 * InstallPromptListener) so a reading queued during a capture round starts
 * uploading the moment connectivity returns, even if the field worker has
 * since navigated away from /capture. No UI of its own; OfflineQueuePanel
 * shows the count and offers a manual retry.
 */
export function OfflineSyncListener() {
  useEffect(() => {
    flushOfflineQueue().catch(() => {});
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);

    function handleOnline() {
      flushOfflineQueue().catch(() => {});
    }
  }, []);

  return null;
}
