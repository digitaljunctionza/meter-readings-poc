"use client";

// Renders nothing — just guarantees installPromptStore's module-level
// beforeinstallprompt listener is attached from the very first page load
// (mounted in the root layout), not only once the Install button's own
// page happens to load. See installPromptStore.ts for why that matters.
import "@/lib/installPromptStore";

export function InstallPromptListener() {
  return null;
}
