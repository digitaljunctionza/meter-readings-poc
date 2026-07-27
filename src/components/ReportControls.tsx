"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Service } from "@/lib/types";

export function ReportControls({ hasResults }: { hasResults: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [unit, setUnit] = useState(searchParams.get("unit") ?? "");
  const [service, setService] = useState<Service | "">(
    (searchParams.get("service") as Service | null) ?? ""
  );

  function handleLookUp(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("searched", "1");

    const setOrDelete = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("from", from);
    setOrDelete("to", to);
    setOrDelete("unit", unit);
    setOrDelete("service", service);

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleClear() {
    setFrom("");
    setTo("");
    setUnit("");
    setService("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.delete("unit");
    params.delete("service");
    params.delete("searched");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasAnyFilter = !!(from || to || unit || service);

  return (
    <form
      onSubmit={handleLookUp}
      className="no-print flex flex-col gap-3 rounded-2xl border-2 border-accent-light px-4 py-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-accent">Unit number</span>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. 101"
            className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-accent">Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as Service | "")}
            className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Any</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-accent">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-accent">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border-2 border-accent-light px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Look up
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full border-2 border-accent-light px-4 py-2 text-sm font-medium text-gray-600"
          >
            Clear
          </button>
        )}

        {hasResults && (
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto rounded-full border-2 border-accent px-4 py-2 text-sm font-semibold text-accent"
          >
            Download PDF
          </button>
        )}
      </div>
    </form>
  );
}
