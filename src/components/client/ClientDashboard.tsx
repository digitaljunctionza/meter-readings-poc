"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertsFeed } from "@/components/AlertsFeed";
import { ComingSoon } from "@/components/ComingSoon";
import { ReadingsExplorer } from "@/components/client/ReadingsExplorer";
import { UsageCard } from "@/components/client/UsageCard";
import type { ReadingRow } from "@/components/ReadingsTable";
import { buildServiceSummary, formatDay, openIssueIds } from "@/lib/clientReport";

export interface ClientDashboardProps {
  propertyName: string;
  properties: { id: string; name: string }[];
  activePropertyId: string;
  /** Where the property switcher links to: "/client", or the preview route. */
  basePath: string;
  settingsHref?: string;
  greetingName: string | null;
  /** Every reading (and meter-replacement marker) for this property, newest first. */
  rows: ReadingRow[];
}

type Tab = "readings" | "notices";

export function ClientDashboard({
  propertyName,
  properties,
  activePropertyId,
  basePath,
  settingsHref,
  greetingName,
  rows,
}: ClientDashboardProps) {
  const [tab, setTab] = useState<Tab>("readings");

  const openIds = useMemo(() => openIssueIds(rows), [rows]);
  const summaries = useMemo(
    () => (["electricity", "water"] as const).map((s) => buildServiceSummary(rows, s)).filter((s) => s.latest),
    [rows]
  );
  const noticeRows = useMemo(
    () => rows.filter((r) => r.kind === "replacement" || openIds.has(r.id)),
    [rows, openIds]
  );
  const latestTaken = useMemo(() => {
    let latest: string | null = null;
    for (const r of rows) {
      if (r.kind === "replacement") continue;
      if (latest === null || r.captured_at > latest) latest = r.captured_at;
    }
    return latest;
  }, [rows]);

  const propertyInitial = propertyName.trim().charAt(0).toUpperCase() || "?";
  const firstName = greetingName?.trim().split(/\s+/)[0];

  return (
    <main className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 pb-16">
        <div className="sticky top-0 z-20 -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-navy-900 px-3 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
              {propertyInitial}
            </div>
            <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">{propertyName}</h1>
            {settingsHref && (
              <Link
                href={settingsHref}
                aria-label="Settings"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M19.4 13a7.97 7.97 0 000-2l2.1-1.6-2-3.5-2.5 1a8 8 0 00-1.7-1L14.9 3h-3.8l-.4 2.9a8 8 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.97 7.97 0 000 2l-2.1 1.6 2 3.5 2.5-1a8 8 0 001.7 1l.4 2.9h3.8l.4-2.9a8 8 0 001.7-1l2.5 1 2-3.5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            {firstName ? `Hi ${firstName}` : "Welcome"}
          </h2>
          <p className="max-w-xl text-[15px] text-slate-600">
            {latestTaken
              ? `Here's how ${propertyName} is using electricity and water. Latest readings were taken on ${formatDay(latestTaken)}.`
              : `Your electricity and water readings for ${propertyName} will appear here.`}
          </p>
          <div className="mt-1">
            <ComingSoon label="Cost & tariffs" />
          </div>
        </div>

        {properties.length > 1 && (
          <nav aria-label="Properties" className="flex flex-wrap gap-2">
            {properties.map((p) => (
              <Link
                key={p.id}
                href={`${basePath}?property=${p.id}`}
                aria-current={p.id === activePropertyId ? "page" : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  p.id === activePropertyId
                    ? "border-green-500 bg-green-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-green-500 hover:text-green-700"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        )}

        {summaries.length > 0 && (
          <div className={`grid grid-cols-1 gap-4 ${summaries.length > 1 ? "md:grid-cols-2" : ""}`}>
            {summaries.map((s) => (
              <UsageCard key={s.service} summary={s} />
            ))}
          </div>
        )}

        <div>
          <div role="tablist" aria-label="Dashboard sections" className="flex gap-6 border-b border-slate-200">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "readings"}
              onClick={() => setTab("readings")}
              className={`-mb-px min-h-11 border-b-2 px-0.5 text-sm font-bold transition-colors ${
                tab === "readings" ? "border-green-500 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Readings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "notices"}
              onClick={() => setTab("notices")}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-0.5 text-sm font-bold transition-colors ${
                tab === "notices" ? "border-green-500 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Notices
              {openIds.size > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {openIds.size}
                </span>
              )}
            </button>
          </div>

          <div role="tabpanel" className="pt-5">
            {tab === "readings" ? (
              <ReadingsExplorer propertyName={propertyName} rows={rows} openIds={openIds} />
            ) : (
              <AlertsFeed rows={noticeRows} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
