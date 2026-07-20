"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (installed) return null;
  if (!deferredPrompt && !isIos()) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    setShowIosHint(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="no-print fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Add to Home Screen
      </button>

      {showIosHint && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4"
          onClick={() => setShowIosHint(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-accent-light bg-white p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-bold text-accent">Add to Home Screen</p>
            <p className="text-sm text-gray-600">
              Tap the Share icon in Safari, then choose &quot;Add to Home Screen&quot;.
            </p>
            <button
              type="button"
              onClick={() => setShowIosHint(false)}
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
