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
      <span className="text-[13px] text-[#5d6c80]">
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
    <div className="no-print flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-700 px-4 text-[15px] font-bold text-white hover:bg-navy-900 disabled:opacity-60"
      >
        {isPending ? "Sending…" : `Email report to ${clientName}`}
      </button>
      {result && (
        <span role="status" className={`text-sm font-medium ${result.ok ? "text-[#2e6b1d]" : "text-red-600"}`}>{result.message}</span>
      )}
    </div>
  );
}
