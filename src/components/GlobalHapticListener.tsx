"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

const INTERACTIVE_SELECTOR =
  'button, a[href], [role="button"], input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], select, summary';

/**
 * A tap haptic for every interactive element in the app, via one delegated
 * listener on the document instead of threading haptic() through every
 * button by hand — that approach is easy to miss on any given button and
 * easy to forget on the next one added.
 *
 * Capture phase, so it fires even if a button's own handler calls
 * stopPropagation() (the Modal backdrop does). Buttons that already trigger
 * their own success/warning/error pattern (capture, review) simply overwrite
 * this one a moment later — navigator.vibrate() replaces an in-progress
 * vibration rather than queuing beside it, so there's no double-buzz, just
 * whichever pattern is more specific winning.
 */
export function GlobalHapticListener() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLButtonElement>(INTERACTIVE_SELECTOR);
      if (!el || el.disabled) return;
      haptic("tap");
    }
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
