"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ReportControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="no-print flex flex-wrap items-end gap-3 rounded-2xl border-2 border-accent-light px-4 py-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-accent">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => updateParam("from", e.target.value)}
          className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-accent">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => updateParam("to", e.target.value)}
          className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("from");
            params.delete("to");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="rounded-full border-2 border-accent-light px-4 py-2 text-sm font-medium text-gray-600"
        >
          Clear dates
        </button>
      )}
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Download PDF
      </button>
    </div>
  );
}
