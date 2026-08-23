"use client";

import { useEffect, useState } from "react";
import { getCapturedPrompt, consumePrompt, subscribe } from "@/lib/installPromptStore";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this instead of the display-mode media query
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt({ className }: { className?: string }) {
  const [hasPrompt, setHasPrompt] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    setHasPrompt(!!getCapturedPrompt());

    const unsubscribe = subscribe(() => {
      setHasPrompt(!!getCapturedPrompt());
      setInstalled(isStandalone());
    });
    window.addEventListener("appinstalled", () => setInstalled(true));

    return unsubscribe;
  }, []);

  // Only hide once we're sure it's actually installed — never hide just
  // because the browser hasn't fired its install-eligibility event yet.
  // The event is captured globally (see installPromptStore.ts) from the
  // very first page load, so by the time this button is visible it's
  // already using whatever was captured, however early it fired.
  if (installed) return null;

  async function handleClick() {
    const deferredPrompt = getCapturedPrompt();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      consumePrompt();
      setHasPrompt(false);
      return;
    }
    setShowHint(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "no-print flex h-10 items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-medium text-white/80"
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Install
      </button>

      {showHint && !hasPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4"
          onClick={() => setShowHint(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-accent-light bg-white p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-bold text-accent">Add to Home Screen</p>
            {isIos() ? (
              <p className="text-sm text-gray-600">
                Tap the Share icon in Safari, then choose &quot;Add to Home Screen&quot;.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Open your browser&apos;s menu (usually ⋮ or ⋯ in the top corner) and look for
                &quot;Install app&quot; or &quot;Add to Home Screen&quot;. If you don&apos;t see it, your browser may
                not support installing this app yet — Chrome and Edge support it best.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
