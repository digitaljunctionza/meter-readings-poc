"use client";

import { useEffect, useRef, useState } from "react";

const DOUBLE_TAP_WINDOW_MS = 2000;

export function ExitGuard() {
  const [showToast, setShowToast] = useState(false);
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    // Push a sentinel entry so the first back press is caught by popstate
    // instead of immediately leaving the app.
    window.history.pushState({ exitGuard: true }, "", window.location.href);

    function onPopState() {
      const now = Date.now();
      if (now - lastBackPressRef.current < DOUBLE_TAP_WINDOW_MS) {
        // Second press within the window: let this one go through (don't
        // re-push), so the next back navigation actually exits/leaves.
        return;
      }
      lastBackPressRef.current = now;
      window.history.pushState({ exitGuard: true }, "", window.location.href);
      setShowToast(true);
      setTimeout(() => setShowToast(false), DOUBLE_TAP_WINDOW_MS);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!showToast) return null;

  return (
    <div className="no-print fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white">
      Tap back again to exit
    </div>
  );
}
