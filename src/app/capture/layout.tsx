import type { ReactNode } from "react";
import { OfflineQueuePanel } from "@/components/OfflineQueuePanel";

export default function CaptureLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OfflineQueuePanel />
      {children}
    </>
  );
}
