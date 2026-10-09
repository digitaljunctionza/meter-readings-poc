import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { AdminPage } from "@/components/AdminPage";
import type { Client, Meter, Property, Service } from "@/lib/types";

export const dynamic = "force-dynamic";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

const SERVICE_BAR: Record<Service, string> = { electricity: "bg-amber-600", water: "bg-blue-500" };

export default async function CapturePropertyPickerPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/capture");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();

  const [{ data: propertyRows }, { data: clientRows }, { data: meterRows }, { data: readingRows }] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("clients").select("*").order("name"),
    supabase.from("meters").select("id, property_id, service").is("retired_at", null),
    supabase.from("meter_readings").select("meter_id").gte("captured_at", monthStartIso()),
  ]);

  const properties = (propertyRows ?? []) as Property[];
  const clientById = new Map(((clientRows ?? []) as Client[]).map((c) => [c.id, c]));
  const meters = (meterRows ?? []) as Pick<Meter, "id" | "property_id" | "service">[];
  const readMeterIds = new Set((readingRows ?? []).map((r) => r.meter_id as string));

  const cards = properties.map((p) => {
    const own = meters.filter((m) => m.property_id === p.id);
    const read = own.filter((m) => readMeterIds.has(m.id)).length;
    const byService = (["electricity", "water"] as const)
      .map((service) => {
        const group = own.filter((m) => m.service === service);
        return { service, total: group.length, read: group.filter((m) => readMeterIds.has(m.id)).length };
      })
      .filter((g) => g.total > 0);
    return { property: p, client: clientById.get(p.client_id), total: own.length, read, byService };
  });

  // The round in progress that's furthest along is almost always where the
  // reader stopped last time, so it gets pinned to the top.
  const resume = cards
    .filter((c) => c.read > 0 && c.read < c.total)
    .sort((a, b) => b.read / b.total - a.read / a.total)[0];
  const ordered = resume ? [resume, ...cards.filter((c) => c !== resume)] : cards;

  const monthLabel = new Date().toLocaleDateString("en-ZA", { month: "long", timeZone: "Africa/Johannesburg" });

  return (
    <AdminPage>
      <header className="border-b border-border bg-surface px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)] lg:mx-4 lg:rounded-2xl lg:border lg:pt-5">
        <p className="text-sm text-[#5d6c80]">Capture · {monthLabel} round</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">Which property?</h1>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
        {properties.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] text-text-body">
            No properties yet.{" "}
            <Link href="/admin/clients" className="font-semibold text-navy-700 underline">
              Add a client and property
            </Link>{" "}
            to get started.
          </p>
        )}

        {ordered.map((c) => {
          const isResume = c === resume;
          const done = c.total > 0 && c.read === c.total;
          const notStarted = c.read === 0;
          return (
            <Link
              key={c.property.id}
              href={`/capture/${c.property.id}`}
              className={`flex flex-col gap-3 rounded-2xl p-4 transition-colors ${
                isResume
                  ? "border-2 border-navy-700 bg-surface"
                  : done
                    ? "border border-green-200 bg-green-50 hover:border-green-700"
                    : "border border-border bg-surface hover:border-border-strong"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {isResume && (
                    <span className="mb-2 inline-block rounded-full bg-[#e8eef7] px-2.5 py-1 text-xs font-bold text-navy-700">
                      Pick up where you left off
                    </span>
                  )}
                  <p className="truncate text-[17px] font-bold text-navy-900">{c.property.name}</p>
                  <p className={`mt-0.5 truncate text-[13px] ${done ? "font-semibold text-[#2e6b1d]" : "text-[#5d6c80]"}`}>
                    {done
                      ? `All ${c.total} meters read · done`
                      : [c.property.address, c.client?.name, `${c.total - c.read} of ${c.total} left`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {done ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#2e6b1d]">
                    <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : notStarted && c.total > 0 ? (
                  <span className="shrink-0 rounded-xl bg-navy-700 px-3.5 py-2.5 text-sm font-bold text-white">Start</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-text-faint">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {!done && !notStarted && (
                <div className="flex gap-3">
                  {c.byService.map((g) => (
                    <div key={g.service} className="flex flex-1 flex-col gap-1.5">
                      <span className="flex justify-between text-[13px] text-text-body">
                        <span>{g.service === "water" ? "Water" : "Electricity"}</span>
                        <span className="font-mono font-bold tabular-nums">
                          {g.read}/{g.total}
                        </span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-divider">
                        <span
                          className={`block h-full rounded-full ${SERVICE_BAR[g.service]}`}
                          style={{ width: `${Math.round((g.read / g.total) * 100)}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </AdminPage>
  );
}
