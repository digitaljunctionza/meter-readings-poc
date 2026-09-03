"use client";

import { useSyncExternalStore } from "react";
import {
  getHapticsServerSnapshot,
  getHapticsSnapshot,
  haptic,
  setHapticsEnabled,
  subscribe,
} from "@/lib/haptics";

export function HapticsToggle() {
  // useSyncExternalStore rather than reading localStorage into state from an
  // effect: it gives the server a defined snapshot, so there is no hydration
  // mismatch and no cascading render.
  const state = useSyncExternalStore(subscribe, getHapticsSnapshot, getHapticsServerSnapshot);

  if (state === "unsupported") {
    return (
      <p className="text-xs text-text-faint">
        This phone doesn&rsquo;t support vibration feedback. iPhones can&rsquo;t &mdash; Apple has never
        allowed web apps to use the Taptic Engine. Android phones buzz on each keypress and save.
      </p>
    );
  }

  const enabled = state === "on";

  function toggle() {
    setHapticsEnabled(!enabled);
    if (!enabled) haptic("success"); // let them feel what they just switched on
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className="flex min-h-[48px] w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm font-semibold text-navy-700">Vibration feedback</span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-green-500" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
