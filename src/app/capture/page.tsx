import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import type { Client, Meter, Property } from "@/lib/types";

export const dynamic = "force-dynamic";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default async function CapturePropertyPickerPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/capture");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();

  const [{ data: propertyRows }, { data: clientRows }, { data: meterRows }] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase.from("clients").select("*").order("name"),
    supabase.from("meters").select("id, property_id").is("retired_at", null),
  ]);

  const properties = (propertyRows ?? []) as Property[];
  const clients = (clientRows ?? []) as Client[];
  const meters = (meterRows ?? []) as Pick<Meter, "id" | "property_id">[];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const meterCountByProperty = new Map<string, number>();
  const meterIdsByProperty = new Map<string, string[]>();
  for (const m of meters) {
    meterCountByProperty.set(m.property_id, (meterCountByProperty.get(m.property_id) ?? 0) + 1);
    meterIdsByProperty.set(m.property_id, [...(meterIdsByProperty.get(m.property_id) ?? []), m.id]);
  }

  const { data: readingRows } = await supabase
    .from("meter_readings")
    .select("meter_id")
    .gte("captured_at", monthStartIso());
  const readMeterIds = new Set((readingRows ?? []).map((r) => r.meter_id as string));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg pb-24">
      <div className="flex items-center gap-3 bg-navy-700 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-green-500">CAPTURE · CHOOSE PROPERTY</p>
          <h1 className="truncate text-lg font-bold">Which round today?</h1>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {properties.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
            No properties yet.{" "}
            <Link href="/admin/clients" className="text-green-700 underline">
              Add a client and property
            </Link>{" "}
            to get started.
          </p>
        ) : (
          properties.map((p) => {
            const total = meterCountByProperty.get(p.id) ?? 0;
            const meterIds = meterIdsByProperty.get(p.id) ?? [];
            const read = meterIds.filter((id) => readMeterIds.has(id)).length;
            const pct = total > 0 ? Math.round((read / total) * 100) : 0;
            const client = clientById.get(p.client_id);
            return (
              <Link
                key={p.id}
                href={`/capture/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-navy-900">{p.name}</p>
                  <p className="truncate text-[11px] text-text-muted">
                    {client?.name ?? "—"} · {total} meter{total === 1 ? "" : "s"}
                  </p>
                  {total > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-divider">
                        <div
                          className={`h-full rounded-full ${read === total ? "bg-green-500" : "bg-amber-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10.5px] font-semibold text-text-muted tabular-nums">
                        {read}/{total}
                      </span>
                    </div>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-text-faint" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            );
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}
