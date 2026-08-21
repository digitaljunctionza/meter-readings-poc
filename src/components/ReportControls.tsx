"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Service } from "@/lib/types";
import { DownloadIcon, SearchIcon, XIcon } from "@/components/icons";

const inputClass =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20";

export function ReportControls({ hasResults }: { hasResults: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [unit, setUnit] = useState(searchParams.get("unit") ?? "");
  const [service, setService] = useState<Service | "">(
    (searchParams.get("service") as Service | null) ?? ""
  );

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("from", from);
    setOrDelete("to", to);
    setOrDelete("unit", unit);
    setOrDelete("service", service);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasAnyFilter = !!(from || to || unit || service);

  return (
    <form
      onSubmit={handleApply}
      className="no-print flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Unit number</span>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. 101"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as Service | "")}
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <SearchIcon className="h-4 w-4" />
          {isPending ? "Applying…" : "Apply filters"}
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <XIcon className="h-4 w-4" />
            Clear
          </button>
        )}

        {hasResults && (
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <DownloadIcon className="h-4 w-4" />
            Download PDF
          </button>
        )}
      </div>
    </form>
  );
}
