"use client";

// The browser's install-eligibility signal (`beforeinstallprompt`) fires at
// most once per page load and is only ever delivered to whichever listeners
// are already attached at that moment. If the button that wants to use it
// only mounts on one specific page (the Dashboard), any earlier firing
// during login/redirect is lost forever, and clicking Install falls back to
// generic instructions even though the browser was ready to install
// directly. Capturing it here, in a module that's imported from the root
// layout, means a listener is attached from the very first paint on any
// page, regardless of which page later renders the actual button.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let captured: BeforeInstallPromptEvent | null = null;
let everInstalled = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    captured = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    everInstalled = true;
    captured = null;
    notify();
  });
}

export function getCapturedPrompt(): BeforeInstallPromptEvent | null {
  return captured;
}

export function wasJustInstalled(): boolean {
  return everInstalled;
}

export function consumePrompt(): void {
  captured = null;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
