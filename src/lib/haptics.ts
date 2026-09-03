// Haptic feedback for the capture flow.
//
// PLATFORM REALITY: this uses the Vibration API, which Android Chrome
// supports and iOS Safari does not — Apple has never shipped it, and there
// is no way for a web app to trigger the Taptic Engine. So on iPhone every
// call here is a silent no-op. That is deliberate: the alternatives (hidden
// <audio> tricks, the switch-control hack) are unreliable, break on iOS
// updates, and can make noise on a muted phone. Wayne's readers on Android
// get the feedback; iPhone users get the same app, minus the buzz.
//
// Vibration also requires a prior user gesture in the same task, so these
// only fire from real event handlers, never on page load or from an effect.

export type HapticPattern =
  | "tap" // a button press registered
  | "success" // reading saved, meter accepted
  | "warning" // flagged, needs a second look
  | "error"; // save failed

// Durations in ms. Kept short — a long buzz on a phone in someone's hand
// reads as a fault, not a confirmation.
const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [14, 40, 22],
  warning: [18, 60, 18],
  error: [30, 50, 30, 50, 30],
};

const STORAGE_KEY = "haptics-enabled";

function supported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Off only if the user explicitly turned it off — default on where supported. */
export function hapticsEnabled(): boolean {
  if (!supported()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Private mode / storage blocked. Fall back to on rather than silently
    // disabling a feature the user asked for.
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Nothing to do — the setting just won't persist across reloads.
  }
  listeners.forEach((fn) => fn());
}

// Subscription plumbing so the settings toggle can read this through
// useSyncExternalStore instead of copying localStorage into state inside an
// effect — same approach as installPromptStore.ts.
const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Client snapshot: "on" | "off" | "unsupported". A string keeps it comparable by value. */
export function getHapticsSnapshot(): "on" | "off" | "unsupported" {
  if (!supported()) return "unsupported";
  return hapticsEnabled() ? "on" : "off";
}

/** The server has no navigator, and rendering the toggle there would mismatch. */
export function getHapticsServerSnapshot(): "on" | "off" | "unsupported" {
  return "unsupported";
}

/** True when this device can actually buzz, for showing/hiding the setting. */
export function hapticsSupported(): boolean {
  return supported();
}

export function haptic(pattern: HapticPattern = "tap"): void {
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some browsers throw if the page is hidden or the gesture has expired.
    // A missed buzz is never worth breaking the action it accompanies.
  }
}
