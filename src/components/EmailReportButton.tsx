"use client";

import { useState, useTransition } from "react";
import { emailPropertyReport } from "@/app/admin/reports/actions";
import { haptic } from "@/lib/haptics";
import type { Service } from "@/lib/types";

export function EmailReportButton({
  propertyId,
  clientName,
  contactEmail,
  filters,
}: {
  propertyId: string;
  clientName: string;
  contactEmail: string | null;
  filters: { from?: string; to?: string; unit?: string; service?: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!contactEmail) {
    return (
      <span className="text-xs text-gray-400">
        No contact email for {clientName} — add one under Clients &amp; meters to email reports.
      </span>
    );
  }

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      try {
        const { sentTo } = await emailPropertyReport(propertyId, {
          from: filters.from,
          to: filters.to,
          unitNumber: filters.unit,
          service: filters.service as Service | undefined,
        });
        haptic("success");
        setResult({ ok: true, message: `Sent to ${sentTo}.` });
      } catch (err) {
        haptic("error");
        setResult({ ok: false, message: err instanceof Error ? err.message : "Failed to send" });
      }
    });
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50"
      >
        {isPending ? "Sending…" : `Email report to ${clientName}`}
      </button>
      {result && (
        <span className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</span>
      )}
    </div>
  );
}
